// pages/Factures/Factures.jsx
//
// Même interface que la page Ventes (Ventes.css, préfixe vt-) :
// synthèse + filtres par statut, recherche, tableau, détail, encaissement.
// Impression / téléchargement : toujours via le choix Ticket / Facture A4 (+ aperçu).
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import {
  Download, X, RefreshCw, FileText, Wallet, CreditCard, Building, Coins, Printer, Loader,
  User, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, MoreVertical,
} from "lucide-react";
import FactureService from "../../services/factureService";
import CommandeVenteService from "../../services/commandeVenteService";
import MagasinService from "../../services/magasinService";
import { useUser } from "../../context/AuthContext";
import FormatChoiceModal from "../../components/Facture/FormatChoiceModal";
import "../Ventes/Ventes.css";
import "./Factures.css";

// ============================================================
// HELPERS
// ============================================================
const NBSP = " ";

const formatMontant = (value) => {
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : Number(value);
  if (value === null || value === undefined || isNaN(num)) return `0${NBSP}FCFA`;
  return `${Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}${NBSP}FCFA`;
};

const formatDateFR = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const getTodayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const toNum = (v) => {
  if (v === "" || v === null || v === undefined) return NaN;
  return parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
};
const DECIMAL_RE = /^\d*[.,]?\d*$/;

const getMontantPaye = (f) => {
  if (!f) return 0;
  if (Array.isArray(f.paiements) && f.paiements.length > 0) {
    return f.paiements.reduce((s, p) => s + (parseFloat(p.montant) || 0), 0);
  }
  return parseFloat(f.total_paye) || 0;
};
const getResteAPayer = (f) => Math.max(0, (parseFloat(f?.montant_total) || 0) - getMontantPaye(f));

const getStatut = (f) => {
  if (!f) return "en_attente";
  if (f.statut === "annulee" || f.statut_effectif === "annulee") return "annulee";
  const total = parseFloat(f.montant_total) || 0;
  const paye = getMontantPaye(f);
  const reste = Math.max(0, total - paye);
  if (total > 0 && reste <= 0) return "payee";
  const ech = f.date_echeance ? new Date(f.date_echeance) : null;
  if (ech && !isNaN(ech) && ech < new Date(new Date().toDateString()) && reste > 0) return "en_retard";
  if (paye > 0) return "partiellement_payee";
  return f.statut_effectif || f.statut || "en_attente";
};

// Statuts de facture → couleurs déjà définies dans Ventes.css (data-p / data-s)
const STATUTS = [
  { value: "impayees", label: "Impayées", s: "confirmee" },
  { value: "en_attente", label: "En attente", s: "en_attente" },
  { value: "partiellement_payee", label: "Partielles", s: "en_preparation" },
  { value: "en_retard", label: "En retard", s: "annulee" },
  { value: "payee", label: "Payées", s: "livree" },
  { value: "annulee", label: "Annulées", s: "annulee" },
];
const LIBELLES_STATUT = {
  en_attente: "Non payée",
  partiellement_payee: "Partielle",
  en_retard: "En retard",
  payee: "Soldée",
  annulee: "Annulée",
};

const MODES_PAIEMENT = [
  { value: "especes", label: "Espèces", Icon: Coins },
  { value: "carte", label: "Carte", Icon: CreditCard },
  { value: "virement", label: "Virement", Icon: Building },
  { value: "cheque", label: "Chèque", Icon: FileText },
];
const modeLabel = (v) => MODES_PAIEMENT.find((m) => m.value === v)?.label || (v === "mobile_money" ? "Mobile money" : v || "-");

const mapLignes = (lignes) =>
  (lignes || []).map((l) => {
    const qte = parseFloat(l.quantite) || 0;
    const prix = parseFloat(l.prix_vente) || 0;
    return {
      ...l,
      produit_nom: l.produit_nom || "-",
      nom_unite_vente: l.nom_unite_vente || l.unite_vente_nom || "Unité",
      unite_symbole: l.unite_symbole || l.nom_unite_vente || "",
      quantite_base: parseFloat(l.quantite_base) || 1,
      quantite_totale_base: parseFloat(l.quantite_totale_base) || qte * (parseFloat(l.quantite_base) || 1),
      prix_vente: prix,
      montant_total: parseFloat(l.montant_total) || qte * prix,
    };
  });

// ============================================================
// MODAL + MENU (même comportement que la page Ventes)
// ============================================================
let lockDepth = 0;
const lockScroll = () => { if (lockDepth++ === 0) document.body.style.overflow = "hidden"; };
const unlockScroll = () => {
  lockDepth = Math.max(0, lockDepth - 1);
  if (lockDepth === 0) document.body.style.overflow = "";
};

