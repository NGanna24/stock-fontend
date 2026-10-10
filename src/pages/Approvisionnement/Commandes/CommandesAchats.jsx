// pages/CommandesAchat/CommandesAchat.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Download, X, Check,
  RefreshCw, Grid, List, ShoppingBasket, Package, Calendar, AlertCircle, CheckCircle,
  Ban, FileText, Building, Phone, Mail, MapPin, ChevronDown, Loader, MoreVertical,
  AlertTriangle, Box, Clock, Send, PackageCheck
} from "lucide-react";
import CommandeAchatService from "../../../services/commandeAchatService";
import FournisseurService from "../../../services/fournisseurService";
import ProduitService from "../../../services/produitService";
import UniteVenteService from "../../../services/uniteVenteService";
import MagasinService from "../../../services/magasinService";
import { useUser } from "../../../context/AuthContext";
import BonCommandePDFActions from "../../../components/commande/BonCommandePDFActions";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import "./CommandesAchats.css";

/* ============================================================
   CONSTANTES & UTILITAIRES
   ============================================================ */
const EMPTY_LIGNE = { id_produit: "", quantite: "", id_unite_vente: "", prix_achat: "" };

const STATUTS = {
  en_attente: { label: "En attente", plural: "En attente", tone: "pending", icon: Clock },
  envoyee: { label: "Envoyée", plural: "Envoyées", tone: "sent", icon: Send },
  partiellement_recue: { label: "Partiellement reçue", plural: "Partielles", tone: "partial", icon: PackageCheck },
  recue: { label: "Reçue", plural: "Reçues", tone: "received", icon: CheckCircle },
  annulee: { label: "Annulée", plural: "Annulées", tone: "cancelled", icon: Ban },
};

