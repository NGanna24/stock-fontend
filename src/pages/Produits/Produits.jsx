// pages/Produits/Produits.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Grid,
  List,
  RefreshCw,
  Package,
  Save,
  AlertCircle,
  CheckCircle,
  Box,
  Tag,
  Banknote,
  Filter,
  ChevronDown,
  ChevronUp,
  Building,
  Eye,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Layers,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { createPortal } from "react-dom";
import ProduitService from "../../services/produitService";
import UniteVenteService from "../../services/uniteVenteService";
import CategorieService from "../../services/categorieService";
import MarqueService from "../../services/marqueService";
import ModeleService from "../../services/modeleService";
import UniteService from "../../services/uniteService";
import FournisseurService from "../../services/fournisseurService";
import { useUser } from "../../context/AuthContext";
import SelectSearch from "../../components/SelectSearch/SelectSearch";
import "./Produits.css";

// ============================================================
// CONSTANTES
// ============================================================
const INITIAL_FORM_DATA = {
  nom: "",
  description: "",
  id_fournisseur: "",
  id_categorie: "",
  id_marque: "",
  id_modele: "",
  id_unite: "",
  prix_achat: "",
  prix_vente: "",
  quantite_stock: "",
  quantite_minimale: "",
  quantite_maximale: "",
  emplacement: "",
  rayon: "",
  etagere: "",
};

const INITIAL_FILTERS = {
  categorie: "",
  marque: "",
  modele: "",
  fournisseur: "",
  statut: "",
  stockMin: "",
  stockMax: "",
  prixMin: "",
  prixMax: "",
};

// ============================================================
// COMPOSANT : TOAST NOTIFICATION
// ============================================================
const Toast = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: { icon: CheckCircle2, color: "#10b981", bg: "#ecfdf5" },
    error: { icon: XCircle, color: "#ef4444", bg: "#fef2f2" },
    warning: { icon: AlertTriangle, color: "#f59e0b", bg: "#fffbeb" },
    info: { icon: Info, color: "#995F2F", bg: "#eff6ff" },
  };

  const { icon: Icon, color, bg } = config[type] || config.info;

  return createPortal(
    <div className={`toast toast-${type}`} style={{ background: bg }}>
      <Icon size={20} style={{ color }} />
      <span className="toast-message" style={{ color }}>
        {message}
      </span>
      <button className="toast-close" onClick={onClose} aria-label="Fermer">
        <X size={16} style={{ color }} />
      </button>
    </div>,
    document.body
  );
};

