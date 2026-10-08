// pages/Ventes/Ventes.jsx
import React, {
  useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback,
} from "react";
import {
  Plus, Search, Eye, ChevronLeft, ChevronRight, Download, X, Check, RefreshCw,
  Grid, List, AlertTriangle, Trash2, Wallet, Loader, ChevronDown, CreditCard,
  Building, Coins, Printer, MoreVertical, Box, FileText, ShoppingBag,
  CheckCircle, User,
} from "lucide-react";
import CommandeVenteService from "../../services/commandeVenteService";
import ProduitService from "../../services/produitService";
import UniteVenteService from "../../services/uniteVenteService";
import MagasinService from "../../services/magasinService";
import FacturePDFService from "../../services/facturePDFService";
import { useUser } from "../../context/AuthContext";
import FacturePDFActions from "../../components/Facture/FacturePDFActions";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";

import "./Ventes.css";

// ============================================================
// HELPERS
// ============================================================
const NBSP = "\u00A0";

const formatMontant = (value) => {
  if (value === undefined || value === null) return `0${NBSP}FCFA`;
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  if (isNaN(num)) return `0${NBSP}FCFA`;
  const formatted = Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${formatted}${NBSP}FCFA`;
};

const formatDateFR = (date) => {
  if (!date) return "-";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return "-";
  }
};

// Accepte "12,5" et "12.5" — retourne NaN si vide
const toNum = (v) => {
  if (v === "" || v === null || v === undefined) return NaN;
  return parseFloat(String(v).replace(",", "."));
};
const DECIMAL_RE = /^\d*[.,]?\d*$/;

// ---------- Logique de paiement centralisée ----------
const isFacturePayee = (commande) => {
  if (!commande) return false;
  if (commande.statut_facture === "payee") return true;
  const montant = parseFloat(commande.montant_total) || 0;
  const paye = parseFloat(commande.total_paye) || 0;
  return montant > 0 && paye >= montant;
};

const isFacturePartiellementPayee = (commande) => {
  if (!commande) return false;
  if (commande.statut_facture === "partiellement_payee") return true;
  const montant = parseFloat(commande.montant_total) || 0;
  const paye = parseFloat(commande.total_paye) || 0;
  return montant > 0 && paye > 0 && paye < montant;
};

const PAIEMENT_LABELS = {
  en_attente: "Non payée",
  payee: "Soldée",
  partiellement_payee: "Partielle",
  en_retard: "En retard",
  annulee: "Annulée",
};

const paiementInfo = (c) => {
  if (!c.statut_facture && !c.numero_facture && !c.id_facture) return null;
  let key = c.statut_facture || "en_attente";
  if (isFacturePayee(c)) key = "payee";
  else if (key !== "annulee" && key !== "en_retard" && isFacturePartiellementPayee(c)) {
    key = "partiellement_payee";
  }
  const montant = parseFloat(c.montant_total) || 0;
  const paye = parseFloat(c.total_paye) || 0;
  const ratio = key === "payee" ? 1 : montant > 0 ? Math.min(1, paye / montant) : 0;
  let label = PAIEMENT_LABELS[key] || PAIEMENT_LABELS.en_attente;
  if (key === "partiellement_payee" && ratio > 0) label = `${label}${NBSP}${Math.round(ratio * 100)}${NBSP}%`;
  return { key, label, ratio };
};

// ============================================================
// STATUTS DE COMMANDE
// ============================================================
const STATUTS = [
  { value: "en_attente", label: "En attente" },
  { value: "confirmee", label: "Confirmée" },
  { value: "en_preparation", label: "En préparation" },
  { value: "expediee", label: "Expédiée" },
  { value: "livree", label: "Livrée" },
  { value: "annulee", label: "Annulée" },
];

const MODES_PAIEMENT = [
  { value: "especes", label: "Espèces", Icon: Coins },
  { value: "carte", label: "Carte", Icon: CreditCard },
  { value: "virement", label: "Virement", Icon: Building },
  { value: "cheque", label: "Chèque", Icon: FileText },
];

// ============================================================
// VERROU DE SCROLL (sans décalage de mise en page)
// ============================================================
let lockDepth = 0;
const lockScroll = () => {
  if (lockDepth++ === 0) {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.dataset.vtPad = document.body.style.paddingRight || "";
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  }
};
const unlockScroll = () => {
  lockDepth = Math.max(0, lockDepth - 1);
  if (lockDepth === 0) {
    document.body.style.overflow = "";
    document.body.style.paddingRight = document.body.dataset.vtPad || "";
    delete document.body.dataset.vtPad;
  }
};

// ============================================================
// MENU ANCRÉ (position: fixed — jamais rogné, se retourne vers le haut si besoin)
// ============================================================
const AnchoredMenu = ({
  open, anchorRef, onClose, width = 200, align = "left",
  matchWidth = false, keepFocus = false, estHeight = 240, className = "", children,
}) => {
  const menuRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const gap = 6;
    const pad = 8;
    const w = matchWidth ? r.width : width;
    const below = window.innerHeight - r.bottom - gap - pad;
    const above = r.top - gap - pad;
    const flip = below < estHeight && above > below;
    let left = align === "right" ? r.right - w : r.left;
    left = Math.min(Math.max(pad, left), Math.max(pad, window.innerWidth - w - pad));
    setPos(
      flip
        ? { left, width: w, bottom: window.innerHeight - r.top + gap, maxHeight: Math.max(120, above) }
        : { left, width: w, top: r.bottom + gap, maxHeight: Math.max(120, below) }
    );
  }, [open, anchorRef, width, align, matchWidth, estHeight]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      const t = e.target;
      if (menuRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      closeRef.current();
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current(); }
    };
    const onScroll = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      closeRef.current();
    };
    const onResize = () => closeRef.current();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, anchorRef]);

  if (!open || !pos) return null;

  const style = { left: pos.left, width: pos.width, maxHeight: pos.maxHeight };
  if (pos.bottom !== undefined) style.bottom = pos.bottom; else style.top = pos.top;

  return (
    <div
      ref={menuRef}
      className={`vt-menu ${className}`}
      style={style}
      role="menu"
      onMouseDown={keepFocus ? (e) => e.preventDefault() : undefined}
    >
      {children}
    </div>
  );
};

// ============================================================
// MODAL (focus restauré, Échap, clic extérieur, scroll verrouillé)
// ============================================================
const Modal = ({ onClose, dismissable = true, size = "md", busy = false, labelledBy, children }) => {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    lockScroll();
    if (ref.current && !ref.current.contains(document.activeElement)) {
      ref.current.focus({ preventScroll: true });
    }
    return () => {
      unlockScroll();
      if (previous && typeof previous.focus === "function" && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    if (!dismissable) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) onCloseRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismissable]);

  return (
    <div
      className="vt-overlay"
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      <div
        ref={ref}
        className={`vt-modal vt-modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-busy={busy || undefined}
        tabIndex={-1}
      >
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
    <button
      type="button"
      className="vt-iconbtn"
      onClick={() => !disabled && onClose()}
      aria-label="Fermer"
    >
      <X size={18} />
    </button>
  </div>
);

// ============================================================
// PETITS COMPOSANTS
// ============================================================
const PaiementTag = ({ info }) =>
  info ? (
    <span className="vt-pay">
      <span className="vt-pay-label" data-p={info.key}>{info.label}</span>
      <span className="vt-meter" aria-hidden="true">
        <i data-p={info.key} style={{ width: `${Math.round(info.ratio * 100)}%` }} />
      </span>
    </span>
  ) : (
    <span className="vt-muted">-</span>
  );