const Modal = ({ onClose, dismissable = true, size = "md", busy = false, labelledBy, children }) => {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    lockScroll();
    if (ref.current && !ref.current.contains(document.activeElement)) ref.current.focus({ preventScroll: true });
    return () => {
      unlockScroll();
      if (previous && typeof previous.focus === "function" && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (!dismissable) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !e.defaultPrevented) onCloseRef.current?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismissable]);
  return (
    <div className="vt-overlay" onMouseDown={(e) => { if (dismissable && e.target === e.currentTarget) onCloseRef.current?.(); }}>
      <div ref={ref} className={`vt-modal vt-modal--${size}`} role="dialog" aria-modal="true"
           aria-labelledby={labelledBy} aria-busy={busy || undefined} tabIndex={-1}>
        {busy && <div className="vt-busybar" />}
        {children}
      </div>
    </div>
  );
};

const ModalHead = ({ id, title, sub, onClose, disabled, children }) => (
  <div className="vt-modal-head">
    <div className="vt-modal-titles">
      <h2 id={id} className="vt-modal-title">{title}</h2>
      {sub && <p className="vt-modal-sub">{sub}</p>}
    </div>
    {children}
    <button type="button" className="vt-iconbtn" onClick={() => !disabled && onClose()} aria-label="Fermer">
      <X size={18} />
    </button>
  </div>
);

const AnchoredMenu = ({ open, anchorRef, onClose, width = 200, children }) => {
  const menuRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const r = anchorRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom;
    const left = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8);
    setPos(below < 140 ? { left, bottom: window.innerHeight - r.top + 6 } : { left, top: r.bottom + 6 });
  }, [open, anchorRef, width]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      closeRef.current();
    };
    const onKey = (e) => { if (e.key === "Escape") closeRef.current(); };
    const onScroll = () => closeRef.current();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, anchorRef]);
  if (!open || !pos) return null;
  return <div ref={menuRef} className="vt-menu" role="menu" style={{ ...pos, width }}>{children}</div>;
};

const PaiementTag = ({ facture }) => {
  const key = getStatut(facture);
  const total = parseFloat(facture.montant_total) || 0;
  const ratio = key === "payee" ? 1 : total > 0 ? Math.min(1, getMontantPaye(facture) / total) : 0;
  let label = LIBELLES_STATUT[key] || LIBELLES_STATUT.en_attente;
  if (key === "partiellement_payee" && ratio > 0) label = `${label}${NBSP}${Math.round(ratio * 100)}${NBSP}%`;
  return (
    <span className="vt-pay">
      <span className="vt-pay-label" data-p={key}>{label}</span>
      <span className="vt-meter" aria-hidden="true">
        <i data-p={key} style={{ width: `${Math.round(ratio * 100)}%` }} />
      </span>
    </span>
  );
};

const RowMenu = ({ facture, onPrint, onDownload }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  return (
    <>
      <button ref={btnRef} type="button" className="vt-iconbtn" aria-haspopup="menu" aria-expanded={open}
              aria-label={`Autres actions pour ${facture.numero_facture}`} title="Imprimer / télécharger"
              onClick={() => setOpen((o) => !o)}>
        <MoreVertical size={18} />
      </button>
      <AnchoredMenu open={open} anchorRef={btnRef} onClose={() => setOpen(false)} width={200}>
        <button type="button" role="menuitem" className="vt-menu-item" onClick={() => { setOpen(false); onPrint(facture); }}>
          <Printer size={15} /><span>Imprimer…</span>
        </button>
        <button type="button" role="menuitem" className="vt-menu-item" onClick={() => { setOpen(false); onDownload(facture); }}>
          <Download size={15} /><span>Télécharger…</span>
        </button>
      </AnchoredMenu>
    </>
  );
};

// ============================================================
// PAGE
// ============================================================
const PAR_PAGE = 10;