// ============================================================
// COMPOSANT : DROPDOWN MENU (PORTAL - jamais coupé)
// ============================================================
const DropdownMenu = ({ trigger, children, isOpen, onClose }) => {
  const triggerRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState("bottom");

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 200;
      const menuWidth = menuRef.current?.offsetWidth || 200;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const showAbove = spaceBelow < menuHeight + 20 && spaceAbove > spaceBelow;

      let top = showAbove
        ? rect.top - menuHeight - 6
        : rect.bottom + 6;
      let left = rect.right - menuWidth;

      if (left < 8) left = 8;
      if (left + menuWidth > viewportWidth - 8) {
        left = viewportWidth - menuWidth - 8;
      }

      setCoords({ top, left });
      setPlacement(showAbove ? "top" : "bottom");
    };

    requestAnimationFrame(updatePosition);

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <span ref={triggerRef} className="dropdown-trigger-wrapper">
        {trigger}
      </span>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={`dropdown-portal-menu placement-${placement}`}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const Produits = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem("token");

  // ========== ÉTATS PRINCIPAUX ==========
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState("list");
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // ========== STATS ==========
  const [stats, setStats] = useState({
    total: 0,
    disponibles: 0,
    rupture: 0,
    stockFaible: 0,
    valeurStock: 0,
  });

  // ========== DONNÉES SELECTS ==========
  const [categories, setCategories] = useState([]);
  const [marques, setMarques] = useState([]);
  const [modeles, setModeles] = useState([]);
  const [unites, setUnites] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);

  // ========== MODAL AJOUT/ÉDITION ==========
  const [showModal, setShowModal] = useState(false);
  const [editingProduit, setEditingProduit] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [unitesVente, setUnitesVente] = useState([]);

  // ✅ AJOUT : état pour le warning doublon
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // ========== MODAL SUPPRESSION ==========
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [produitToDelete, setProduitToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ========== MODAL DÉTAILS ==========
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [produitToView, setProduitToView] = useState(null);

  // ========== NOTIFICATIONS ==========
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => setToast({ type, message });

  // ========== PERMISSIONS ==========
  const canManage = user && ["admin", "manager"].includes(user.role);

  // ========== DEBOUNCE RECHERCHE ==========
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ========== FERMER LE DROPDOWN AU CLIC EXTÉRIEUR ==========
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // ========== FERMER MODALS AVEC ÉCHAP ==========
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (showModal && !saving) setShowModal(false);
        if (showDeleteModal && !deleting) setShowDeleteModal(false);
        if (showDetailsModal) setShowDetailsModal(false);
        setOpenDropdown(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showModal, saving, showDeleteModal, deleting, showDetailsModal]);

  // ========== UTILITAIRES ==========
  const formatPrice = useCallback((value) => {
    const num = Number(value || 0);
    return num.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }, []);

  const formatDate = useCallback((date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  }, []);

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  // ========== CHARGEMENT DES DONNÉES ==========
  const loadProduits = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const filterParams = { ...filters };
      if (debouncedSearch && debouncedSearch.length >= 2) {
        filterParams.search = debouncedSearch;
      }

      Object.keys(filterParams).forEach((key) => {
        if (
          filterParams[key] === "" ||
          filterParams[key] === undefined ||
          filterParams[key] === null
        ) {
          delete filterParams[key];
        }
      });

      const hasFilters = Object.keys(filterParams).length > 0;
      const response = hasFilters
        ? await ProduitService.filterProduits(token, filterParams)
        : await ProduitService.getAllProduits(token);

      if (response.success) {
        setProduits(response.data || []);
      } else {
        showToast("error", response.message || "Erreur de chargement");
      }
    } catch (err) {
      console.error("❌ LoadProduits error:", err);
      showToast("error", err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [token, filters, debouncedSearch]);

  // ========== STATS CALCULÉES ==========
  useEffect(() => {
    if (!produits.length) {
      setStats({ total: 0, disponibles: 0, rupture: 0, stockFaible: 0, valeurStock: 0 });
      return;
    }

    const disponibles = produits.filter((p) => p.statut === "disponible").length;
    const rupture = produits.filter((p) => p.statut === "rupture").length;
    const stockFaible = produits.filter(
      (p) =>
        Number(p.quantite_stock || 0) > 0 &&
        Number(p.quantite_stock || 0) <= Number(p.quantite_minimale || 0)
    ).length;
    const valeurStock = produits.reduce(
      (sum, p) =>
        sum + Number(p.quantite_stock || 0) * Number(p.prix_achat || 0),
      0
    );

    setStats({
      total: produits.length,
      disponibles,
      rupture,
      stockFaible,
      valeurStock,
    });
  }, [produits]);

  // ========== CHARGEMENTS ANNEXES ==========
  const loadCategories = useCallback(async () => {
    try {
      const res = await CategorieService.getAllCategories(token);
      if (res.success) setCategories(res.data || []);
    } catch (err) {
      console.error("❌ LoadCategories:", err);
    }
  }, [token]);

  const loadMarques = useCallback(async () => {
    try {
      const res = await MarqueService.getAllMarques(token);
      if (res.success) setMarques(res.data || []);
    } catch (err) {
      console.error("❌ LoadMarques:", err);
    }
  }, [token]);

  const loadModeles = useCallback(async () => {
    try {
      const res = await ModeleService.getAllModeles(token);
      if (res.success) setModeles(res.data || []);
    } catch (err) {
      console.error("❌ LoadModeles:", err);
    }
  }, [token]);

  const loadUnites = useCallback(async () => {
    try {
      const res = await UniteService.getAllUnites(token);
      if (res.success) setUnites(res.data || []);
    } catch (err) {
      console.error("❌ LoadUnites:", err);
    }
  }, [token]);

  const loadFournisseurs = useCallback(async () => {
    try {
      const res = await FournisseurService.getActiveFournisseurs(token);
      if (res.success) setFournisseurs(res.data || []);
    } catch (err) {
      console.error("❌ LoadFournisseurs:", err);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadCategories();
      loadMarques();
      loadModeles();
      loadUnites();
      loadFournisseurs();
    }
  }, [isAuthenticated, token, loadCategories, loadMarques, loadModeles, loadUnites, loadFournisseurs]);

  useEffect(() => {
    if (isAuthenticated && token) loadProduits();
  }, [isAuthenticated, token, filters, debouncedSearch, loadProduits]);

  // ========== PAGINATION ==========
  const { currentItems, totalPages } = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return {
      currentItems: produits.slice(indexOfFirstItem, indexOfLastItem),
      totalPages: Math.ceil(produits.length / itemsPerPage),
    };
  }, [produits, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  // ========== FILTRES ==========
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setSearchTerm("");
    setCurrentPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((v) => v !== "").length;
  }, [filters]);

  // ========== FORMULAIRE ==========
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // ✅ AJOUT : effacer le warning dès que l'utilisateur modifie le nom ou le modèle
    if (name === "nom" || name === "id_modele") {
      setDuplicateWarning(null);
    }
  };

  // ========== UNITÉS DE VENTE ==========
  const handleAddUniteVente = () => {
    setUnitesVente((prev) => [
      ...prev,
      {
        id_unite_vente: null,
        nom: "",
        quantite_base: 1,
        prix_vente: 0,
        prix_achat: 0,
        est_principal: prev.filter((u) => !u.isDeleted).length === 0,
        isNew: true,
        isDeleted: false,
      },
    ]);
  };

  const handleUniteVenteChange = (index, field, value) => {
    setUnitesVente((prev) => {
      const newList = [...prev];
      newList[index] = { ...newList[index], [field]: value };
      return newList;
    });
  };

  const handleRemoveUniteVente = (index) => {
    setUnitesVente((prev) => {
      const newList = [...prev];
      if (newList[index].id_unite_vente) {
        newList[index].isDeleted = true;
      } else {
        newList.splice(index, 1);
      }
      return newList;
    });
  };

  const handleSetUnitePrincipale = (index) => {
    setUnitesVente((prev) =>
      prev.map((u, i) => ({ ...u, est_principal: i === index }))
    );
  };

  // ========== ACTIONS ==========
  const handleAdd = () => {
    setEditingProduit(null);
    setFormData(INITIAL_FORM_DATA);
    setUnitesVente([]);
    setDuplicateWarning(null); // ✅ AJOUT
    setShowModal(true);
  };

  const handleEdit = async (produit) => {
    setEditingProduit(produit);
    setDuplicateWarning(null); // ✅ AJOUT
    setFormData({
      nom: produit.nom || "",
      description: produit.description || "",
      id_fournisseur: produit.id_fournisseur || "",
      id_categorie: produit.id_categorie || "",
      id_marque: produit.id_marque || "",
      id_modele: produit.id_modele || "",
      id_unite: produit.id_unite || "",
      prix_achat: produit.prix_achat ?? "",
      prix_vente: produit.prix_vente ?? "",
      quantite_stock: produit.quantite_stock ?? "",
      quantite_minimale: produit.quantite_minimale ?? "",
      quantite_maximale: produit.quantite_maximale ?? "",
      emplacement: produit.emplacement || "",
      rayon: produit.rayon || "",
      etagere: produit.etagere || "",
    });

    try {
      const res = await UniteVenteService.getByProduit(token, produit.id_produit);
      if (res.success && res.data && res.data.length > 0) {
        setUnitesVente(
          res.data.map((u) => ({
            id_unite_vente: u.id_unite_vente,
            nom: u.nom,
            quantite_base: u.quantite_base,
            prix_vente: u.prix_vente,
            prix_achat: u.prix_achat || 0,
            est_principal: u.est_principal === 1 || u.est_principal === true,
            isNew: false,
            isDeleted: false,
          }))
        );
      } else {
        setUnitesVente([
          {
            id_unite_vente: null,
            nom: produit.unite_nom || "Unité",
            quantite_base: 1,
            prix_vente: produit.prix_vente || 0,
            prix_achat: produit.prix_achat || 0,
            est_principal: true,
            isNew: true,
            isDeleted: false,
          },
        ]);
      }
    } catch (err) {
      console.error("❌ LoadUnitesVente:", err);
      setUnitesVente([
        {
          id_unite_vente: null,
          nom: produit.unite_nom || "Unité",
          quantite_base: 1,
          prix_vente: produit.prix_vente || 0,
          prix_achat: produit.prix_achat || 0,
          est_principal: true,
          isNew: true,
          isDeleted: false,
        },
      ]);
    }
    setShowModal(true);
  };

  const handleView = (produit) => {
    setProduitToView(produit);
    setShowDetailsModal(true);
    setOpenDropdown(null);
  };

