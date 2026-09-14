// pages/Ventes/Ventes.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Search, Eye, ChevronLeft, ChevronRight, Download, X, Check,
  RefreshCw, Grid, List, Package, Calendar, Clock, AlertCircle,
  CheckCircle, Ban, FileText, ShoppingBag, AlertTriangle, Trash2,
  Truck, User, TrendingUp, Wallet, Phone, Search as SearchIcon,
  Loader, ChevronDown, CreditCard, Building, Coins, Printer, FileDown,
  MoreVertical, Box, ShoppingCart, UserCheck, Receipt, XCircle
} from "lucide-react";
import CommandeVenteService from "../../services/commandeVenteService";
import ProduitService from "../../services/produitService";
import UniteVenteService from "../../services/uniteVenteService";
import { useUser } from "../../context/AuthContext";
import FacturePDF from "../../components/Facture/FacturePDF";
import { PDFDownloadLink } from '@react-pdf/renderer';

import "./Ventes.css";

// ============================================================
// HELPERS
// ============================================================
const formatMontant = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0 FCFA';
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num)) return '0 FCFA';
  const fixed = Math.round(num).toString();
  const formatted = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FCFA`;
};

const formatDateFR = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
};

// ============================================================
// CONFIGURATION DES STATUTS
// ============================================================
const STATUTS_CONFIG = [
  { value: 'en_attente', label: 'En attente', icon: Clock, className: 'status-en-attente' },
  { value: 'confirmee', label: 'Confirmée', icon: CheckCircle, className: 'status-confirmee' },
  { value: 'en_preparation', label: 'En préparation', icon: Package, className: 'status-preparation' },
  { value: 'expediee', label: 'Expédiée', icon: Truck, className: 'status-expediee' },
  { value: 'livree', label: 'Livrée', icon: CheckCircle, className: 'status-livree' },
  { value: 'annulee', label: 'Annulée', icon: Ban, className: 'status-annulee' }
];

// ============================================================
// COMPOSANT : Badge de statut
// ============================================================
const StatutBadge = ({ statut }) => {
  const config = STATUTS_CONFIG.find(s => s.value === statut) || STATUTS_CONFIG[0];
  const Icon = config.icon;
  return (
    <span className={`status-badge ${config.className}`}>
      <Icon size={14} />
      {config.label}
    </span>
  );
};

// ============================================================
// COMPOSANT : Dropdown de statut
// ============================================================
const StatutDropdown = ({ commande, onSelect, updatingStatut, canManage }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentStatut = STATUTS_CONFIG.find(s => s.value === commande.statut) || STATUTS_CONFIG[0];
  const Icon = currentStatut.icon;
  const isUpdating = updatingStatut === commande.id_commande;
  const isLocked = commande.statut === 'livree' || commande.statut === 'annulee';

  if (!canManage || isLocked) {
    return (
      <span className={`status-badge ${currentStatut.className} ${isLocked ? 'locked' : ''}`}>
        <Icon size={14} />
        {currentStatut.label}
        {isLocked && <span className="lock-icon" title="Statut verrouillé">🔒</span>}
      </span>
    );
  }

  return (
    <div className="statut-dropdown-container" ref={dropdownRef}>
      <button
        className={`status-badge clickable ${currentStatut.className} ${isUpdating ? 'loading' : ''}`}
        onClick={() => !isUpdating && setOpen(!open)}
        disabled={isUpdating}
        title="Cliquer pour changer le statut"
      >
        {isUpdating ? (
          <span className="spinner-small"></span>
        ) : (
          <>
            <Icon size={14} />
            <span>{currentStatut.label}</span>
            <ChevronDown size={12} className={`statut-chevron ${open ? 'rotated' : ''}`} />
          </>
        )}
      </button>

      {open && (
        <div className="statut-dropdown-menu">
          <div className="statut-dropdown-header">Changer le statut</div>
          {STATUTS_CONFIG.map((s) => {
            const SIcon = s.icon;
            const isCurrent = s.value === commande.statut;
            const isDisabled = commande.statut === 'livree' && s.value !== 'livree';

            return (
              <button
                key={s.value}
                className={`statut-dropdown-item ${isCurrent ? 'active' : ''}`}
                onClick={() => {
                  if (!isCurrent && !isDisabled) {
                    onSelect(commande.id_commande, s.value);
                    setOpen(false);
                  }
                }}
                disabled={isCurrent || isDisabled}
              >
                <SIcon size={14} className={s.className} />
                <span>{s.label}</span>
                {isCurrent && <Check size={14} className="current-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const Ventes = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem('token');

  // ========== ÉTATS PRINCIPAUX ==========
  const [commandes, setCommandes] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState("list");
  const [error, setError] = useState(null);
  const [filterStatut, setFilterStatut] = useState("");

  // ========== ÉTATS MODALS ==========
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

  // ========== ÉTATS TOAST ==========
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ========== ÉTAT FORMULAIRE ==========
  const [formData, setFormData] = useState({
    nomclient: "",
    telephone: "",
    lignes: []
  });

  // ========== ÉTATS COMBOBOX PRODUIT ==========
  const [produitSearch, setProduitSearch] = useState("");
  const [produitSearchResults, setProduitSearchResults] = useState([]);
  const [showProduitDropdown, setShowProduitDropdown] = useState(false);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [quantite, setQuantite] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const searchDebounce = useRef(null);
  const dropdownRef = useRef(null);

  // ========== Unités de vente ==========
  const [unitesVente, setUnitesVente] = useState([]);
  const [selectedUnite, setSelectedUnite] = useState(null);
  const [loadingUnites, setLoadingUnites] = useState(false);

  // ========== ÉTAT PAIEMENT ==========
  const [paiementData, setPaiementData] = useState({
    mode_paiement: "especes"
  });

  const canManage = user && ['admin', 'manager', 'caissier'].includes(user.role);
  const [openMenuId, setOpenMenuId] = useState(null);

  const toggleMenu = (id) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================
  useEffect(() => {
    if (isAuthenticated && token) {
      loadCommandes();
      loadProduits();
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProduitDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCommandes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await CommandeVenteService.getAllCommandes(token);
      if (response.success) {
        setCommandes(response.data || []);
      } else {
        setError(response.message || 'Erreur lors du chargement des commandes');
      }
    } catch (error) {
      console.error('❌ LoadCommandes error:', error);
      setError(error.message || 'Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const loadProduits = async () => {
    try {
      const response = await ProduitService.getAllProduits(token);
      if (response.success) {
        setProduits(response.data || []);
      }
    } catch (error) {
      console.error('❌ LoadProduits error:', error);
    }
  };

  // ============================================================
  // GESTION FORMULAIRE
  // ============================================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const rechercherProduits = (texte) => {
    setProduitSearch(texte);
    setSelectedProduit(null);
    setSelectedUnite(null);
    setUnitesVente([]);

    if (texte.length < 2) {
      setProduitSearchResults([]);
      setShowProduitDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowProduitDropdown(true);

    if (searchDebounce.current) {
      clearTimeout(searchDebounce.current);
    }

    searchDebounce.current = setTimeout(async () => {
      try {
        const response = await ProduitService.getProduitsByModele(token, texte);

        if (response.success && response.data) {
          const produitsDisponibles = response.data.filter(p => {
            const stock = parseFloat(p.quantite_stock) || 0;
            return stock > 0;
          });

          setProduitSearchResults(produitsDisponibles);
        } else {
          setProduitSearchResults([]);
        }
      } catch (error) {
        console.error('❌ [RECHERCHE] Erreur:', error);
        setProduitSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const selectProduit = async (produit) => {
    setSelectedProduit(produit);
    setProduitSearch(produit.nom + (produit.modele_nom ? ` - ${produit.modele_nom}` : ''));
    setShowProduitDropdown(false);
    setSelectedUnite(null);
    setUnitesVente([]);
    setPrixVente('');
    setLoadingUnites(true);

    try {
      const res = await UniteVenteService.getByProduit(token, produit.id_produit);
      const unitesPersonnalisees = (res.success && res.data) ? res.data : [];

      const uniteBase = {
        id_unite_vente: null,
        nom: produit.unite_nom || produit.unite_symbole || 'Unité',
        symbole: produit.unite_symbole || '',
        quantite_base: 1,
        prix_vente: produit.prix_vente || 0,
        prix_achat: produit.prix_achat || 0,
        est_principal: false,
        est_unite_base: true,
      };

      const toutesLesUnites = [uniteBase, ...unitesPersonnalisees];
      setUnitesVente(toutesLesUnites);

      const principale = unitesPersonnalisees.find(
        u => u.est_principal === 1 || u.est_principal === true
      );
      const defaut = principale || uniteBase;
      setSelectedUnite(defaut);
      setPrixVente(defaut.prix_vente || 0);
    } catch (error) {
      console.error('❌ Erreur chargement unités:', error);

      const uniteBase = {
        id_unite_vente: null,
        nom: produit.unite_nom || produit.unite_symbole || 'Unité',
        quantite_base: 1,
        prix_vente: produit.prix_vente || 0,
        prix_achat: produit.prix_achat || 0,
        est_principal: true,
        est_unite_base: true,
      };
      setUnitesVente([uniteBase]);
      setSelectedUnite(uniteBase);
      setPrixVente(uniteBase.prix_vente);
    } finally {
      setLoadingUnites(false);
    }

    setTimeout(() => {
      const qteInput = document.querySelector('input[name="quantite_ajout"]');
      if (qteInput) qteInput.focus();
    }, 200);
  };

  const handleUniteChange = (uniteId) => {
    const unite = unitesVente.find(u =>
      u.id_unite_vente === uniteId ||
      (uniteId === null && u.id_unite_vente === null)
    );
    if (unite) {
      setSelectedUnite(unite);
      setPrixVente(unite.prix_vente || 0);
    }
  };

  const calculerUnitesBase = () => {
    if (!selectedUnite || !quantite) return 0;
    return parseFloat(quantite) * parseFloat(selectedUnite.quantite_base || 1);
  };

  const ajouterProduit = async () => {
    if (!selectedProduit) {
      alert("Veuillez sélectionner un produit");
      return;
    }

    if (!selectedUnite) {
      alert("Veuillez sélectionner une unité de vente");
      return;
    }

    if (!quantite || parseFloat(quantite) <= 0) {
      alert("Veuillez saisir une quantité valide");
      return;
    }

    let stockDisponible = parseFloat(selectedProduit.quantite_stock) || 0;
    try {
      const fresh = await ProduitService.getProduitById(token, selectedProduit.id_produit);
      if (fresh.success && fresh.data) {
        stockDisponible = parseFloat(fresh.data.quantite_stock) || 0;
      }
    } catch (err) {
      console.warn('⚠️ Impossible de rafraîchir le stock');
    }

    const qteBase = parseFloat(selectedUnite.quantite_base) || 1;
    const unitesNecessaires = parseFloat(quantite) * qteBase;

    const dejaReserve = formData.lignes
      .filter(l => l.id_produit === selectedProduit.id_produit)
      .reduce((sum, l) => sum + (parseFloat(l.quantite_totale_base) || 0), 0);

    const stockRestant = stockDisponible - dejaReserve;

    if (unitesNecessaires > stockRestant) {
      const maxConditionnements = Math.floor(stockRestant / qteBase);
      alert(
        `❌ Stock insuffisant !\n\n` +
        `Stock disponible : ${stockDisponible} unité(s) de base\n` +
        `Déjà dans le panier : ${dejaReserve} unité(s)\n` +
        `Restant : ${stockRestant} unité(s)\n\n` +
        `Vous demandez : ${quantite} ${selectedUnite.nom}(s) = ${unitesNecessaires} unité(s)\n` +
        `Maximum possible : ${maxConditionnements} ${selectedUnite.nom}(s)`
      );
      return;
    }

    const prix = parseFloat(prixVente) || parseFloat(selectedUnite.prix_vente) || 0;
    if (prix <= 0) {
      alert(`Le prix de vente n'est pas défini`);
      return;
    }

    const ligneExistanteIndex = formData.lignes.findIndex(
      l => l.id_produit === selectedProduit.id_produit &&
           l.id_unite_vente === selectedUnite.id_unite_vente
    );

    let nouvellesLignes;
    if (ligneExistanteIndex !== -1) {
      nouvellesLignes = [...formData.lignes];
      const ligne = nouvellesLignes[ligneExistanteIndex];
      const nouvelleQte = ligne.quantite + parseFloat(quantite);
      const nouvelleQteBase = ligne.quantite_totale_base + unitesNecessaires;

      ligne.quantite = nouvelleQte;
      ligne.quantite_totale_base = nouvelleQteBase;
      ligne.total = nouvelleQte * ligne.prix_vente;
    } else {
      nouvellesLignes = [
        ...formData.lignes,
        {
          id_produit: selectedProduit.id_produit,
          produit_nom: selectedProduit.nom,
          modele_nom: selectedProduit.modele_nom || '',

          id_unite_vente: selectedUnite.id_unite_vente,
          nom_unite_vente: selectedUnite.nom,
          quantite_base: qteBase,
          quantite_totale_base: unitesNecessaires,

          quantite: parseFloat(quantite),
          prix_vente: prix,
          unite: selectedUnite.nom,
          total: parseFloat(quantite) * prix,
        }
      ];
    }

    setFormData({
      ...formData,
      lignes: nouvellesLignes
    });

    setSelectedProduit(null);
    setSelectedUnite(null);
    setUnitesVente([]);
    setProduitSearch("");
    setQuantite("");
    setPrixVente("");
    setProduitSearchResults([]);
    setShowProduitDropdown(false);

    setTimeout(() => {
      const searchInput = document.querySelector('input[name="produit_search"]');
      if (searchInput) searchInput.focus();
    }, 100);
  };

  const removeLigne = (index) => {
    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes.splice(index, 1);
    setFormData({ ...formData, lignes: nouvellesLignes });
  };

  const calculerTotal = () => {
    return formData.lignes.reduce((sum, l) => sum + (l.total || 0), 0);
  };

  const renderProduitDropdown = () => {
    if (!showProduitDropdown) return null;

    return (
      <div className="produit-dropdown" ref={dropdownRef}>
        {isSearching ? (
          <div className="dropdown-loading">
            <Loader size={18} className="spinning" />
            <span>Recherche en cours...</span>
          </div>
        ) : produitSearchResults.length === 0 ? (
          <div className="dropdown-empty">
            <span>Aucun produit disponible</span>
          </div>
        ) : (
          produitSearchResults.map(p => (
            <div
              key={p.id_produit}
              className={`dropdown-item ${selectedProduit?.id_produit === p.id_produit ? 'selected' : ''}`}
              onClick={() => selectProduit(p)}
            >
              <div className="dropdown-item-info">
                <span className="dropdown-item-nom">{p.nom}</span>
                {p.modele_nom && <span className="dropdown-item-modele">{p.modele_nom}</span>}
              </div>
              <div className="dropdown-item-prix">
                {formatMontant(p.prix_vente)}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // ============================================================
  // ACTIONS PRINCIPALES
  // ============================================================
  const handleAdd = () => {
    setFormData({
      nomclient: "",
      telephone: "",
      lignes: []
    });
    setSelectedProduit(null);
    setSelectedUnite(null);
    setUnitesVente([]);
    setProduitSearch("");
    setQuantite("");
    setPrixVente("");
    setProduitSearchResults([]);
    setShowProduitDropdown(false);
    setCommandeEnCours(null);
    setFactureGeneree(null);
    setError(null);
    setShowModal(true);
  };

  const handleView = (commande) => {
    setSelectedCommande(commande);
    setShowDetailModal(true);
  };

  const handleChangeStatut = async (id, statut) => {
    if (updatingStatut === id) return;
    setUpdatingStatut(id);
    setError(null);

    try {
      const response = await CommandeVenteService.updateStatut(token, id, statut);

      if (response.success) {
        await loadCommandes();

        const labels = {
          'en_attente': 'En attente',
          'confirmee': 'Confirmée',
          'en_preparation': 'En préparation',
          'expediee': 'Expédiée',
          'livree': 'Livrée',
          'annulee': 'Annulée'
        };

        showToast(`Statut modifié : "${labels[statut] || statut}"`, 'success');
      } else {
        setError(response.message || 'Erreur lors du changement de statut');
        showToast(response.message || 'Erreur lors du changement', 'error');
      }
    } catch (error) {
      console.error('❌ Change statut error:', error);
      setError(error.message || 'Erreur lors du changement de statut');
      showToast(error.message || 'Erreur lors du changement', 'error');
    } finally {
      setUpdatingStatut(null);
    }
  };

  const handleFinaliserVente = async () => {
    if (!formData.nomclient || formData.nomclient.trim() === "") {
      alert("Veuillez saisir le nom du client");
      return;
    }

    if (!formData.telephone || formData.telephone.trim() === "") {
      alert("Veuillez saisir le numéro de téléphone du client");
      return;
    }

    if (formData.lignes.length === 0) {
      alert("Veuillez ajouter au moins un produit");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        nomclient: formData.nomclient.trim(),
        telephone: formData.telephone.trim(),
        date_commande: new Date().toISOString().split('T')[0],
        notes: null,
        mode_paiement: "especes",
        date_echeance: null,
        lignes: formData.lignes.map(l => ({
          id_produit: l.id_produit,
          id_unite_vente: l.id_unite_vente,
          nom_unite_vente: l.nom_unite_vente,
          quantite_base: l.quantite_base,
          quantite: l.quantite,
          quantite_totale_base: l.quantite_totale_base,
          prix_vente: l.prix_vente,
          remise: 0
        }))
      };

      const commandeResponse = await CommandeVenteService.createCommande(token, data);

      if (!commandeResponse.success) {
        throw new Error(commandeResponse.message || 'Erreur lors de la création');
      }

      const commande = commandeResponse.data;

      const commandeCompleteResponse = await CommandeVenteService.getCommandeById(
        token,
        commande.id_commande
      );

      if (!commandeCompleteResponse.success) {
        throw new Error('Impossible de récupérer les détails');
      }

      const commandeComplete = commandeCompleteResponse.data;

      const facture = {
        id_facture: commandeComplete.id_facture || Date.now(),
        numero_facture: commandeComplete.numero_facture || `FV-${Date.now()}`,
        date_facture: commandeComplete.date_facture || new Date().toISOString().split('T')[0],
        date_echeance: commandeComplete.date_echeance || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nomclient: commandeComplete.nomclient || 'Client',
        telephone: commandeComplete.telephone || '',
        montant_total: parseFloat(commandeComplete.montant_total) || 0,
        mode_paiement: commandeComplete.mode_paiement || "especes",
        statut: commandeComplete.statut_facture || 'en_attente',
        notes: commandeComplete.notes || `Facture pour commande ${commandeComplete.numero_commande}`,
        lignes: commandeComplete.lignes || [],
        paiements: commandeComplete.paiements || [],
        total_paye: commandeComplete.total_paye || 0,
        reste_a_payer: parseFloat(commandeComplete.montant_total) - (commandeComplete.total_paye || 0),
        numero_commande: commandeComplete.numero_commande,
        id_commande: commandeComplete.id_commande,
      };

      setFactureGeneree(facture);
      setCommandeEnCours(commande);
      setShowModal(false);
      setShowFactureModal(true);

    } catch (error) {
      console.error('❌ Finaliser error:', error);
      setError(error.message || 'Erreur lors de la finalisation');
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePayer = async () => {
    if (!commandeEnCours || !factureGeneree) {
      alert('❌ Aucune facture à payer');
      return;
    }

    const resteAPayer = factureGeneree.reste_a_payer !== undefined
      ? factureGeneree.reste_a_payer
      : factureGeneree.montant_total;

    if (resteAPayer <= 0) {
      alert('❌ Cette facture est déjà totalement payée');
      setShowPaiementModal(false);
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
          date_paiement: new Date().toISOString().split('T')[0],
          montant: parseFloat(paiementData.montant || resteAPayer),
          mode_paiement: paiementData.mode_paiement || 'especes',
          note: `Paiement pour facture ${factureGeneree.numero_facture}`,
          reference: null
        }
      );

      if (!paiementResponse.success) {
        throw new Error(paiementResponse.message || 'Erreur lors du paiement');
      }

      const commandeComplete = await CommandeVenteService.getCommandeById(
        token,
        commandeEnCours.id_commande
      );

      let nouveauTotalPaye = 0;
      let nouveauMontantTotal = 0;
      let nouveauStatutFacture = 'en_attente';
      let nouveauResteAPayer = 0;

      if (commandeComplete.success) {
        nouveauTotalPaye = commandeComplete.data.total_paye || 0;
        nouveauMontantTotal = parseFloat(commandeComplete.data.montant_total) || 0;
        nouveauStatutFacture = commandeComplete.data.statut_facture || 'en_attente';
        nouveauResteAPayer = nouveauMontantTotal - nouveauTotalPaye;

        setFactureGeneree({
          ...factureGeneree,
          statut: nouveauStatutFacture,
          total_paye: nouveauTotalPaye,
          reste_a_payer: nouveauResteAPayer,
          paiements: commandeComplete.data.paiements || []
        });
      }

      await loadCommandes();

      if (nouveauStatutFacture === 'payee') {
        setShowPaiementModal(false);
        setCommandeEnCours(null);
        setPaiementData({ mode_paiement: "especes", montant: "" });
        setShowFactureModal(true);
        showToast('Facture totalement payée !', 'success');
      } else {
        showToast(`Paiement partiel. Reste : ${formatMontant(nouveauResteAPayer)}`, 'success');
      }

    } catch (error) {
      console.error('❌ Payer error:', error);
      setError(error.message || 'Erreur lors du paiement');
      showToast(error.message || 'Erreur lors du paiement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const preparerPaiement = async (commande) => {
    if (!commande?.id_commande) {
      alert('❌ Commande invalide');
      return;
    }

    try {
      const fullResponse = await CommandeVenteService.getCommandeById(token, commande.id_commande);
      if (!fullResponse.success) throw new Error('Commande non trouvée');

      const commandeComplete = fullResponse.data;

      if (!commandeComplete.id_facture) {
        alert('❌ Aucune facture associée à cette commande');
        return;
      }

      const montantTotal = parseFloat(commandeComplete.montant_total) || 0;
      const totalPaye = parseFloat(commandeComplete.total_paye) || 0;
      const resteAPayer = montantTotal - totalPaye;

      if (resteAPayer <= 0) {
        alert('❌ Cette facture est déjà totalement payée');
        return;
      }

      const facture = {
        id_facture: commandeComplete.id_facture,
        numero_facture: commandeComplete.numero_facture,
        date_facture: commandeComplete.date_facture,
        date_echeance: commandeComplete.date_echeance,
        nomclient: commandeComplete.nomclient,
        telephone: commandeComplete.telephone,
        montant_total: montantTotal,
        statut: commandeComplete.statut_facture || 'en_attente',
        lignes: commandeComplete.lignes || [],
        paiements: commandeComplete.paiements || [],
        total_paye: totalPaye,
        reste_a_payer: resteAPayer,
        numero_commande: commandeComplete.numero_commande,
        id_commande: commandeComplete.id_commande,
        mode_paiement: commandeComplete.mode_paiement || 'especes',
      };

      setCommandeEnCours(commandeComplete);
      setFactureGeneree(facture);
      setPaiementData({ mode_paiement: "especes" });
      setShowPaiementModal(true);
      setShowDetailModal(false);
      setOpenMenuId(null);

    } catch (error) {
      console.error('❌ Erreur preparerPaiement:', error);
      alert(`❌ Erreur: ${error.message}`);
    }
  };

  const confirmDelete = (commande) => {
    setCommandeToDelete(commande);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!commandeToDelete) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await CommandeVenteService.deleteCommande(token, commandeToDelete.id_commande);

      if (response.success) {
        await loadCommandes();
        setShowDeleteModal(false);
        setCommandeToDelete(null);
        showToast('Commande supprimée', 'success');
      } else {
        setError(response.message || 'Erreur lors de la suppression');
        showToast(response.message || 'Erreur suppression', 'error');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      setError(error.message || 'Erreur lors de la suppression');
      showToast(error.message || 'Erreur suppression', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await CommandeVenteService.exportCommandes(token);
      if (response.success && response.data) {
        const headers = ["ID", "Numéro", "Date", "Client", "Téléphone", "Facture", "Montant", "Statut", "Notes"];
        const rows = response.data.map(c => [
          c.id, c.numero, c.date, c.client || '-', c.telephone || '-',
          c.facture || '-', formatMontant(c.montant), c.statut, c.notes || ""
        ]);

        let csv = headers.join(",") + "\n";
        rows.forEach(row => {
          csv += row.map(cell => `"${cell}"`).join(",") + "\n";
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ventes_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      alert('Erreur lors de l\'exportation');
    }
  };

  const getStatutFactureBadge = (statut) => {
    const configs = {
      'en_attente': { label: 'En attente', className: 'status-en-attente' },
      'payee': { label: 'Payée', className: 'status-livree' },
      'partiellement_payee': { label: 'Partiellement payée', className: 'status-preparation' },
      'en_retard': { label: 'En retard', className: 'status-annulee' },
      'annulee': { label: 'Annulée', className: 'status-annulee' }
    };
    const config = configs[statut] || configs['en_attente'];
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  const getStats = () => {
    const total = commandes.length;
    const enAttente = commandes.filter(c => c.statut === 'en_attente').length;
    const confirmee = commandes.filter(c => c.statut === 'confirmee').length;
    const enPreparation = commandes.filter(c => c.statut === 'en_preparation').length;
    const expediee = commandes.filter(c => c.statut === 'expediee').length;
    const livree = commandes.filter(c => c.statut === 'livree').length;
    const annulee = commandes.filter(c => c.statut === 'annulee').length;

    const totalCA = commandes.reduce((sum, c) => {
      const montant = c.montant_total !== undefined && c.montant_total !== null
        ? parseFloat(c.montant_total) : 0;
      return sum + (isNaN(montant) ? 0 : montant);
    }, 0);

    return { total, enAttente, confirmee, enPreparation, expediee, livree, annulee, totalCA };
  };

  const stats = getStats();

  const filteredCommandes = commandes.filter((commande) => {
    const matchSearch =
      commande.numero_commande?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.nomclient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.telephone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.numero_facture?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatut = filterStatut ? commande.statut === filterStatut : true;
    return matchSearch && matchStatut;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCommandes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCommandes.length / itemsPerPage);

  // ============================================================
  // RENDU DES LIGNES DU FORMULAIRE
  // ============================================================
  const renderLignesForm = () => {
    if (formData.lignes.length === 0) {
      return (
        <div className="empty-lignes">
          <ShoppingBag size={28} />
          <p>Aucun produit ajouté</p>
          <small>Recherchez et ajoutez des produits à la commande</small>
        </div>
      );
    }

    return (
      <div className="lignes-table-container">
        <table className="lignes-table">
          <thead>
            <tr>
              <th style={{ width: '34%' }}>Produit</th>
              <th style={{ width: '18%' }}>Unité</th>
              <th style={{ width: '10%' }}>Qté</th>
              <th style={{ width: '16%' }}>Prix unit.</th>
              <th style={{ width: '16%' }}>Total</th>
              <th style={{ width: '6%' }}></th>
            </tr>
          </thead>
          <tbody>
            {formData.lignes.map((ligne, index) => (
              <tr key={index}>
                <td>
                  <strong>{ligne.produit_nom}</strong>
                  {ligne.modele_nom && <span className="unite-label"> - {ligne.modele_nom}</span>}
                </td>
                <td>
                  <span className="unite-badge">
                    <Box size={11} />
                    {ligne.nom_unite_vente}
                    {ligne.quantite_base > 1 && (
                      <small> ({ligne.quantite_base})</small>
                    )}
                  </span>
                </td>
                <td>
                  <span className="qte-cell">
                    <strong>{ligne.quantite}</strong>
                  </span>
                </td>
                <td>{formatMontant(ligne.prix_vente)}</td>
                <td className="montant-cell">
                  <strong>{formatMontant(ligne.total)}</strong>
                  {ligne.quantite_base > 1 && (
                    <div className="unites-total">
                      = {ligne.quantite_totale_base} unités
                    </div>
                  )}
                </td>
                <td>
                  <button
                    className="btn-remove"
                    onClick={() => removeLigne(index)}
                    disabled={saving}
                    title="Supprimer"
                  >
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ============================================================
  // VUE LISTE
  // ============================================================
  const renderListView = () => (
    <div className="ventes-table-container">
      <table className="ventes-table">
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Date</th>
            <th>Client</th>
            <th>Téléphone</th>
            <th>Facture</th>
            <th>Montant</th>
            <th>Statut</th>
            <th>Statut Facture</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length === 0 ? (
            <tr>
              <td colSpan="9" className="empty-state">
                <ShoppingBag size={32} />
                <p>Aucune commande trouvée</p>
              </td>
            </tr>
          ) : (
            currentItems.map((commande) => (
              <tr key={commande.id_commande}>
                <td className="numero-cell">
                  <span className="commande-numero">{commande.numero_commande}</span>
                </td>
                <td>{formatDateFR(commande.date_commande)}</td>
                <td className="client-cell">
                  <User size={14} />
                  <span>{commande.nomclient || '-'}</span>
                </td>
                <td>{commande.telephone || '-'}</td>
                <td>{commande.numero_facture || '-'}</td>
                <td className="montant-cell">
                  <strong>{formatMontant(commande.montant_total)}</strong>
                </td>
                <td>
                  <StatutDropdown
                    commande={commande}
                    onSelect={handleChangeStatut}
                    updatingStatut={updatingStatut}
                    canManage={canManage}
                  />
                </td>
                <td>{commande.statut_facture ? getStatutFactureBadge(commande.statut_facture) : '-'}</td>
                <td className="actions-cell">
                  <div className="actions-dropdown-container">
                    <button
                      className="action-btn btn-more"
                      onClick={() => toggleMenu(commande.id_commande)}
                      title="Actions"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {openMenuId === commande.id_commande && (
                      <div className="actions-dropdown-menu">
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            handleView(commande);
                            setOpenMenuId(null);
                          }}
                        >
                          <Eye size={16} />
                          <span>Voir</span>
                        </button>

                        {canManage && commande.statut !== 'livree' && commande.statut !== 'annulee' && (
                          <button
                            className="dropdown-item"
                            onClick={() => preparerPaiement(commande)}
                          >
                            <Wallet size={16} />
                            <span>Payer</span>
                          </button>
                        )}

                        {canManage && (
                          <button
                            className="dropdown-item btn-delete"
                            onClick={() => {
                              confirmDelete(commande);
                              setOpenMenuId(null);
                            }}
                          >
                            <Trash2 size={16} />
                            <span>Supprimer</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // ============================================================
  // VUE GRILLE
  // ============================================================
  const renderGridView = () => (
    <div className="ventes-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={48} className="empty-icon" />
          <p>Aucune commande trouvée</p>
        </div>
      ) : (
        currentItems.map((commande) => (
          <div key={commande.id_commande} className="vente-card">
            <div className="vente-card-header">
              <div className="vente-info">
                <span className="vente-numero">{commande.numero_commande}</span>
                <span className="vente-date">
                  <Calendar size={14} />
                  {formatDateFR(commande.date_commande)}
                </span>
              </div>
              <div className="vente-actions">
                <button
                  className="action-btn btn-view"
                  onClick={() => handleView(commande)}
                  title="Voir"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
            <div className="vente-card-body">
              <div className="client-info">
                <User size={16} />
                <span>{commande.nomclient || 'Client inconnu'}</span>
              </div>
              <div className="client-telephone">
                <Phone size={14} />
                <span>{commande.telephone || '-'}</span>
              </div>
              <div className="vente-facture">
                <FileText size={14} />
                <span>{commande.numero_facture || 'Facture non générée'}</span>
              </div>
              <div className="vente-montant">
                <span>{formatMontant(commande.montant_total)}</span>
              </div>
              <div className="vente-stats">
                <StatutDropdown
                  commande={commande}
                  onSelect={handleChangeStatut}
                  updatingStatut={updatingStatut}
                  canManage={canManage}
                />
                {commande.statut_facture && getStatutFactureBadge(commande.statut_facture)}
              </div>
            </div>
            <div className="vente-card-footer">
              {canManage && commande.statut !== 'livree' && commande.statut !== 'annulee' && (
                <button
                  className="btn btn-paiement"
                  onClick={() => preparerPaiement(commande)}
                >
                  <Wallet size={16} />
                  Payer
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="ventes-container">
      {/* En-tête */}
      <div className="ventes-header">
        <div>
          <h1 className="ventes-title">Ventes</h1>
          <p className="ventes-subtitle">{stats.total} commandes au total</p>
        </div>
        <div className="ventes-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              <span>Nouvelle Vente</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={loadCommandes}
            title="Rafraîchir"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

{/* Statistiques */}
<div className="ventes-stats">
  <div className="stat-card">
    <div className="stat-icon total"><ShoppingBag size={18} /></div>
    <div className="stat-info">
      <span className="stat-label">Total</span>
      <span className="stat-value" title={stats.total}>{stats.total}</span>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon en-attente"><Clock size={18} /></div>
    <div className="stat-info">
      <span className="stat-label">En attente</span>
      <span className="stat-value" title={stats.enAttente}>{stats.enAttente}</span>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon confirmee"><CheckCircle size={18} /></div>
    <div className="stat-info">
      <span className="stat-label">Confirmées</span>
      <span className="stat-value" title={stats.confirmee}>{stats.confirmee}</span>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon preparation"><Package size={18} /></div>
    <div className="stat-info">
      <span className="stat-label">En préparation</span>
      <span className="stat-value" title={stats.enPreparation}>{stats.enPreparation}</span>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon expediee"><Truck size={18} /></div>
    <div className="stat-info">
      <span className="stat-label">Expédiées</span>
      <span className="stat-value" title={stats.expediee}>{stats.expediee}</span>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon livree"><CheckCircle size={18} /></div>
    <div className="stat-info">
      <span className="stat-label">Livrées</span>
      <span className="stat-value" title={stats.livree}>{stats.livree}</span>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon ca"><TrendingUp size={18} /></div>
    <div className="stat-info">
      <span className="stat-label">Chiffre d'affaires</span>
      <span className="stat-value" title={formatMontant(stats.totalCA)}>{formatMontant(stats.totalCA)}</span>
    </div>
  </div>
</div>

      {/* Filtres */}
      <div className="ventes-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher une commande..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className="filter-group">
          <select
            className="filter-select"
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="confirmee">Confirmée</option>
            <option value="en_preparation">En préparation</option>
            <option value="expediee">Expédiée</option>
            <option value="livree">Livrée</option>
            <option value="annulee">Annulée</option>
          </select>
        </div>
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <Grid size={18} />
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Contenu */}
      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Chargement des commandes...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-secondary" onClick={loadCommandes}>
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && (
        <>{viewMode === 'grid' ? renderGridView() : renderListView()}</>
      )}

      {/* Pagination */}
      {!loading && !error && filteredCommandes.length > itemsPerPage && (
        <div className="ventes-pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="pagination-info">
            Page {currentPage} sur {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ============================================================
          MODAL - NOUVELLE VENTE (STRUCTURE 2 COLONNES)
          ============================================================ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
          <div className="modal-content large vente-modal" onClick={(e) => e.stopPropagation()}>
            {/* HEADER */}
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-header-icon">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h2>Nouvelle Vente</h2>
                  <p className="modal-header-sub">Créer une commande client</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => !saving && setShowModal(false)}>
                <X size={22} />
              </button>
            </div>

            {/* BODY : 2 COLONNES */}
            <div className="modal-body vente-body-grid">
              {/* ═══════════ COLONNE GAUCHE : FORMULAIRE ═══════════ */}
              <div className="vente-form-main">
                {error && (
                  <div className="modal-error">
                    <AlertTriangle size={16} />
                    <p>{error}</p>
                  </div>
                )}

                {/* ÉTAPE 1 : CLIENT */}
                <div className="step-section">
                  <div className="section-header">
                    <div className="section-header-left">
                      <div className="step-badge">1</div>
                      <h4>Client</h4>
                    </div>
                    <span className="section-badge required">Requis</span>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Nom du client *</label>
                      <div className="input-with-icon">
                        <User size={15} className="input-icon" />
                        <input
                          type="text"
                          name="nomclient"
                          value={formData.nomclient}
                          onChange={handleInputChange}
                          placeholder="Ex: Koné Mondésir"
                          disabled={saving}
                          className="form-input-with-icon"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Téléphone *</label>
                      <div className="input-with-icon">
                        <Phone size={15} className="input-icon" />
                        <input
                          type="text"
                          name="telephone"
                          value={formData.telephone}
                          onChange={handleInputChange}
                          placeholder="Ex: +225 07 00 00 00 00"
                          disabled={saving}
                          className="form-input-with-icon"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ÉTAPE 2 : PRODUITS */}
                <div className="step-section">
                  <div className="section-header">
                    <div className="section-header-left">
                      <div className="step-badge">2</div>
                      <h4>Ajouter des produits</h4>
                    </div>
                    <span className="section-badge">
                      {formData.lignes.length} ajouté(s)
                    </span>
                  </div>

                  {/* Combobox produit */}
                  <div className="produit-search-wrapper">
                    <div className="combobox-container" ref={dropdownRef}>
                      <div className="combobox-input-wrapper large">
                        <SearchIcon size={18} className="combobox-icon" />
                        <input
                          type="text"
                          name="produit_search"
                          className="combobox-input"
                          placeholder="Rechercher par nom, modèle ou marque..."
                          value={produitSearch}
                          onChange={(e) => rechercherProduits(e.target.value)}
                          onFocus={() => {
                            if (produitSearch.length >= 2 && produitSearchResults.length > 0) {
                              setShowProduitDropdown(true);
                            }
                          }}
                          disabled={saving}
                          autoComplete="off"
                        />
                        {isSearching && <Loader size={16} className="combobox-spinner spinning" />}
                        <ChevronDown
                          size={18}
                          className="combobox-arrow"
                          onClick={() => {
                            if (produitSearchResults.length > 0) {
                              setShowProduitDropdown(!showProduitDropdown);
                            }
                          }}
                        />
                      </div>
                      {renderProduitDropdown()}
                    </div>
                  </div>

                  {/* Badge produit sélectionné */}
                  {selectedProduit && (
                    <div className="produit-selection-info">
                      <div className="produit-selection-badge">
                        <Check size={16} />
                        <div className="produit-selection-details">
                          <strong>{selectedProduit.nom}</strong>
                          {selectedProduit.modele_nom && (
                            <span className="produit-selection-modele">
                              {selectedProduit.modele_nom}
                            </span>
                          )}
                        </div>
                        <span className="produit-selection-stock">
                          {selectedProduit.quantite_stock} en stock
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Unité de vente */}
                  {selectedProduit && (
                    <div className="unite-vente-section">
                      <label>Unité de vente *</label>

                      {loadingUnites ? (
                        <div className="loading-unites">
                          <Loader size={14} className="spinning" />
                          <span>Chargement des unités...</span>
                        </div>
                      ) : unitesVente.length === 0 ? (
                        <div className="empty-unites">
                          <AlertTriangle size={14} />
                          <span>Aucune unité de vente disponible</span>
                        </div>
                      ) : (
                        <div className="unites-buttons">
                          {unitesVente.map((unite, idx) => (
                            <button
                              key={unite.id_unite_vente ?? `base-${idx}`}
                              type="button"
                              className={`unite-btn ${selectedUnite?.id_unite_vente === unite.id_unite_vente ? 'active' : ''}`}
                              onClick={() => handleUniteChange(unite.id_unite_vente)}
                              disabled={saving}
                            >
                              <Box size={14} />
                              <div className="unite-btn-content">
                                <span className="unite-btn-nom">
                                  {unite.nom}
                                  {unite.est_unite_base && (
                                    <small className="badge-base"> (base)</small>
                                  )}
                                </span>
                                {unite.quantite_base > 1 && (
                                  <span className="unite-btn-base">
                                    × {unite.quantite_base} unités
                                  </span>
                                )}
                                <span className="unite-btn-prix">
                                  {formatMontant(unite.prix_vente)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Qté + Prix + Bouton Ajouter */}
                  <div className="add-ligne-grid">
                    <div className="form-group">
                      <label>Quantité *</label>
                      <input
                        type="number"
                        name="quantite_ajout"
                        value={quantite}
                        onChange={(e) => setQuantite(e.target.value)}
                        placeholder="0"
                        disabled={saving || !selectedProduit || !selectedUnite}
                        min="1"
                        step="1"
                      />
                      {quantite && selectedUnite && (
                        <small className="input-hint">
                          = {calculerUnitesBase()} unité(s)
                        </small>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Prix de vente</label>
                      <input
                        type="number"
                        value={prixVente}
                        onChange={(e) => setPrixVente(e.target.value)}
                        placeholder="Auto"
                        disabled={saving || !selectedProduit || !selectedUnite}
                        step="0.01"
                      />
                      {selectedUnite && (
                        <small className="input-hint">
                          Prix {selectedUnite.nom}
                        </small>
                      )}
                    </div>

                    <div className="form-group add-button-group">
                      <label>&nbsp;</label>
                      <button
                        type="button"
                        className="btn-add-produit"
                        onClick={ajouterProduit}
                        disabled={saving || !selectedProduit || !selectedUnite || !quantite}
                      >
                        <Plus size={16} />
                        <span>Ajouter</span>
                      </button>
                    </div>
                  </div>

                  {/* Sous-total preview */}
                  {quantite && selectedUnite && prixVente && (
                    <div className="sous-total-preview">
                      <div className="sous-total-line">
                        <span>Sous-total :</span>
                        <strong>{formatMontant(parseFloat(quantite) * parseFloat(prixVente))}</strong>
                      </div>
                      {selectedUnite.quantite_base > 1 && (
                        <div className="sous-total-conversion">
                          {quantite} {selectedUnite.nom}(s) = {calculerUnitesBase()} unité(s) de base
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tableau des lignes */}
                  <div className="lignes-section">
                    {renderLignesForm()}
                  </div>
                </div>
              </div>

              {/* ═══════════ COLONNE DROITE : RÉSUMÉ ═══════════ */}
              <aside className="vente-resume-sidebar">
                <div className="step-section resume-card">
                  <div className="section-header">
                    <div className="section-header-left">
                      <div className="step-badge">3</div>
                      <h4>Résumé</h4>
                    </div>
                  </div>

                  <div className="resume-content">
                    <div className="resume-row">
                      <span className="resume-label">
                        <UserCheck size={13} /> Client
                      </span>
                      <span className="resume-value">
                        {formData.nomclient || '—'}
                      </span>
                    </div>

                    <div className="resume-row">
                      <span className="resume-label">
                        <Phone size={13} /> Téléphone
                      </span>
                      <span className="resume-value">
                        {formData.telephone || '—'}
                      </span>
                    </div>

                    <div className="resume-row">
                      <span className="resume-label">
                        <Package size={13} /> Produits
                      </span>
                      <span className="resume-value">
                        {formData.lignes.length}
                      </span>
                    </div>

                    {formData.lignes.length > 0 && (
                      <div className="resume-lignes">
                        {formData.lignes.map((l, i) => (
                          <div key={i} className="resume-ligne-item">
                            <div className="resume-ligne-info">
                              <span className="resume-ligne-nom">
                                {l.quantite} × {l.produit_nom}
                              </span>
                              <span className="resume-ligne-unite">
                                {l.nom_unite_vente}
                                {l.quantite_base > 1 && ` (${l.quantite_base})`}
                              </span>
                            </div>
                            <span className="resume-ligne-total">
                              {formatMontant(l.total)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="resume-total">
                      <span className="resume-total-label">Total</span>
                      <span className="resume-total-value">
                        {formatMontant(calculerTotal())}
                      </span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            {/* FOOTER */}
            <div className="modal-footer vente-footer">
              <div className="footer-summary">
                <div className="summary-item">
                  <span className="summary-label">Produits</span>
                  <span className="summary-value">{formData.lignes.length}</span>
                </div>
                <div className="summary-divider" />
                <div className="summary-item total">
                  <span className="summary-label">Total</span>
                  <span className="summary-value-total">{formatMontant(calculerTotal())}</span>
                </div>
              </div>

              <div className="footer-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleFinaliserVente}
                  disabled={saving || formData.lignes.length === 0 || !formData.nomclient || !formData.telephone}
                >
                  {saving ? (
                    <>
                      <span className="spinner-small"></span>
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      <span>Générer la facture</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL - PAIEMENT
          ============================================================ */}
      {showPaiementModal && commandeEnCours && factureGeneree && (
        <div className="modal-overlay" onClick={() => !saving && setShowPaiementModal(false)}>
          <div className="modal-content paiement-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Paiement de la facture</h2>
              <button className="modal-close" onClick={() => !saving && setShowPaiementModal(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              {error && (
                <div className="modal-error">
                  <AlertTriangle size={16} />
                  <p>{error}</p>
                </div>
              )}

              <div className="paiement-resume">
                <div className="paiement-client">
                  <User size={20} />
                  <span>{commandeEnCours.nomclient || 'Client'}</span>
                </div>
                <div className="paiement-facture">
                  <FileText size={18} />
                  <span>Facture N° {factureGeneree.numero_facture}</span>
                </div>
                <div className="paiement-total">
                  <span className="paiement-label">Montant à payer</span>
                  <span className="paiement-montant">{formatMontant(factureGeneree.montant_total)}</span>
                </div>
                <div className="paiement-commande">
                  <span>Commande : {commandeEnCours.numero_commande}</span>
                </div>
              </div>

              <div className="form-section">
                <div className="form-group">
                  <label>Mode de paiement</label>
                  <div className="paiement-modes">
                    <button
                      type="button"
                      className={`paiement-mode-btn ${paiementData.mode_paiement === 'especes' ? 'active' : ''}`}
                      onClick={() => setPaiementData({ mode_paiement: 'especes' })}
                      disabled={saving}
                    >
                      <Coins size={24} />
                      <span>Espèces</span>
                    </button>
                    <button
                      type="button"
                      className={`paiement-mode-btn ${paiementData.mode_paiement === 'carte' ? 'active' : ''}`}
                      onClick={() => setPaiementData({ mode_paiement: 'carte' })}
                      disabled={saving}
                    >
                      <CreditCard size={24} />
                      <span>Carte</span>
                    </button>
                    <button
                      type="button"
                      className={`paiement-mode-btn ${paiementData.mode_paiement === 'virement' ? 'active' : ''}`}
                      onClick={() => setPaiementData({ mode_paiement: 'virement' })}
                      disabled={saving}
                    >
                      <Building size={24} />
                      <span>Virement</span>
                    </button>
                    <button
                      type="button"
                      className={`paiement-mode-btn ${paiementData.mode_paiement === 'cheque' ? 'active' : ''}`}
                      onClick={() => setPaiementData({ mode_paiement: 'cheque' })}
                      disabled={saving}
                    >
                      <FileText size={24} />
                      <span>Chèque</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowPaiementModal(false);
                  setCommandeEnCours(null);
                }}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                className="btn btn-success"
                onClick={handlePayer}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Paiement...</span>
                  </>
                ) : (
                  <>
                    <Wallet size={18} />
                    <span>Payer {formatMontant(factureGeneree.montant_total)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL - FACTURE
          ============================================================ */}
      {showFactureModal && factureGeneree && (
        <div className="modal-overlay" onClick={() => setShowFactureModal(false)}>
          <div className="modal-content facture-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2> Facture N° {factureGeneree.numero_facture}</h2>
              <button className="modal-close" onClick={() => setShowFactureModal(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <div className="facture-header">
                <div className="facture-info">
                  <p><strong>Client :</strong> {factureGeneree.nomclient}</p>
                  <p><strong>Téléphone :</strong> {factureGeneree.telephone || '-'}</p>
                  <p><strong>Date :</strong> {formatDateFR(factureGeneree.date_facture)}</p>
                  <p><strong>Échéance :</strong> {formatDateFR(factureGeneree.date_echeance)}</p>
                  <p><strong>Commande :</strong> {factureGeneree.numero_commande}</p>
                </div>
                <div className="facture-status">
                  {factureGeneree.statut === 'payee' ? (
                    <span className="status-badge status-livree">Payée</span>
                  ) : factureGeneree.statut === 'partiellement_payee' ? (
                    <span className="status-badge status-preparation"> Partiellement payée</span>
                  ) : (
                    <span className="status-badge status-en-attente"> En attente</span>
                  )}
                </div>
              </div>

              <table className="facture-lignes">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Unité</th>
                    <th>Qté</th>
                    <th>Prix unitaire</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {factureGeneree.lignes?.map((ligne, index) => (
                    <tr key={index}>
                      <td>{ligne.produit_nom}</td>
                      <td>
                        <span className="unite-badge">
                          {ligne.nom_unite_vente || 'Unité'}
                          {ligne.quantite_base > 1 && ` (${ligne.quantite_base})`}
                        </span>
                      </td>
                      <td>{ligne.quantite}</td>
                      <td>{formatMontant(ligne.prix_vente)}</td>
                      <td>{formatMontant(ligne.montant_total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan="4"><strong>TOTAL</strong></td>
                    <td><strong>{formatMontant(factureGeneree.montant_total)}</strong></td>
                  </tr>
                </tfoot>
              </table>

              <div className="facture-actions">
                {factureGeneree.statut !== 'payee' ? (
                  <>
                    <button
                      className="btn btn-success btn-payer"
                      onClick={() => {
                        setShowFactureModal(false);
                        setPaiementData({ mode_paiement: "especes" });
                        setShowPaiementModal(true);
                      }}
                    >
                      <Wallet size={18} />
                      <span>Payer maintenant</span>
                    </button>

                    <button
                      className="btn btn-secondary btn-payer-plus-tard"
                      onClick={async () => {
                        setShowFactureModal(false);
                        await loadCommandes();
                        await loadProduits();
                        showToast(
                          `Commande ${commandeEnCours?.numero_commande} enregistrée. ` +
                          `Facture ${factureGeneree?.numero_facture} en attente de paiement.`,
                          'success'
                        );
                        setCommandeEnCours(null);
                        setFactureGeneree(null);
                        setFormData({ nomclient: "", telephone: "", lignes: [] });
                      }}
                    >
                      <Clock size={16} />
                      <span>Enregistrer sans payer</span>
                    </button>
                  </>
                ) : (
                  <PDFDownloadLink
                    document={<FacturePDF data={factureGeneree} />}
                    fileName={`facture-${factureGeneree.numero_facture}.pdf`}
                  >
                    {({ loading }) => (
                      <button className="pdf-btn pdf-btn-download" disabled={loading}>
                        {loading ? (
                          <><span className="spinner-small"></span><span>Génération...</span></>
                        ) : (
                          <><FileDown size={16} /><span>Télécharger PDF</span></>
                        )}
                      </button>
                    )}
                  </PDFDownloadLink>
                )}

                <button
                  className="pdf-btn pdf-btn-print"
                  onClick={() => {
                    if (!factureGeneree) return;
                    alert(`Impression de la facture ${factureGeneree.numero_facture}`);
                  }}
                  disabled={!factureGeneree}
                >
                  <Printer size={16} />
                  <span>Imprimer</span>
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowFactureModal(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL - DÉTAILS
          ============================================================ */}
      {showDetailModal && selectedCommande && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Détails de la commande</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-header-left">
                  <div className="detail-icon"><ShoppingBag size={26} /></div>
                  <div>
                    <h3 className="detail-numero">{selectedCommande.numero_commande}</h3>
                    <span className="detail-date">
                      <Calendar size={14} />
                      {formatDateFR(selectedCommande.date_commande)}
                    </span>
                  </div>
                </div>
                <div className="detail-header-right">
                  <StatutDropdown
                    commande={selectedCommande}
                    onSelect={handleChangeStatut}
                    updatingStatut={updatingStatut}
                    canManage={canManage}
                  />
                  {selectedCommande.statut_facture && getStatutFactureBadge(selectedCommande.statut_facture)}
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-section">
                  <h4><User size={16} /> Client</h4>
                  <div className="detail-item">
                    <label>Nom</label>
                    <span>{selectedCommande.nomclient || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone</label>
                    <span>{selectedCommande.telephone || '-'}</span>
                  </div>
                </div>
                <div className="detail-section">
                  <h4><FileText size={16} /> Informations</h4>
                  <div className="detail-item">
                    <label>Facture</label>
                    <span>{selectedCommande.numero_facture || 'Non générée'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Mode de paiement</label>
                    <span>{selectedCommande.mode_paiement || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Montant total</label>
                    <span className="montant-total">{formatMontant(selectedCommande.montant_total)}</span>
                  </div>
                </div>
              </div>

              {selectedCommande.lignes && selectedCommande.lignes.length > 0 && (
                <div className="detail-lignes">
                  <h4>Produits</h4>
                  <div className="detail-lignes-wrapper">
                    <table className="detail-lignes-table">
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Unité</th>
                          <th>Qté</th>
                          <th>Prix unitaire</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCommande.lignes.map((ligne, index) => (
                          <tr key={index}>
                            <td>
                              <span className="produit-nom">{ligne.produit_nom}</span>
                              {ligne.marque_nom && <span className="produit-marque"> - {ligne.marque_nom}</span>}
                            </td>
                            <td>
                              <span className="unite-badge">
                                <Box size={11} />
                                {ligne.nom_unite_vente || 'Unité'}
                                {ligne.quantite_base > 1 && ` (${ligne.quantite_base})`}
                              </span>
                            </td>
                            <td>{ligne.quantite}</td>
                            <td>{formatMontant(ligne.prix_vente)}</td>
                            <td className="montant-cell">{formatMontant(ligne.montant_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="total-row">
                          <td colSpan="4"><strong>Total</strong></td>
                          <td><strong>{formatMontant(selectedCommande.montant_total)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {selectedCommande.paiements && selectedCommande.paiements.length > 0 && (
                <div className="detail-paiements">
                  <h4>Paiements</h4>
                  <table className="detail-paiements-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Montant</th>
                        <th>Mode</th>
                        <th>Référence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCommande.paiements.map((paiement, index) => (
                        <tr key={index}>
                          <td>{formatDateFR(paiement.date_paiement)}</td>
                          <td className="montant-cell">{formatMontant(paiement.montant)}</td>
                          <td>{paiement.mode_paiement}</td>
                          <td>{paiement.reference || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Fermer
              </button>
              {canManage && selectedCommande.statut !== 'livree' && selectedCommande.statut !== 'annulee' && (
                <button
                  className="btn btn-success"
                  onClick={() => preparerPaiement(selectedCommande)}
                >
                  <Wallet size={16} />
                  <span>Payer</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL - SUPPRESSION
          ============================================================ */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🗑️ Confirmer la suppression</h2>
              <button className="modal-close" onClick={() => !deleting && setShowDeleteModal(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-icon-wrapper">
                <AlertTriangle size={44} color="#ef4444" />
              </div>
              <p>Êtes-vous sûr de vouloir supprimer cette commande ?</p>
              <p className="delete-item-name">
                <strong>"{commandeToDelete?.numero_commande}"</strong>
              </p>
              <p className="delete-item-detail">
                Client : {commandeToDelete?.nomclient || 'Client inconnu'}
              </p>
              <p className="delete-warning">⚠️ Cette action est irréversible</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Annuler
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Supprimer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TOAST
          ============================================================ */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-message">{toast.message}</span>
          <button
            className="toast-close"
            onClick={() => setToast(null)}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default Ventes;