// Valeur venant de l'API (conserve le comportement d'origine)
const formatMontant = (value) => {
  if (value === undefined || value === null || isNaN(value)) return "0 FCFA";
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  if (isNaN(num)) return "0 FCFA";
  return Math.round(num).toLocaleString("fr-FR") + " FCFA";
};
const formatNombre = (n) => Math.round(n || 0).toLocaleString("fr-FR");
const formatDate = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  return isNaN(date) ? "-" : date.toLocaleDateString("fr-FR");
};
// Saisie utilisateur : la virgule est un séparateur décimal
const parsePrix = (value) => {
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const n = parseFloat(String(value).replace(",", ".").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
};
const num = (v) => parseFloat(v) || 0;
const getTodayISO = () => new Date().toISOString().split("T")[0];
const produitLabel = (p) => p.nom + (p.modele_nom ? ` - ${p.modele_nom}` : "");

const downloadCSV = (headers, rows, filename) => {
  const esc = (c) => `"${String(c ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/* ============================================================
   PETITS COMPOSANTS
   ============================================================ */
const StatusTag = ({ statut }) => {
  const cfg = STATUTS[statut] || STATUTS.en_attente;
  return (
    <span className={`ca-tag ca-tag--${cfg.tone}`}>
      <i className="ca-tag-dot" />
      {cfg.label}
    </span>
  );
};

const Combobox = ({
  icon: Icon, value, onChange, items, getKey, selectedKey, renderItem, onSelect,
  placeholder, emptyText, disabled, inputRef, name,
}) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => { setActive(0); }, [value, items.length]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (item) => { onSelect(item); setOpen(false); };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && items[active]) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="ca-combo" ref={wrapRef}>
      <Icon size={16} className="ca-combo-icon" />
      <input
        ref={inputRef}
        name={name}
        type="text"
        className="ca-combo-input"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
      />
      <button
        type="button"
        className="ca-combo-arrow"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label="Afficher la liste"
      >
        <ChevronDown size={16} />
      </button>
      {open && !disabled && (
        <div className="ca-combo-pop">
          {items.length === 0 ? (
            <div className="ca-combo-empty">{emptyText}</div>
          ) : (
            <div className="ca-combo-list" ref={listRef} role="listbox">
              {items.map((it, i) => (
                <div
                  key={getKey(it)}
                  role="option"
                  aria-selected={getKey(it) === selectedKey}
                  className={`ca-combo-item ${i === active ? "is-active" : ""} ${getKey(it) === selectedKey ? "is-selected" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(it)}
                >
                  {renderItem(it)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ActionsMenu = ({ menu, commande, canManage, isAdmin, onView, onEdit, onCancel, onDelete, onClose }) => {
  if (!menu || !commande) return null;
  const inactive = ["recue", "annulee"].includes(commande.statut);
  const style = { right: menu.right, ...(menu.up ? { bottom: menu.bottom } : { top: menu.top }) };
  const run = (fn) => () => { onClose(); fn(commande); };
  return createPortal(
    <div className="ca-menu" data-ca-menu style={style} role="menu">
      <button className="ca-menu-item" onClick={run(onView)} role="menuitem">
        <Eye size={15} /> Voir les détails
      </button>
      {canManage && !inactive && (
        <button className="ca-menu-item" onClick={run(onEdit)} role="menuitem">
          <Edit size={15} /> Modifier
        </button>
      )}
      {canManage && !inactive && (
        <button className="ca-menu-item ca-menu-item--warn" onClick={run(onCancel)} role="menuitem">
          <Ban size={15} /> Annuler la commande
        </button>
      )}
      {isAdmin && !inactive && (
        <>
          <div className="ca-menu-sep" />
          <button className="ca-menu-item ca-menu-item--danger" onClick={run(onDelete)} role="menuitem">
            <Trash2 size={15} /> Supprimer
          </button>
        </>
      )}
    </div>,
    document.body
  );
};

/* ============================================================
   PAGE
   ============================================================ */
const CommandesAchat = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem("token");

  // ---------- Données ----------
  const [commandes, setCommandes] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [magasin, setMagasin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // ---------- Liste ----------
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [viewMode, setViewMode] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 720 ? "grid" : "list"
  );
  const [filterStatut, setFilterStatut] = useState("");
  const [filterPeriode, setFilterPeriode] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [selectedIds, setSelectedIds] = useState([]);
  const [notification, setNotification] = useState(null);
  const notifTimer = useRef(null);
  const [menu, setMenu] = useState(null);

  // ---------- Modals ----------
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [confirm, setConfirm] = useState(null); // {kind:'delete'|'cancel'|'bulk', commande?}
  const [editingCommande, setEditingCommande] = useState(null);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState(null);

  // ---------- Formulaire ----------
  const [formData, setFormData] = useState({ id_fournisseur: "", date_commande: "", lignes: [] });
  const [ligneForm, setLigneForm] = useState(EMPTY_LIGNE);
  const [unitesVente, setUnitesVente] = useState([]);
  const [selectedUnite, setSelectedUnite] = useState(null);
  const [loadingUnites, setLoadingUnites] = useState(false);
  const [editingLigneIndex, setEditingLigneIndex] = useState(null);
  const [editBackup, setEditBackup] = useState(null);
  const [fournisseurSearch, setFournisseurSearch] = useState("");
  const [produitSearch, setProduitSearch] = useState("");
  const unitesReq = useRef(0);
  const qteRef = useRef(null);
  const produitInputRef = useRef(null);

  const canManage = !!user && ["admin", "manager"].includes(user.role);
  const isAdmin = !!user && user.role === "admin";

  /* ---------- Chargement ---------- */
  const loadCommandes = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await CommandeAchatService.getAllCommandes(token);
      if (response.success) setCommandes(response.data || []);
      else setLoadError(response.message || "Impossible de charger les commandes");
    } catch (e) {
      console.error("❌ LoadCommandes error:", e);
      setLoadError(e.message || "Impossible de charger les commandes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!(isAuthenticated && token)) return;
    loadCommandes();
    (async () => {
      try {
        const r = await FournisseurService.getActiveFournisseurs(token);
        if (r.success) setFournisseurs(r.data || []);
      } catch (e) { console.error("❌ LoadFournisseurs error:", e); }
    })();
    (async () => {
      try {
        const r = await ProduitService.getAllProduits(token);
        if (r.success) setProduits(r.data || []);
      } catch (e) { console.error("❌ LoadProduits error:", e); }
    })();
    (async () => {
      try {
        const r = await MagasinService.getMonMagasin(token);
        if (r.success) setMagasin(r.magasin);
      } catch (e) { console.error("❌ LoadMagasin error:", e); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  /* ---------- Menu d'actions : fermeture ---------- */
  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    const onDown = (e) => {
      if (!e.target.closest("[data-ca-menu],[data-ca-more]")) close();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  /* ---------- Échap + verrouillage du scroll ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (menu) setMenu(null);
      else if (showModal && !saving) setShowModal(false);
      else if (showDetailModal) setShowDetailModal(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu, showModal, showDetailModal, saving]);

  useEffect(() => {
    document.body.style.overflow = showModal || showDetailModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showModal, showDetailModal]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatut, filterPeriode, sortBy]);

  /* ---------- Notifications ---------- */
  const showNotification = (message, type = "info") => {
    clearTimeout(notifTimer.current);
    setNotification({ message, type });
    notifTimer.current = setTimeout(() => setNotification(null), 4000);
  };
  useEffect(() => () => clearTimeout(notifTimer.current), []);

  /* ============================================================
     STATS / FILTRES
     ============================================================ */
  const stats = useMemo(() => {
    const count = (s) => commandes.filter((c) => c.statut === s).length;
    const total = commandes.length;
    const totalMontant = commandes.reduce((s, c) => s + num(c.montant_total), 0);
    const recuMontant = commandes.filter((c) => c.statut === "recue").reduce((s, c) => s + num(c.montant_total), 0);
    const avecMontant = commandes.filter((c) => num(c.montant_total) > 0).length;
    const recue = count("recue");
    return {
      total,
      en_attente: count("en_attente"),
      envoyee: count("envoyee"),
      partiellement_recue: count("partiellement_recue"),
      recue,
      annulee: count("annulee"),
      totalMontant,
      recuMontant,
      montantMoyen: avecMontant ? Math.round(totalMontant / avecMontant) : 0,
      tauxReception: total ? Math.round((recue / total) * 100) : 0,
    };
  }, [commandes]);

  const sortedCommandes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const list = commandes.filter((c) => {
      const matchSearch = !q ||
        c.numero_commande?.toLowerCase().includes(q) ||
        c.fournisseur_nom?.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q);
      const matchStatut = filterStatut ? c.statut === filterStatut : true;
      let matchPeriode = true;
      if (filterPeriode !== "all") {
        const d = new Date(c.date_commande);
        if (filterPeriode === "today") matchPeriode = d.toDateString() === today.toDateString();
        else if (filterPeriode === "week") matchPeriode = d >= startOfWeek;
        else if (filterPeriode === "month") matchPeriode = d >= startOfMonth;
      }
      return matchSearch && matchStatut && matchPeriode;
    });

    const byDate = (a, b) => new Date(a.date_commande) - new Date(b.date_commande);
    const sorters = {
      date_desc: (a, b) => byDate(b, a),
      date_asc: byDate,
      montant_desc: (a, b) => num(b.montant_total) - num(a.montant_total),
      montant_asc: (a, b) => num(a.montant_total) - num(b.montant_total),
      fournisseur: (a, b) => (a.fournisseur_nom || "").localeCompare(b.fournisseur_nom || ""),
    };
    return [...list].sort(sorters[sortBy] || sorters.date_desc);
  }, [commandes, searchTerm, filterStatut, filterPeriode, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedCommandes.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const firstIdx = (page - 1) * itemsPerPage;
  const currentItems = sortedCommandes.slice(firstIdx, firstIdx + itemsPerPage);
  const hasFilters = !!searchTerm || !!filterStatut || filterPeriode !== "all";
  const allPageSelected = currentItems.length > 0 && currentItems.every((c) => selectedIds.includes(c.id_commande_achat));

  const resetFilters = () => { setSearchTerm(""); setFilterStatut(""); setFilterPeriode("all"); };

  const stages = [
    { key: "", label: "Toutes", count: stats.total, tone: "all" },
    ...Object.keys(STATUTS).map((k) => ({ key: k, label: STATUTS[k].plural, count: stats[k], tone: STATUTS[k].tone })),
  ];

  /* ============================================================
     FORMULAIRE : FOURNISSEUR / PRODUIT
     ============================================================ */
  const selectedFournisseur = fournisseurs.find((f) => String(f.id_fournisseur) === String(formData.id_fournisseur));

  const produitsFiltres = useMemo(() => {
    if (!formData.id_fournisseur) return [];
    return produits.filter((p) => Number(p.id_fournisseur) === Number(formData.id_fournisseur));
  }, [produits, formData.id_fournisseur]);

  const fournisseursListe = useMemo(() => {
    const q = (selectedFournisseur && fournisseurSearch === selectedFournisseur.nom ? "" : fournisseurSearch).trim().toLowerCase();
    if (!q) return fournisseurs;
    return fournisseurs.filter((f) =>
      [f.nom, f.email, f.telephone, f.ville].some((v) => v?.toLowerCase().includes(q))
    );
  }, [fournisseurs, fournisseurSearch, selectedFournisseur]);

  const selectedProduit = produitsFiltres.find((p) => String(p.id_produit) === String(ligneForm.id_produit));

  const produitsListe = useMemo(() => {
    const q = (selectedProduit && produitSearch === produitLabel(selectedProduit) ? "" : produitSearch).trim().toLowerCase();
    if (!q) return produitsFiltres;
    return produitsFiltres.filter((p) =>
      [p.nom, p.modele_nom, p.reference].some((v) => v?.toLowerCase().includes(q))
    );
  }, [produitsFiltres, produitSearch, selectedProduit]);

  const resetLigneForm = () => {
    unitesReq.current += 1;
    setLigneForm(EMPTY_LIGNE);
    setSelectedUnite(null);
    setUnitesVente([]);
    setLoadingUnites(false);
  };

  const onFournisseurText = (text) => {
    setFournisseurSearch(text);
    if (formData.id_fournisseur) {
      setFormData((fd) => ({ ...fd, id_fournisseur: "" }));
      resetLigneForm();
      setProduitSearch("");
    }
  };

  const selectFournisseur = (f) => {
    setFormData((fd) => ({ ...fd, id_fournisseur: f.id_fournisseur }));
    setFournisseurSearch(f.nom);
    setProduitSearch("");
    resetLigneForm();
    setTimeout(() => produitInputRef.current?.focus(), 50);
  };

  const onProduitText = (text) => {
    setProduitSearch(text);
    if (ligneForm.id_produit) resetLigneForm();
  };

  const selectProduit = async (produit) => {
    const reqId = ++unitesReq.current;
    setLigneForm({ ...EMPTY_LIGNE, id_produit: produit.id_produit });
    setProduitSearch(produitLabel(produit));
    setSelectedUnite(null);
    setUnitesVente([]);
    setLoadingUnites(true);

    const uniteBase = {
      id_unite_vente: null,
      nom: produit.unite_nom || produit.unite_symbole || "Unité",
      symbole: produit.unite_symbole || "",
      quantite_base: 1,
      prix_achat: produit.prix_achat || 0,
      prix_vente: produit.prix_vente || 0,
      est_principal: false,
      est_unite_base: true,
    };

    let toutes = [uniteBase];
    let defaut = uniteBase;
    try {
      const res = await UniteVenteService.getByProduit(token, produit.id_produit);
      const perso = res.success && res.data ? res.data : [];
      toutes = [uniteBase, ...perso];
      defaut = perso.find((u) => u.est_principal === 1 || u.est_principal === true) || uniteBase;
    } catch (e) {
      console.error("❌ Erreur chargement unités:", e);
    }
    if (reqId !== unitesReq.current) return; // sélection obsolète
    setUnitesVente(toutes);
    setSelectedUnite(defaut);
    setLigneForm((prev) => ({ ...prev, id_unite_vente: defaut.id_unite_vente, prix_achat: defaut.prix_achat || 0 }));
    setLoadingUnites(false);
    setTimeout(() => qteRef.current?.focus(), 50);
  };

  const handleUniteChange = (unite) => {
    setSelectedUnite(unite);
    setLigneForm((prev) => ({ ...prev, id_unite_vente: unite.id_unite_vente, prix_achat: unite.prix_achat || 0 }));
  };

  const handleLigneChange = (e) => {
    const { name, value } = e.target;
    if (name === "quantite") setLigneForm((p) => ({ ...p, quantite: value.replace(/[^0-9]/g, "") }));
    else if (name === "prix_achat") setLigneForm((p) => ({ ...p, prix_achat: value.replace(/[^0-9,.]/g, "") }));
  };

  const previewQte = parseInt(ligneForm.quantite, 10) || 0;
  const previewBase = previewQte * (selectedUnite?.quantite_base || 1);
  const previewTotal = previewQte * parsePrix(ligneForm.prix_achat);

  const addLigne = () => {
    if (!ligneForm.id_produit || !selectedProduit) return showNotification("Sélectionnez un produit", "warning");
    if (!selectedUnite) return showNotification("Sélectionnez une unité", "warning");
    if (previewQte <= 0) return showNotification("Saisissez une quantité valide", "warning");

    const prix = parsePrix(ligneForm.prix_achat);
    const prixAchat = prix > 0 ? prix : null;
    const idProduit = Number(selectedProduit.id_produit);
    const baseQty = previewQte * (selectedUnite.quantite_base || 1);

    setFormData((fd) => {
      const idx = fd.lignes.findIndex(
        (l) => l.id_produit === idProduit && l.id_unite_vente === selectedUnite.id_unite_vente
      );
      if (idx !== -1) {
        const lignes = fd.lignes.map((l, i) =>
          i === idx
            ? {
                ...l,
                quantite: num(l.quantite) + previewQte,
                quantite_totale_base: num(l.quantite_totale_base) + baseQty,
                prix_achat: prixAchat !== null ? prixAchat : l.prix_achat,
              }
            : l
        );
        return { ...fd, lignes };
      }
      return {
        ...fd,
        lignes: [
          ...fd.lignes,
          {
            id_produit: idProduit,
            id_unite_vente: selectedUnite.id_unite_vente,
            nom_unite_vente: selectedUnite.nom,
            quantite_base: selectedUnite.quantite_base,
            quantite_totale_base: baseQty,
            quantite: previewQte,
            prix_achat: prixAchat,
            produit_nom: selectedProduit.nom,
            modele_nom: selectedProduit.modele_nom || "",
            unite: selectedUnite.nom,
            reference: selectedProduit.reference || "",
          },
        ],
      };
    });

    showNotification(`${selectedProduit.nom} ajouté : ${previewQte} ${selectedUnite.nom}`, "success");
    resetLigneForm();
    setProduitSearch("");
    setTimeout(() => produitInputRef.current?.focus(), 50);
  };

  const removeLigne = (index) =>
    setFormData((fd) => ({ ...fd, lignes: fd.lignes.filter((_, i) => i !== index) }));

  const startEditLigne = (index) => {
    setEditBackup({ ...formData.lignes[index] });
    setEditingLigneIndex(index);
  };

  const cancelEditLigne = () => {
    if (editingLigneIndex !== null && editBackup) {
      setFormData((fd) => ({
        ...fd,
        lignes: fd.lignes.map((l, i) => (i === editingLigneIndex ? editBackup : l)),
      }));
    }
    setEditBackup(null);
    setEditingLigneIndex(null);
  };

  const updateLigne = (index, field, value) =>
    setFormData((fd) => ({
      ...fd,
      lignes: fd.lignes.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    }));

  const saveLigneEdit = (index) => {
    const ligne = formData.lignes[index];
    const q = parseInt(ligne.quantite, 10) || 0;
    if (q <= 0) return showNotification("Quantité invalide", "warning");
    const p = parsePrix(ligne.prix_achat);
    setFormData((fd) => ({
      ...fd,
      lignes: fd.lignes.map((l, i) =>
        i === index
          ? { ...l, quantite: q, prix_achat: p > 0 ? p : null, quantite_totale_base: q * (l.quantite_base || 1) }
          : l
      ),
    }));
    setEditBackup(null);
    setEditingLigneIndex(null);
  };

  const totalCommande = formData.lignes.reduce((s, l) => s + num(l.quantite) * num(l.prix_achat), 0);

  /* ============================================================
     ACTIONS
     ============================================================ */
  const closeForm = () => {
    if (saving) return;
    setShowModal(false);
    setModalError(null);
  };

  const handleAdd = () => {
    setEditingCommande(null);
    setFormData({ id_fournisseur: "", date_commande: getTodayISO(), lignes: [] });
    setFournisseurSearch("");
    setProduitSearch("");
    resetLigneForm();
    setEditingLigneIndex(null);
    setEditBackup(null);
    setModalError(null);
    setShowModal(true);
  };

  const handleEdit = async (commande) => {
    setLoading(true);
    try {
      const response = await CommandeAchatService.getCommandeById(token, commande.id_commande_achat);
      if (!response.success) {
        showNotification(response.message || "Impossible de charger la commande", "error");
        return;
      }
      const c = response.data;
      setEditingCommande(c);
      setFormData({
        id_fournisseur: c.id_fournisseur || "",
        date_commande: c.date_commande ? c.date_commande.split("T")[0] : getTodayISO(),
        lignes: (c.lignes || []).map((l) => ({
          id_produit: l.id_produit,
          id_unite_vente: l.id_unite_vente,
          nom_unite_vente: l.nom_unite_vente || "Unité",
          quantite_base: parseFloat(l.quantite_base) || 1,
          quantite_totale_base: parseFloat(l.quantite_totale_base) || parseFloat(l.quantite),
          quantite: parseFloat(l.quantite) || 0,
          prix_achat: l.prix_achat !== null && l.prix_achat !== undefined ? parseFloat(l.prix_achat) : null,
          produit_nom: l.produit_nom || "Produit inconnu",
          modele_nom: l.modele_nom || "",
          unite: l.nom_unite_vente || l.unite_symbole || "",
          reference: l.reference || "",
        })),
      });
      const f = fournisseurs.find((x) => x.id_fournisseur === c.id_fournisseur);
      setFournisseurSearch(f ? f.nom : c.fournisseur_nom || "");
      setProduitSearch("");
      resetLigneForm();
      setEditingLigneIndex(null);
      setEditBackup(null);
      setModalError(null);
      setShowModal(true);
    } catch (e) {
      console.error("❌ Erreur chargement commande:", e);
      showNotification("Erreur lors du chargement de la commande", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (commande) => {
    setSelectedCommande(commande);
    setShowDetailModal(true);
    try {
      const res = await CommandeAchatService.getCommandeById(token, commande.id_commande_achat);
      if (res.success && res.data) setSelectedCommande(res.data);
    } catch (e) {
      console.error("❌ Impossible de charger la commande complète :", e);
    }
  };

  const handleSave = async () => {
    if (!formData.id_fournisseur) return setModalError("Sélectionnez un fournisseur.");
    if (formData.lignes.length === 0) return setModalError("Ajoutez au moins un produit.");
    if (editingLigneIndex !== null) return setModalError("Validez ou annulez la modification de la ligne en cours.");

    setSaving(true);
    setModalError(null);
    try {
      const data = {
        id_fournisseur: parseInt(formData.id_fournisseur, 10),
        date_commande: formData.date_commande || getTodayISO(),
        notes: null,
        lignes: formData.lignes.map((l) => ({
          id_produit: l.id_produit,
          id_unite_vente: l.id_unite_vente,
          nom_unite_vente: l.nom_unite_vente,
          quantite_base: l.quantite_base,
          quantite: l.quantite,
          quantite_totale_base: l.quantite_totale_base,
          prix_achat: l.prix_achat,
        })),
      };
      const response = editingCommande
        ? await CommandeAchatService.updateCommande(token, editingCommande.id_commande_achat, data)
        : await CommandeAchatService.createCommande(token, data);

      if (response.success) {
        await loadCommandes();
        setShowModal(false);
        setEditingCommande(null);
        showNotification(editingCommande ? "Commande mise à jour" : "Commande créée", "success");
      } else {
        setModalError(response.message || "Erreur lors de l'enregistrement");
      }
    } catch (e) {
      console.error("❌ Save error:", e);
      setModalError(e.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "cancel") {
        const r = await CommandeAchatService.annulerCommande(token, confirm.commande.id_commande_achat);
        if (r.success) {
          await loadCommandes();
          showNotification("Commande annulée", "warning");
        } else showNotification(r.message || "Erreur lors de l'annulation", "error");
      } else if (confirm.kind === "delete") {
        const r = await CommandeAchatService.deleteCommande(token, confirm.commande.id_commande_achat);
        if (r.success) {
          await loadCommandes();
          setSelectedIds((ids) => ids.filter((id) => id !== confirm.commande.id_commande_achat));
          showNotification("Commande supprimée", "info");
        } else showNotification(r.message || "Erreur lors de la suppression", "error");
      } else if (confirm.kind === "bulk") {
        let ok = 0;
        let ko = 0;
        for (const id of selectedIds) {
          try {
            const r = await CommandeAchatService.deleteCommande(token, id);
            if (r.success) ok++; else ko++;
          } catch (e) { console.error("❌ Erreur suppression #", id, e); ko++; }
        }
        await loadCommandes();
        setSelectedIds([]);
        showNotification(ko === 0 ? `${ok} commande(s) supprimée(s)` : `${ok} supprimée(s), ${ko} en erreur`, ko === 0 ? "success" : "warning");
      }
    } catch (e) {
      console.error("❌ Confirm error:", e);
      showNotification(e.message || "Une erreur est survenue", "error");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const confirmProps = (() => {
    if (!confirm) return { title: "", message: "", confirmLabel: "Confirmer" };
    if (confirm.kind === "cancel")
      return {
        title: "Annuler cette commande ?",
        message: `La commande ${confirm.commande.numero_commande} (${confirm.commande.fournisseur_nom || "fournisseur inconnu"}) sera marquée comme annulée.`,
        confirmLabel: "Annuler la commande",
      };
    if (confirm.kind === "delete")
      return {
        title: "Supprimer cette commande ?",
        message: `La commande ${confirm.commande.numero_commande} (${confirm.commande.fournisseur_nom || "fournisseur inconnu"}) sera définitivement supprimée. Cette action est irréversible.`,
        confirmLabel: "Supprimer définitivement",
      };
    return {
      title: `Supprimer ${selectedIds.length} commande(s) ?`,
      message: "Cette action est irréversible. Toutes les commandes sélectionnées seront définitivement supprimées.",
      confirmLabel: "Supprimer définitivement",
    };
  })();

  const handleExport = async () => {
    try {
      const response = await CommandeAchatService.exportCommandes(token);
      if (response.success && response.data) {
        downloadCSV(
          ["ID", "Numéro", "Date", "Fournisseur", "Montant", "Statut", "Notes"],
          response.data.map((c) => [c.id, c.numero, c.date, c.fournisseur, formatMontant(c.montant), c.statut, c.notes || ""]),
          `commandes_achat_${getTodayISO()}.csv`
        );
        showNotification("Export terminé", "success");
      } else showNotification(response.message || "Export impossible", "error");
    } catch (e) {
      console.error("❌ Export error:", e);
      showNotification("Erreur lors de l'export", "error");
    }
  };

  const handleBulkExport = () => {
    const sel = commandes.filter((c) => selectedIds.includes(c.id_commande_achat));
    if (!sel.length) return;
    downloadCSV(
      ["N° Commande", "Date", "Fournisseur", "Montant", "Statut"],
      sel.map((c) => [c.numero_commande, formatDate(c.date_commande), c.fournisseur_nom || "-", formatMontant(c.montant_total), STATUTS[c.statut]?.label || c.statut]),
      `commandes_selection_${getTodayISO()}.csv`
    );
    showNotification(`${sel.length} commande(s) exportée(s)`, "success");
  };

  const toggleSelect = (id) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const toggleSelectPage = () => {
    const ids = currentItems.map((c) => c.id_commande_achat);
    setSelectedIds((cur) => (allPageSelected ? cur.filter((id) => !ids.includes(id)) : [...new Set([...cur, ...ids])]));
  };

  const openMenu = (e, commande) => {
    e.stopPropagation();
    const id = commande.id_commande_achat;
    if (menu?.id === id) return setMenu(null);
    const r = e.currentTarget.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 220;
    setMenu({ id, right: window.innerWidth - r.right, top: r.bottom + 6, bottom: window.innerHeight - r.top + 6, up });
  };
  const menuCommande = menu ? commandes.find((c) => c.id_commande_achat === menu.id) : null;

  const renderMore = (commande) => (
    <button
      className={`ca-more ${menu?.id === commande.id_commande_achat ? "is-open" : ""}`}
      data-ca-more
      onClick={(e) => openMenu(e, commande)}
      aria-label={`Actions pour ${commande.numero_commande}`}
      aria-haspopup="menu"
    >
      <MoreVertical size={17} />
    </button>
  );

  /* ============================================================
     VUES
     ============================================================ */
  const renderEmpty = () => (
    <div className="ca-empty">
      <span className="ca-empty-icon"><ShoppingBasket size={30} /></span>
      {hasFilters ? (
        <>
          <h3>Aucune commande ne correspond</h3>
          <p>Modifiez la recherche ou retirez les filtres pour voir toutes les commandes.</p>
          <button className="ca-btn ca-btn--ghost" onClick={resetFilters}>Retirer les filtres</button>
        </>
      ) : (
        <>
          <h3>Aucune commande d'achat</h3>
          <p>Créez une commande pour réapprovisionner votre stock auprès d'un fournisseur.</p>
          {canManage && (
            <button className="ca-btn ca-btn--signal" onClick={handleAdd}><Plus size={17} /> Nouvelle commande</button>
          )}
        </>
      )}
    </div>
  );

  const renderTable = () => (
    <div className="ca-tablewrap">
      <table className="ca-table">
        <thead>
          <tr>
            <th className="ca-col-check">
              <input type="checkbox" className="ca-check" checked={allPageSelected} onChange={toggleSelectPage} aria-label="Tout sélectionner" />
            </th>
            <th>Commande</th>
            <th>Fournisseur</th>
            <th>Date</th>
            <th className="ca-num">Articles</th>
            <th className="ca-num">Montant</th>
            <th>Statut</th>
            <th className="ca-col-act" />
          </tr>
        </thead>
        <tbody>
          {currentItems.map((c) => {
            const tone = (STATUTS[c.statut] || STATUTS.en_attente).tone;
            const selected = selectedIds.includes(c.id_commande_achat);
            return (
              <tr
                key={c.id_commande_achat}
                className={`ca-row ca-tone-${tone} ${selected ? "is-selected" : ""}`}
                onClick={() => handleView(c)}
              >
                <td className="ca-col-check" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" className="ca-check" checked={selected} onChange={() => toggleSelect(c.id_commande_achat)} aria-label={`Sélectionner ${c.numero_commande}`} />
                </td>
                <td><span className="ca-ref">{c.numero_commande}</span></td>
                <td><span className="ca-supplier"><Building size={14} />{c.fournisseur_nom || "—"}</span></td>
                <td className="ca-muted">{formatDate(c.date_commande)}</td>
                <td className="ca-num">{c.nb_lignes || 0}</td>
                <td className="ca-num ca-amount">
                  {num(c.montant_total) > 0 ? formatMontant(c.montant_total) : <em className="ca-undef">À définir</em>}
                </td>
                <td><StatusTag statut={c.statut} /></td>
                <td className="ca-col-act" onClick={(e) => e.stopPropagation()}>
                  {renderMore(c)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderGrid = () => (
    <div className="ca-grid">
      {currentItems.map((c) => {
        const tone = (STATUTS[c.statut] || STATUTS.en_attente).tone;
        const selected = selectedIds.includes(c.id_commande_achat);
        return (
          <article key={c.id_commande_achat} className={`ca-ticket ca-tone-${tone} ${selected ? "is-selected" : ""}`}>
            <div className="ca-ticket-top" onClick={() => handleView(c)}>
              <div className="ca-ticket-head">
                <input
                  type="checkbox"
                  className="ca-check"
                  checked={selected}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelect(c.id_commande_achat)}
                  aria-label={`Sélectionner ${c.numero_commande}`}
                />
                <span className="ca-ref">{c.numero_commande}</span>
                <span className="ca-ticket-more" onClick={(e) => e.stopPropagation()}>{renderMore(c)}</span>
              </div>
              <p className="ca-ticket-supplier"><Building size={15} />{c.fournisseur_nom || "—"}</p>
              <p className="ca-ticket-meta">
                <span><Calendar size={13} /> {formatDate(c.date_commande)}</span>
                <span><Package size={13} /> {c.nb_lignes || 0} article(s)</span>
              </p>
            </div>
            <div className="ca-ticket-foot" onClick={() => handleView(c)}>
              <strong className="ca-ticket-amount">
                {num(c.montant_total) > 0 ? formatMontant(c.montant_total) : <em className="ca-undef">À définir</em>}
              </strong>
              <StatusTag statut={c.statut} />
            </div>
          </article>
        );
      })}
    </div>
  );

  const gaugeFilled = Math.round(stats.tauxReception / 10);

  /* ============================================================
     RENDU
     ============================================================ */
  return (
    <div className="ca-root">
      {notification && (
        <div className={`ca-toast ca-toast--${notification.type}`} role="status" aria-live="polite">
          {notification.type === "success" && <CheckCircle size={18} />}
          {notification.type === "error" && <AlertCircle size={18} />}
          {notification.type === "warning" && <AlertTriangle size={18} />}
          {notification.type === "info" && <AlertCircle size={18} />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} aria-label="Fermer"><X size={15} /></button>
        </div>
      )}

      {/* ---------- En-tête ---------- */}
      <header className="ca-head">
        <div className="ca-head-id">
          <span className="ca-head-mark"><ShoppingBasket size={23} /></span>
          <div>
            <h1>Commandes d'achat</h1>
            <p>Réapprovisionnement auprès de vos fournisseurs</p>
          </div>
        </div>
        <div className="ca-head-actions">
          <button className="ca-btn ca-btn--ghost ca-btn--icon" onClick={loadCommandes} disabled={loading} title="Actualiser" aria-label="Actualiser">
            <RefreshCw size={17} className={loading ? "ca-spin" : ""} />
          </button>
          <button className="ca-btn ca-btn--ghost" onClick={handleExport}><Download size={17} /> Exporter</button>
          {canManage && (
            <button className="ca-btn ca-btn--signal" onClick={handleAdd}><Plus size={18} /> Nouvelle commande</button>
          )}
        </div>
      </header>

      {/* ---------- Registre ---------- */}
      <section className="ca-ledger" aria-label="Synthèse des achats">
        <div className="ca-ledger-cell ca-ledger-main">
          <span className="ca-ledger-label">Montant total des achats</span>
          <strong className="ca-ledger-figure">{formatNombre(stats.totalMontant)}<small>FCFA</small></strong>
          <span className="ca-ledger-sub">sur {stats.total} commande{stats.total > 1 ? "s" : ""}</span>
        </div>
        <div className="ca-ledger-cell">
          <span className="ca-ledger-label">Panier moyen</span>
          <strong className="ca-ledger-mid">{stats.montantMoyen > 0 ? formatNombre(stats.montantMoyen) : "—"}<small>{stats.montantMoyen > 0 ? "FCFA" : ""}</small></strong>
          <span className="ca-ledger-sub">par commande chiffrée</span>
        </div>
        <div className="ca-ledger-cell">
          <span className="ca-ledger-label">Déjà reçu en stock</span>
          <strong className="ca-ledger-mid">{stats.recuMontant > 0 ? formatNombre(stats.recuMontant) : "—"}<small>{stats.recuMontant > 0 ? "FCFA" : ""}</small></strong>
          <span className="ca-ledger-sub">{stats.recue} commande{stats.recue > 1 ? "s" : ""} reçue{stats.recue > 1 ? "s" : ""}</span>
        </div>
        <div className="ca-ledger-cell ca-ledger-rate">
          <span className="ca-ledger-label">Taux de réception</span>
          <strong className="ca-ledger-mid">{stats.tauxReception}<small>%</small></strong>
          <div className="ca-gauge" role="img" aria-label={`${stats.tauxReception}% des commandes reçues`}>
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} className={i < gaugeFilled ? "on" : ""} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Pipeline ---------- */}
      <nav className="ca-pipeline" aria-label="Filtrer par statut">
        {stages.map((s) => (
          <button
            key={s.key || "all"}
            className={`ca-stage ca-stage--${s.tone} ${filterStatut === s.key ? "is-active" : ""}`}
            onClick={() => setFilterStatut(filterStatut === s.key ? "" : s.key)}
            aria-pressed={filterStatut === s.key}
          >
            <span className="ca-stage-count">{s.count}</span>
            <span className="ca-stage-label">{s.label}</span>
          </button>
        ))}
      </nav>

      {/* ---------- Barre d'outils ---------- */}
      <div className="ca-toolbar">
        <div className="ca-search">
          <Search size={17} className="ca-search-icon" />
          <input
            type="text"
            placeholder="Rechercher par numéro, fournisseur ou note"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Rechercher une commande"
          />
          {searchTerm && (
            <button className="ca-search-clear" onClick={() => setSearchTerm("")} aria-label="Effacer la recherche"><X size={15} /></button>
          )}
        </div>
        <select className="ca-select" value={filterPeriode} onChange={(e) => setFilterPeriode(e.target.value)} aria-label="Période">
          <option value="all">Toutes les périodes</option>
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
        </select>
        <select className="ca-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Trier par">
          <option value="date_desc">Plus récentes</option>
          <option value="date_asc">Plus anciennes</option>
          <option value="montant_desc">Montant décroissant</option>
          <option value="montant_asc">Montant croissant</option>
          <option value="fournisseur">Fournisseur (A–Z)</option>
        </select>
        <div className="ca-seg" role="group" aria-label="Mode d'affichage">
          <button className={viewMode === "list" ? "is-on" : ""} onClick={() => setViewMode("list")} title="Vue liste" aria-pressed={viewMode === "list"}><List size={17} /></button>
          <button className={viewMode === "grid" ? "is-on" : ""} onClick={() => setViewMode("grid")} title="Vue tickets" aria-pressed={viewMode === "grid"}><Grid size={17} /></button>
        </div>
      </div>

      {/* ---------- Contenu ---------- */}
      {loading && commandes.length === 0 ? (
        <div className="ca-state"><span className="ca-loader" /><p>Chargement des commandes…</p></div>
      ) : loadError && commandes.length === 0 ? (
        <div className="ca-state ca-state--error">
          <AlertCircle size={26} />
          <p>{loadError}</p>
          <button className="ca-btn ca-btn--dark" onClick={loadCommandes}>Réessayer</button>
        </div>
      ) : (
        <div className={loading ? "ca-content is-loading" : "ca-content"}>
          <div className="ca-count">
            {sortedCommandes.length} commande{sortedCommandes.length > 1 ? "s" : ""}
            {hasFilters && <button className="ca-linkbtn" onClick={resetFilters}>Retirer les filtres</button>}
          </div>
          {currentItems.length === 0 ? renderEmpty() : viewMode === "grid" ? renderGrid() : renderTable()}

          {sortedCommandes.length > itemsPerPage && (
            <div className="ca-pager">
              <span className="ca-pager-info">
                {firstIdx + 1}–{Math.min(firstIdx + itemsPerPage, sortedCommandes.length)} sur {sortedCommandes.length}
              </span>
              <div className="ca-pager-ctrl">
                <button onClick={() => setCurrentPage(Math.max(page - 1, 1))} disabled={page === 1} aria-label="Page précédente"><ChevronLeft size={17} /></button>
                <span>Page {page} / {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.min(page + 1, totalPages))} disabled={page === totalPages} aria-label="Page suivante"><ChevronRight size={17} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- Barre de sélection ---------- */}
      {selectedIds.length > 0 && (
        <div className="ca-bulk" role="region" aria-label="Actions sur la sélection">
          <strong>{selectedIds.length}</strong> sélectionnée{selectedIds.length > 1 ? "s" : ""}
          <button className="ca-bulk-btn" onClick={handleBulkExport}><Download size={15} /> Exporter</button>
          {isAdmin && (
            <button className="ca-bulk-btn ca-bulk-btn--danger" onClick={() => setConfirm({ kind: "bulk" })} disabled={busy}>
              <Trash2 size={15} /> Supprimer
            </button>
          )}
          <button className="ca-bulk-close" onClick={() => setSelectedIds([])} aria-label="Désélectionner"><X size={16} /></button>
        </div>
      )}

      <ActionsMenu
        menu={menu}
        commande={menuCommande}
        canManage={canManage}
        isAdmin={isAdmin}
        onClose={() => setMenu(null)}
        onView={handleView}
        onEdit={handleEdit}
        onCancel={(c) => setConfirm({ kind: "cancel", commande: c })}
        onDelete={(c) => setConfirm({ kind: "delete", commande: c })}
      />

      {/* ============================================================
          MODAL : BON DE COMMANDE (création / édition)
          ============================================================ */}
      {showModal && (
        <div className="ca-overlay" role="dialog" aria-modal="true" aria-label="Bon de commande">
          <div className="ca-sheet">
            <header className="ca-sheet-head">
              <div className="ca-sheet-title">
                <span className="ca-sheet-mark"><ShoppingBasket size={21} /></span>
                <div>
                  <h2>{editingCommande ? "Modifier la commande" : "Nouvelle commande d'achat"}</h2>
                  <p>{editingCommande ? `Commande ${editingCommande.numero_commande}` : "Choisissez un fournisseur, puis composez la commande"}</p>
                </div>
              </div>
              <button className="ca-sheet-close" onClick={closeForm} aria-label="Fermer"><X size={20} /></button>
            </header>

            <div className="ca-sheet-body">
              <div className="ca-sheet-main">
                {modalError && (
                  <div className="ca-alert" role="alert"><AlertCircle size={16} />{modalError}</div>
                )}

                {/* Étape 1 */}
                <section className="ca-step">
                  <div className="ca-step-rail"><span className={`ca-step-n ${formData.id_fournisseur ? "is-done" : ""}`}>{formData.id_fournisseur ? <Check size={14} /> : 1}</span></div>
                  <div className="ca-step-body">
                    <h3>Fournisseur</h3>
                    <div className="ca-field-row">
                      <div className="ca-field ca-field--grow">
                        <Combobox
                          icon={Building}
                          value={fournisseurSearch}
                          onChange={onFournisseurText}
                          items={fournisseursListe}
                          getKey={(f) => f.id_fournisseur}
                          selectedKey={formData.id_fournisseur}
                          onSelect={selectFournisseur}
                          placeholder="Rechercher un fournisseur"
                          emptyText="Aucun fournisseur trouvé"
                          disabled={saving || formData.lignes.length > 0}
                          renderItem={(f) => (
                            <>
                              <div className="ca-opt-main">
                                <span className="ca-opt-name">{f.nom}</span>
                                <span className="ca-opt-sub">
                                  {f.ville && <span><MapPin size={12} /> {f.ville}</span>}
                                  {f.telephone && <span><Phone size={12} /> {f.telephone}</span>}
                                  {f.email && <span><Mail size={12} /> {f.email}</span>}
                                </span>
                              </div>
                            </>
                          )}
                        />
                      </div>
                      <div className="ca-field ca-field--date">
                        <input
                          type="date"
                          className="ca-input"
                          value={formData.date_commande}
                          onChange={(e) => setFormData((fd) => ({ ...fd, date_commande: e.target.value }))}
                          disabled={saving}
                          aria-label="Date de la commande"
                        />
                      </div>
                    </div>
                    {formData.lignes.length > 0 && (
                      <p className="ca-hint">Retirez tous les produits pour changer de fournisseur.</p>
                    )}
                  </div>
                </section>

                {/* Étape 2 */}
                <section className={`ca-step ${!formData.id_fournisseur ? "is-locked" : ""}`}>
                  <div className="ca-step-rail"><span className={`ca-step-n ${formData.lignes.length ? "is-done" : ""}`}>{formData.lignes.length ? <Check size={14} /> : 2}</span></div>
                  <div className="ca-step-body">
                    <h3>Produits <span className="ca-step-count">{formData.lignes.length}</span></h3>

                    <div className="ca-addbar">
                      <div className="ca-addbar-search">
                        <Combobox
                          icon={Search}
                          name="produit_search"
                          inputRef={produitInputRef}
                          value={produitSearch}
                          onChange={onProduitText}
                          items={produitsListe}
                          getKey={(p) => p.id_produit}
                          selectedKey={ligneForm.id_produit}
                          onSelect={selectProduit}
                          placeholder={formData.id_fournisseur ? "Rechercher une pièce, un modèle, une référence" : "Choisissez d'abord un fournisseur"}
                          emptyText="Aucun produit trouvé pour ce fournisseur"
                          disabled={saving || !formData.id_fournisseur || editingLigneIndex !== null}
                          renderItem={(p) => (
                            <>
                              <div className="ca-opt-main">
                                <span className="ca-opt-name">{p.nom}</span>
                                <span className="ca-opt-sub">
                                  {p.modele_nom && <span>{p.modele_nom}</span>}
                                  {p.reference && <span>Réf. {p.reference}</span>}
                                </span>
                              </div>
                              <span className="ca-opt-price">
                                {p.prix_achat && parseFloat(p.prix_achat) > 0 ? formatMontant(p.prix_achat) : "Prix à définir"}
                              </span>
                            </>
                          )}
                        />
                      </div>

                      {ligneForm.id_produit && (
                        <>
                          <div className="ca-chips">
                            {loadingUnites && <Loader size={15} className="ca-spin" />}
                            {unitesVente.map((u, idx) => (
                              <button
                                key={u.id_unite_vente ?? `base-${idx}`}
                                type="button"
                                className={`ca-chip ${selectedUnite?.id_unite_vente === u.id_unite_vente ? "is-on" : ""}`}
                                onClick={() => handleUniteChange(u)}
                                disabled={saving}
                                title={u.est_unite_base ? "Unité de base" : `× ${u.quantite_base}`}
                              >
                                {u.nom}
                                {u.quantite_base > 1 && <small>×{u.quantite_base}</small>}
                              </button>
                            ))}
                          </div>
                          <input
                            ref={qteRef}
                            type="text"
                            inputMode="numeric"
                            name="quantite"
                            className="ca-input ca-input--qty"
                            placeholder="Qté"
                            value={ligneForm.quantite}
                            onChange={handleLigneChange}
                            onKeyDown={(e) => e.key === "Enter" && addLigne()}
                            disabled={saving || editingLigneIndex !== null}
                            aria-label="Quantité"
                          />
                          <input
                            type="text"
                            inputMode="decimal"
                            name="prix_achat"
                            className="ca-input ca-input--price"
                            placeholder="Prix unitaire"
                            value={ligneForm.prix_achat}
                            onChange={handleLigneChange}
                            onKeyDown={(e) => e.key === "Enter" && addLigne()}
                            disabled={saving || editingLigneIndex !== null}
                            aria-label="Prix d'achat unitaire"
                          />
                          <button
                            type="button"
                            className="ca-addbtn"
                            onClick={addLigne}
                            disabled={saving || editingLigneIndex !== null || previewQte <= 0}
                            title="Ajouter à la commande"
                            aria-label="Ajouter à la commande"
                          >
                            <Plus size={19} />
                          </button>
                        </>
                      )}
                    </div>

                    {ligneForm.id_produit && selectedUnite && previewQte > 0 && (
                      <div className="ca-preview">
                        <span>
                          <strong>{previewQte}</strong> {selectedUnite.nom}
                          {selectedUnite.quantite_base > 1 && <> soit <strong>{previewBase}</strong> unités de base</>}
                        </span>
                        {previewTotal > 0 && <strong>{formatMontant(previewTotal)}</strong>}
                      </div>
                    )}

                    {formData.lignes.length === 0 ? (
                      <div className="ca-lines-empty">
                        <Package size={22} />
                        <p>Aucun produit dans cette commande</p>
                        <small>Recherchez une pièce ci-dessus, indiquez la quantité puis appuyez sur Entrée.</small>
                      </div>
                    ) : (
                      <div className="ca-lines">
                        <div className="ca-line ca-line--head">
                          <span>Produit</span><span>Unité</span><span className="ca-num">Qté</span>
                          <span className="ca-num">Prix unit.</span><span className="ca-num">Total</span><span />
                        </div>
                        {formData.lignes.map((l, index) => {
                          const editing = editingLigneIndex === index;
                          const q = num(l.quantite);
                          const p = num(l.prix_achat);
                          const hasPrix = l.prix_achat !== null && l.prix_achat !== undefined && l.prix_achat !== "" && p > 0;
                          return (
                            <div key={`${l.id_produit}-${l.id_unite_vente}-${index}`} className={`ca-line ${editing ? "is-editing" : ""}`}>
                              <div className="ca-line-name">
                                <strong>{l.produit_nom}</strong>
                                {l.modele_nom && <small>{l.modele_nom}</small>}
                              </div>
                              <span className="ca-unit">{l.nom_unite_vente}{l.quantite_base > 1 && <small>×{l.quantite_base}</small>}</span>
                              {editing ? (
                                <input className="ca-line-input" value={l.quantite} inputMode="numeric"
                                  onChange={(e) => updateLigne(index, "quantite", e.target.value.replace(/[^0-9]/g, ""))}
                                  onKeyDown={(e) => e.key === "Enter" && saveLigneEdit(index)} aria-label="Quantité" />
                              ) : (
                                <span className="ca-num ca-strong">{q}</span>
                              )}
                              {editing ? (
                                <input className="ca-line-input" value={l.prix_achat ?? ""} inputMode="decimal" placeholder="—"
                                  onChange={(e) => updateLigne(index, "prix_achat", e.target.value.replace(/[^0-9,.]/g, ""))}
                                  onKeyDown={(e) => e.key === "Enter" && saveLigneEdit(index)} aria-label="Prix unitaire" />
                              ) : (
                                <span className={`ca-num ${hasPrix ? "" : "ca-undef"}`}>{hasPrix ? formatMontant(p) : "À définir"}</span>
                              )}
                              <span className="ca-num ca-strong">{hasPrix ? formatMontant(q * p) : "—"}</span>
                              <div className="ca-line-act">
                                {editing ? (
                                  <>
                                    <button className="ca-ibtn ca-ibtn--ok" onClick={() => saveLigneEdit(index)} title="Valider" aria-label="Valider"><Check size={15} /></button>
                                    <button className="ca-ibtn ca-ibtn--no" onClick={cancelEditLigne} title="Annuler" aria-label="Annuler"><X size={15} /></button>
                                  </>
                                ) : (
                                  <>
                                    <button className="ca-ibtn" onClick={() => startEditLigne(index)} disabled={saving || editingLigneIndex !== null} title="Modifier" aria-label="Modifier"><Edit size={15} /></button>
                                    <button className="ca-ibtn ca-ibtn--no" onClick={() => removeLigne(index)} disabled={saving || editingLigneIndex !== null} title="Retirer" aria-label="Retirer"><Trash2 size={15} /></button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Ticket récapitulatif */}
              <aside className="ca-sheet-side">
                <div className="ca-receipt">
                  <h3>Bon de commande</h3>
                  <div className="ca-rc-meta">
                    <div><span>Fournisseur</span><strong>{selectedFournisseur?.nom || "—"}</strong></div>
                    <div><span>Date</span><strong>{formatDate(formData.date_commande)}</strong></div>
                  </div>
                  <div className="ca-rc-sep" />
                  {formData.lignes.length === 0 ? (
                    <p className="ca-rc-empty">Les produits ajoutés apparaîtront ici.</p>
                  ) : (
                    <ul className="ca-rc-list">
                      {formData.lignes.map((l, i) => {
                        const hasPrix = num(l.prix_achat) > 0;
                        return (
                          <li key={i}>
                            <div className="ca-rc-line">
                              <span className="ca-rc-name">{l.produit_nom}</span>
                              <i className="ca-rc-dots" />
                              <span className="ca-rc-val">{hasPrix ? formatMontant(num(l.quantite) * num(l.prix_achat)) : "—"}</span>
                            </div>
                            <small>{num(l.quantite)} {l.nom_unite_vente}{hasPrix ? ` × ${formatMontant(l.prix_achat)}` : ""}</small>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="ca-rc-sep" />
                  <div className="ca-rc-count"><span>Lignes</span><strong>{formData.lignes.length}</strong></div>
                  <div className="ca-rc-total">
                    <span>Total</span>
                    <strong>{totalCommande > 0 ? formatMontant(totalCommande) : "À définir"}</strong>
                  </div>
                  {totalCommande === 0 && formData.lignes.length > 0 && (
                    <p className="ca-rc-note">Les prix pourront être renseignés à la réception.</p>
                  )}
                </div>
              </aside>
            </div>

            <footer className="ca-sheet-foot">
              <button className="ca-btn ca-btn--ghost" onClick={closeForm} disabled={saving}>Annuler</button>
              <button
                className="ca-btn ca-btn--signal"
                onClick={handleSave}
                disabled={saving || !formData.id_fournisseur || formData.lignes.length === 0 || editingLigneIndex !== null}
              >
                {saving ? (<><Loader size={16} className="ca-spin" /> Enregistrement…</>) : (<><Check size={17} /> {editingCommande ? "Mettre à jour" : "Créer la commande"}</>)}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL : DÉTAILS
          ============================================================ */}
      {showDetailModal && selectedCommande && (
        <div className="ca-overlay" onClick={() => setShowDetailModal(false)} role="dialog" aria-modal="true" aria-label="Détails de la commande">
          <div className="ca-detail" onClick={(e) => e.stopPropagation()}>
            <header className="ca-sheet-head">
              <div className="ca-sheet-title">
                <span className="ca-sheet-mark"><FileText size={21} /></span>
                <div>
                  <h2>{selectedCommande.numero_commande}</h2>
                  <p><Calendar size={13} /> {formatDate(selectedCommande.date_commande)}</p>
                </div>
              </div>
              <div className="ca-detail-status">
                <StatusTag statut={selectedCommande.statut} />
                <button className="ca-sheet-close" onClick={() => setShowDetailModal(false)} aria-label="Fermer"><X size={20} /></button>
              </div>
            </header>

            <div className="ca-detail-body">
              <div className="ca-detail-cols">
                <section>
                  <h4><Building size={15} /> Fournisseur</h4>
                  <dl>
                    <div><dt>Nom</dt><dd>{selectedCommande.fournisseur_nom || "-"}</dd></div>
                    <div><dt>Téléphone</dt><dd>{selectedCommande.fournisseur_telephone || "-"}</dd></div>
                    <div><dt>Email</dt><dd>{selectedCommande.fournisseur_email || "-"}</dd></div>
                    <div><dt>Ville</dt><dd>{selectedCommande.fournisseur_ville || "-"}</dd></div>
                  </dl>
                </section>
                <section>
                  <h4><FileText size={15} /> Informations</h4>
                  <dl>
                    <div><dt>Créée par</dt><dd>{selectedCommande.utilisateur_nom || "-"}</dd></div>
                    <div>
                      <dt>Montant total</dt>
                      <dd className="ca-detail-total">
                        {num(selectedCommande.montant_total) > 0 ? formatMontant(selectedCommande.montant_total) : <em className="ca-undef">À définir</em>}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>

              {selectedCommande.lignes && selectedCommande.lignes.length > 0 && (
                <section className="ca-detail-lines">
                  <h4><Package size={15} /> Produits commandés</h4>
                  <div className="ca-tablewrap ca-tablewrap--flat">
                    <table className="ca-table ca-table--compact">
                      <thead>
                        <tr><th>Produit</th><th>Unité</th><th className="ca-num">Qté</th><th className="ca-num">Prix unit.</th><th className="ca-num">Total</th></tr>
                      </thead>
                      <tbody>
                        {selectedCommande.lignes.map((l, idx) => {
                          const qte = num(l.quantite);
                          const prix = l.prix_achat !== null && l.prix_achat !== undefined ? parseFloat(l.prix_achat) : null;
                          const total = prix !== null ? qte * prix : null;
                          const qteBase = parseFloat(l.quantite_totale_base) || qte * (parseFloat(l.quantite_base) || 1);
                          return (
                            <tr key={idx}>
                              <td>
                                <div className="ca-strong">{l.produit_nom}</div>
                                {l.modele_nom && <div className="ca-muted ca-small">{l.modele_nom}</div>}
                              </td>
                              <td>
                                <span className="ca-unit"><Box size={12} />{l.nom_unite_vente || "Unité"}{l.quantite_base > 1 && <small>({l.quantite_base})</small>}</span>
                              </td>
                              <td className="ca-num">
                                <strong>{qte}</strong>
                                {l.quantite_base > 1 && <div className="ca-muted ca-small">= {qteBase} unités</div>}
                              </td>
                              <td className="ca-num">{prix !== null ? formatMontant(prix) : <em className="ca-undef">À définir</em>}</td>
                              <td className="ca-num">{total !== null ? <strong>{formatMontant(total)}</strong> : <em className="ca-undef">—</em>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="4"><strong>Total commande</strong></td>
                          <td className="ca-num">
                            {num(selectedCommande.montant_total) > 0 ? <strong>{formatMontant(selectedCommande.montant_total)}</strong> : <em className="ca-undef">À définir à la réception</em>}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              )}
            </div>

            <div className="ca-detail-foot">
              <BonCommandePDFActions
                commandeData={{ ...selectedCommande, magasin }}
                onClose={() => setShowDetailModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={runConfirm}
        title={confirmProps.title}
        message={confirmProps.message}
        type="danger"
        confirmLabel={confirmProps.confirmLabel}
        cancelLabel="Annuler"
        loading={busy}
      />
    </div>
  );
};

export default CommandesAchat;