const handleSave = async () => {
    console.log('═══════════════════════════════════════');
    console.log('🚀 [LOG 2] handleSave() DÉMARRÉ');

    // === VALIDATIONS DE BASE ===
    console.log('📋 Validation 1 : nom');
    console.log('   formData.nom =', JSON.stringify(formData.nom));
    console.log('   formData.nom?.trim() =', JSON.stringify(formData.nom?.trim()));
    console.log('   !formData.nom.trim() =', !formData.nom.trim());

    if (!formData.nom.trim()) {
        console.log('❌ [LOG 2] Bloqué : nom vide');
        showToast("warning", "Veuillez saisir un nom de produit");
        return;
    }

    console.log('📋 Validation 2 : fournisseur');
    console.log('   formData.id_fournisseur =', JSON.stringify(formData.id_fournisseur));
    console.log('   typeof =', typeof formData.id_fournisseur);
    console.log('   !formData.id_fournisseur =', !formData.id_fournisseur);

    if (!formData.id_fournisseur) {
        console.log('❌ [LOG 2] Bloqué : fournisseur non sélectionné');
        showToast("warning", "Veuillez sélectionner un fournisseur");
        return;
    }

    console.log('✅ [LOG 2] Validations de base OK');

    // ============================================================
    // UNITÉS DE VENTE — OPTIONNELLES
    // ============================================================
    const unitesActives = unitesVente.filter((u) => !u.isDeleted);
    console.log('📦 [LOG 2] Unités de vente actives :', unitesActives.length);

    if (unitesActives.length > 0) {
        for (const unite of unitesActives) {
            console.log('   🔍 Vérification unité :', unite.nom);
            console.log('      nom:', unite.nom);
            console.log('      quantite_base:', unite.quantite_base);
            console.log('      prix_vente:', unite.prix_vente);

            if (!unite.nom || !unite.nom.trim()) {
                console.log('   ❌ [LOG 2] Bloqué : unité sans nom');
                showToast("warning", "Toutes les unités de vente doivent avoir un nom");
                return;
            }
            if (!unite.quantite_base || parseFloat(unite.quantite_base) <= 0) {
                console.log('   ❌ [LOG 2] Bloqué : quantité base invalide');
                showToast("warning", `La quantité de base de "${unite.nom}" doit être > 0`);
                return;
            }
            if (!unite.prix_vente || parseFloat(unite.prix_vente) <= 0) {
                console.log('   ❌ [LOG 2] Bloqué : prix vente invalide');
                showToast("warning", `Le prix de vente de "${unite.nom}" doit être > 0`);
                return;
            }
        }
    }

    console.log('✅ [LOG 2] Toutes validations OK → on passe au save');

    // ============================================================
    // SAUVEGARDE
    // ============================================================
    setSaving(true);
    setDuplicateWarning(null);

    try {
        const data = {
            ...formData,
            nom: formData.nom.trim(),
            description: formData.description?.trim() || "",
            prix_achat: parseFloat(formData.prix_achat) || 0,
            prix_vente: parseFloat(formData.prix_vente) || 0,
            quantite_stock: parseFloat(formData.quantite_stock) || 0,
            quantite_minimale: parseFloat(formData.quantite_minimale) || 0,
            quantite_maximale: parseFloat(formData.quantite_maximale) || 0,
            id_fournisseur: formData.id_fournisseur || null,
            id_categorie: formData.id_categorie || null,
            id_marque: formData.id_marque || null,
            id_modele: formData.id_modele || null,
            id_unite: formData.id_unite || null,
            unites_vente: unitesActives.map((u) => ({
                id_unite_vente: u.id_unite_vente,
                nom: u.nom.trim(),
                quantite_base: parseFloat(u.quantite_base) || 1,
                prix_vente: parseFloat(u.prix_vente) || 0,
                prix_achat: parseFloat(u.prix_achat) || 0,
                est_principal: u.est_principal,
            })),
            unites_vente_deleted: unitesVente
                .filter((u) => u.isDeleted && u.id_unite_vente)
                .map((u) => u.id_unite_vente),
        };

        console.log('📤 [LOG 2] Données envoyées au service :');
        console.log(JSON.stringify(data, null, 2));

        const response = editingProduit
            ? await ProduitService.updateProduit(token, editingProduit.id_produit, data)
            : await ProduitService.createProduit(token, data);

        console.log('📥 [LOG 2] Réponse du service :', response);

        if (response.success) {
            console.log('✅ [LOG 2] SUCCÈS');
            showToast("success", editingProduit ? "Produit modifié avec succès" : "Produit créé avec succès");
            await loadProduits();
            setShowModal(false);
            setEditingProduit(null);
            setFormData(INITIAL_FORM_DATA);
            setUnitesVente([]);
            setDuplicateWarning(null);
        } else if (response.isDuplicate) {
            console.log('⚠️ [LOG 2] DOUBLON détecté');
            setDuplicateWarning({
                message: response.message,
                existingId: response.existingId,
            });
        } else {
            console.log('❌ [LOG 2] Échec service :', response.message);
            showToast("error", response.message || "Erreur de sauvegarde");
        }
    } catch (err) {
        console.error('💥 [LOG 2] ERREUR attrapée :', err);
        console.error('   Stack:', err.stack);
        showToast("error", err.message || "Erreur de sauvegarde");
    } finally {
        console.log('🏁 [LOG 2] handleSave TERMINÉ');
        setSaving(false);
    }
};

  const confirmDelete = (produit) => {
    setProduitToDelete(produit);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDelete = async () => {
    if (!produitToDelete) return;
    setDeleting(true);
    try {
      const response = await ProduitService.deleteProduit(
        token,
        produitToDelete.id_produit
      );
      if (response.success) {
        showToast("success", "Produit supprimé avec succès");
        await loadProduits();
        setShowDeleteModal(false);
        setProduitToDelete(null);
      } else {
        showToast("error", response.message || "Erreur de suppression");
      }
    } catch (err) {
      console.error("❌ Delete error:", err);
      showToast("error", err.message || "Erreur de suppression");
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await ProduitService.exportProduits(token);
      if (response.success && response.data) {
        const blob = new Blob([response.data], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `produits_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showToast("success", "Export réussi");
      }
    } catch (err) {
      console.error("❌ Export error:", err);
      showToast("error", "Erreur lors de l'exportation");
    }
  };

  const handleSearch = (keyword) => {
    setSearchTerm(keyword);
    setCurrentPage(1);
  };

  // ========== BADGE STATUT ==========
  const getStatusBadge = (statut) => {
    if (statut === "disponible") {
      return (
        <span className="status-badge available">
          <CheckCircle size={14} /> Disponible
        </span>
      );
    }
    if (statut === "rupture") {
      return (
        <span className="status-badge out-of-stock">
          <AlertCircle size={14} /> Rupture
        </span>
      );
    }
    return <span className="status-badge unknown">{statut || "Inconnu"}</span>;
  };

  // ========== STATS CARDS ==========
  const renderStats = () => (
    <div className="stats-grid">
      <div className="stat-card stat-primary">
        <div className="stat-icon-wrapper">
          <Package size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-label">Total produits</span>
          <span className="stat-value">{stats.total}</span>
        </div>
      </div>

      <div className="stat-card stat-success">
        <div className="stat-icon-wrapper">
          <CheckCircle2 size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-label">Disponibles</span>
          <span className="stat-value">{stats.disponibles}</span>
        </div>
      </div>

      <div className="stat-card stat-danger">
        <div className="stat-icon-wrapper">
          <AlertCircle size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-label">En rupture</span>
          <span className="stat-value">{stats.rupture}</span>
        </div>
      </div>

      <div className="stat-card stat-warning">
        <div className="stat-icon-wrapper">
          <TrendingDown size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-label">Stock faible</span>
          <span className="stat-value">{stats.stockFaible}</span>
        </div>
      </div>

      <div className="stat-card stat-info">
        <div className="stat-icon-wrapper">
          <Banknote size={22} />
        </div>
        <div className="stat-content">
          <span className="stat-label">Valeur du stock</span>
          <span className="stat-value stat-value-money">
            {formatPrice(stats.valeurStock)} <small>FCFA</small>
          </span>
        </div>
      </div>
    </div>
  );

  // ========== PANNEAU FILTRES ==========
  const renderFilters = () => (
    <div className={`filters-panel ${showFilters ? "open" : ""}`}>
      <div className="filters-grid">
        <div className="filter-group">
          <label>Fournisseur</label>
          <select name="fournisseur" value={filters.fournisseur} onChange={handleFilterChange}>
            <option value="">Tous les fournisseurs</option>
            {fournisseurs.map((f) => (
              <option key={f.id_fournisseur} value={f.id_fournisseur}>
                {f.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Catégorie</label>
          <select name="categorie" value={filters.categorie} onChange={handleFilterChange}>
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id_categorie} value={c.id_categorie}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Marque</label>
          <select name="marque" value={filters.marque} onChange={handleFilterChange}>
            <option value="">Toutes les marques</option>
            {marques.map((m) => (
              <option key={m.id_marque} value={m.id_marque}>
                {m.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Modèle</label>
          <select name="modele" value={filters.modele} onChange={handleFilterChange}>
            <option value="">Tous les modèles</option>
            {modeles.map((m) => (
              <option key={m.id_modele} value={m.id_modele}>
                {m.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Statut</label>
          <select name="statut" value={filters.statut} onChange={handleFilterChange}>
            <option value="">Tous les statuts</option>
            <option value="disponible">Disponible</option>
            <option value="rupture">Rupture</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Stock min</label>
          <input type="number" name="stockMin" value={filters.stockMin} onChange={handleFilterChange} placeholder="Min" min="0" />
        </div>

        <div className="filter-group">
          <label>Stock max</label>
          <input type="number" name="stockMax" value={filters.stockMax} onChange={handleFilterChange} placeholder="Max" min="0" />
        </div>

        <div className="filter-group">
          <label>Prix min (FCFA)</label>
          <input type="number" name="prixMin" value={filters.prixMin} onChange={handleFilterChange} placeholder="Min" min="0" step="0.01" />
        </div>

        <div className="filter-group">
          <label>Prix max (FCFA)</label>
          <input type="number" name="prixMax" value={filters.prixMax} onChange={handleFilterChange} placeholder="Max" min="0" step="0.01" />
        </div>
      </div>

      <div className="filters-actions">
        <button className="btn btn-ghost" onClick={resetFilters}>
          <X size={16} /> Réinitialiser
        </button>
        <span className="filter-results">
          <strong>{produits.length}</strong> résultat(s)
        </span>
      </div>
    </div>
  );

  // ========== VUE GRILLE ==========
  const renderGridView = () => (
    <div className="produits-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state-full">
          <div className="empty-icon-wrapper">
            <Package size={40} />
          </div>
          <h3>Aucun produit trouvé</h3>
          <p>Essayez de modifier vos filtres ou ajoutez un nouveau produit</p>
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={16} /> Ajouter un produit
            </button>
          )}
        </div>
      ) : (
        currentItems.map((produit) => {
          const isLowStock =
            Number(produit.quantite_stock || 0) > 0 &&
            Number(produit.quantite_stock || 0) <= Number(produit.quantite_minimale || 0);

          return (
            <div key={produit.id_produit} className="produit-card">
              <div className="produit-card-header">
                <div className="produit-icon">
                  <Package size={24} />
                </div>
                <div className="produit-actions">
                  <button className="produit-action-btn" onClick={() => handleView(produit)} title="Voir">
                    <Eye size={16} />
                  </button>
                  {canManage && (
                    <>
                      <button className="produit-action-btn edit" onClick={() => handleEdit(produit)} title="Modifier">
                        <Edit size={16} />
                      </button>
                      <button className="produit-action-btn delete" onClick={() => confirmDelete(produit)} title="Supprimer">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="produit-card-body">
                <h3 className="produit-name" title={produit.nom}>{produit.nom}</h3>
                <p className="produit-description">
                  {produit.description || "Aucune description"}
                </p>

                {produit.fournisseur_nom && (
                  <div className="produit-fournisseur">
                    <Building size={14} />
                    <span>{produit.fournisseur_nom}</span>
                  </div>
                )}

                <div className="produit-tags">
                  {produit.categorie_nom && (
                    <span className="tag tag-blue">
                      <Tag size={12} /> {produit.categorie_nom}
                    </span>
                  )}
                  {produit.marque_nom && (
                    <span className="tag tag-purple">
                      <Box size={12} /> {produit.marque_nom}
                    </span>
                  )}
                  {produit.modele_nom && (
                    <span className="tag tag-gray">
                      {produit.modele_nom}
                    </span>
                  )}
                </div>

                <div className="produit-footer-info">
                  <div className={`stock-indicator ${isLowStock ? "low" : "ok"}`}>
                    <span className="stock-label">Stock</span>
                    <span className="stock-value">
                      {produit.quantite_stock || 0}
                      {produit.unite_symbole && (
                        <small> {produit.unite_symbole}</small>
                      )}
                    </span>
                  </div>

                  <div className="price-indicator">
                    <span className="price-label">Prix</span>
                    <span className="price-value">
                      {formatPrice(produit.prix_vente)} <small>FCFA</small>
                    </span>
                  </div>
                </div>

                <div className="produit-status-row">
                  {getStatusBadge(produit.statut)}
                  {isLowStock && (
                    <span className="mini-badge warning">
                      <AlertTriangle size={12} /> Stock faible
                    </span>
                  )}
                </div>
              </div>

              <div className="produit-card-footer">
                <span className="produit-date">Créé le {formatDate(produit.date_creation)}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // ========== VUE LISTE ==========
  const renderListView = () => (
    <div className="produits-table-wrapper">
      <div className="produits-table-container">
        <table className="produits-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Fournisseur</th>
              <th>Catégorie</th>
              <th>Marque</th>
              <th>Prix vente</th>
              <th>Stock</th>
              <th>Statut</th>
              <th className="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  <Package size={32} />
                  <p>Aucun produit trouvé</p>
                </td>
              </tr>
            ) : (
              currentItems.map((produit) => {
                const isLowStock =
                  Number(produit.quantite_stock || 0) > 0 &&
                  Number(produit.quantite_stock || 0) <= Number(produit.quantite_minimale || 0);

                return (
                  <tr key={produit.id_produit}>
                    <td className="name-cell">
                      <div className="produit-name-with-icon">
                        <div className="produit-icon-tiny">
                          <Package size={14} />
                        </div>
                        <span title={produit.nom}>{produit.nom}</span>
                      </div>
                    </td>
                    <td>
                      <div className="fournisseur-cell">
                        <Building size={14} />
                        <span>{produit.fournisseur_nom || "-"}</span>
                      </div>
                    </td>
                    <td>
                      {produit.categorie_nom ? (
                        <span className="tag tag-blue">
                          <Tag size={12} /> {produit.categorie_nom}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{produit.marque_nom || "-"}</td>
                    <td className="price-cell">
                      {formatPrice(produit.prix_vente)} <small>FCFA</small>
                    </td>
                    <td className="stock-cell">
                      <span className={`stock-badge ${isLowStock ? "low" : ""}`}>
                        {produit.quantite_stock || 0}
                        {produit.unite_symbole && (
                          <small>{produit.unite_symbole}</small>
                        )}
                      </span>
                    </td>
                    <td>{getStatusBadge(produit.statut)}</td>
                    <td className="actions-cell">
                      <DropdownMenu
                        isOpen={openDropdown === produit.id_produit}
                        onClose={() => setOpenDropdown(null)}
                        trigger={
                          <button
                            className="dropdown-trigger"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDropdown(produit.id_produit);
                            }}
                            title="Actions"
                          >
                            <MoreVertical size={18} />
                          </button>
                        }
                      >
                        <button
                          className="dropdown-item"
                          onClick={() => handleView(produit)}
                        >
                          <Eye size={16} />
                          <span>Voir les détails</span>
                        </button>
                        {canManage && (
                          <>
                            <button
                              className="dropdown-item"
                              onClick={() => {
                                handleEdit(produit);
                                setOpenDropdown(null);
                              }}
                            >
                              <Edit size={16} />
                              <span>Modifier</span>
                            </button>
                            <hr className="dropdown-divider" />
                            <button
                              className="dropdown-item danger"
                              onClick={() => confirmDelete(produit)}
                            >
                              <Trash2 size={16} />
                              <span>Supprimer</span>
                            </button>
                          </>
                        )}
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ========== LOADER ==========
  const LoaderComponent = () => (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Chargement des produits...</p>
    </div>
  );

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="produits-container">
      {/* ================= HEADER ================= */}
      <div className="produits-header">
        <div className="header-left">
          <h1 className="produits-title">Produits</h1>
          <p className="produits-subtitle">
            Gérez votre catalogue de produits et leur stock
          </p>
        </div>
        <div className="produits-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              <span>Nouveau produit</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span className="hide-mobile">Exporter</span>
          </button>
          <button
            className="btn btn-icon"
            onClick={loadProduits}
            title="Rafraîchir"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spinning" : ""} />
          </button>
        </div>
      </div>

      {/* ================= STATS ================= */}
      {renderStats()}

      {/* ================= FILTRES ET RECHERCHE ================= */}
      <div className="produits-filters">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              className="search-clear"
              onClick={() => handleSearch("")}
              aria-label="Effacer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filters-toggle-group">
          <button
            className={`btn-filters ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            <span>Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="filter-count">{activeFiltersCount}</span>
            )}
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grille"
            >
              <Grid size={16} />
            </button>
            <button
              className={`view-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="Liste"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {renderFilters()}

      {/* ================= CONTENU ================= */}
      {loading && <LoaderComponent />}

      {!loading && (
        <>
          {viewMode === "grid" ? renderGridView() : renderListView()}
        </>
      )}

      {/* ================= PAGINATION ================= */}
      {!loading && produits.length > itemsPerPage && (
        <div className="produits-pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="pagination-info">
            Page <strong>{currentPage}</strong> sur <strong>{totalPages}</strong>
          </span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ============================================================
          MODAL AJOUT / ÉDITION
          ============================================================ */}
      {showModal && (
        <div className="modal-overlay">
          <div
            className="modal-content modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon">
                  <Package size={20} />
                </div>
                <div>
                  <h2>
                    {editingProduit ? "Modifier le produit" : "Nouveau produit"}
                  </h2>
                  <p className="modal-subtitle">
                    {editingProduit
                      ? "Modifiez les informations du produit"
                      : "Remplissez les informations du nouveau produit"}
                  </p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => !saving && setShowModal(false)}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* ✅ AJOUT : Bandeau warning doublon */}
              {duplicateWarning && (
                <div className="alert alert-warning">
                  <AlertTriangle size={18} />
                  <div className="alert-content">
                    <strong>Produit déjà existant</strong>
                    <p>{duplicateWarning.message}</p>
                    {duplicateWarning.existingId && (
                      <button
                        type="button"
                        className="alert-link"
                        onClick={() => {
                          const existing = produits.find(
                            (p) => p.id_produit === duplicateWarning.existingId
                          );
                          if (existing) {
                            setShowModal(false);
                            setDuplicateWarning(null);
                            handleView(existing);
                          } else {
                            showToast(
                              "info",
                              "Produit existant introuvable dans la liste actuelle."
                            );
                          }
                        }}
                      >
                        Voir le produit existant →
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="alert-close"
                    onClick={() => setDuplicateWarning(null)}
                    aria-label="Fermer l'avertissement"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Section : Informations générales */}
              <div className="form-section">
                <div className="form-section-title">
                  <Info size={14} />
                  <span>Informations générales</span>
                </div>

                <div className="form-group">
                  <label>
                    Fournisseur <span className="required">*</span>
                  </label>
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
                      <span>
                        <strong>{f.nom}</strong>
                        {f.ville && ` — ${f.ville}`}
                        {f.pays && ` (${f.pays})`}
                      </span>
                    )}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Nom du produit <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleInputChange}
                    placeholder="Ex: Bougie NGK CR8E"
                    disabled={saving}
                    maxLength={100}
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Description du produit..."
                    rows="2"
                    disabled={saving}
                    maxLength={500}
                  />
                </div>

                <div className="form-grid-4">
                  <div className="form-group">
                    <SelectSearch
                      options={categories}
                      value={formData.id_categorie}
                      onChange={handleInputChange}
                      label="Catégorie"
                      placeholder="Sélectionner..."
                      optionLabel="nom"
                      optionValue="id_categorie"
                      name="id_categorie"
                      disabled={saving}
                    />
                  </div>
                  <div className="form-group">
                    <SelectSearch
                      options={marques}
                      value={formData.id_marque}
                      onChange={handleInputChange}
                      label="Marque"
                      placeholder="Sélectionner..."
                      optionLabel="nom"
                      optionValue="id_marque"
                      name="id_marque"
                      disabled={saving}
                    />
                  </div>
                  <div className="form-group">
                    <SelectSearch
                      options={modeles}
                      value={formData.id_modele}
                      onChange={handleInputChange}
                      label="Modèle"
                      placeholder="Sélectionner..."
                      optionLabel="nom"
                      optionValue="id_modele"
                      name="id_modele"
                      disabled={saving}
                    />
                  </div>
                  <div className="form-group">
                    <SelectSearch
                      options={unites}
                      value={formData.id_unite}
                      onChange={handleInputChange}
                      label="Unité de base"
                      placeholder="Sélectionner..."
                      optionLabel="nom"
                      optionValue="id_unite"
                      name="id_unite"
                      disabled={saving}
                      renderOption={(u) => (
                        <span>
                          {u.nom} <small>({u.symbole})</small>
                        </span>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Section : Prix */}
              <div className="form-section">
                <div className="form-section-title">
                  <Banknote />
                  <span>Prix (FCFA)</span>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Prix d'achat</label>
                    <input
                      type="number"
                      name="prix_achat"
                      value={formData.prix_achat}
                      onChange={handleInputChange}
                      placeholder="0"
                      step="0.01"
                      min="0"
                      disabled={saving}
                    />
                    <small>Prix proposé par le fournisseur</small>
                  </div>
                  <div className="form-group">
                    <label>Prix de vente</label>
                    <input
                      type="number"
                      name="prix_vente"
                      value={formData.prix_vente}
                      onChange={handleInputChange}
                      placeholder="0"
                      step="0.01"
                      min="0"
                      disabled={saving}
                    />
                    <small>Prix par défaut (unité de base)</small>
                  </div>
                </div>
              </div>

              {/* Section : Unités de vente */}
              <div className="form-section unites-vente-section">
                <div className="section-header-unites">
                  <div className="section-header-left">
                    <Layers size={16} />
                    <span>Unités de vente</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleAddUniteVente}
                    disabled={saving}
                  >
                    <Plus size={14} /> Ajouter
                  </button>
                </div>

                <p className="section-hint">
                  Définissez les conditionnements dans lesquels vous vendez ce produit
                  (ex : Bidon, Carton, Palette)
                </p>

                {unitesVente.filter((u) => !u.isDeleted).length === 0 ? (
                  <div className="empty-unites">
                    <div className="empty-icon-wrapper small">
                      <Box size={24} />
                    </div>
                    <p>Aucune unité de vente</p>
                    <small>Cliquez sur "Ajouter" pour commencer</small>
                  </div>
                ) : (
                  <div className="unites-vente-list">
                    {unitesVente.map((unite, index) => {
                      if (unite.isDeleted) return null;
                      return (
                        <div
                          key={index}
                          className={`unite-vente-item ${
                            unite.est_principal ? "principal" : ""
                          }`}
                        >
                          <div className="unite-principal-check">
                            <input
                              type="radio"
                              name="unite_principale"
                              checked={unite.est_principal}
                              onChange={() => handleSetUnitePrincipale(index)}
                              disabled={saving}
                              title="Définir comme principale"
                            />
                          </div>

                          <div className="form-group">
                            <label>Nom</label>
                            <input
                              type="text"
                              value={unite.nom}
                              onChange={(e) =>
                                handleUniteVenteChange(index, "nom", e.target.value)
                              }
                              placeholder="Ex: Carton"
                              disabled={saving}
                              maxLength={50}
                            />
                          </div>

                          <div className="form-group">
                            <label>Qté base</label>
                            <input
                              type="number"
                              value={unite.quantite_base}
                              onChange={(e) =>
                                handleUniteVenteChange(index, "quantite_base", e.target.value)
                              }
                              placeholder="12"
                              min="1"
                              step="1"
                              disabled={saving}
                            />
                          </div>

                          <div className="form-group">
                            <label>Prix achat</label>
                            <input
                              type="number"
                              value={unite.prix_achat}
                              onChange={(e) =>
                                handleUniteVenteChange(index, "prix_achat", e.target.value)
                              }
                              placeholder="0"
                              min="0"
                              step="0.01"
                              disabled={saving}
                            />
                          </div>

                          <div className="form-group">
                            <label>Prix vente</label>
                            <input
                              type="number"
                              value={unite.prix_vente}
                              onChange={(e) =>
                                handleUniteVenteChange(index, "prix_vente", e.target.value)
                              }
                              placeholder="0"
                              min="0"
                              step="0.01"
                              disabled={saving}
                            />
                          </div>

                          <button
                            type="button"
                            className="btn-remove-unite"
                            onClick={() => handleRemoveUniteVente(index)}
                            disabled={saving}
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section : Stock */}
              <div className="form-section">
                <div className="form-section-title">
                  <Box size={14} />
                  <span>Stock & Emplacement</span>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Stock actuel</label>
                    <input
                      type="number"
                      name="quantite_stock"
                      value={formData.quantite_stock}
                      onChange={handleInputChange}
                      placeholder="0"
                      step="1"
                      min="0"
                      disabled={saving}
                    />
                  </div>
                  <div className="form-group">
                    <label>Stock minimum</label>
                    <input
                      type="number"
                      name="quantite_minimale"
                      value={formData.quantite_minimale}
                      onChange={handleInputChange}
                      placeholder="0"
                      step="1"
                      min="0"
                      disabled={saving}
                    />
                  </div>
                  <div className="form-group">
                    <label>Stock maximum</label>
                    <input
                      type="number"
                      name="quantite_maximale"
                      value={formData.quantite_maximale}
                      onChange={handleInputChange}
                      placeholder="0"
                      step="1"
                      min="0"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Emplacement</label>
                    <input
                      type="text"
                      name="emplacement"
                      value={formData.emplacement}
                      onChange={handleInputChange}
                      placeholder="Ex: A1"
                      disabled={saving}
                      maxLength={50}
                    />
                  </div>
                  <div className="form-group">
                    <label>Rayon</label>
                    <input
                      type="text"
                      name="rayon"
                      value={formData.rayon}
                      onChange={handleInputChange}
                      placeholder="Ex: R3"
                      disabled={saving}
                      maxLength={50}
                    />
                  </div>
                  <div className="form-group">
                    <label>Étagère</label>
                    <input
                      type="text"
                      name="etagere"
                      value={formData.etagere}
                      onChange={handleInputChange}
                      placeholder="Ex: E2"
                      disabled={saving}
                      maxLength={50}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={
                  saving ||
                  !formData.id_fournisseur ||
                  !formData.nom.trim()
                }
              >
                {saving ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>{editingProduit ? "Mettre à jour" : "Créer"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL SUPPRESSION
          ============================================================ */}
      {showDeleteModal && (
        <div
          className="modal-overlay"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            className="modal-content modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header danger-header">
              <div className="modal-title-group">
                <div className="modal-icon danger-icon">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2>Supprimer le produit</h2>
                  <p className="modal-subtitle">Cette action est irréversible</p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => !deleting && setShowDeleteModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body delete-confirm-body">
              <p>Êtes-vous sûr de vouloir supprimer :</p>
              <div className="delete-item-card">
                <Package size={20} />
                <strong>{produitToDelete?.nom}</strong>
              </div>
              <p className="delete-warning-text">
                Toutes les données associées (stock, mouvements) seront
                également supprimées.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Supprimer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL DÉTAILS
          ============================================================ */}
      {showDetailsModal && produitToView && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="modal-content modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon">
                  <Package size={20} />
                </div>
                <div>
                  <h2>{produitToView.nom}</h2>
                  <p className="modal-subtitle">
                    {produitToView.description || "Aucune description"}
                  </p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowDetailsModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="details-status-row">
                {getStatusBadge(produitToView.statut)}
              </div>

              <div className="details-grid">
                <div className="detail-card">
                  <span className="detail-label">Fournisseur</span>
                  <span className="detail-value">
                    {produitToView.fournisseur_nom || "N/A"}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Catégorie</span>
                  <span className="detail-value">
                    {produitToView.categorie_nom || "N/A"}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Marque</span>
                  <span className="detail-value">
                    {produitToView.marque_nom || "N/A"}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Modèle</span>
                  <span className="detail-value">
                    {produitToView.modele_nom || "N/A"}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Unité de base</span>
                  <span className="detail-value">
                    {produitToView.unite_nom || "N/A"}
                    {produitToView.unite_symbole &&
                      ` (${produitToView.unite_symbole})`}
                  </span>
                </div>
                <div className="detail-card detail-card-money">
                  <span className="detail-label">Prix d'achat</span>
                  <span className="detail-value">
                    {formatPrice(produitToView.prix_achat)} <small>FCFA</small>
                  </span>
                </div>
                <div className="detail-card detail-card-money">
                  <span className="detail-label">Prix de vente</span>
                  <span className="detail-value">
                    {formatPrice(produitToView.prix_vente)} <small>FCFA</small>
                  </span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Stock actuel</span>
                  <span className="detail-value">
                    {produitToView.quantite_stock || 0}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Stock minimum</span>
                  <span className="detail-value">
                    {produitToView.quantite_minimale || 0}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Stock maximum</span>
                  <span className="detail-value">
                    {produitToView.quantite_maximale || 0}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Emplacement</span>
                  <span className="detail-value">
                    {produitToView.emplacement || "N/A"}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Rayon / Étagère</span>
                  <span className="detail-value">
                    {produitToView.rayon || "N/A"} / {produitToView.etagere || "N/A"}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Date de création</span>
                  <span className="detail-value">
                    {formatDate(produitToView.date_creation)}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Fermer
              </button>
              {canManage && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEdit(produitToView);
                  }}
                >
                  <Edit size={18} />
                  <span>Modifier</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TOAST ================= */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Produits;