const StatutMenu = ({ commande, onSelect, updatingStatut, canManage }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const current = STATUTS.find((s) => s.value === commande.statut) || STATUTS[0];
  const locked = commande.statut === "livree" || commande.statut === "annulee";
  const updating = updatingStatut === commande.id_commande;

  if (!canManage || locked) {
    return (
      <span
        className="vt-status"
        data-s={current.value}
        title={locked ? "Statut verrouillé" : undefined}
      >
        <i className="vt-dot" />
        {current.label}
        {locked && (
          <svg className="vt-lock" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        )}
      </span>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="vt-status vt-status--btn"
        data-s={current.value}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Changer le statut"
        onClick={() => !updating && setOpen((o) => !o)}
      >
        <i className="vt-dot" />
        <span>{current.label}</span>
        {updating ? <Loader size={12} className="vt-spin" /> : <ChevronDown size={12} className="vt-chev" />}
      </button>
      <AnchoredMenu open={open} anchorRef={btnRef} onClose={() => setOpen(false)} width={210} estHeight={260}>
        <div className="vt-menu-title">Changer le statut</div>
        {STATUTS.map((s) => {
          const isCurrent = s.value === commande.statut;
          return (
            <button
              key={s.value}
              type="button"
              role="menuitem"
              className="vt-menu-item"
              data-s={s.value}
              disabled={isCurrent}
              onClick={() => {
                onSelect(commande.id_commande, s.value);
                setOpen(false);
              }}
            >
              <i className="vt-dot" />
              <span>{s.label}</span>
              {isCurrent && <Check size={14} className="vt-menu-check" />}
            </button>
          );
        })}
      </AnchoredMenu>
    </>
  );
};

const RowMenu = ({ commande, canPrint, canDelete, onPrint, onDelete }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  if (!canPrint && !canDelete) return null;
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="vt-iconbtn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Autres actions pour ${commande.numero_commande}`}
        title="Autres actions"
        onClick={() => setOpen((o) => !o)}
      >
        <MoreVertical size={18} />
      </button>
      <AnchoredMenu open={open} anchorRef={btnRef} onClose={() => setOpen(false)} width={180} align="right" estHeight={110}>
        {canPrint && (
          <button type="button" role="menuitem" className="vt-menu-item" onClick={() => { setOpen(false); onPrint(commande); }}>
            <Printer size={15} /><span>Imprimer la facture</span>
          </button>
        )}
        {canDelete && (
          <button type="button" role="menuitem" className="vt-menu-item vt-menu-item--danger" onClick={() => { setOpen(false); onDelete(commande); }}>
            <Trash2 size={15} /><span>Supprimer</span>
          </button>
        )}
      </AnchoredMenu>
    </>
  );
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const Ventes = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem("token");

  // ---------- Données ----------
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState(null);
  const [magasin, setMagasin] = useState(null);

  // ---------- Liste ----------
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [viewMode, setViewMode] = useState("list");
  const searchRef = useRef(null);

  // ---------- Modals ----------
  const [showModal, setShowModal] = useState(false);
  const [showPaiementModal, setShowPaiementModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFactureModal, setShowFactureModal] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [commandeToDelete, setCommandeToDelete] = useState(null);
  const [commandeEnCours, setCommandeEnCours] = useState(null);
  const [factureGeneree, setFactureGeneree] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatut, setUpdatingStatut] = useState(null);

  // ---------- Toast ----------
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((message, type = "info") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // ---------- Alerte générique ----------
  const [alertModal, setAlertModal] = useState({
    isOpen: false, title: "", message: "", details: null, type: "warning",
  });
  const showAlert = (title, message, type = "warning", details = null) =>
    setAlertModal({ isOpen: true, title, message, type, details });
  const closeAlert = () => setAlertModal((prev) => ({ ...prev, isOpen: false }));

  // ---------- Formulaire de vente ----------
  const [formData, setFormData] = useState({ nomclient: "", telephone: "", lignes: [] });
  const [produitSearch, setProduitSearch] = useState("");
  const [produitSearchResults, setProduitSearchResults] = useState([]);
  const [showProduitDropdown, setShowProduitDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [quantite, setQuantite] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [adding, setAdding] = useState(false);
  const [unitesVente, setUnitesVente] = useState([]);
  const [selectedUnite, setSelectedUnite] = useState(null);
  const [loadingUnites, setLoadingUnites] = useState(false);

  const comboRef = useRef(null);
  const inputRef = useRef(null);
  const qteRef = useRef(null);
  const telRef = useRef(null);
  const searchDebounce = useRef(null);
  const searchReq = useRef(0);
  const unitReq = useRef(0);

  // ---------- Paiement ----------
  const [paiementData, setPaiementData] = useState({ mode_paiement: "especes", montant: "" });

  const canManage = !!user && ["admin", "manager", "caissier"].includes(user.role);

  // ============================================================
  // EFFETS
  // ============================================================
  useEffect(() => {
    if (isAuthenticated && token) {
      loadCommandes();
      loadProduits();
      loadMagasin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatut]);

  useEffect(() => () => {
    clearTimeout(toastTimer.current);
    clearTimeout(searchDebounce.current);
  }, []);

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

  // Focus quantité dès que l'unité est prête (au lieu d'un setTimeout fragile)
  useEffect(() => {
    if (selectedProduit && !loadingUnites && selectedUnite) {
      qteRef.current?.focus();
    }
  }, [selectedProduit, loadingUnites, selectedUnite]);

  useEffect(() => {
    if (!showProduitDropdown) return;
    document.getElementById(`vt-opt-${activeIdx}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, showProduitDropdown]);

  // ============================================================
  // CHARGEMENT
  // ============================================================
  const loadCommandes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await CommandeVenteService.getAllCommandes(token);
      if (response.success) setCommandes(response.data || []);
      else setError(response.message || "Erreur lors du chargement des commandes");
    } catch (err) {
      console.error("LoadCommandes error:", err);
      setError(err.message || "Erreur lors du chargement des commandes");
    } finally {
      setLoading(false);
    }
  };

  const loadProduits = async () => {
    try {
      await ProduitService.getAllProduits(token);
    } catch (err) {
      console.error("LoadProduits error:", err);
    }
  };

  const loadMagasin = async () => {
    try {
      const res = await MagasinService.getMonMagasin(token);
      if (res.success) setMagasin(res.magasin);
    } catch (err) {
      console.error("LoadMagasin error:", err);
    }
  };

  // ============================================================
  // FORMULAIRE DE VENTE
  // ============================================================
  const resetComposer = () => {
    searchReq.current++;
    unitReq.current++;
    clearTimeout(searchDebounce.current);
    setSelectedProduit(null);
    setSelectedUnite(null);
    setUnitesVente([]);
    setProduitSearch("");
    setQuantite("");
    setPrixVente("");
    setProduitSearchResults([]);
    setShowProduitDropdown(false);
    setIsSearching(false);
    setActiveIdx(0);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const rechercherProduits = (texte) => {
    setProduitSearch(texte);
    setSelectedProduit(null);
    setSelectedUnite(null);
    setUnitesVente([]);
    setActiveIdx(0);

    clearTimeout(searchDebounce.current);
    const rid = ++searchReq.current;

    if (texte.length < 2) {
      setProduitSearchResults([]);
      setShowProduitDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowProduitDropdown(true);

    searchDebounce.current = setTimeout(async () => {
      try {
        const response = await ProduitService.getProduitsByModele(token, texte);
        if (rid !== searchReq.current) return; // réponse périmée
        if (response.success && response.data) {
          setProduitSearchResults(
            response.data.filter((p) => (parseFloat(p.quantite_stock) || 0) > 0)
          );
        } else {
          setProduitSearchResults([]);
        }
      } catch (err) {
        console.error("Recherche produit:", err);
        if (rid === searchReq.current) setProduitSearchResults([]);
      } finally {
        if (rid === searchReq.current) setIsSearching(false);
      }
    }, 300);
  };

  const selectProduit = async (produit) => {
    const rid = ++unitReq.current;
    searchReq.current++;
    clearTimeout(searchDebounce.current);
    setIsSearching(false);
    setSelectedProduit(produit);
    setProduitSearch(produit.nom + (produit.modele_nom ? ` - ${produit.modele_nom}` : ""));
    setShowProduitDropdown(false);
    setSelectedUnite(null);
    setUnitesVente([]);
    setPrixVente("");
    setQuantite("");
    setLoadingUnites(true);

    const uniteBase = {
      id_unite_vente: null,
      nom: produit.unite_nom || produit.unite_symbole || "Unité",
      symbole: produit.unite_symbole || "",
      quantite_base: 1,
      prix_vente: produit.prix_vente || 0,
      prix_achat: produit.prix_achat || 0,
      est_principal: false,
      est_unite_base: true,
    };

    try {
      const res = await UniteVenteService.getByProduit(token, produit.id_produit);
      if (rid !== unitReq.current) return;
      const perso = res.success && res.data ? res.data : [];
      setUnitesVente([uniteBase, ...perso]);
      const principale = perso.find((u) => u.est_principal === 1 || u.est_principal === true);
      const defaut = principale || uniteBase;
      setSelectedUnite(defaut);
      setPrixVente(String(defaut.prix_vente || 0));
    } catch (err) {
      console.error("Erreur chargement unités:", err);
      if (rid !== unitReq.current) return;
      const fallback = { ...uniteBase, est_principal: true };
      setUnitesVente([fallback]);
      setSelectedUnite(fallback);
      setPrixVente(String(fallback.prix_vente || 0));
    } finally {
      if (rid === unitReq.current) setLoadingUnites(false);
    }
  };

  const handleUniteChange = (uniteId) => {
    const unite = unitesVente.find((u) => u.id_unite_vente === uniteId);
    if (unite) {
      setSelectedUnite(unite);
      setPrixVente(String(unite.prix_vente || 0));
    }
  };

  const calculerUnitesBase = () => {
    const q = toNum(quantite);
    if (!selectedUnite || isNaN(q)) return 0;
    return q * (parseFloat(selectedUnite.quantite_base) || 1);
  };

  const ajouterProduit = async () => {
    if (adding) return;

    if (!selectedProduit) {
      showAlert("Produit non sélectionné", "Veuillez sélectionner un produit avant de l'ajouter.");
      return;
    }
    if (!selectedUnite) {
      showAlert("Unité manquante", "Veuillez sélectionner une unité de vente.");
      return;
    }
    const qte = toNum(quantite);
    if (!(qte > 0)) {
      showAlert("Quantité invalide", "Veuillez saisir une quantité supérieure à 0.");
      return;
    }

    setAdding(true);
    try {
      let stockDisponible = parseFloat(selectedProduit.quantite_stock) || 0;
      try {
        const fresh = await ProduitService.getProduitById(token, selectedProduit.id_produit);
        if (fresh.success && fresh.data) stockDisponible = parseFloat(fresh.data.quantite_stock) || 0;
      } catch {
        console.warn("Impossible de rafraîchir le stock");
      }

      const qteBase = parseFloat(selectedUnite.quantite_base) || 1;
      const unitesNecessaires = qte * qteBase;

      const dejaReserve = formData.lignes
        .filter((l) => l.id_produit === selectedProduit.id_produit)
        .reduce((sum, l) => sum + (parseFloat(l.quantite_totale_base) || 0), 0);
      const stockRestant = stockDisponible - dejaReserve;

      if (unitesNecessaires > stockRestant) {
        const maxConditionnements = Math.max(0, Math.floor(stockRestant / qteBase));
        showAlert(
          "Stock insuffisant",
          `Vous demandez ${quantite} ${selectedUnite.nom}(s) = ${unitesNecessaires} unité(s) de base.`,
          "danger",
          <>
            <div className="detail-section">
              <span className="detail-label">Stock disponible</span>
              <ul>
                <li>Stock total : <strong>{stockDisponible} unité(s)</strong></li>
                <li>Déjà au panier : <strong>{dejaReserve} unité(s)</strong></li>
                <li>Restant : <strong>{stockRestant} unité(s)</strong></li>
              </ul>
            </div>
            <div className="detail-section">
              <span className="detail-label">Maximum possible</span>
              <p><strong>{maxConditionnements} {selectedUnite.nom}(s)</strong></p>
            </div>
          </>
        );
        return;
      }

      const prix = toNum(prixVente) || parseFloat(selectedUnite.prix_vente) || 0;
      if (prix <= 0) {
        showAlert("Prix non défini", "Le prix de vente de ce produit n'est pas renseigné. Veuillez saisir un prix.");
        return;
      }

      const nouvelle = {
        id_produit: selectedProduit.id_produit,
        produit_nom: selectedProduit.nom,
        modele_nom: selectedProduit.modele_nom || "",
        id_unite_vente: selectedUnite.id_unite_vente,
        nom_unite_vente: selectedUnite.nom,
        quantite_base: qteBase,
        quantite_totale_base: unitesNecessaires,
        quantite: qte,
        prix_vente: prix,
        unite: selectedUnite.nom,
        total: qte * prix,
      };

      setFormData((prev) => {
        const idx = prev.lignes.findIndex(
          (l) => l.id_produit === nouvelle.id_produit && l.id_unite_vente === nouvelle.id_unite_vente
        );
        if (idx !== -1) {
          return {
            ...prev,
            lignes: prev.lignes.map((l, i) =>
              i !== idx
                ? l
                : {
                    ...l,
                    quantite: l.quantite + qte,
                    quantite_totale_base: l.quantite_totale_base + unitesNecessaires,
                    total: (l.quantite + qte) * l.prix_vente,
                  }
            ),
          };
        }
        return { ...prev, lignes: [...prev.lignes, nouvelle] };
      });

      resetComposer();
      requestAnimationFrame(() => inputRef.current?.focus());
    } finally {
      setAdding(false);
    }
  };

  const removeLigne = (index) =>
    setFormData((prev) => ({ ...prev, lignes: prev.lignes.filter((_, i) => i !== index) }));

  const calculerTotal = () => formData.lignes.reduce((sum, l) => sum + (l.total || 0), 0);

  const onComboKeyDown = (e) => {
    const n = produitSearchResults.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showProduitDropdown && n) { setShowProduitDropdown(true); return; }
      if (n) setActiveIdx((i) => (i + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (n) setActiveIdx((i) => (i - 1 + n) % n);
    } else if (e.key === "Enter") {
      if (showProduitDropdown && produitSearchResults[activeIdx]) {
        e.preventDefault();
        selectProduit(produitSearchResults[activeIdx]);
      }
    }
  };

  const onAddKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); ajouterProduit(); }
  };

  // ============================================================
  // ACTIONS
  // ============================================================
  const handleAdd = () => {
    setFormData({ nomclient: "", telephone: "", lignes: [] });
    resetComposer();
    setCommandeEnCours(null);
    setFactureGeneree(null);
    setError(null);
    setShowModal(true);
  };

  const handleView = async (commande) => {
    setSelectedCommande(commande);
    setShowDetailModal(true);
    try {
      const res = await CommandeVenteService.getCommandeById(token, commande.id_commande);
      if (res.success && res.data) {
        setSelectedCommande((prev) =>
          prev && prev.id_commande === commande.id_commande ? { ...prev, ...res.data } : prev
        );
      }
    } catch (err) {
      console.warn("Détails complets indisponibles:", err);
    }
  };

  const handleChangeStatut = async (id, statut) => {
    if (updatingStatut === id) return;
    setUpdatingStatut(id);
    try {
      const response = await CommandeVenteService.updateStatut(token, id, statut);
      if (response.success) {
        await loadCommandes();
        const patch = (prev) => (prev && prev.id_commande === id ? { ...prev, statut } : prev);
        setSelectedCommande(patch);
        setCommandeEnCours(patch);
        const label = STATUTS.find((s) => s.value === statut)?.label || statut;
        showToast(`Statut modifié : ${label}`, "success");
      } else {
        showToast(response.message || "Erreur lors du changement", "error");
      }
    } catch (err) {
      console.error("Change statut error:", err);
      showToast(err.message || "Erreur lors du changement", "error");
    } finally {
      setUpdatingStatut(null);
    }
  };

  const handleImprimerDepuisListe = async (commande) => {
    try {
      const res = await CommandeVenteService.getCommandeById(token, commande.id_commande);
      if (!res.success) {
        showToast("Impossible de charger la facture", "error");
        return;
      }
      const result = await FacturePDFService.print({ ...res.data, magasin: magasin || null });
      if (result.fallback) showToast("Impression directe indisponible : le PDF a été ouvert ou téléchargé", "info");
      else if (result.success) showToast("Impression lancée", "success");
    } catch (err) {
      console.error("Print error:", err);
      showToast(err.message || "Erreur lors de l'impression", "error");
    }
  };

  const mapLignesFacture = (lignes) =>
    (lignes || []).map((l) => ({ ...l, unite_symbole: l.unite_symbole || l.nom_unite_vente || "" }));

  const handleFinaliserVente = async () => {
    if (!formData.nomclient.trim()) {
      showAlert("Client manquant", "Veuillez saisir le nom du client.");
      return;
    }
    if (!formData.telephone.trim()) {
      showAlert("Téléphone manquant", "Veuillez saisir le numéro de téléphone du client.");
      return;
    }
    if (formData.lignes.length === 0) {
      showAlert("Panier vide", "Veuillez ajouter au moins un produit à la vente.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        nomclient: formData.nomclient.trim(),
        telephone: formData.telephone.trim(),
        date_commande: new Date().toISOString().split("T")[0],
        notes: null,
        mode_paiement: "especes",
        date_echeance: null,
        lignes: formData.lignes.map((l) => ({
          id_produit: l.id_produit,
          id_unite_vente: l.id_unite_vente,
          nom_unite_vente: l.nom_unite_vente,
          quantite_base: l.quantite_base,
          quantite: l.quantite,
          quantite_totale_base: l.quantite_totale_base,
          prix_vente: l.prix_vente,
          remise: 0,
        })),
      };

      const commandeResponse = await CommandeVenteService.createCommande(token, data);
      if (!commandeResponse.success) {
        throw new Error(commandeResponse.message || "Erreur lors de la création");
      }
      const commande = commandeResponse.data;

      const completeRes = await CommandeVenteService.getCommandeById(token, commande.id_commande);
      if (!completeRes.success) throw new Error("Impossible de récupérer les détails");
      const c = completeRes.data;

      const facture = {
        id_facture: c.id_facture || Date.now(),
        numero_facture: c.numero_facture || `FV-${Date.now()}`,
        date_facture: c.date_facture || new Date().toISOString().split("T")[0],
        date_echeance:
          c.date_echeance ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        nomclient: c.nomclient || "Client",
        telephone: c.telephone || "",
        montant_total: parseFloat(c.montant_total) || 0,
        mode_paiement: c.mode_paiement || "especes",
        statut: c.statut_facture || "en_attente",
        notes: c.notes || `Facture pour commande ${c.numero_commande}`,
        lignes: mapLignesFacture(c.lignes),
        paiements: c.paiements || [],
        total_paye: c.total_paye || 0,
        reste_a_payer: parseFloat(c.montant_total) - (c.total_paye || 0),
        numero_commande: c.numero_commande,
        id_commande: c.id_commande,
        magasin,
      };

      setFactureGeneree(facture);
      setCommandeEnCours(commande);
      setShowModal(false);
      setShowFactureModal(true);
    } catch (err) {
      console.error("Finaliser error:", err);
      setError(err.message || "Erreur lors de la finalisation");
      showAlert("Erreur", err.message || "Erreur lors de la finalisation de la vente.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const handlePayer = async () => {
    if (!commandeEnCours || !factureGeneree) {
      showAlert("Aucune facture", "Aucune facture à payer.");
      return;
    }

    const resteAPayer =
      factureGeneree.reste_a_payer !== undefined
        ? factureGeneree.reste_a_payer
        : factureGeneree.montant_total;

    if (resteAPayer <= 0) {
      showAlert("Facture déjà payée", "Cette facture est déjà totalement payée.", "success");
      setShowPaiementModal(false);
      return;
    }

    const montant = paiementData.montant ? toNum(paiementData.montant) : resteAPayer;
    if (!(montant > 0) || montant > resteAPayer + 0.001) {
      showAlert(
        "Montant invalide",
        `Le montant doit être supérieur à 0 et ne pas dépasser le reste à payer (${formatMontant(resteAPayer)}).`
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const paiementResponse = await CommandeVenteService.addPaiement(
        token,
        commandeEnCours.id_commande,
        {
          id_facture: factureGeneree.id_facture,
          date_paiement: new Date().toISOString().split("T")[0],
          montant,
          mode_paiement: paiementData.mode_paiement || "especes",
          note: `Paiement pour facture ${factureGeneree.numero_facture}`,
          reference: null,
        }
      );
      if (!paiementResponse.success) {
        throw new Error(paiementResponse.message || "Erreur lors du paiement");
      }

      const completeRes = await CommandeVenteService.getCommandeById(token, commandeEnCours.id_commande);

      let nouveauTotalPaye = 0;
      let nouveauStatutFacture = "en_attente";
      let nouveauReste = 0;

      if (completeRes.success) {
        const d = completeRes.data;
        nouveauTotalPaye = d.total_paye || 0;
        const nouveauMontantTotal = parseFloat(d.montant_total) || 0;
        nouveauStatutFacture = d.statut_facture || "en_attente";
        nouveauReste = nouveauMontantTotal - nouveauTotalPaye;

        setFactureGeneree((prev) => ({
          ...prev,
          statut: nouveauStatutFacture,
          total_paye: nouveauTotalPaye,
          reste_a_payer: nouveauReste,
          paiements: d.paiements || [],
          lignes: mapLignesFacture(d.lignes),
          magasin,
        }));
      }

      await loadCommandes();

      if (nouveauStatutFacture === "payee" || nouveauReste <= 0) {
        setShowPaiementModal(false);
        setCommandeEnCours(null);
        setPaiementData({ mode_paiement: "especes", montant: "" });
        setShowFactureModal(true);
        showToast("Facture totalement payée", "success");
      } else {
        setPaiementData((p) => ({ ...p, montant: "" }));
        showToast(`Paiement partiel enregistré. Reste : ${formatMontant(nouveauReste)}`, "success");
      }
    } catch (err) {
      console.error("Payer error:", err);
      setError(err.message || "Erreur lors du paiement");
      showToast(err.message || "Erreur lors du paiement", "error");
    } finally {
      setSaving(false);
    }
  };

  const preparerPaiement = async (commande) => {
    if (!commande?.id_commande) {
      showAlert("Commande invalide", "Impossible de préparer le paiement pour cette commande.", "danger");
      return;
    }
    try {
      const fullResponse = await CommandeVenteService.getCommandeById(token, commande.id_commande);
      if (!fullResponse.success) throw new Error("Commande non trouvée");
      const c = fullResponse.data;

      if (!c.id_facture) {
        showAlert("Facture manquante", "Aucune facture n'est associée à cette commande.");
        return;
      }

      const montantTotal = parseFloat(c.montant_total) || 0;
      const totalPaye = parseFloat(c.total_paye) || 0;
      const reste = montantTotal - totalPaye;

      if (reste <= 0) {
        showAlert("Facture déjà payée", "Cette facture est déjà totalement payée.", "success");
        return;
      }

      setCommandeEnCours(c);
      setFactureGeneree({
        id_facture: c.id_facture,
        numero_facture: c.numero_facture,
        date_facture: c.date_facture,
        date_echeance: c.date_echeance,
        nomclient: c.nomclient,
        telephone: c.telephone,
        montant_total: montantTotal,
        statut: c.statut_facture || "en_attente",
        lignes: mapLignesFacture(c.lignes),
        paiements: c.paiements || [],
        total_paye: totalPaye,
        reste_a_payer: reste,
        numero_commande: c.numero_commande,
        id_commande: c.id_commande,
        mode_paiement: c.mode_paiement || "especes",
        magasin,
      });
      setPaiementData({ mode_paiement: "especes", montant: "" });
      setShowPaiementModal(true);
      setShowDetailModal(false);
    } catch (err) {
      console.error("preparerPaiement:", err);
      showAlert("Erreur", err.message || "Erreur lors de la préparation du paiement.", "danger");
    }
  };

  const confirmDelete = (commande) => {
    setCommandeToDelete(commande);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!commandeToDelete) return;
    setDeleting(true);
    try {
      const response = await CommandeVenteService.deleteCommande(token, commandeToDelete.id_commande);
      if (response.success) {
        await loadCommandes();
        setShowDeleteModal(false);
        setCommandeToDelete(null);
        showToast("Commande supprimée", "success");
      } else {
        showToast(response.message || "Erreur suppression", "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      showToast(err.message || "Erreur suppression", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await CommandeVenteService.exportCommandes(token);
      if (response.success && response.data) {
        const clean = (v) => String(v ?? "").replace(/\u00A0/g, " ").replace(/"/g, '""');
        const headers = ["ID", "Numéro", "Date", "Client", "Téléphone", "Facture", "Montant", "Statut", "Notes"];
        const rows = response.data.map((c) => [
          c.id, c.numero, c.date, c.client || "-", c.telephone || "-",
          c.facture || "-", formatMontant(c.montant), c.statut, c.notes || "",
        ]);
        let csv = headers.join(",") + "\n";
        rows.forEach((row) => { csv += row.map((cell) => `"${clean(cell)}"`).join(",") + "\n"; });

        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ventes_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export error:", err);
      showAlert("Erreur d'exportation", "Une erreur est survenue lors de l'exportation des données.", "danger");
    }
  };

  // ============================================================
  // DONNÉES DÉRIVÉES
  // ============================================================
  const canPay = (c) =>
    canManage && c.statut !== "livree" && c.statut !== "annulee" && !isFacturePayee(c);

  const stats = useMemo(() => {
    const par = {};
    STATUTS.forEach((s) => { par[s.value] = 0; });
    let totalCA = 0;
    let aEncaisser = 0;
    commandes.forEach((c) => {
      if (par[c.statut] !== undefined) par[c.statut]++;
      if (c.statut !== "annulee") {
        const m = parseFloat(c.montant_total);
        if (!isNaN(m)) totalCA += m;
        if (!isFacturePayee(c)) aEncaisser++;
      }
    });
    return { total: commandes.length, par, totalCA, aEncaisser };
  }, [commandes]);

  const filteredCommandes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return commandes.filter((c) => {
      const matchSearch =
        !q ||
        [c.numero_commande, c.nomclient, c.telephone, c.numero_facture, c.notes].some((f) =>
          f?.toLowerCase().includes(q)
        );
      const matchStatut = filterStatut ? c.statut === filterStatut : true;
      return matchSearch && matchStatut;
    });
  }, [commandes, searchTerm, filterStatut]);

  const totalPages = Math.max(1, Math.ceil(filteredCommandes.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const startIdx = (page - 1) * itemsPerPage;
  const currentItems = filteredCommandes.slice(startIdx, startIdx + itemsPerPage);

  const composerReady = !!selectedProduit && !!selectedUnite && !loadingUnites;
  const manques = [];
  if (!formData.nomclient.trim()) manques.push("le nom du client");
  if (!formData.telephone.trim()) manques.push("le téléphone");
  if (formData.lignes.length === 0) manques.push("au moins un produit");

  const factureReste = factureGeneree
    ? factureGeneree.reste_a_payer !== undefined
      ? parseFloat(factureGeneree.reste_a_payer)
      : parseFloat(factureGeneree.montant_total) || 0
    : 0;
  const factureEstPayee = factureGeneree ? factureGeneree.statut === "payee" || factureReste <= 0 : false;

  // ============================================================
  // RENDUS PARTIELS
  // ============================================================
  const renderActions = (commande) => (
    <div className="vt-actions">
      {canPay(commande) && (
        <button type="button" className="vt-btn vt-btn--sm vt-btn--cash" onClick={() => preparerPaiement(commande)}>
          <Wallet size={14} />
          {isFacturePartiellementPayee(commande) ? "Compléter" : "Encaisser"}
        </button>
      )}
      <button
        type="button"
        className="vt-iconbtn"
        onClick={() => handleView(commande)}
        aria-label={`Voir ${commande.numero_commande}`}
        title="Voir le détail"
      >
        <Eye size={17} />
      </button>
      <RowMenu
        commande={commande}
        canPrint={!!commande.id_facture}
        canDelete={canManage}
        onPrint={handleImprimerDepuisListe}
        onDelete={confirmDelete}
      />
    </div>
  );

  const renderSkeleton = () =>
    Array.from({ length: itemsPerPage }).map((_, i) => (
      <tr key={`sk-${i}`} className="vt-skel-row" aria-hidden="true">
        {[60, 70, 50, 55, 65, 50, 60].map((w, j) => (
          <td key={j}><span className="vt-skel" style={{ width: `${w}%` }} /></td>
        ))}
      </tr>
    ));

  const renderEmpty = () => (
    <div className="vt-empty">
      <ShoppingBag size={30} />
      <p className="vt-empty-title">
        {commandes.length === 0 ? "Aucune vente enregistrée" : "Aucune commande ne correspond"}
      </p>
      <p className="vt-empty-text">
        {commandes.length === 0
          ? canManage ? "Créez la première vente pour la voir apparaître ici." : "Les ventes apparaîtront ici dès qu'elles seront créées."
          : "Modifiez la recherche ou le statut sélectionné."}
      </p>
      {commandes.length > 0 && (
        <button
          type="button"
          className="vt-btn vt-btn--sm"
          onClick={() => { setSearchTerm(""); setFilterStatut(""); }}
        >
          Effacer les filtres
        </button>
      )}
    </div>
  );

  const renderListView = () => (
    <div className="vt-table-wrap" aria-busy={loading || undefined}>
      {loading && commandes.length > 0 && <div className="vt-busybar" />}
      <table className="vt-table">
        <colgroup>
          <col style={{ width: "13%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "18%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Commande</th>
            <th>Client</th>
            <th>Facture</th>
            <th className="vt-th-right">Montant</th>
            <th>Statut</th>
            <th>Paiement</th>
            <th className="vt-th-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && commandes.length === 0
            ? renderSkeleton()
            : currentItems.map((commande) => (
                <tr key={commande.id_commande}>
                  <td>
                    <button type="button" className="vt-link vt-cell-main" onClick={() => handleView(commande)}>
                      {commande.numero_commande}
                    </button>
                    <div className="vt-cell-sub">{formatDateFR(commande.date_commande)}</div>
                  </td>
                  <td>
                    <div className="vt-cell-main" title={commande.nomclient || ""}>{commande.nomclient || "-"}</div>
                    <div className="vt-cell-sub">{commande.telephone || "-"}</div>
                  </td>
                  <td>
                    <div className="vt-cell-main vt-cell-main--plain">{commande.numero_facture || "-"}</div>
                  </td>
                  <td className="vt-td-right">
                    <div className="vt-cell-main vt-num">{formatMontant(commande.montant_total)}</div>
                  </td>
                  <td>
                    <StatutMenu
                      commande={commande}
                      onSelect={handleChangeStatut}
                      updatingStatut={updatingStatut}
                      canManage={canManage}
                    />
                  </td>
                  <td><PaiementTag info={paiementInfo(commande)} /></td>
                  <td className="vt-td-right">{renderActions(commande)}</td>
                </tr>
              ))}
        </tbody>
      </table>
      {!loading && currentItems.length === 0 && renderEmpty()}
    </div>
  );

  const renderGridView = () => (
    <div className="vt-tickets" aria-busy={loading || undefined}>
      {loading && commandes.length > 0 && <div className="vt-busybar" />}
      {!loading && currentItems.length === 0 && renderEmpty()}
      {currentItems.map((commande) => (
        <article key={commande.id_commande} className="vt-ticket">
          <header className="vt-ticket-head">
            <button type="button" className="vt-link" onClick={() => handleView(commande)}>
              {commande.numero_commande}
            </button>
            <span className="vt-cell-sub">{formatDateFR(commande.date_commande)}</span>
          </header>
          <div className="vt-ticket-client">
            <User size={15} />
            <div>
              <div className="vt-cell-main">{commande.nomclient || "Client inconnu"}</div>
              <div className="vt-cell-sub">{commande.telephone || "-"}</div>
            </div>
          </div>
          <div className="vt-ticket-sep" />
          <div className="vt-ticket-amount vt-num">{formatMontant(commande.montant_total)}</div>
          <div className="vt-cell-sub">{commande.numero_facture ? `Facture ${commande.numero_facture}` : "Facture non générée"}</div>
          <div className="vt-ticket-tags">
            <StatutMenu
              commande={commande}
              onSelect={handleChangeStatut}
              updatingStatut={updatingStatut}
              canManage={canManage}
            />
            <PaiementTag info={paiementInfo(commande)} />
          </div>
          <footer className="vt-ticket-foot">{renderActions(commande)}</footer>
        </article>
      ))}
    </div>
  );

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="ventes-container vt">
      {/* ---------- En-tête ---------- */}
      <header className="vt-head">
        <div>
          <h1 className="vt-title">Ventes</h1>
          <p className="vt-sub">
            {stats.total} commande{stats.total > 1 ? "s" : ""}, dont {stats.aEncaisser} à encaisser
          </p>
        </div>
        <div className="vt-head-actions">
          <button type="button" className="vt-btn" onClick={handleExport}>
            <Download size={16} /> Exporter
          </button>
          <button
            type="button"
            className="vt-btn vt-btn--icon"
            onClick={loadCommandes}
            disabled={loading}
            aria-label="Rafraîchir"
            title="Rafraîchir"
          >
            <RefreshCw size={16} className={loading ? "vt-spin" : ""} />
          </button>
          {canManage && (
            <button type="button" className="vt-btn vt-btn--primary" onClick={handleAdd}>
              <Plus size={16} /> Nouvelle vente
            </button>
          )}
        </div>
      </header>

      {/* ---------- Chiffre d'affaires + parcours des commandes ---------- */}
      <section className="vt-overview" aria-label="Synthèse des ventes">
        <div className="vt-ca">
          <span className="vt-label">Chiffre d'affaires</span>
          <strong className="vt-ca-value vt-num" title={formatMontant(stats.totalCA)}>
            {formatMontant(stats.totalCA)}
          </strong>
          <span className="vt-ca-note">Commandes annulées exclues</span>
        </div>

        <div className="vt-rail" role="group" aria-label="Filtrer par statut">
          <button
            type="button"
            className="vt-stage vt-stage--all"
            data-s="all"
            aria-pressed={filterStatut === ""}
            onClick={() => setFilterStatut("")}
          >
            <span className="vt-stage-count vt-num">{stats.total}</span>
            <span className="vt-stage-label">Toutes</span>
          </button>
          {STATUTS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`vt-stage ${s.value === "annulee" ? "vt-stage--apart" : ""}`}
              data-s={s.value}
              aria-pressed={filterStatut === s.value}
              onClick={() => setFilterStatut(filterStatut === s.value ? "" : s.value)}
            >
              <span className="vt-stage-count vt-num">{stats.par[s.value]}</span>
              <span className="vt-stage-label">{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------- Recherche ---------- */}
      <div className="vt-toolbar">
        <div className="vt-search">
          <Search size={16} className="vt-search-icon" />
          <input
            ref={searchRef}
            type="text"
            className="vt-input vt-search-input"
            placeholder="Numéro, client, téléphone, facture ou notes"
            aria-label="Rechercher une commande"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            spellCheck={false}
          />
          {searchTerm ? (
            <button type="button" className="vt-search-clear" onClick={() => setSearchTerm("")} aria-label="Effacer la recherche">
              <X size={14} />
            </button>
          ) : (
            <kbd className="vt-kbd">Ctrl K</kbd>
          )}
        </div>
        <span className="vt-count" aria-live="polite">
          {filteredCommandes.length} résultat{filteredCommandes.length > 1 ? "s" : ""}
        </span>
        <div className="vt-seg" role="group" aria-label="Mode d'affichage">
          <button type="button" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")} title="Liste" aria-label="Affichage en liste">
            <List size={16} />
          </button>
          <button type="button" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")} title="Tickets" aria-label="Affichage en tickets">
            <Grid size={16} />
          </button>
        </div>
      </div>

      {/* ---------- Erreur ---------- */}
      {error && !loading && !showModal && (
        <div className="vt-error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button type="button" className="vt-btn vt-btn--sm" onClick={loadCommandes}>Réessayer</button>
        </div>
      )}

      {/* ---------- Contenu ---------- */}
      {viewMode === "grid" ? renderGridView() : renderListView()}

      {/* ---------- Pagination ---------- */}
      <nav className="vt-pager" aria-label="Pagination">
        <span className="vt-pager-info">
          {filteredCommandes.length === 0
            ? "0 commande"
            : `${startIdx + 1} à ${Math.min(startIdx + itemsPerPage, filteredCommandes.length)} sur ${filteredCommandes.length}`}
        </span>
        <div className="vt-pager-ctrl">
          <button
            type="button"
            className="vt-iconbtn vt-iconbtn--boxed"
            onClick={() => setCurrentPage(Math.max(page - 1, 1))}
            disabled={page === 1}
            aria-label="Page précédente"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="vt-pager-page">Page {page} sur {totalPages}</span>
          <button
            type="button"
            className="vt-iconbtn vt-iconbtn--boxed"
            onClick={() => setCurrentPage(Math.min(page + 1, totalPages))}
            disabled={page === totalPages}
            aria-label="Page suivante"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </nav>

      {/* ============================================================
          MODAL : NOUVELLE VENTE
          ============================================================ */}
      {showModal && (
        <Modal
          size="sale"
          busy={saving}
          labelledBy="vt-sale-title"
          dismissable={!saving && !alertModal.isOpen && formData.lignes.length === 0}
          onClose={() => setShowModal(false)}
        >
          <ModalHead
            id="vt-sale-title"
            title="Nouvelle vente"
            sub="Le ticket se remplit à droite au fur et à mesure"
            onClose={() => setShowModal(false)}
            disabled={saving}
          />

          <div className="vt-sale">
            <div className="vt-sale-main">
              {error && (
                <div className="vt-error" role="alert">
                  <AlertTriangle size={16} /><span>{error}</span>
                </div>
              )}

              <section className="vt-section">
                <h3 className="vt-section-title">Client</h3>
                <div className="vt-grid-2">
                  <div className="vt-field">
                    <label htmlFor="vt-nom">Nom du client</label>
                    <input
                      id="vt-nom"
                      type="text"
                      name="nomclient"
                      className="vt-input"
                      value={formData.nomclient}
                      onChange={handleInputChange}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); telRef.current?.focus(); } }}
                      placeholder="Koné Mondésir"
                      readOnly={saving}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <div className="vt-field">
                    <label htmlFor="vt-tel">Téléphone</label>
                    <input
                      id="vt-tel"
                      ref={telRef}
                      type="tel"
                      inputMode="tel"
                      name="telephone"
                      className="vt-input"
                      value={formData.telephone}
                      onChange={handleInputChange}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); inputRef.current?.focus(); } }}
                      placeholder="+225 07 00 00 00 00"
                      readOnly={saving}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </section>

              <section className="vt-section">
                <h3 className="vt-section-title">Produit</h3>

                <div className="vt-combo" ref={comboRef}>
                  <Search size={16} className="vt-combo-icon" />
                  <input
                    ref={inputRef}
                    type="text"
                    name="produit_search"
                    className="vt-input vt-combo-input"
                    role="combobox"
                    aria-expanded={showProduitDropdown}
                    aria-controls="vt-listbox"
                    aria-autocomplete="list"
                    placeholder="Rechercher par nom, modèle ou marque"
                    value={produitSearch}
                    onChange={(e) => rechercherProduits(e.target.value)}
                    onFocus={() => {
                      if (produitSearch.length >= 2 && !selectedProduit) setShowProduitDropdown(true);
                    }}
                    onKeyDown={onComboKeyDown}
                    readOnly={saving}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <span className="vt-combo-end">
                    {isSearching ? <Loader size={15} className="vt-spin" /> : <ChevronDown size={16} />}
                  </span>
                </div>

                <AnchoredMenu
                  open={showProduitDropdown}
                  anchorRef={comboRef}
                  onClose={() => setShowProduitDropdown(false)}
                  matchWidth
                  keepFocus
                  estHeight={280}
                  className="vt-menu--list"
                >
                  <div id="vt-listbox" role="listbox">
                    {isSearching && produitSearchResults.length === 0 ? (
                      <div className="vt-menu-note"><Loader size={15} className="vt-spin" /> Recherche en cours</div>
                    ) : produitSearchResults.length === 0 ? (
                      <div className="vt-menu-note">Aucun produit en stock pour cette recherche</div>
                    ) : (
                      produitSearchResults.map((p, i) => (
                        <button
                          key={p.id_produit}
                          id={`vt-opt-${i}`}
                          type="button"
                          role="option"
                          aria-selected={i === activeIdx}
                          className={`vt-option ${i === activeIdx ? "is-active" : ""}`}
                          onMouseEnter={() => setActiveIdx(i)}
                          onClick={() => selectProduit(p)}
                        >
                          <span className="vt-option-main">
                            <span className="vt-option-name">{p.nom}</span>
                            {p.modele_nom && <span className="vt-option-sub">{p.modele_nom}</span>}
                          </span>
                          <span className="vt-option-stock">{p.quantite_stock} en stock</span>
                          <span className="vt-option-price vt-num">{formatMontant(p.prix_vente)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </AnchoredMenu>

                <div className={`vt-picked ${selectedProduit ? "is-set" : ""}`}>
                  {selectedProduit ? (
                    <>
                      <Check size={16} />
                      <div className="vt-picked-name">
                        <strong>{selectedProduit.nom}</strong>
                        {selectedProduit.modele_nom && <span>{selectedProduit.modele_nom}</span>}
                      </div>
                      <span className="vt-picked-stock">{selectedProduit.quantite_stock} en stock</span>
                      <button
                        type="button"
                        className="vt-iconbtn vt-iconbtn--sm"
                        onClick={() => { resetComposer(); inputRef.current?.focus(); }}
                        aria-label="Changer de produit"
                        title="Changer de produit"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <span className="vt-muted">Aucun produit sélectionné</span>
                  )}
                </div>

                <div className="vt-units" role="radiogroup" aria-label="Unité de vente">
                  {!selectedProduit ? (
                    <p className="vt-units-note">Les unités de vente du produit apparaîtront ici.</p>
                  ) : loadingUnites ? (
                    <>
                      <span className="vt-unit vt-unit--skel" />
                      <span className="vt-unit vt-unit--skel" />
                    </>
                  ) : unitesVente.length === 0 ? (
                    <p className="vt-units-note vt-units-note--warn">
                      <AlertTriangle size={14} /> Aucune unité de vente disponible
                    </p>
                  ) : (
                    unitesVente.map((unite, idx) => (
                      <button
                        key={unite.id_unite_vente ?? `base-${idx}`}
                        type="button"
                        role="radio"
                        aria-checked={selectedUnite?.id_unite_vente === unite.id_unite_vente}
                        className={`vt-unit ${selectedUnite?.id_unite_vente === unite.id_unite_vente ? "is-active" : ""}`}
                        onClick={() => handleUniteChange(unite.id_unite_vente)}
                      >
                        <Box size={15} />
                        <span className="vt-unit-text">
                          <span className="vt-unit-name">
                            {unite.nom}
                            {unite.est_unite_base && <small>base</small>}
                          </span>
                          <span className="vt-unit-price vt-num">{formatMontant(unite.prix_vente)}</span>
                          {unite.quantite_base > 1 && (
                            <span className="vt-unit-base">{unite.quantite_base} unités de base</span>
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <div className="vt-add">
                  <div className="vt-field">
                    <label htmlFor="vt-qte">Quantité</label>
                    <input
                      id="vt-qte"
                      ref={qteRef}
                      type="text"
                      inputMode="decimal"
                      name="quantite_ajout"
                      className="vt-input vt-num"
                      placeholder="0"
                      value={quantite}
                      readOnly={!composerReady}
                      tabIndex={composerReady ? 0 : -1}
                      onChange={(e) => DECIMAL_RE.test(e.target.value) && setQuantite(e.target.value)}
                      onKeyDown={onAddKeyDown}
                      autoComplete="off"
                    />
                  </div>
                  <div className="vt-field">
                    <label htmlFor="vt-prix">Prix de vente{selectedUnite ? `, ${selectedUnite.nom}` : ""}</label>
                    <input
                      id="vt-prix"
                      type="text"
                      inputMode="decimal"
                      className="vt-input vt-num"
                      placeholder="Automatique"
                      value={prixVente}
                      readOnly={!composerReady}
                      tabIndex={composerReady ? 0 : -1}
                      onChange={(e) => DECIMAL_RE.test(e.target.value) && setPrixVente(e.target.value)}
                      onKeyDown={onAddKeyDown}
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="button"
                    className="vt-btn vt-btn--primary vt-add-btn"
                    onClick={ajouterProduit}
                    disabled={!composerReady || !quantite || adding}
                  >
                    {adding ? <Loader size={16} className="vt-spin" /> : <Plus size={16} />}
                    Ajouter
                  </button>
                </div>

                <p className="vt-add-hint" aria-live="polite">
                  {composerReady && quantite && !isNaN(toNum(quantite)) && !isNaN(toNum(prixVente))
                    ? `Sous-total ${formatMontant(toNum(quantite) * toNum(prixVente))}${
                        selectedUnite.quantite_base > 1 ? `, soit ${calculerUnitesBase()} unité(s) de base` : ""
                      }`
                    : "\u00A0"}
                </p>
              </section>
            </div>

            {/* ---------- Ticket ---------- */}
            <aside className="vt-receipt" aria-label="Ticket de la vente">
              <div className="vt-receipt-head">
                <span>TICKET DE VENTE</span>
                <span>{formData.lignes.length} ligne{formData.lignes.length > 1 ? "s" : ""}</span>
              </div>
              <dl className="vt-receipt-client">
                <div><dt>Client</dt><dd>{formData.nomclient || "-"}</dd></div>
                <div><dt>Tél.</dt><dd>{formData.telephone || "-"}</dd></div>
              </dl>

              <ul className="vt-receipt-lines">
                {formData.lignes.length === 0 ? (
                  <li className="vt-receipt-empty">Le ticket est vide.<br />Ajoutez un produit pour commencer.</li>
                ) : (
                  formData.lignes.map((l, i) => (
                    <li key={`${l.id_produit}-${l.id_unite_vente ?? "base"}`} className="vt-rl">
                      <div className="vt-rl-main">
                        <span className="vt-rl-name">
                          {l.produit_nom}{l.modele_nom ? ` ${l.modele_nom}` : ""}
                        </span>
                        <span className="vt-rl-meta">
                          {l.quantite} {l.nom_unite_vente}
                          {l.quantite_base > 1 ? ` (${l.quantite_base})` : ""} x {formatMontant(l.prix_vente)}
                        </span>
                      </div>
                      <span className="vt-rl-total">{formatMontant(l.total)}</span>
                      <button
                        type="button"
                        className="vt-rl-remove"
                        onClick={() => removeLigne(i)}
                        aria-label={`Retirer ${l.produit_nom}`}
                        title="Retirer"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div className="vt-receipt-total">
                <span>TOTAL</span>
                <strong>{formatMontant(calculerTotal())}</strong>
              </div>
            </aside>
          </div>

          <div className="vt-modal-foot">
            <p className="vt-foot-hint" aria-live="polite">
              {manques.length > 0 ? `Il manque ${manques.join(", ")}.` : "La vente est prête à être facturée."}
            </p>
            <div className="vt-foot-actions">
              <button type="button" className="vt-btn" onClick={() => setShowModal(false)} disabled={saving}>
                Annuler
              </button>
              <button
                type="button"
                className="vt-btn vt-btn--primary"
                onClick={handleFinaliserVente}
                disabled={saving || manques.length > 0}
              >
                {saving ? <Loader size={16} className="vt-spin" /> : <Check size={16} />}
                {saving ? "Enregistrement" : "Générer la facture"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL : PAIEMENT
          ============================================================ */}
      {showPaiementModal && commandeEnCours && factureGeneree && (
        <Modal
          size="sm"
          busy={saving}
          labelledBy="vt-pay-title"
          dismissable={!saving && !alertModal.isOpen}
          onClose={() => setShowPaiementModal(false)}
        >
          <ModalHead
            id="vt-pay-title"
            title="Encaisser la facture"
            sub={`Facture ${factureGeneree.numero_facture}, commande ${commandeEnCours.numero_commande}`}
            onClose={() => setShowPaiementModal(false)}
            disabled={saving}
          />
          <div className="vt-modal-body">
            {error && (
              <div className="vt-error" role="alert">
                <AlertTriangle size={16} /><span>{error}</span>
              </div>
            )}

            <div className="vt-due">
              <span className="vt-due-client"><User size={15} /> {commandeEnCours.nomclient || "Client"}</span>
              <span className="vt-due-label">Reste à payer</span>
              <strong className="vt-due-amount vt-num">{formatMontant(factureReste)}</strong>
              <dl className="vt-due-detail">
                <div><dt>Total facture</dt><dd className="vt-num">{formatMontant(factureGeneree.montant_total)}</dd></div>
                <div><dt>Déjà payé</dt><dd className="vt-num">{formatMontant(factureGeneree.total_paye || 0)}</dd></div>
              </dl>
            </div>

            <div className="vt-field vt-field--spaced">
              <label htmlFor="vt-montant">Montant encaissé</label>
              <div className="vt-inline">
                <input
                  id="vt-montant"
                  type="text"
                  inputMode="decimal"
                  className="vt-input vt-num"
                  placeholder={String(Math.round(factureReste))}
                  value={paiementData.montant}
                  onChange={(e) =>
                    DECIMAL_RE.test(e.target.value) &&
                    setPaiementData((p) => ({ ...p, montant: e.target.value }))
                  }
                  readOnly={saving}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="vt-btn"
                  onClick={() => setPaiementData((p) => ({ ...p, montant: "" }))}
                  disabled={saving || !paiementData.montant}
                >
                  Tout le solde
                </button>
              </div>
              <small className="vt-hint">Laissez vide pour encaisser la totalité du reste à payer.</small>
            </div>

            <div className="vt-field">
              <span className="vt-field-label" id="vt-mode-label">Mode de paiement</span>
              <div className="vt-modes" role="radiogroup" aria-labelledby="vt-mode-label">
                {MODES_PAIEMENT.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={paiementData.mode_paiement === value}
                    className={`vt-mode ${paiementData.mode_paiement === value ? "is-active" : ""}`}
                    onClick={() => setPaiementData((p) => ({ ...p, mode_paiement: value }))}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="vt-modal-foot vt-modal-foot--end">
            <button
              type="button"
              className="vt-btn"
              onClick={() => { setShowPaiementModal(false); setCommandeEnCours(null); }}
              disabled={saving}
            >
              Annuler
            </button>
            <button type="button" className="vt-btn vt-btn--cash vt-btn--lg" onClick={handlePayer} disabled={saving}>
              {saving ? <Loader size={16} className="vt-spin" /> : <Wallet size={16} />}
              {saving
                ? "Paiement en cours"
                : `Encaisser ${formatMontant(paiementData.montant ? toNum(paiementData.montant) || 0 : factureReste)}`}
            </button>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL : FACTURE
          ============================================================ */}
      {showFactureModal && factureGeneree && (
        <Modal
          size="lg"
          labelledBy="vt-fac-title"
          dismissable={!alertModal.isOpen}
          onClose={() => setShowFactureModal(false)}
        >
          <ModalHead
            id="vt-fac-title"
            title={`Facture ${factureGeneree.numero_facture}`}
            sub={`Commande ${factureGeneree.numero_commande}`}
            onClose={() => setShowFactureModal(false)}
          >
            <PaiementTag
              info={{
                key: factureEstPayee ? "payee" : factureGeneree.statut === "partiellement_payee" ? "partiellement_payee" : "en_attente",
                label: factureEstPayee ? "Soldée" : factureGeneree.statut === "partiellement_payee" ? "Partielle" : "Non payée",
                ratio: factureEstPayee
                  ? 1
                  : factureGeneree.montant_total > 0
                  ? Math.min(1, (factureGeneree.total_paye || 0) / factureGeneree.montant_total)
                  : 0,
              }}
            />
          </ModalHead>

          <div className="vt-modal-body">
            <dl className="vt-facts">
              <div><dt>Client</dt><dd>{factureGeneree.nomclient}</dd></div>
              <div><dt>Téléphone</dt><dd>{factureGeneree.telephone || "-"}</dd></div>
              <div><dt>Date</dt><dd>{formatDateFR(factureGeneree.date_facture)}</dd></div>
              <div><dt>Échéance</dt><dd>{formatDateFR(factureGeneree.date_echeance)}</dd></div>
            </dl>

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
                  {factureGeneree.lignes?.map((ligne, index) => (
                    <tr key={index}>
                      <td>{ligne.produit_nom}</td>
                      <td>
                        {ligne.nom_unite_vente || "Unité"}
                        {ligne.quantite_base > 1 && ` (${ligne.quantite_base})`}
                      </td>
                      <td className="vt-td-right vt-num">{ligne.quantite}</td>
                      <td className="vt-td-right vt-num">{formatMontant(ligne.prix_vente)}</td>
                      <td className="vt-td-right vt-num">{formatMontant(ligne.montant_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="vt-sums">
              <div><span>Total</span><strong className="vt-num">{formatMontant(factureGeneree.montant_total)}</strong></div>
              {(factureGeneree.total_paye || 0) > 0 && (
                <div><span>Déjà payé</span><span className="vt-num">{formatMontant(factureGeneree.total_paye)}</span></div>
              )}
              <div className="vt-sums-due">
                <span>Reste à payer</span>
                <strong className="vt-num">{formatMontant(Math.max(0, factureReste))}</strong>
              </div>
            </div>

            <div className="vt-facture-actions">
              {factureEstPayee ? (
                <div className="vt-paid-banner">
                  <CheckCircle size={18} />
                  <span>Cette facture est entièrement payée</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="vt-btn vt-btn--cash"
                    onClick={() => {
                      setShowFactureModal(false);
                      setPaiementData({ mode_paiement: "especes", montant: "" });
                      setShowPaiementModal(true);
                    }}
                  >
                    <Wallet size={16} />
                    {factureGeneree.statut === "partiellement_payee" ? "Compléter le paiement" : "Encaisser maintenant"}
                  </button>
                  <button
                    type="button"
                    className="vt-btn"
                    onClick={async () => {
                      setShowFactureModal(false);
                      await loadCommandes();
                      await loadProduits();
                      showToast(
                        `Commande ${commandeEnCours?.numero_commande} enregistrée. Facture ${factureGeneree?.numero_facture} en attente de paiement.`,
                        "success"
                      );
                      setCommandeEnCours(null);
                      setFactureGeneree(null);
                      setFormData({ nomclient: "", telephone: "", lignes: [] });
                    }}
                  >
                    Enregistrer sans payer
                  </button>
                </>
              )}
              <FacturePDFActions factureData={factureGeneree} onClose={() => setShowFactureModal(false)} />
            </div>
          </div>

          <div className="vt-modal-foot vt-modal-foot--end">
            <button type="button" className="vt-btn" onClick={() => setShowFactureModal(false)}>Fermer</button>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL : DÉTAILS
          ============================================================ */}
      {showDetailModal && selectedCommande && (
        <Modal
          size="lg"
          labelledBy="vt-det-title"
          dismissable={!alertModal.isOpen}
          onClose={() => setShowDetailModal(false)}
        >
          <ModalHead
            id="vt-det-title"
            title={selectedCommande.numero_commande}
            sub={`Commande du ${formatDateFR(selectedCommande.date_commande)}`}
            onClose={() => setShowDetailModal(false)}
          >
            <div className="vt-head-tags">
              <StatutMenu
                commande={selectedCommande}
                onSelect={handleChangeStatut}
                updatingStatut={updatingStatut}
                canManage={canManage}
              />
              <PaiementTag info={paiementInfo(selectedCommande)} />
            </div>
          </ModalHead>

          <div className="vt-modal-body">
            <div className="vt-det-grid">
              <section>
                <h3 className="vt-section-title">Client</h3>
                <dl className="vt-kv">
                  <div><dt>Nom</dt><dd>{selectedCommande.nomclient || "-"}</dd></div>
                  <div><dt>Téléphone</dt><dd>{selectedCommande.telephone || "-"}</dd></div>
                </dl>
              </section>
              <section>
                <h3 className="vt-section-title">Facturation</h3>
                <dl className="vt-kv">
                  <div><dt>Facture</dt><dd>{selectedCommande.numero_facture || "Non générée"}</dd></div>
                  <div><dt>Mode de paiement</dt><dd>{selectedCommande.mode_paiement || "-"}</dd></div>
                  <div><dt>Montant total</dt><dd className="vt-num vt-kv-strong">{formatMontant(selectedCommande.montant_total)}</dd></div>
                </dl>
              </section>
            </div>

            {selectedCommande.lignes?.length > 0 && (
              <section className="vt-det-block">
                <h3 className="vt-section-title">Produits</h3>
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
                      {selectedCommande.lignes.map((ligne, index) => (
                        <tr key={index}>
                          <td>
                            {ligne.produit_nom}
                            {ligne.marque_nom && <span className="vt-muted"> {ligne.marque_nom}</span>}
                          </td>
                          <td>
                            {ligne.nom_unite_vente || "Unité"}
                            {ligne.quantite_base > 1 && ` (${ligne.quantite_base})`}
                          </td>
                          <td className="vt-td-right vt-num">{ligne.quantite}</td>
                          <td className="vt-td-right vt-num">{formatMontant(ligne.prix_vente)}</td>
                          <td className="vt-td-right vt-num">{formatMontant(ligne.montant_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="4">Total</td>
                        <td className="vt-td-right vt-num">{formatMontant(selectedCommande.montant_total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            )}

            {selectedCommande.paiements?.length > 0 && (
              <section className="vt-det-block">
                <h3 className="vt-section-title">Paiements reçus</h3>
                <div className="vt-doc-scroll">
                  <table className="vt-doc">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Mode</th>
                        <th>Référence</th>
                        <th className="vt-th-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCommande.paiements.map((paiement, index) => (
                        <tr key={index}>
                          <td>{formatDateFR(paiement.date_paiement)}</td>
                          <td>{paiement.mode_paiement}</td>
                          <td>{paiement.reference || "-"}</td>
                          <td className="vt-td-right vt-num">{formatMontant(paiement.montant)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

          <div className="vt-modal-foot">
            <div>
              {isFacturePayee(selectedCommande) && selectedCommande.statut !== "annulee" && (
                <span className="vt-paid-banner vt-paid-banner--inline">
                  <CheckCircle size={16} /> Payée
                </span>
              )}
            </div>
            <div className="vt-foot-actions">
              <button type="button" className="vt-btn" onClick={() => setShowDetailModal(false)}>Fermer</button>
              {canPay(selectedCommande) && (
                <button type="button" className="vt-btn vt-btn--cash" onClick={() => preparerPaiement(selectedCommande)}>
                  <Wallet size={16} />
                  {isFacturePartiellementPayee(selectedCommande) ? "Compléter le paiement" : "Encaisser"}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================
          MODAL : SUPPRESSION
          ============================================================ */}
      {showDeleteModal && (
        <Modal
          size="sm"
          busy={deleting}
          labelledBy="vt-del-title"
          dismissable={!deleting}
          onClose={() => setShowDeleteModal(false)}
        >
          <ModalHead
            id="vt-del-title"
            title="Supprimer cette commande ?"
            onClose={() => setShowDeleteModal(false)}
            disabled={deleting}
          />
          <div className="vt-modal-body">
            <div className="vt-danger-note">
              <AlertTriangle size={20} />
              <div>
                <p>
                  La commande <strong>{commandeToDelete?.numero_commande}</strong> de{" "}
                  <strong>{commandeToDelete?.nomclient || "client inconnu"}</strong> sera supprimée.
                </p>
                <p className="vt-danger-warn">Cette action est irréversible.</p>
              </div>
            </div>
          </div>
          <div className="vt-modal-foot vt-modal-foot--end">
            <button type="button" className="vt-btn" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              Annuler
            </button>
            <button type="button" className="vt-btn vt-btn--danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader size={16} className="vt-spin" /> : <Trash2 size={16} />}
              {deleting ? "Suppression" : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}

      {/* ---------- Alerte générique ---------- */}
      <ConfirmModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        onConfirm={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        details={alertModal.details}
        type={alertModal.type}
        confirmLabel="Compris"
        cancelLabel="Fermer"
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

export default Ventes;
