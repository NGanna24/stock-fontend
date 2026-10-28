// pages/Produits/Produits.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Download, X, Grid, List,
  RefreshCw, Package, Save, AlertCircle, CheckCircle, Box, Tag, Filter, Building,
  Eye, MoreVertical, Layers, AlertTriangle, Info, Check, MapPin, Banknote,
} from "lucide-react"; 
import ProduitService from "../../services/produitService";
import UniteVenteService from "../../services/uniteVenteService";
import CategorieService from "../../services/categorieService";
import MarqueService from "../../services/marqueService";
import ModeleService from "../../services/modeleService";
import UniteService from "../../services/uniteService";
import FournisseurService from "../../services/fournisseurService";
import { useUser } from "../../context/AuthContext";
import SelectSearch from "../../components/SelectSearch/SelectSearch";
import StockSelector from "../../components/StockSelector/StockSelector";
import StockInputWithSelector from "../../components/StockSelector/StockInputWithSelector";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import "./Produits.css";
import { useDisableNumberScroll } from "../../hooks/useDisableNumberScroll";
/* ============================================================
   CONSTANTES & UTILITAIRES
   ============================================================ */
const INITIAL_FORM_DATA = {
  nom: "", description: "", id_fournisseur: "", id_categorie: "", id_marque: "",
  id_modele: "", id_unite: "", prix_achat: "", prix_vente: "", quantite_stock: "",
  quantite_minimale: "", quantite_maximale: "", emplacement: "", rayon: "", etagere: "",
};

const INITIAL_FILTERS = {
  categorie: "", marque: "", modele: "", fournisseur: "", statut: "",
  stockMin: "", stockMax: "", prixMin: "", prixMax: "",
};

const ITEMS_PER_PAGE = 10;
const num = (v) => Number(v || 0);

const formatPrice = (value) =>
  num(value).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return isNaN(d) ? "N/A" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const isLow = (p) => num(p.quantite_stock) > 0 && num(p.quantite_stock) <= num(p.quantite_minimale);

// ton : ok | low | out
const getTone = (p) => (p.statut === "rupture" ? "out" : isLow(p) ? "low" : "ok");

// Niveau de remplissage du stock (barre + repère du seuil minimum)
const levelInfo = (p) => {
  const stock = num(p.quantite_stock);
  const min = num(p.quantite_minimale);
  const max = num(p.quantite_maximale);
  const ref = max > 0 ? max : min > 0 ? min * 3 : 0;
  if (!ref) return { pct: null, minPct: null, tone: getTone(p) };
  return {
    pct: Math.max(0, Math.min(100, (stock / ref) * 100)),
    minPct: min > 0 ? Math.min(100, (min / ref) * 100) : null,
    tone: getTone(p),
  };
};

const nameOf = (list, key, value) => {
  if (!value) return "";
  const item = list.find((x) => String(x[key]) === String(value));
  return item ? item.nom : "";
};

/* ============================================================
   PETITS COMPOSANTS
   ============================================================ */
const StockTag = ({ produit }) => {
  const tone = getTone(produit);
  const label =
    produit.statut === "rupture" ? "Rupture"
    : tone === "low" ? "Stock faible"
    : produit.statut === "disponible" ? "Disponible"
    : produit.statut || "Inconnu";
  return (
    <span className={`pr-tag pr-tag--${tone}`}>
      <i className="pr-tag-dot" />
      {label}
    </span>
  );
};

const LevelBar = ({ produit }) => {
  const lv = levelInfo(produit);
  if (lv.pct === null) return null;
  return (
    <div className={`pr-level pr-level--${lv.tone}`} title="Niveau de stock (le repère marque le seuil minimum)">
      <i style={{ width: `${lv.pct}%` }} />
      {lv.minPct !== null && <b style={{ left: `${lv.minPct}%` }} />}
    </div>
  );
};

const ActionsMenu = ({ menu, produit, canManage, onView, onEdit, onDelete, onClose }) => {
  if (!menu || !produit) return null;
  const style = { right: menu.right, ...(menu.up ? { bottom: menu.bottom } : { top: menu.top }) };
  const run = (fn) => () => { onClose(); fn(produit); };
  return createPortal(
    <div className="pr-menu" data-pr-menu style={style} role="menu">
      <button className="pr-menu-item" onClick={run(onView)} role="menuitem"><Eye size={15} /> Voir la fiche</button>
      {canManage && (
        <>
          <button className="pr-menu-item" onClick={run(onEdit)} role="menuitem"><Edit size={15} /> Modifier</button>
          <div className="pr-menu-sep" />
          <button className="pr-menu-item pr-menu-item--danger" onClick={run(onDelete)} role="menuitem"><Trash2 size={15} /> Supprimer</button>
        </>
      )}
    </div>,
    document.body
  );
};

/* ============================================================
   PAGE
   ============================================================ */