const Factures = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem("token");
  const canManage = !!user && ["admin", "manager", "caissier"].includes(user.role);

  // Données
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState(null);
  const [magasin, setMagasin] = useState(null);
  const [stats, setStats] = useState({
    total_factures: 0, total_montant: 0, en_attente: 0, payee: 0, partiellement_payee: 0,
    en_retard: 0, annulee: 0, total_impayees: 0, montant_impaye: 0, montant_moyen: 0,
  });

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [page, setPage] = useState(1);
  const searchRef = useRef(null);
  const reqId = useRef(0);

  // Modales
  const [detail, setDetail] = useState(null);          // facture affichée
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [justePayee, setJustePayee] = useState(false);
  const [aEncaisser, setAEncaisser] = useState(null);  // facture à encaisser
  const [paiement, setPaiement] = useState({ montant: "", mode_paiement: "especes" });
  const [saving, setSaving] = useState(false);
  const [erreurPaiement, setErreurPaiement] = useState(null);
  const [formatChoice, setFormatChoice] = useState(null); // { action: 'print'|'download', data }
  const [preparing, setPreparing] = useState(null);       // id_facture en préparation d'impression

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((message, type = "info") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ============================================================
  // CHARGEMENT
  // ============================================================
  const loadFactures = useCallback(async () => {
    if (!token) return;
    const rid = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterStatut) params.statut = filterStatut;
      if (dateDebut) params.date_debut = dateDebut;
      if (dateFin) params.date_fin = dateFin;
      const res = await FactureService.getAllFactures(token, params);
      if (rid !== reqId.current) return;
      if (res.success) setFactures(res.data || []);
      else setError(res.message || "Erreur lors du chargement des factures");
    } catch (err) {
      if (rid === reqId.current) setError(err.message || "Erreur lors du chargement des factures");
    } finally {
      if (rid === reqId.current) setLoading(false);
    }
  }, [token, searchTerm, filterStatut, dateDebut, dateFin]);

  const loadStats = useCallback(async () => {
    try {
      const res = await FactureService.getStats(token);
      if (res.success && res.data) setStats((s) => ({ ...s, ...res.data }));
    } catch (err) {
      console.error("Stats factures :", err);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    loadStats();
    MagasinService.getMonMagasin(token).then((r) => { if (r.success) setMagasin(r.magasin); }).catch(() => {});
  }, [isAuthenticated, token, loadStats]);

  // Recherche et filtres : appel serveur avec un petit délai
  useEffect(() => {
    if (!isAuthenticated || !token) return undefined;
    const t = setTimeout(() => { setPage(1); loadFactures(); }, searchTerm ? 350 : 0);
    return () => clearTimeout(t);
  }, [loadFactures, isAuthenticated, token, searchTerm]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const rafraichir = () => { loadFactures(); loadStats(); };

  // ============================================================
  // DONNÉES POUR L'IMPRESSION (même format que la page Ventes)
  // ============================================================
  const versDonneesImpression = useCallback((f) => {
    const total = parseFloat(f.montant_total) || 0;
    const paye = getMontantPaye(f);
    return {
      ...f,
      montant_total: total,
      total_paye: paye,
      reste_a_payer: Math.max(0, total - paye),
      statut: getStatut(f),
      lignes: mapLignes(f.lignes),
      paiements: f.paiements || [],
      mode_paiement: f.mode_paiement || "especes",
      magasin: magasin || f.magasin || null,
      utilisateur_nom: f.utilisateur_nom || user?.fullname || user?.nom || "",
    };
  }, [magasin, user]);

  /** Charge la facture complète (lignes + paiements) si besoin. */
  const factureComplete = useCallback(async (f) => {
    if (Array.isArray(f.lignes) && f.lignes.length > 0) return f;
    const res = await FactureService.getFactureById(token, f.id_facture);
    if (!res.success || !res.data) throw new Error(res.message || "Impossible de charger la facture");
    return { ...f, ...res.data };
  }, [token]);

  const ouvrirFormat = async (action, f) => {
    setPreparing(f.id_facture);
    try {
      const complete = await factureComplete(f);
      setFormatChoice({ action, data: versDonneesImpression(complete) });
    } catch (err) {
      showToast(err.message || "Impossible de préparer la facture", "error");
    } finally {
      setPreparing(null);
    }
  };

  // ============================================================
  // DÉTAIL
  // ============================================================
  const ouvrirDetail = async (f) => {
    setJustePayee(false);
    setDetail(f);
    setLoadingDetail(true);
    try {
      const res = await FactureService.getFactureById(token, f.id_facture);
      if (res.success && res.data) setDetail((cur) => (cur && cur.id_facture === f.id_facture ? { ...f, ...res.data } : cur));
    } catch (err) {
      console.error("Détail facture :", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ============================================================
  // ENCAISSEMENT
  // ============================================================
  const preparerPaiement = (f) => {
    if (getStatut(f) === "annulee") { showToast("Impossible d'encaisser une facture annulée", "error"); return; }
    if (getResteAPayer(f) <= 0) { showToast("Cette facture est déjà soldée", "info"); return; }
    setErreurPaiement(null);
    setPaiement({ montant: "", mode_paiement: "especes" });
    setAEncaisser(f);
  };

  const encaisser = async () => {
    if (!aEncaisser || saving) return;
    const reste = getResteAPayer(aEncaisser);
    const montant = paiement.montant ? toNum(paiement.montant) : reste;
    if (!(montant > 0) || montant > reste + 0.001) {
      setErreurPaiement(`Le montant doit être supérieur à 0 et ne pas dépasser le reste à payer (${formatMontant(reste)}).`);
      return;
    }
    if (!aEncaisser.id_commande) {
      setErreurPaiement("Impossible de trouver la vente associée à cette facture.");
      return;
    }
    setSaving(true);
    setErreurPaiement(null);
    try {
      const res = await CommandeVenteService.addPaiement(token, aEncaisser.id_commande, {
        id_facture: aEncaisser.id_facture,
        date_paiement: getTodayISO(),
        montant,
        mode_paiement: paiement.mode_paiement || "especes",
        note: `Paiement pour facture ${aEncaisser.numero_facture}`,
        reference: null,
      });
      if (!res.success) throw new Error(res.message || "Erreur lors du paiement");

      // Facture à jour (lignes + paiements) pour l'affichage et l'impression
      let aJour = null;
      try {
        const r = await FactureService.getFactureById(token, aEncaisser.id_facture);
        if (r.success && r.data) aJour = { ...aEncaisser, ...r.data };
      } catch { /* on garde la version locale */ }
      if (!aJour) {
        aJour = { ...aEncaisser, paiements: [...(aEncaisser.paiements || []), { montant, mode_paiement: paiement.mode_paiement, date_paiement: getTodayISO() }] };
      }

      setAEncaisser(null);
      setJustePayee(true);
      setDetail(aJour);
      showToast(`Paiement de ${formatMontant(montant)} enregistré`, "success");
      rafraichir();
    } catch (err) {
      setErreurPaiement(err.message || "Erreur lors du paiement");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // EXPORT
  // ============================================================
  const exporter = async () => {
    try {
      const res = await FactureService.exportFactures(token);
      if (!res.success || !res.data) throw new Error(res.message || "Export impossible");
      const clean = (v) => String(v ?? "").replace(/"/g, '""');
      const entetes = ["Numéro", "Date", "Échéance", "Client", "Téléphone", "Commande", "Montant", "Payé", "Reste", "Statut", "Mode", "Notes", "Utilisateur"];
      let csv = entetes.map((h) => `"${h}"`).join(";") + "\n";
      res.data.forEach((f) => {
        csv += [f.numero, f.date, f.echeance, f.client, f.telephone, f.commande,
          Math.round(f.montant || 0), Math.round(f.paye || 0), Math.round(f.reste || 0),
          f.statut, f.mode, f.notes, f.utilisateur].map((c) => `"${clean(c)}"`).join(";") + "\n";
      });
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factures_${getTodayISO()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.message || "Erreur lors de l'exportation", "error");
    }
  };

  // ============================================================
  // DÉRIVÉS
  // ============================================================
  // factureService.getStats ne renvoie pas toujours total_impayees : on le recalcule si besoin
  const nbImpayees = stats.total_impayees
    || (stats.en_attente || 0) + (stats.partiellement_payee || 0) + (stats.en_retard || 0);
  const compteurs = useMemo(() => ({
    impayees: nbImpayees,
    en_attente: stats.en_attente,
    partiellement_payee: stats.partiellement_payee,
    en_retard: stats.en_retard,
    payee: stats.payee,
    annulee: stats.annulee,
  }), [stats, nbImpayees]);

  const totalPages = Math.max(1, Math.ceil(factures.length / PAR_PAGE));
  const pageCourante = Math.min(page, totalPages);
  const debutIdx = (pageCourante - 1) * PAR_PAGE;
  const visibles = factures.slice(debutIdx, debutIdx + PAR_PAGE);
  const filtresActifs = !!(searchTerm || filterStatut || dateDebut || dateFin);
  const peutEncaisser = (f) => canManage && getStatut(f) !== "annulee" && getResteAPayer(f) > 0;

  const resteEncaisser = aEncaisser ? getResteAPayer(aEncaisser) : 0;
  const montantSaisi = paiement.montant ? toNum(paiement.montant) || 0 : resteEncaisser;

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="ventes-container vt fac">
      {/* ---------- En-tête ---------- */}
      <header className="vt-head">
        <div>
          <h1 className="vt-title">Factures</h1>
          <p className="vt-sub">
            {stats.total_factures} facture{stats.total_factures > 1 ? "s" : ""}
            {nbImpayees > 0 && <>, dont {nbImpayees} à encaisser</>}
          </p>
        </div>
        <div className="vt-head-actions">
          <button type="button" className="vt-btn" onClick={exporter}>
            <Download size={16} /> Exporter
          </button>
          <button type="button" className="vt-btn vt-btn--icon" onClick={rafraichir} disabled={loading}
                  aria-label="Rafraîchir" title="Rafraîchir">
            <RefreshCw size={16} className={loading ? "vt-spin" : ""} />
          </button>
        </div>
      </header>

      {/* ---------- Synthèse ---------- */}
      <section className="vt-overview" aria-label="Synthèse des factures">
        <div className="vt-ca">
          <span className="vt-label">Reste à encaisser</span>
          <strong className="vt-ca-value vt-num" title={formatMontant(stats.montant_impaye)}>
            {formatMontant(stats.montant_impaye)}
          </strong>
          <span className="vt-ca-note">
            Facturé : {formatMontant(stats.total_montant)} · Panier moyen : {formatMontant(stats.montant_moyen)}
          </span>
        </div>
        <div className="vt-rail" role="group" aria-label="Filtrer par statut">
          <button type="button" className="vt-stage vt-stage--all" data-s="all" aria-pressed={filterStatut === ""}
                  onClick={() => setFilterStatut("")}>
            <span className="vt-stage-count vt-num">{stats.total_factures}</span>
            <span className="vt-stage-label">Toutes</span>
          </button>
          {STATUTS.map((s) => (
            <button key={s.value} type="button"
                    className={`vt-stage ${s.value === "annulee" ? "vt-stage--apart" : ""}`}
                    data-s={s.s} aria-pressed={filterStatut === s.value}
                    onClick={() => setFilterStatut(filterStatut === s.value ? "" : s.value)}>
              <span className="vt-stage-count vt-num">{compteurs[s.value] || 0}</span>
              <span className="vt-stage-label">{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------- Recherche + dates ---------- */}
      <div className="vt-toolbar fac-toolbar">
        <div className="vt-search">
          <input ref={searchRef} type="text" className="vt-input vt-search-input"
                 placeholder="Numéro, client, téléphone ou commande" aria-label="Rechercher une facture"
                 value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} spellCheck={false} />
          {searchTerm ? (
            <button type="button" className="vt-search-clear" onClick={() => setSearchTerm("")} aria-label="Effacer la recherche">
              <X size={14} />
            </button>
          ) : (
            <kbd className="vt-kbd">Ctrl K</kbd>
          )}
        </div>
        <div className="fac-dates">
          <input type="date" className="vt-input" value={dateDebut} max={dateFin || undefined}
                 onChange={(e) => setDateDebut(e.target.value)} aria-label="Du" title="Du" />
          <span className="vt-muted">au</span>
          <input type="date" className="vt-input" value={dateFin} min={dateDebut || undefined}
                 onChange={(e) => setDateFin(e.target.value)} aria-label="Au" title="Au" />
        </div>
        {filtresActifs && (
          <button type="button" className="vt-btn vt-btn--sm"
                  onClick={() => { setSearchTerm(""); setFilterStatut(""); setDateDebut(""); setDateFin(""); }}>
            <X size={14} /> Effacer
          </button>
        )}
        <span className="vt-count" aria-live="polite">
          {factures.length} résultat{factures.length > 1 ? "s" : ""}
        </span>
      </div>

      {error && !loading && (
        <div className="vt-error" role="alert">
          <AlertTriangle size={16} /><span>{error}</span>
          <button type="button" className="vt-btn vt-btn--sm" onClick={loadFactures}>Réessayer</button>
        </div>
      )}

      {/* ---------- Tableau ---------- */}
      <div className="vt-table-wrap" aria-busy={loading || undefined}>
        {loading && factures.length > 0 && <div className="vt-busybar" />}
        <table className="vt-table vt-table--sans-num">
          <colgroup>
            <col style={{ width: "36px" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "16%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="vt-th-index">#</th>
              <th>Facture</th>
              <th>Client</th>
              <th>Commande</th>
              <th>Échéance</th>
              <th className="vt-th-right">Montant</th>
              <th>Paiement</th>
              <th className="vt-th-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && factures.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="vt-skel-row" aria-hidden="true">
                    {[40, 70, 70, 50, 50, 60, 60, 60].map((w, j) => <td key={j}><span className="vt-skel" style={{ width: `${w}%` }} /></td>)}
                  </tr>
                ))
              : visibles.map((f, i) => {
                  const statut = getStatut(f);
                  const reste = getResteAPayer(f);
                  return (
                    <tr key={f.id_facture}>
                      <td className="vt-td-index">{debutIdx + i + 1}</td>
                      <td>
                        <button type="button" className="vt-link vt-cell-main" onClick={() => ouvrirDetail(f)}>
                          {f.numero_facture}
                        </button>
                        <div className="vt-cell-sub">{f.date_facture_formatee || formatDateFR(f.date_facture)}</div>
                      </td>
                      <td>
                        <div className="vt-cell-main" title={f.nomclient || ""}>{f.nomclient || "-"}</div>
                        <div className="vt-cell-sub">{f.telephone || "-"}</div>
                      </td>
                      <td><div className="vt-cell-main vt-cell-main--plain">{f.numero_commande || "-"}</div></td>
                      <td>
                        <div className={`vt-cell-main vt-cell-main--plain ${statut === "en_retard" ? "fac-late" : ""}`}>
                          {f.date_echeance_formatee || formatDateFR(f.date_echeance)}
                        </div>
                      </td>
                      <td className="vt-td-right">
                        <div className="vt-cell-main vt-num">{formatMontant(f.montant_total)}</div>
                        {statut !== "payee" && statut !== "annulee" && reste > 0 && reste < (parseFloat(f.montant_total) || 0) && (
                          <div className="vt-cell-sub vt-num">reste {formatMontant(reste)}</div>
                        )}
                      </td>
                      <td><PaiementTag facture={f} /></td>
                      <td className="vt-td-right">
                        <div className="vt-actions">
                          {peutEncaisser(f) && (
                            <button type="button" className="vt-btn vt-btn--sm vt-btn--cash" onClick={() => preparerPaiement(f)}>
                              <Wallet size={14} /> {statut === "partiellement_payee" ? "Compléter" : "Encaisser"}
                            </button>
                          )}
                          <button type="button" className="vt-btn vt-btn--sm" onClick={() => ouvrirDetail(f)}>Détails</button>
                          {preparing === f.id_facture
                            ? <span className="vt-iconbtn" aria-label="Préparation"><Loader size={16} className="vt-spin" /></span>
                            : <RowMenu facture={f} onPrint={(x) => ouvrirFormat("print", x)} onDownload={(x) => ouvrirFormat("download", x)} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!loading && visibles.length === 0 && (
          <div className="vt-empty">
            <FileText size={30} />
            <p className="vt-empty-title">{filtresActifs ? "Aucune facture ne correspond" : "Aucune facture"}</p>
            <p className="vt-empty-text">
              {filtresActifs ? "Modifiez la recherche, les dates ou le statut sélectionné." : "Les factures apparaissent ici dès qu'une vente est enregistrée."}
            </p>
            {filtresActifs && (
              <button type="button" className="vt-btn vt-btn--sm"
                      onClick={() => { setSearchTerm(""); setFilterStatut(""); setDateDebut(""); setDateFin(""); }}>
                Effacer les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---------- Pagination ---------- */}
      <nav className="vt-pager" aria-label="Pagination">
        <span className="vt-pager-info">
          {factures.length === 0 ? "0 facture" : `${debutIdx + 1} à ${Math.min(debutIdx + PAR_PAGE, factures.length)} sur ${factures.length}`}
        </span>
        <div className="vt-pager-ctrl">
          <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(Math.max(pageCourante - 1, 1))}
                  disabled={pageCourante === 1} aria-label="Page précédente"><ChevronLeft size={18} /></button>
          <span className="vt-pager-page">Page {pageCourante} sur {totalPages}</span>
          <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => setPage(Math.min(pageCourante + 1, totalPages))}
                  disabled={pageCourante === totalPages} aria-label="Page suivante"><ChevronRight size={18} /></button>
        </div>
      </nav>

      {/* ============================================================
          MODAL : DÉTAIL DE LA FACTURE
          ============================================================ */}
      {detail && !formatChoice && (() => {
        const total = parseFloat(detail.montant_total) || 0;
        const paye = getMontantPaye(detail);
        const reste = getResteAPayer(detail);
        const statut = getStatut(detail);
        return (
          <Modal size="lg" busy={loadingDetail} labelledBy="fac-det-title" onClose={() => setDetail(null)}>
            <ModalHead
              id="fac-det-title"
              title={`Facture ${detail.numero_facture}`}
              sub={`${detail.numero_commande ? `Commande ${detail.numero_commande} · ` : ""}du ${detail.date_facture_formatee || formatDateFR(detail.date_facture)}`}
              onClose={() => setDetail(null)}
            >
              <div className="vt-head-tags"><PaiementTag facture={detail} /></div>
            </ModalHead>

            <div className="vt-modal-body">
              {justePayee && (
                <div className="vt-paid-banner fac-banner">
                  <CheckCircle size={18} />
                  <span>
                    Paiement enregistré.{" "}
                    {statut === "payee" ? "La facture est soldée." : `Reste à payer : ${formatMontant(reste)}.`}
                    {" "}Vous pouvez imprimer le reçu.
                  </span>
                </div>
              )}

              <dl className="vt-facts">
                <div><dt>Client</dt><dd>{detail.nomclient || "-"}</dd></div>
                <div><dt>Téléphone</dt><dd>{detail.telephone || "-"}</dd></div>
                <div><dt>Date</dt><dd>{detail.date_facture_formatee || formatDateFR(detail.date_facture)}</dd></div>
                <div><dt>Échéance</dt><dd className={statut === "en_retard" ? "fac-late" : ""}>{detail.date_echeance_formatee || formatDateFR(detail.date_echeance)}</dd></div>
              </dl>

              {loadingDetail && !(detail.lignes?.length) ? (
                <div className="fac-state"><Loader size={16} className="vt-spin" /> Chargement des produits…</div>
              ) : detail.lignes?.length > 0 ? (
                <div className="vt-doc-scroll">
                  <table className="vt-doc">
                    <thead>
                      <tr>
                        <th>Produit</th>
                        <th>Unité</th>
                        <th className="vt-th-right">Qté</th>
                        <th className="vt-th-right">Prix unitaire</th>
                        <th className="vt-th-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mapLignes(detail.lignes).map((l, idx) => (
                        <tr key={idx}>
                          <td>{l.produit_nom}{l.marque_nom && <span className="vt-muted"> {l.marque_nom}</span>}</td>
                          <td>{l.nom_unite_vente}{l.quantite_base > 1 && ` (${l.quantite_base})`}</td>
                          <td className="vt-td-right vt-num">{l.quantite}</td>
                          <td className="vt-td-right vt-num">{formatMontant(l.prix_vente)}</td>
                          <td className="vt-td-right vt-num">{formatMontant(l.montant_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="vt-muted">Aucun produit sur cette facture.</p>
              )}

              <div className="vt-sums">
                <div><span>Total</span><strong className="vt-num">{formatMontant(total)}</strong></div>
                {paye > 0 && <div><span>Déjà payé</span><span className="vt-num">{formatMontant(paye)}</span></div>}
                <div className="vt-sums-due"><span>Reste à payer</span><strong className="vt-num">{formatMontant(reste)}</strong></div>
              </div>

              {detail.paiements?.length > 0 && (
                <section className="vt-det-block">
                  <h3 className="vt-section-title">Paiements</h3>
                  <div className="vt-doc-scroll">
                    <table className="vt-doc">
                      <thead>
                        <tr>
                          <th>Date</th><th>Mode</th><th>Référence</th><th>Par</th>
                          <th className="vt-th-right">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.paiements.map((p, idx) => (
                          <tr key={idx}>
                            <td>{p.date_paiement_formatee || formatDateFR(p.date_paiement)}</td>
                            <td>{modeLabel(p.mode_paiement)}</td>
                            <td>{p.reference || "-"}</td>
                            <td>{p.utilisateur_nom || "-"}</td>
                            <td className="vt-td-right vt-num">{formatMontant(p.montant)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {(detail.notes || detail.utilisateur_nom) && (
                <dl className="vt-kv fac-meta">
                  {detail.notes && <div><dt>Notes</dt><dd>{detail.notes}</dd></div>}
                  {detail.utilisateur_nom && <div><dt>Enregistrée par</dt><dd>{detail.utilisateur_nom}</dd></div>}
                </dl>
              )}
            </div>

            <div className="vt-modal-foot">
              <div className="vt-foot-actions">
                <button type="button" className="vt-btn" onClick={() => ouvrirFormat("download", detail)} disabled={preparing === detail.id_facture}>
                  <Download size={16} /> Télécharger
                </button>
                <button type="button" className={`vt-btn ${justePayee || !peutEncaisser(detail) ? "vt-btn--primary" : ""}`}
                        onClick={() => ouvrirFormat("print", detail)} disabled={preparing === detail.id_facture}>
                  {preparing === detail.id_facture ? <Loader size={16} className="vt-spin" /> : <Printer size={16} />} Imprimer
                </button>
              </div>
              <div className="vt-foot-actions">
                <button type="button" className="vt-btn" onClick={() => setDetail(null)}>Fermer</button>
                {peutEncaisser(detail) && (
                  <button type="button" className="vt-btn vt-btn--cash" onClick={() => { setDetail(null); preparerPaiement(detail); }}>
                    <Wallet size={16} /> {statut === "partiellement_payee" ? "Compléter le paiement" : "Encaisser"}
                  </button>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ============================================================
          MODAL : ENCAISSEMENT
          ============================================================ */}
      {aEncaisser && (
        <Modal size="md" busy={saving} labelledBy="fac-pay-title" dismissable={!saving} onClose={() => setAEncaisser(null)}>
          <ModalHead id="fac-pay-title" title="Encaisser un paiement" sub={`Facture ${aEncaisser.numero_facture}`}
                     onClose={() => setAEncaisser(null)} disabled={saving} />
          <div className="vt-modal-body">
            {erreurPaiement && (
              <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{erreurPaiement}</span></div>
            )}
            <div className="vt-due">
              <span className="vt-due-client"><User size={15} /> {aEncaisser.nomclient || "Client"}</span>
              <span className="vt-due-label">Reste à payer</span>
              <strong className="vt-due-amount vt-num">{formatMontant(resteEncaisser)}</strong>
              <dl className="vt-due-detail">
                <div><dt>Total facture</dt><dd className="vt-num">{formatMontant(aEncaisser.montant_total)}</dd></div>
                <div><dt>Déjà payé</dt><dd className="vt-num">{formatMontant(getMontantPaye(aEncaisser))}</dd></div>
              </dl>
            </div>

            <div className="vt-field vt-field--spaced">
              <label htmlFor="fac-montant">Montant encaissé</label>
              <div className="vt-inline">
                <input id="fac-montant" type="text" inputMode="decimal" className="vt-input vt-num"
                       placeholder={String(Math.round(resteEncaisser))} value={paiement.montant}
                       onChange={(e) => DECIMAL_RE.test(e.target.value) && setPaiement((p) => ({ ...p, montant: e.target.value }))}
                       readOnly={saving} autoComplete="off" autoFocus />
                <button type="button" className="vt-btn" onClick={() => setPaiement((p) => ({ ...p, montant: "" }))}
                        disabled={saving || !paiement.montant}>
                  Tout le solde
                </button>
              </div>
              <small className="vt-hint">Laissez vide pour encaisser la totalité du reste à payer.</small>
            </div>

            <div className="vt-field">
              <span className="vt-field-label" id="fac-mode-label">Mode de paiement</span>
              <div className="vt-modes" role="radiogroup" aria-labelledby="fac-mode-label">
                {MODES_PAIEMENT.map(({ value, label, Icon }) => (
                  <button key={value} type="button" role="radio" aria-checked={paiement.mode_paiement === value}
                          className={`vt-mode ${paiement.mode_paiement === value ? "is-active" : ""}`}
                          onClick={() => setPaiement((p) => ({ ...p, mode_paiement: value }))}>
                    <Icon size={20} /><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="vt-modal-foot vt-modal-foot--end">
            <button type="button" className="vt-btn" onClick={() => setAEncaisser(null)} disabled={saving}>Annuler</button>
            <button type="button" className="vt-btn vt-btn--cash vt-btn--lg" onClick={encaisser} disabled={saving}>
              {saving ? <Loader size={16} className="vt-spin" /> : <Wallet size={16} />}
              {saving ? "Paiement en cours" : `Encaisser ${formatMontant(montantSaisi)}`}
            </button>
          </div>
        </Modal>
      )}

      {/* ---------- Choix Ticket / Facture A4 (+ aperçu avant impression) ---------- */}
      <FormatChoiceModal
        isOpen={!!formatChoice}
        factureData={formatChoice?.data}
        action={formatChoice?.action}
        onClose={() => setFormatChoice(null)}
        onDone={(format) => {
          const quoi = format === "ticket" ? "Ticket" : "Facture A4";
          showToast(`${quoi} ${formatChoice?.action === "download" ? "téléchargé" : "imprimé"}`, "success");
          setFormatChoice(null);
        }}
      />

      {/* ---------- Toast ---------- */}
      {toast && (
        <div className="vt-toast" data-type={toast.type} role="status" aria-live="polite">
          <span className="vt-toast-bar" />
          <span className="vt-toast-msg">{toast.message}</span>
          <button type="button" className="vt-iconbtn vt-iconbtn--sm" onClick={() => setToast(null)} aria-label="Fermer">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Factures;