const Produits = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem("token");
    useDisableNumberScroll(true);


  // ---------- Données ----------
  const [produits, setProduits] = useState([]);
  const [allProduits, setAllProduits] = useState([]); // non filtrés : sert aux statistiques
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const reqRef = useRef(0);
  const hasActiveRef = useRef(false);

  const [categories, setCategories] = useState([]);
  const [marques, setMarques] = useState([]);
  const [modeles, setModeles] = useState([]);
  const [unites, setUnites] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);

  // ---------- Liste ----------
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 720 ? "grid" : "list"
  );
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [onlyLow, setOnlyLow] = useState(false);
  const [menu, setMenu] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // ---------- Modals ----------
  const [showModal, setShowModal] = useState(false);
  const [editingProduit, setEditingProduit] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [unitesVente, setUnitesVente] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [createdProduitId, setCreatedProduitId] = useState(null);
  const [opening, setOpening] = useState(false);

  const [produitToDelete, setProduitToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [produitToView, setProduitToView] = useState(null);

  const canManage = !!user && ["admin", "manager"].includes(user.role);

  const showToast = (type, message) => {
    clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* ---------- Debounces ---------- */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const t = setTimeout(() => setAppliedFilters(filters), 400);
    return () => clearTimeout(t);
  }, [filters]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, appliedFilters, onlyLow]);

  /* ---------- Chargement ---------- */
  const loadProduits = useCallback(async () => {
    if (!token) return;
    const reqId = ++reqRef.current;
    setLoading(true);
    try {
      const params = { ...appliedFilters };
      if (debouncedSearch.trim().length >= 2) params.search = debouncedSearch.trim();
      Object.keys(params).forEach((k) => {
        if (params[k] === "" || params[k] === undefined || params[k] === null) delete params[k];
      });
      const hasF = Object.keys(params).length > 0;
      hasActiveRef.current = hasF;

      const response = hasF
        ? await ProduitService.filterProduits(token, params)
        : await ProduitService.getAllProduits(token);

      if (reqId !== reqRef.current) return; // réponse obsolète
      if (response.success) {
        setProduits(response.data || []);
        if (!hasF) setAllProduits(response.data || []);
        setLoadError(null);
      } else {
        setLoadError(response.message || "Impossible de charger les produits");
      }
    } catch (err) {
      console.error("❌ LoadProduits error:", err);
      if (reqId === reqRef.current) setLoadError(err.message || "Impossible de charger les produits");
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }, [token, appliedFilters, debouncedSearch]);

  const loadAll = useCallback(async () => {
    try {
      const r = await ProduitService.getAllProduits(token);
      if (r.success) setAllProduits(r.data || []);
    } catch (err) { console.error("❌ LoadAll:", err); }
  }, [token]);

  // Recharge la liste (et les stats si des filtres sont actifs)
  const reload = async () => {
    await loadProduits();
    if (hasActiveRef.current) await loadAll();
  };

  useEffect(() => {
    if (isAuthenticated && token) loadProduits();
  }, [isAuthenticated, token, loadProduits]);

  useEffect(() => {
    if (!(isAuthenticated && token)) return;
    const safe = async (fn, set, label) => {
      try { const r = await fn(token); if (r.success) set(r.data || []); }
      catch (err) { console.error(`❌ ${label}:`, err); }
    };
    safe(CategorieService.getAllCategories, setCategories, "LoadCategories");
    safe(MarqueService.getAllMarques, setMarques, "LoadMarques");
    safe(ModeleService.getAllModeles, setModeles, "LoadModeles");
    safe(UniteService.getAllUnites, setUnites, "LoadUnites");
    safe(FournisseurService.getActiveFournisseurs, setFournisseurs, "LoadFournisseurs");
  }, [isAuthenticated, token]);

  /* ---------- Menu d'actions ---------- */
  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    const onDown = (e) => { if (!e.target.closest("[data-pr-menu],[data-pr-more]")) close(); };
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
      else if (produitToView) setProduitToView(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu, showModal, saving, produitToView]);

  useEffect(() => {
    document.body.style.overflow = showModal || produitToView ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showModal, produitToView]);

  /* ============================================================
     STATS / FILTRES / PAGINATION
     ============================================================ */
  const stats = useMemo(() => {
    const total = allProduits.length;
    const disponibles = allProduits.filter((p) => p.statut === "disponible").length;
    const rupture = allProduits.filter((p) => p.statut === "rupture").length;
    const faible = allProduits.filter((p) => p.statut !== "rupture" && isLow(p)).length;
    const valeur = allProduits.reduce((s, p) => s + num(p.quantite_stock) * num(p.prix_achat), 0);
    const enStock = allProduits.filter((p) => p.statut !== "rupture").length;
    return { total, disponibles, rupture, faible, valeur, taux: total ? Math.round((enStock / total) * 100) : 0 };
  }, [allProduits]);

  const visible = useMemo(
    () => (onlyLow ? produits.filter((p) => p.statut !== "rupture" && isLow(p)) : produits),
    [produits, onlyLow]
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const firstIdx = (page - 1) * ITEMS_PER_PAGE;
  const currentItems = visible.slice(firstIdx, firstIdx + ITEMS_PER_PAGE);

  const activeFiltersCount = useMemo(
    () => Object.values(filters).filter((v) => v !== "").length + (onlyLow ? 1 : 0),
    [filters, onlyLow]
  );
  const hasFilters = activeFiltersCount > 0 || searchTerm.trim().length > 0;

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const setQuick = (statut, low) => {
    const next = { ...filters, statut };
    setFilters(next);
    setAppliedFilters(next); // application immédiate, sans attendre le debounce
    setOnlyLow(low);
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setOnlyLow(false);
    setSearchTerm("");
    setDebouncedSearch("");
  };

  const quickKey = onlyLow ? "faible" : filters.statut === "disponible" ? "disponible" : filters.statut === "rupture" ? "rupture" : "";
  const stages = [
    { key: "", label: "Tous", count: stats.total, tone: "all", run: () => setQuick("", false) },
    { key: "disponible", label: "Disponibles", count: stats.disponibles, tone: "ok", run: () => setQuick("disponible", false) },
    { key: "faible", label: "Stock faible", count: stats.faible, tone: "low", run: () => setQuick("", true) },
    { key: "rupture", label: "En rupture", count: stats.rupture, tone: "out", run: () => setQuick("rupture", false) },
  ];

  /* ============================================================
     FORMULAIRE
     ============================================================ */
  const uniteSelectionneeForm = useMemo(() => {
    if (!formData.id_unite) return null;
    const u = unites.find((x) => String(x.id_unite) === String(formData.id_unite));
    return u ? { nom: u.nom, symbole: u.symbole || "" } : null;
  }, [formData.id_unite, unites]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "nom" || name === "id_modele") setDuplicateWarning(null);
  };

  const handleAddUniteVente = () =>
    setUnitesVente((prev) => [
      ...prev,
      {
        id_unite_vente: null, nom: "", quantite_base: "", prix_vente: "", prix_achat: "",
        est_principal: prev.filter((u) => !u.isDeleted).length === 0, isNew: true, isDeleted: false,
      },
    ]);

  const handleUniteVenteChange = (index, field, value) =>
    setUnitesVente((prev) => prev.map((u, i) => (i === index ? { ...u, [field]: value } : u)));

  const handleRemoveUniteVente = (index) =>
    setUnitesVente((prev) => {
      const target = prev[index];
      let next;
      if (target.id_unite_vente) next = prev.map((u, i) => (i === index ? { ...u, isDeleted: true } : u));
      else next = prev.filter((_, i) => i !== index);
      // Si l'unité principale disparaît, la première restante devient principale
      const actives = next.filter((u) => !u.isDeleted);
      if (actives.length > 0 && !actives.some((u) => u.est_principal)) {
        const firstId = next.findIndex((u) => !u.isDeleted);
        next = next.map((u, i) => (i === firstId ? { ...u, est_principal: true } : u));
      }
      return next;
    });

  const handleSetUnitePrincipale = (index) =>
    setUnitesVente((prev) => prev.map((u, i) => ({ ...u, est_principal: i === index })));

  const resetModal = () => {
    setShowModal(false);
    setEditingProduit(null);
    setFormData(INITIAL_FORM_DATA);
    setUnitesVente([]);
    setDuplicateWarning(null);
    setCurrentStep(1);
    setCreatedProduitId(null);
  };

  const handleAdd = () => {
    setEditingProduit(null);
    setFormData(INITIAL_FORM_DATA);
    setUnitesVente([]);
    setDuplicateWarning(null);
    setCurrentStep(1);
    setCreatedProduitId(null);
    setShowModal(true);
  };

  const uniteBaseParDefaut = (produit) => ({
    id_unite_vente: null, nom: produit.unite_nom || "Unité", quantite_base: 1,
    prix_vente: produit.prix_vente || 0, prix_achat: produit.prix_achat || 0,
    est_principal: true, isNew: true, isDeleted: false,
  });

  const handleEdit = async (produit) => {
    if (opening) return;
    setOpening(true);
    setEditingProduit(produit);
    setDuplicateWarning(null);
    setFormData({
      nom: produit.nom || "", description: produit.description || "",
      id_fournisseur: produit.id_fournisseur || "", id_categorie: produit.id_categorie || "",
      id_marque: produit.id_marque || "", id_modele: produit.id_modele || "", id_unite: produit.id_unite || "",
      prix_achat: produit.prix_achat ?? "", prix_vente: produit.prix_vente ?? "",
      quantite_stock: produit.quantite_stock ?? "", quantite_minimale: produit.quantite_minimale ?? "",
      quantite_maximale: produit.quantite_maximale ?? "", emplacement: produit.emplacement || "",
      rayon: produit.rayon || "", etagere: produit.etagere || "",
    });
    try {
      const res = await UniteVenteService.getByProduit(token, produit.id_produit);
      if (res.success && res.data && res.data.length > 0) {
        setUnitesVente(
          res.data.map((u) => ({
            id_unite_vente: u.id_unite_vente, nom: u.nom, quantite_base: u.quantite_base,
            prix_vente: u.prix_vente, prix_achat: u.prix_achat || 0,
            est_principal: u.est_principal === 1 || u.est_principal === true,
            isNew: false, isDeleted: false,
          }))
        );
      } else setUnitesVente([uniteBaseParDefaut(produit)]);
    } catch (err) {
      console.error("❌ LoadUnitesVente:", err);
      setUnitesVente([uniteBaseParDefaut(produit)]);
    } finally {
      setOpening(false);
    }
    setCurrentStep(1);
    setCreatedProduitId(produit.id_produit);
    setShowModal(true);
  };

  const buildUnitesPayload = () => {
    const actives = unitesVente.filter((u) => !u.isDeleted);
    return {
      unites_vente: actives.map((u) => ({
        id_unite_vente: u.id_unite_vente || null,
        nom: u.nom.trim(),
        quantite_base: parseFloat(u.quantite_base) || 1,
        prix_vente: parseFloat(u.prix_vente) || 0,
        prix_achat: parseFloat(u.prix_achat) || 0,
        est_principal: u.est_principal,
      })),
      unites_vente_deleted: unitesVente.filter((u) => u.isDeleted && u.id_unite_vente).map((u) => u.id_unite_vente),
    };
  };

  const buildBase = () => ({
    ...formData,
    nom: formData.nom.trim(),
    description: formData.description?.trim() || "",
    prix_achat: parseFloat(formData.prix_achat) || 0,
    prix_vente: parseFloat(formData.prix_vente) || 0,
    id_fournisseur: formData.id_fournisseur || null,
    id_categorie: formData.id_categorie || null,
    id_marque: formData.id_marque || null,
    id_modele: formData.id_modele || null,
    id_unite: formData.id_unite || null,
  });

  const stockFields = () => ({
    quantite_stock: parseFloat(formData.quantite_stock) || 0,
    quantite_minimale: parseFloat(formData.quantite_minimale) || 0,
    quantite_maximale: parseFloat(formData.quantite_maximale) || 0,
    emplacement: formData.emplacement?.trim() || "",
    rayon: formData.rayon?.trim() || "",
    etagere: formData.etagere?.trim() || "",
  });

  // Étape 1 : fiche produit
  const handleSaveAndNext = async () => {
    if (!formData.nom.trim()) return showToast("warning", "Saisissez un nom de produit");
    if (!formData.id_unite) return showToast("warning", "Choisissez une unité de base");
    if (!formData.id_fournisseur) return showToast("warning", "Sélectionnez un fournisseur");

    for (const u of unitesVente.filter((x) => !x.isDeleted)) {
      if (!u.nom || !u.nom.trim()) return showToast("warning", "Toutes les unités de vente doivent avoir un nom");
      if (!u.quantite_base || parseFloat(u.quantite_base) <= 0)
        return showToast("warning", `La quantité de base de « ${u.nom} » doit être supérieure à 0`);
      if (!u.prix_vente || parseFloat(u.prix_vente) <= 0)
        return showToast("warning", `Le prix de vente de « ${u.nom} » doit être supérieur à 0`);
    }

    setSaving(true);
    setDuplicateWarning(null);
    try {
      // Création : le stock démarre à 0 (saisi à l'étape 2).
      // Modification : on renvoie les valeurs actuelles pour ne jamais remettre le stock à zéro.
      const stock = editingProduit
        ? stockFields()
        : { quantite_stock: 0, quantite_minimale: 0, quantite_maximale: 0, emplacement: "", rayon: "", etagere: "" };

      const data = { ...buildBase(), ...stock, ...buildUnitesPayload() };
      const response = editingProduit
        ? await ProduitService.updateProduit(token, editingProduit.id_produit, data)
        : await ProduitService.createProduit(token, data);

      if (response.success) {
        const idProduit = response.data?.id_produit || response.id_produit || editingProduit?.id_produit;
        setCreatedProduitId(idProduit);
        reload();

        // Synchronise les vrais identifiants d'unités renvoyés par le serveur et retire les unités supprimées
        const serveur = response.data?.unites_vente || [];
        setUnitesVente((prev) =>
          prev
            .filter((u) => !u.isDeleted)
            .map((u) => {
              const match = serveur.find((s) => s.nom && u.nom && s.nom.trim().toLowerCase() === u.nom.trim().toLowerCase());
              return match ? { ...u, id_unite_vente: match.id_unite_vente, isNew: false } : u;
            })
        );

        showToast("success", editingProduit ? "Produit modifié. Ajustez le stock ou passez cette étape." : "Produit créé. Vous pouvez saisir le stock.");
        setCurrentStep(2);
      } else if (response.isDuplicate) {
        setDuplicateWarning({ message: response.message, existingId: response.existingId });
      } else {
        showToast("error", response.message || "Erreur de sauvegarde");
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      showToast("error", err.message || "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // Étape 2 : stock & emplacement
  const handleSaveStock = async () => {
    if (!createdProduitId) return showToast("error", "Produit introuvable pour la mise à jour");
    setSaving(true);
    try {
      const data = { ...buildBase(), ...stockFields(), ...buildUnitesPayload() };
      const response = await ProduitService.updateProduit(token, createdProduitId, data);
      if (response.success) {
        showToast("success", editingProduit ? "Produit et stock mis à jour" : "Stock enregistré");
        await reload();
        resetModal();
      } else showToast("error", response.message || "Erreur de sauvegarde du stock");
    } catch (err) {
      console.error("❌ SaveStock error:", err);
      showToast("error", err.message || "Erreur de sauvegarde du stock");
    } finally {
      setSaving(false);
    }
  };

  const handleSkipStock = () => {
    showToast("success", editingProduit ? "Produit modifié" : "Produit créé");
    resetModal();
  };

  const handleDelete = async () => {
    if (!produitToDelete) return;
    setDeleting(true);
    try {
      const response = await ProduitService.deleteProduit(token, produitToDelete.id_produit);
      if (response.success) {
        showToast("success", "Produit supprimé");
        await reload();
      } else showToast("error", response.message || "Erreur de suppression");
    } catch (err) {
      console.error("❌ Delete error:", err);
      showToast("error", err.message || "Erreur de suppression");
    } finally {
      setDeleting(false);
      setProduitToDelete(null);
    }
  };

  const handleExport = async () => {
    try {
      const response = await ProduitService.exportProduits(token);
      if (response.success && response.data) {
        const blob = new Blob(["\uFEFF", response.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `produits_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showToast("success", "Export terminé");
      } else showToast("error", response.message || "Export impossible");
    } catch (err) {
      console.error("❌ Export error:", err);
      showToast("error", "Erreur lors de l'export");
    }
  };

  const openMenu = (e, produit) => {
    e.stopPropagation();
    if (menu?.id === produit.id_produit) return setMenu(null);
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({
      id: produit.id_produit,
      right: window.innerWidth - r.right,
      top: r.bottom + 6,
      bottom: window.innerHeight - r.top + 6,
      up: window.innerHeight - r.bottom < 170,
    });
  };
  const menuProduit = menu ? produits.find((p) => p.id_produit === menu.id) : null;

  const renderMore = (produit) => (
    <button
      className={`pr-more ${menu?.id === produit.id_produit ? "is-open" : ""}`}
      data-pr-more
      onClick={(e) => openMenu(e, produit)}
      aria-label={`Actions pour ${produit.nom}`}
      aria-haspopup="menu"
    >
      <MoreVertical size={17} />
    </button>
  );

  const stockProps = (p, variant) => ({
    idProduit: p.id_produit,
    stockBase: p.quantite_stock,
    unitesVente: p.unites_vente || [],
    uniteBase: { nom: p.unite_nom, symbole: p.unite_symbole },
    isLowStock: isLow(p),
    isRupture: p.statut === "rupture",
    variant,
  });

  /* ============================================================
     VUES
     ============================================================ */
  const renderEmpty = () => (
    <div className="pr-empty">
      <span className="pr-empty-icon"><Package size={30} /></span>
      {hasFilters ? (
        <>
          <h3>Aucun produit ne correspond</h3>
          <p>Modifiez la recherche ou retirez les filtres pour revoir tout le catalogue.</p>
          <button className="pr-btn pr-btn--ghost" onClick={resetFilters}>Retirer les filtres</button>
        </>
      ) : (
        <>
          <h3>Votre catalogue est vide</h3>
          <p>Ajoutez votre première pièce pour commencer à suivre le stock.</p>
          {canManage && <button className="pr-btn pr-btn--signal" onClick={handleAdd}><Plus size={17} /> Nouveau produit</button>}
        </>
      )}
    </div>
  );

const renderTable = () => (
  <div className="pr-tablewrap">
    <table className="pr-table">
      <colgroup>
        <col style={{ width: "44px" }} />
        <col />
        <col />
        <col />
        <col />
        <col />
        <col />
        <col />
        <col style={{ width: "56px" }} />
      </colgroup>
      <thead>
        <tr>
          <th className="pr-th-index">#</th>
          <th>Produit</th>
          <th>Fournisseur</th>
          <th>Catégorie</th>
          <th>Marque</th>
          <th className="pr-num">Prix de vente</th>
          <th>Stock</th>
          <th>Statut</th>
          <th className="pr-col-act" />
        </tr>
      </thead>
      <tbody>
        {currentItems.map((p, index) => (
          <tr
            key={p.id_produit}
            className={`pr-row pr-tone-${getTone(p)}`}
            onClick={() => setProduitToView(p)}
          >
            {/* 🆕 Numéro de ligne */}
            <td className="pr-td-index">{firstIdx + index + 1}</td>

            <td>
              <div className="pr-name">
                <strong title={p.nom}>{p.nom}</strong>
                {p.modele_nom && <small title={p.modele_nom}>{p.modele_nom}</small>}
              </div>
            </td>
            <td>
              <span className="pr-supplier">
                <Building size={14} />
                {p.fournisseur_nom || "—"}
              </span>
            </td>
            <td>
              {p.categorie_nom
                ? <span className="pr-chip"><Tag size={12} />{p.categorie_nom}</span>
                : <span className="pr-muted">—</span>}
            </td>
            <td>{p.marque_nom || <span className="pr-muted">—</span>}</td>
            <td className="pr-num pr-price">
              {formatPrice(p.prix_vente)} <small>FCFA</small>
            </td>
            <td className="pr-stockcell" onClick={(e) => e.stopPropagation()}>
              <StockSelector {...stockProps(p, "list")} />
              <LevelBar produit={p} />
            </td>
            <td><StockTag produit={p} /></td>
            <td className="pr-col-act" onClick={(e) => e.stopPropagation()}>
              {renderMore(p)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

  const renderGrid = () => (
    <div className="pr-grid">
      {currentItems.map((p) => (
        <article key={p.id_produit} className={`pr-card pr-tone-${getTone(p)}`}>
          <div className="pr-card-top" onClick={() => setProduitToView(p)}>
            <div className="pr-card-head">
              <StockTag produit={p} />
              <span className="pr-card-more" onClick={(e) => e.stopPropagation()}>{renderMore(p)}</span>
            </div>
            <h3 title={p.nom}>{p.nom}</h3>
            {p.modele_nom && <p className="pr-card-model">{p.modele_nom}</p>}
            <p className="pr-card-desc">{p.description || "Aucune description"}</p>
            <div className="pr-card-tags">
              {p.categorie_nom && <span className="pr-chip"><Tag size={12} />{p.categorie_nom}</span>}
              {p.marque_nom && <span className="pr-chip"><Box size={12} />{p.marque_nom}</span>}
            </div>
            {p.fournisseur_nom && <p className="pr-card-supplier"><Building size={14} />{p.fournisseur_nom}</p>}
          </div>
          <div className="pr-card-foot">
            <div className="pr-card-stock" onClick={(e) => e.stopPropagation()}>
              <span className="pr-card-label">Stock</span>
              <StockSelector {...stockProps(p, "grid")} />
              <LevelBar produit={p} />
            </div>
            <div className="pr-card-price" onClick={() => setProduitToView(p)}>
              <span className="pr-card-label">Prix de vente</span>
              <strong>{formatPrice(p.prix_vente)}</strong>
              <small>FCFA</small>
            </div>
          </div>
        </article>
      ))}
    </div>
  );

  /* ============================================================
     APERÇU ÉTIQUETTE (modal)
     ============================================================ */
  const fournisseurNom = nameOf(fournisseurs, "id_fournisseur", formData.id_fournisseur);
  const categorieNom = nameOf(categories, "id_categorie", formData.id_categorie);
  const marqueNom = nameOf(marques, "id_marque", formData.id_marque);
  const modeleNom = nameOf(modeles, "id_modele", formData.id_modele);
  const unitesActives = unitesVente.filter((u) => !u.isDeleted && u.nom);

  /* ============================================================
     RENDU
     ============================================================ */
  const v = produitToView;
  const marge = v ? num(v.prix_vente) - num(v.prix_achat) : 0;
  const margePct = v && num(v.prix_achat) > 0 ? Math.round((marge / num(v.prix_achat)) * 100) : null;
  const symb = v?.unite_symbole ? ` ${v.unite_symbole}` : "";

  return (
    <div className="pr-root">
      {toast && (
        <div className={`pr-toast pr-toast--${toast.type}`} role="status" aria-live="polite">
          {toast.type === "success" && <CheckCircle size={18} />}
          {toast.type === "error" && <AlertCircle size={18} />}
          {toast.type === "warning" && <AlertTriangle size={18} />}
          {toast.type === "info" && <Info size={18} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Fermer"><X size={15} /></button>
        </div>
      )}

      {/* ---------- En-tête ---------- */}
      <header className="pr-head">
        <div className="pr-head-id">
          <span className="pr-head-mark"><Package size={23} /></span>
          <div>
            <h1>Produits</h1>
            <p>Catalogue des pièces et suivi du stock</p>
          </div>
        </div>
        <div className="pr-head-actions">
          <button className="pr-btn pr-btn--ghost pr-btn--icon" onClick={reload} disabled={loading} title="Actualiser" aria-label="Actualiser">
            <RefreshCw size={17} className={loading ? "pr-spin" : ""} />
          </button>
          <button className="pr-btn pr-btn--ghost" onClick={handleExport}><Download size={17} /> Exporter</button>
          {canManage && <button className="pr-btn pr-btn--signal" onClick={handleAdd}><Plus size={18} /> Nouveau produit</button>}
        </div>
      </header>

      {/* ---------- Registre ---------- */}
      <section className="pr-ledger" aria-label="Synthèse du stock">
        <div className="pr-ledger-cell pr-ledger-main">
          <span className="pr-ledger-label">Valeur estimée du stock (prix d'achat)</span>
          <strong className="pr-ledger-figure">{Math.round(stats.valeur).toLocaleString("fr-FR")}<small>FCFA</small></strong>
          <span className="pr-ledger-sub">sur {stats.total} référence{stats.total > 1 ? "s" : ""}</span>
        </div>
        <div className="pr-ledger-cell">
          <span className="pr-ledger-label">À surveiller</span>
          <strong className="pr-ledger-mid">{stats.faible + stats.rupture}</strong>
          <span className="pr-ledger-sub">{stats.rupture} en rupture · {stats.faible} en stock faible</span>
        </div>
        <div className="pr-ledger-cell">
          <span className="pr-ledger-label">Références en stock</span>
          <strong className="pr-ledger-mid">{stats.taux}<small>%</small></strong>
          <div className="pr-gauge" role="img" aria-label={`${stats.taux}% des références en stock`}>
            {Array.from({ length: 10 }, (_, i) => <i key={i} className={i < Math.round(stats.taux / 10) ? "on" : ""} />)}
          </div>
        </div>
      </section>

      {/* ---------- Pipeline ---------- */}
      <nav className="pr-pipeline" aria-label="Filtrer par état du stock">
        {stages.map((s) => (
          <button key={s.key || "all"} className={`pr-stage pr-stage--${s.tone} ${quickKey === s.key ? "is-active" : ""}`} onClick={s.run} aria-pressed={quickKey === s.key}>
            <span className="pr-stage-count">{s.count}</span>
            <span className="pr-stage-label">{s.label}</span>
          </button>
        ))}
      </nav>

      {/* ---------- Barre d'outils ---------- */}
      <div className="pr-toolbar">
        <div className="pr-search">
          <Search size={17} className="pr-search-icon" />
          <input
            type="text"
            placeholder="Rechercher une pièce, une marque, un modèle (2 lettres minimum)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Rechercher un produit"
          />
          {searchTerm && <button className="pr-search-clear" onClick={() => setSearchTerm("")} aria-label="Effacer"><X size={15} /></button>}
        </div>
        <button className={`pr-filterbtn ${showFilters ? "is-on" : ""}`} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
          <Filter size={16} /> Filtres
          {activeFiltersCount > 0 && <span className="pr-filterbtn-count">{activeFiltersCount}</span>}
        </button>
        <div className="pr-seg" role="group" aria-label="Mode d'affichage">
          <button className={viewMode === "list" ? "is-on" : ""} onClick={() => setViewMode("list")} title="Vue liste" aria-pressed={viewMode === "list"}><List size={17} /></button>
          <button className={viewMode === "grid" ? "is-on" : ""} onClick={() => setViewMode("grid")} title="Vue fiches" aria-pressed={viewMode === "grid"}><Grid size={17} /></button>
        </div>
      </div>

      {showFilters && (
        <section className="pr-filters" aria-label="Filtres avancés">
          <div className="pr-filters-grid">
            <label className="pr-f"><span>Fournisseur</span>
              <select name="fournisseur" value={filters.fournisseur} onChange={handleFilterChange}>
                <option value="">Tous</option>
                {fournisseurs.map((f) => <option key={f.id_fournisseur} value={f.id_fournisseur}>{f.nom}</option>)}
              </select>
            </label>
            <label className="pr-f"><span>Catégorie</span>
              <select name="categorie" value={filters.categorie} onChange={handleFilterChange}>
                <option value="">Toutes</option>
                {categories.map((c) => <option key={c.id_categorie} value={c.id_categorie}>{c.nom}</option>)}
              </select>
            </label>
            <label className="pr-f"><span>Marque</span>
              <select name="marque" value={filters.marque} onChange={handleFilterChange}>
                <option value="">Toutes</option>
                {marques.map((m) => <option key={m.id_marque} value={m.id_marque}>{m.nom}</option>)}
              </select>
            </label>
            <label className="pr-f"><span>Modèle</span>
              <select name="modele" value={filters.modele} onChange={handleFilterChange}>
                <option value="">Tous</option>
                {modeles.map((m) => <option key={m.id_modele} value={m.id_modele}>{m.nom}</option>)}
              </select>
            </label>
            <label className="pr-f"><span>Stock minimum</span>
              <input type="number" name="stockMin" value={filters.stockMin} onChange={handleFilterChange} placeholder="Min" min="0" />
            </label>
            <label className="pr-f"><span>Stock maximum</span>
              <input type="number" name="stockMax" value={filters.stockMax} onChange={handleFilterChange} placeholder="Max" min="0" />
            </label>
            <label className="pr-f"><span>Prix min (FCFA)</span>
              <input type="number" name="prixMin" value={filters.prixMin} onChange={handleFilterChange} placeholder="Min" min="0" step="0.01" />
            </label>
            <label className="pr-f"><span>Prix max (FCFA)</span>
              <input type="number" name="prixMax" value={filters.prixMax} onChange={handleFilterChange} placeholder="Max" min="0" step="0.01" />
            </label>
          </div>
          <div className="pr-filters-foot">
            <span><strong>{visible.length}</strong> résultat{visible.length > 1 ? "s" : ""}</span>
            <button className="pr-btn pr-btn--ghost" onClick={resetFilters}><X size={15} /> Réinitialiser</button>
          </div>
        </section>
      )}

      {/* ---------- Contenu ---------- */}
      {loading && produits.length === 0 && !loadError ? (
        <div className="pr-state"><span className="pr-loader" /><p>Chargement des produits…</p></div>
      ) : loadError && produits.length === 0 ? (
        <div className="pr-state pr-state--error">
          <AlertCircle size={26} />
          <p>{loadError}</p>
          <button className="pr-btn pr-btn--dark" onClick={reload}>Réessayer</button>
        </div>
      ) : (
        <div className={loading ? "pr-content is-loading" : "pr-content"}>
          <div className="pr-count">
            {visible.length} produit{visible.length > 1 ? "s" : ""}
            {hasFilters && <button className="pr-linkbtn" onClick={resetFilters}>Retirer les filtres</button>}
          </div>
          {currentItems.length === 0 ? renderEmpty() : viewMode === "grid" ? renderGrid() : renderTable()}

          {visible.length > ITEMS_PER_PAGE && (
            <div className="pr-pager">
              <span>{firstIdx + 1}–{Math.min(firstIdx + ITEMS_PER_PAGE, visible.length)} sur {visible.length}</span>
              <div className="pr-pager-ctrl">
                <button onClick={() => setCurrentPage(Math.max(page - 1, 1))} disabled={page === 1} aria-label="Page précédente"><ChevronLeft size={17} /></button>
                <span>Page {page} / {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.min(page + 1, totalPages))} disabled={page === totalPages} aria-label="Page suivante"><ChevronRight size={17} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      <ActionsMenu
        menu={menu}
        produit={menuProduit}
        canManage={canManage}
        onClose={() => setMenu(null)}
        onView={(p) => setProduitToView(p)}
        onEdit={handleEdit}
        onDelete={(p) => setProduitToDelete(p)}
      />

      {/* ============================================================
          MODAL : FICHE PRODUIT (2 étapes)
          ============================================================ */}
      {showModal && (
        <div className="pr-overlay" role="dialog" aria-modal="true" aria-label="Fiche produit">
          <div className="pr-sheet">
            <header className="pr-sheet-head">
              <div className="pr-sheet-title">
                <span className="pr-sheet-mark"><Package size={21} /></span>
                <div>
                  <h2>{editingProduit ? "Modifier le produit" : "Nouveau produit"}</h2>
                  <p>{currentStep === 1 ? "Identité, prix et conditionnements" : "Quantités en stock et emplacement (facultatif)"}</p>
                </div>
              </div>
              <ol className="pr-steps" aria-label="Étapes">
                <li className={currentStep === 1 ? "is-current" : "is-done"}><span>{currentStep === 1 ? 1 : <Check size={13} />}</span> Fiche</li>
                <li className={currentStep === 2 ? "is-current" : ""}><span>2</span> Stock</li>
              </ol>
              <button className="pr-sheet-close" onClick={() => !saving && setShowModal(false)} aria-label="Fermer"><X size={20} /></button>
            </header>

            <div className="pr-sheet-body">
              <div className="pr-sheet-main">
                {currentStep === 1 && (
                  <>
                    {duplicateWarning && (
                      <div className="pr-alert" role="alert">
                        <AlertTriangle size={18} />
                        <div>
                          <strong>Produit déjà existant</strong>
                          <p>{duplicateWarning.message}</p>
                          {duplicateWarning.existingId && (
                            <button
                              type="button"
                              className="pr-linkbtn"
                              onClick={() => {
                                const existing = allProduits.find((p) => p.id_produit === duplicateWarning.existingId)
                                  || produits.find((p) => p.id_produit === duplicateWarning.existingId);
                                if (existing) { resetModal(); setProduitToView(existing); }
                                else showToast("info", "Produit existant introuvable dans la liste actuelle.");
                              }}
                            >
                              Voir le produit existant
                            </button>
                          )}
                        </div>
                        <button type="button" className="pr-alert-close" onClick={() => setDuplicateWarning(null)} aria-label="Fermer"><X size={14} /></button>
                      </div>
                    )}

                    <section className="pr-block">
                      <h3><Info size={15} /> Informations générales</h3>
                      <div className="pr-field">
                        <label className="pr-lbl">Fournisseur <em>*</em></label>
                        <SelectSearch
                          options={fournisseurs}
                          value={formData.id_fournisseur}
                          onChange={handleInputChange}
                          placeholder="Sélectionner un fournisseur..."
                          optionLabel="nom"
                          optionValue="id_fournisseur"
                          name="id_fournisseur"
                          disabled={saving}
                          renderOption={(f) => (
                            <span><strong>{f.nom}</strong>{f.ville && ` — ${f.ville}`}{f.pays && ` (${f.pays})`}</span>
                          )}
                        />
                      </div>
                      <div className="pr-field">
                        <label className="pr-lbl" htmlFor="pr-nom">Nom du produit <em>*</em></label>
                        <input id="pr-nom" className="pr-input" type="text" name="nom" value={formData.nom} onChange={handleInputChange} placeholder="Ex : Bougie NGK CR8E" disabled={saving} maxLength={100} />
                      </div>
                      <div className="pr-field">
                        <label className="pr-lbl" htmlFor="pr-desc">Description</label>
                        <textarea id="pr-desc" className="pr-input pr-textarea" name="description" value={formData.description} onChange={handleInputChange} placeholder="Compatibilité, particularités…" rows="2" disabled={saving} maxLength={500} />
                      </div>
                      <div className="pr-grid4">
                        <div className="pr-field">
                          <SelectSearch options={categories} value={formData.id_categorie} onChange={handleInputChange} label="Catégorie" placeholder="Sélectionner..." optionLabel="nom" optionValue="id_categorie" name="id_categorie" disabled={saving} />
                        </div>
                        <div className="pr-field">
                          <SelectSearch options={marques} value={formData.id_marque} onChange={handleInputChange} label="Marque" placeholder="Sélectionner..." optionLabel="nom" optionValue="id_marque" name="id_marque" disabled={saving} />
                        </div>
                        <div className="pr-field">
                          <SelectSearch options={modeles} value={formData.id_modele} onChange={handleInputChange} label="Modèle" placeholder="Sélectionner..." optionLabel="nom" optionValue="id_modele" name="id_modele" disabled={saving} />
                        </div>
                        <div className="pr-field">
                          <SelectSearch
                            options={unites}
                            value={formData.id_unite}
                            onChange={handleInputChange}
                            label="Unité de base *"
                            placeholder="Sélectionner..."
                            optionLabel="nom"
                            optionValue="id_unite"
                            name="id_unite"
                            disabled={saving}
                            renderOption={(u) => <span>{u.nom} <small>({u.symbole})</small></span>}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="pr-block">
                      <h3><Banknote size={15} /> Prix (FCFA)</h3>
                      <div className="pr-grid2">
                        <div className="pr-field">
                          <label className="pr-lbl" htmlFor="pr-pa">Prix d'achat</label>
                          <input id="pr-pa" className="pr-input" type="number" name="prix_achat" value={formData.prix_achat} onChange={handleInputChange} placeholder="0" step="0.01" min="0" disabled={saving} />
                          <small className="pr-hint">Prix proposé par le fournisseur</small>
                        </div>
                        <div className="pr-field">
                          <label className="pr-lbl" htmlFor="pr-pv">Prix de vente</label>
                          <input id="pr-pv" className="pr-input" type="number" name="prix_vente" value={formData.prix_vente} onChange={handleInputChange} placeholder="0" step="0.01" min="0" disabled={saving} />
                          <small className="pr-hint">Prix par défaut, en unité de base</small>
                        </div>
                      </div>
                    </section>

                    <section className="pr-block">
                      <div className="pr-block-head">
                        <h3><Layers size={15} /> Unités de vente</h3>
                        <button type="button" className="pr-btn pr-btn--sm pr-btn--dark" onClick={handleAddUniteVente} disabled={saving}><Plus size={14} /> Ajouter</button>
                      </div>
                      <p className="pr-hint">Les conditionnements dans lesquels vous vendez cette pièce (ex : bidon, carton, palette).</p>

                      {unitesVente.filter((u) => !u.isDeleted).length === 0 ? (
                        <div className="pr-units-empty">
                          <Box size={22} />
                          <p>Aucune unité de vente</p>
                          <small>Ajoutez-en une pour vendre autrement qu'à l'unité de base.</small>
                        </div>
                      ) : (
                        <div className="pr-units">
                          <div className="pr-unit pr-unit--head">
                            <span title="Unité principale">Princ.</span><span>Nom</span><span>Qté de base</span><span>Prix d'achat</span><span>Prix de vente</span><span />
                          </div>
                          {unitesVente.map((u, index) => {
                            if (u.isDeleted) return null;
                            return (
                              <div key={index} className={`pr-unit ${u.est_principal ? "is-main" : ""}`}>
                                <input type="radio" name="unite_principale" className="pr-radio" checked={!!u.est_principal} onChange={() => handleSetUnitePrincipale(index)} disabled={saving} title="Définir comme principale" aria-label="Unité principale" />
                                <input className="pr-input pr-input--sm" type="text" value={u.nom} onChange={(e) => handleUniteVenteChange(index, "nom", e.target.value)} placeholder="Ex : Carton" disabled={saving} maxLength={50} aria-label="Nom de l'unité" />
                                <input className="pr-input pr-input--sm" type="number" value={u.quantite_base} onChange={(e) => handleUniteVenteChange(index, "quantite_base", e.target.value)} placeholder="12" min="1" step="1" disabled={saving} aria-label="Quantité de base" />
                                <input className="pr-input pr-input--sm" type="number" value={u.prix_achat} onChange={(e) => handleUniteVenteChange(index, "prix_achat", e.target.value)} placeholder="0" min="0" step="0.01" disabled={saving} aria-label="Prix d'achat" />
                                <input className="pr-input pr-input--sm" type="number" value={u.prix_vente} onChange={(e) => handleUniteVenteChange(index, "prix_vente", e.target.value)} placeholder="0" min="0" step="0.01" disabled={saving} aria-label="Prix de vente" />
                                <button type="button" className="pr-ibtn pr-ibtn--no" onClick={() => handleRemoveUniteVente(index)} disabled={saving} title="Retirer" aria-label="Retirer l'unité"><Trash2 size={15} /></button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <div className="pr-note">
                      <Info size={18} />
                      <div>
                        <strong>Stock et emplacement (facultatif)</strong>
                        <span>
                          {editingProduit
                            ? "Ajustez le stock ou l'emplacement, ou passez cette étape si rien ne change."
                            : "Renseignez-les maintenant ou complétez-les plus tard."}
                        </span>
                      </div>
                    </div>

                    <section className="pr-block">
                      <h3><Box size={15} /> Quantités</h3>
                      {!formData.id_unite && (
                        <div className="pr-alert" role="alert"><AlertTriangle size={16} /><div><p>Choisissez d'abord une <strong>unité de base</strong> à l'étape 1 pour saisir le stock.</p></div></div>
                      )}
                      <div className="pr-grid3">
                        {[
                          ["quantite_stock", "Stock actuel"],
                          ["quantite_minimale", "Stock minimum"],
                          ["quantite_maximale", "Stock maximum"],
                        ].map(([name, label]) => (
                          <div className="pr-field" key={name}>
                            <label className="pr-lbl">{label}</label>
                            <StockInputWithSelector
                              value={formData[name]}
                              onChange={handleInputChange}
                              name={name}
                              idProduit={createdProduitId || "new"}
                              unitesVente={unitesVente.filter((u) => !u.isDeleted)}
                              uniteBase={uniteSelectionneeForm}
                              disabled={saving || !formData.id_unite}
                              placeholder={!formData.id_unite ? "Choisir l'unité de base" : "0"}
                            />
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="pr-block">
                      <h3><MapPin size={15} /> Emplacement en magasin</h3>
                      <div className="pr-grid3">
                        <div className="pr-field"><label className="pr-lbl" htmlFor="pr-emp">Emplacement</label>
                          <input id="pr-emp" className="pr-input" type="text" name="emplacement" value={formData.emplacement} onChange={handleInputChange} placeholder="Ex : A1" disabled={saving} maxLength={50} /></div>
                        <div className="pr-field"><label className="pr-lbl" htmlFor="pr-ray">Rayon</label>
                          <input id="pr-ray" className="pr-input" type="text" name="rayon" value={formData.rayon} onChange={handleInputChange} placeholder="Ex : R3" disabled={saving} maxLength={50} /></div>
                        <div className="pr-field"><label className="pr-lbl" htmlFor="pr-eta">Étagère</label>
                          <input id="pr-eta" className="pr-input" type="text" name="etagere" value={formData.etagere} onChange={handleInputChange} placeholder="Ex : E2" disabled={saving} maxLength={50} /></div>
                      </div>
                    </section>
                  </>
                )}
              </div>

              {/* Aperçu étiquette */}
              <aside className="pr-sheet-side">
                <div className="pr-tagcard">
                  <div className="pr-tagcard-hole" />
                  <p className="pr-tagcard-meta">{fournisseurNom || "Fournisseur"}{categorieNom ? ` · ${categorieNom}` : ""}</p>
                  <h4>{formData.nom.trim() || "Nom du produit"}</h4>
                  <p className="pr-tagcard-sub">{[marqueNom, modeleNom].filter(Boolean).join(" — ") || "Marque — Modèle"}</p>
                  <div className="pr-tagcard-price">
                    <strong>{formatPrice(formData.prix_vente)}</strong>
                    <small>FCFA{uniteSelectionneeForm ? ` / ${uniteSelectionneeForm.nom}` : ""}</small>
                  </div>
                  {unitesActives.length > 0 && (
                    <ul className="pr-tagcard-units">
                      {unitesActives.map((u, i) => (
                        <li key={i}>
                          <span>{u.nom}{num(u.quantite_base) > 1 ? ` ×${num(u.quantite_base)}` : ""}{u.est_principal ? " ★" : ""}</span>
                          <b>{formatPrice(u.prix_vente)}</b>
                        </li>
                      ))}
                    </ul>
                  )}
                  {currentStep === 2 && (formData.emplacement || formData.rayon || formData.etagere) && (
                    <p className="pr-tagcard-loc"><MapPin size={13} /> {[formData.emplacement, formData.rayon, formData.etagere].filter(Boolean).join(" / ")}</p>
                  )}
                </div>
                <p className="pr-side-note">Aperçu de la fiche, mis à jour pendant la saisie.</p>
              </aside>
            </div>

            <footer className="pr-sheet-foot">
              {currentStep === 1 ? (
                <>
                  <button className="pr-btn pr-btn--ghost" onClick={() => setShowModal(false)} disabled={saving}>Annuler</button>
                  <button className="pr-btn pr-btn--signal" onClick={handleSaveAndNext} disabled={saving || !formData.id_fournisseur || !formData.nom.trim()}>
                    {saving ? (<><RefreshCw size={16} className="pr-spin" /> Enregistrement…</>) : (<><Save size={17} /> {editingProduit ? "Mettre à jour et continuer" : "Enregistrer et continuer"} <ChevronRight size={16} /></>)}
                  </button>
                </>
              ) : (
                <>
                  <button className="pr-btn pr-btn--ghost" onClick={handleSkipStock} disabled={saving}>Passer cette étape</button>
                  <button className="pr-btn pr-btn--signal" onClick={handleSaveStock} disabled={saving}>
                    {saving ? (<><RefreshCw size={16} className="pr-spin" /> Enregistrement…</>) : (<><Save size={17} /> Enregistrer le stock</>)}
                  </button>
                </>
              )}
            </footer>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL : FICHE DÉTAILLÉE
          ============================================================ */}
      {v && (
        <div className="pr-overlay" onClick={() => setProduitToView(null)} role="dialog" aria-modal="true" aria-label="Détails du produit">
          <div className="pr-detail" onClick={(e) => e.stopPropagation()}>
            <header className="pr-sheet-head">
              <div className="pr-sheet-title">
                <span className="pr-sheet-mark"><Package size={21} /></span>
                <div>
                  <h2>{v.nom}</h2>
                  <p>{v.modele_nom || v.description || "Aucune description"}</p>
                </div>
              </div>
              <div className="pr-detail-status">
                <StockTag produit={v} />
                <button className="pr-sheet-close" onClick={() => setProduitToView(null)} aria-label="Fermer"><X size={20} /></button>
              </div>
            </header>

            <div className="pr-detail-body">
              <div className="pr-prices">
                <div><span>Prix d'achat</span><strong>{formatPrice(v.prix_achat)} <small>FCFA</small></strong></div>
                <div><span>Prix de vente</span><strong>{formatPrice(v.prix_vente)} <small>FCFA</small></strong></div>
                <div className={marge < 0 ? "is-neg" : ""}>
                  <span>Marge unitaire</span>
                  <strong>{marge > 0 ? "+" : ""}{formatPrice(marge)} <small>FCFA{margePct !== null ? ` · ${margePct}%` : ""}</small></strong>
                </div>
              </div>

              <div className="pr-detail-cols">
                <section>
                  <h4><Box size={15} /> Stock</h4>
                  <div className="pr-detail-stock">
                    <StockSelector
                      idProduit={v.id_produit}
                      stockBase={v.quantite_stock}
                      unitesVente={v.unites_vente || []}
                      uniteBase={{ nom: v.unite_nom, symbole: v.unite_symbole }}
                      isLowStock={isLow(v)}
                      isRupture={v.statut === "rupture"}
                      variant="details"
                    />
                    <LevelBar produit={v} />
                  </div>
                  <dl>
                    <div><dt>Stock minimum</dt><dd>{num(v.quantite_minimale)}{symb}</dd></div>
                    <div><dt>Stock maximum</dt><dd>{num(v.quantite_maximale)}{symb}</dd></div>
                  </dl>
                </section>
                <section>
                  <h4><MapPin size={15} /> Emplacement</h4>
                  <div className="pr-loc">
                    <div><span>Emplacement</span><strong>{v.emplacement || "N/A"}</strong></div>
                    <div><span>Rayon</span><strong>{v.rayon || "N/A"}</strong></div>
                    <div><span>Étagère</span><strong>{v.etagere || "N/A"}</strong></div>
                  </div>
                </section>
              </div>

              <section>
                <h4><Tag size={15} /> Classification</h4>
                <dl className="pr-dl2">
                  <div><dt>Fournisseur</dt><dd>{v.fournisseur_nom || "N/A"}</dd></div>
                  <div><dt>Catégorie</dt><dd>{v.categorie_nom || "N/A"}</dd></div>
                  <div><dt>Marque</dt><dd>{v.marque_nom || "N/A"}</dd></div>
                  <div><dt>Modèle</dt><dd>{v.modele_nom || "N/A"}</dd></div>
                  <div><dt>Unité de base</dt><dd>{v.unite_nom || "N/A"}{v.unite_symbole && ` (${v.unite_symbole})`}</dd></div>
                  <div><dt>Créé le</dt><dd>{formatDate(v.date_creation)}</dd></div>
                </dl>
              </section>

              {Array.isArray(v.unites_vente) && v.unites_vente.filter((u) => u && u.nom).length > 0 && (
                <section>
                  <h4><Layers size={15} /> Unités de vente</h4>
                  <div className="pr-tablewrap pr-tablewrap--flat">
                    <table className="pr-table pr-table--compact">
                      <thead><tr><th>Unité</th><th className="pr-num">Contenu</th><th className="pr-num">Prix de vente</th></tr></thead>
                      <tbody>
                        {v.unites_vente.filter((u) => u && u.nom).map((u, i) => (
                          <tr key={u.id_unite_vente ?? i}>
                            <td><strong>{u.nom}</strong>{(u.est_principal === 1 || u.est_principal === true) && <span className="pr-main-flag">principale</span>}</td>
                            <td className="pr-num">{num(u.quantite_base) > 1 ? `${num(u.quantite_base)}${symb}` : "—"}</td>
                            <td className="pr-num pr-price">{u.prix_vente != null ? <>{formatPrice(u.prix_vente)} <small>FCFA</small></> : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>

            <footer className="pr-sheet-foot">
              <button className="pr-btn pr-btn--ghost" onClick={() => setProduitToView(null)}>Fermer</button>
              {canManage && (
                <button className="pr-btn pr-btn--signal" onClick={() => { const p = v; setProduitToView(null); handleEdit(p); }}>
                  <Edit size={17} /> Modifier
                </button>
              )}
            </footer>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!produitToDelete}
        onClose={() => !deleting && setProduitToDelete(null)}
        onConfirm={handleDelete}
        title="Supprimer ce produit ?"
        message={`« ${produitToDelete?.nom || ""} » sera définitivement supprimé, avec toutes les données associées (stock, mouvements). Cette action est irréversible.`}
        type="danger"
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        loading={deleting}
      />
    </div>
  );
};

export default Produits;
