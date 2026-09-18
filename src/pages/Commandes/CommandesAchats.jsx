// pages/CommandesAchat/CommandesAchat.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus, Search, Edit, Trash2, Eye, ChevronLeft, ChevronRight,
  Download, X, Check, RefreshCw, Grid, List, ShoppingBasket,
  Package, Banknote, Calendar, Clock, AlertCircle, CheckCircle,
  Send, Ban, FileText, Building, Phone, Mail, MapPin, ChevronDown,
  Loader, MoreVertical, AlertTriangle, PackageCheck, Box
} from "lucide-react";
import CommandeAchatService from "../../services/commandeAchatService";
import FournisseurService from "../../services/fournisseurService";
import ProduitService from "../../services/produitService";
import UniteVenteService from "../../services/uniteVenteService";
import MagasinService from "../../services/magasinService";
import { useUser } from "../../context/AuthContext";
import BonCommandePDFActions from "../../components/commande/BonCommandePDFActions";
import "./CommandesAchats.css";

const CommandesAchat = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem('token');

  // ============================================================
  // ÉTATS PRINCIPAUX
  // ============================================================
  const [commandes, setCommandes] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [produitsFiltres, setProduitsFiltres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("list");
  const [error, setError] = useState(null);
  const [filterStatut, setFilterStatut] = useState("");
  const [filterPeriode, setFilterPeriode] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [selectedIds, setSelectedIds] = useState([]);
  const [notification, setNotification] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Magasin (pour le PDF)
  const [magasin, setMagasin] = useState(null);

  // ============================================================
  // ÉTATS MODALS
  // ============================================================
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCommande, setEditingCommande] = useState(null);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [commandeToDelete, setCommandeToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatut, setUpdatingStatut] = useState(null);
  const [editingLigneIndex, setEditingLigneIndex] = useState(null);

  // ============================================================
  // ÉTATS FORMULAIRE
  // ============================================================
  const [formData, setFormData] = useState({
    id_fournisseur: "",
    date_commande: "",   // ← toujours rempli automatiquement (invisible)
    lignes: []
  });

  const [ligneForm, setLigneForm] = useState({
    id_produit: "",
    quantite: "",
    id_unite_vente: "",
    prix_achat: ""
  });

  // ============================================================
  // UNITÉS DE VENTE
  // ============================================================
  const [unitesVente, setUnitesVente] = useState([]);
  const [selectedUnite, setSelectedUnite] = useState(null);
  const [loadingUnites, setLoadingUnites] = useState(false);

  // ============================================================
  // COMBOBOX FOURNISSEUR
  // ============================================================
  const [fournisseurSearch, setFournisseurSearch] = useState("");
  const [showFournisseurDropdown, setShowFournisseurDropdown] = useState(false);
  const [fournisseurSearchResults, setFournisseurSearchResults] = useState([]);
  const [isSearchingFournisseur, setIsSearchingFournisseur] = useState(false);
  const fournisseurDebounce = useRef(null);
  const fournisseurDropdownRef = useRef(null);

  // ============================================================
  // COMBOBOX PRODUIT
  // ============================================================
  const [produitSearch, setProduitSearch] = useState("");
  const [showProduitDropdown, setShowProduitDropdown] = useState(false);
  const [produitSearchResults, setProduitSearchResults] = useState([]);
  const [isSearchingProduit, setIsSearchingProduit] = useState(false);
  const produitDebounce = useRef(null);
  const produitDropdownRef = useRef(null);

  // ============================================================
  // PERMISSIONS
  // ============================================================
  const canManage = user && ['admin', 'manager'].includes(user.role);
  const isAdmin = user && ['admin'].includes(user.role);

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================
  useEffect(() => {
    if (isAuthenticated && token) {
      loadCommandes();
      loadFournisseurs();
      loadAllProduits();
      loadMagasin();
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fournisseurDropdownRef.current && !fournisseurDropdownRef.current.contains(event.target)) {
        setShowFournisseurDropdown(false);
      }
      if (produitDropdownRef.current && !produitDropdownRef.current.contains(event.target)) {
        setShowProduitDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrer les produits quand le fournisseur change
  useEffect(() => {
    if (formData.id_fournisseur) {
      const produitsFiltresList = produits.filter(
        p => p.id_fournisseur === parseInt(formData.id_fournisseur)
      );
      setProduitsFiltres(produitsFiltresList);
      setLigneForm({ id_produit: "", quantite: "", id_unite_vente: "", prix_achat: "" });
      setSelectedUnite(null);
      setUnitesVente([]);
      setProduitSearch("");
      setProduitSearchResults([]);
    } else {
      setProduitsFiltres([]);
    }
  }, [formData.id_fournisseur, produits]);

  // ============================================================
  // SERVICES
  // ============================================================
  const loadCommandes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await CommandeAchatService.getAllCommandes(token);
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

  const loadFournisseurs = async () => {
    try {
      const response = await FournisseurService.getActiveFournisseurs(token);
      if (response.success) {
        setFournisseurs(response.data || []);
        setFournisseurSearchResults(response.data || []);
      }
    } catch (error) {
      console.error('❌ LoadFournisseurs error:', error);
    }
  };

  const loadAllProduits = async () => {
    try {
      const response = await ProduitService.getAllProduits(token);
      if (response.success) {
        setProduits(response.data || []);
      }
    } catch (error) {
      console.error('❌ LoadProduits error:', error);
    }
  };

  const loadMagasin = async () => {
    try {
      const res = await MagasinService.getMonMagasin(token);
      if (res.success) setMagasin(res.magasin);
    } catch (error) {
      console.error('❌ LoadMagasin error:', error);
    }
  };

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ============================================================
  // UTILITAIRES
  // ============================================================
  const formatMontant = (value) => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(num)) return '0';
    return Math.round(num).toLocaleString('fr-FR') + ' FCFA';
  };

  const parseNumber = (value) => {
    if (typeof value === 'number') return value;
    if (!value || value === '') return 0;
    return parseFloat(value.toString().replace(/,/g, '').replace(/[^0-9.]/g, '')) || 0;
  };

  // Date du jour au format YYYY-MM-DD (utilisée automatiquement)
  const getTodayISO = () => new Date().toISOString().split('T')[0];

  const calculerQuantiteBase = () => {
    if (!selectedUnite || !ligneForm.quantite) return 0;
    const qte = parseInt(ligneForm.quantite) || 0;
    return qte * (selectedUnite.quantite_base || 1);
  };

  const calculerSousTotalLigne = () => {
    if (!ligneForm.quantite) return 0;
    const qte = parseInt(ligneForm.quantite) || 0;
    const prix = parseFloat(ligneForm.prix_achat) || 0;
    return qte * prix;
  };

  // ============================================================
  // STATISTIQUES
  // ============================================================
  const getStats = () => {
    const total = commandes.length;
    const enAttente = commandes.filter(c => c.statut === 'en_attente').length;
    const envoyee = commandes.filter(c => c.statut === 'envoyee').length;
    const partiellementRecue = commandes.filter(c => c.statut === 'partiellement_recue').length;
    const recue = commandes.filter(c => c.statut === 'recue').length;
    const annulee = commandes.filter(c => c.statut === 'annulee').length;

    const totalMontant = commandes.reduce((sum, c) => {
      const montant = c.montant_total !== undefined && c.montant_total !== null
        ? parseFloat(c.montant_total) : 0;
      return sum + (isNaN(montant) ? 0 : montant);
    }, 0);

    const recuMontant = commandes
      .filter(c => c.statut === 'recue')
      .reduce((sum, c) => sum + (parseFloat(c.montant_total) || 0), 0);

    return {
      total, enAttente, envoyee, partiellementRecue, recue, annulee,
      totalMontant, recuMontant,
      tauxReception: total > 0 ? Math.round((recue / total) * 100) : 0
    };
  };

  const stats = getStats();

  // ============================================================
  // FILTRES ET TRI
  // ============================================================
  const filteredCommandes = useMemo(() => {
    return commandes.filter((commande) => {
      const matchSearch =
        commande.numero_commande?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commande.fournisseur_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commande.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatut = filterStatut ? commande.statut === filterStatut : true;

      let matchPeriode = true;
      if (filterPeriode !== 'all') {
        const dateCommande = new Date(commande.date_commande);
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        switch (filterPeriode) {
          case 'today':
            matchPeriode = dateCommande.toDateString() === today.toDateString();
            break;
          case 'week':
            matchPeriode = dateCommande >= startOfWeek;
            break;
          case 'month':
            matchPeriode = dateCommande >= startOfMonth;
            break;
          default:
            matchPeriode = true;
        }
      }

      return matchSearch && matchStatut && matchPeriode;
    });
  }, [commandes, searchTerm, filterStatut, filterPeriode]);

  const sortedCommandes = useMemo(() => {
    const sorted = [...filteredCommandes];
    switch (sortBy) {
      case 'date_desc':
        sorted.sort((a, b) => new Date(b.date_commande) - new Date(a.date_commande));
        break;
      case 'date_asc':
        sorted.sort((a, b) => new Date(a.date_commande) - new Date(b.date_commande));
        break;
      case 'montant_desc':
        sorted.sort((a, b) => (parseFloat(b.montant_total) || 0) - (parseFloat(a.montant_total) || 0));
        break;
      case 'montant_asc':
        sorted.sort((a, b) => (parseFloat(a.montant_total) || 0) - (parseFloat(b.montant_total) || 0));
        break;
      case 'fournisseur':
        sorted.sort((a, b) => (a.fournisseur_nom || '').localeCompare(b.fournisseur_nom || ''));
        break;
      default:
        break;
    }
    return sorted;
  }, [filteredCommandes, sortBy]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedCommandes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedCommandes.length / itemsPerPage);

  // ============================================================
  // COMBOBOX FOURNISSEUR
  // ============================================================
  const rechercherFournisseurs = (texte) => {
    setFournisseurSearch(texte);

    if (texte.length === 0) {
      setFournisseurSearchResults(fournisseurs);
      setShowFournisseurDropdown(false);
      return;
    }

    setIsSearchingFournisseur(true);
    setShowFournisseurDropdown(true);

    if (fournisseurDebounce.current) clearTimeout(fournisseurDebounce.current);

    fournisseurDebounce.current = setTimeout(() => {
      const results = fournisseurs.filter(f =>
        f.nom?.toLowerCase().includes(texte.toLowerCase()) ||
        f.email?.toLowerCase().includes(texte.toLowerCase()) ||
        f.telephone?.toLowerCase().includes(texte.toLowerCase()) ||
        f.ville?.toLowerCase().includes(texte.toLowerCase())
      );
      setFournisseurSearchResults(results);
      setIsSearchingFournisseur(false);
    }, 200);
  };

  const selectFournisseur = (fournisseur) => {
    setFormData({
      ...formData,
      id_fournisseur: fournisseur.id_fournisseur
    });
    setFournisseurSearch(fournisseur.nom);
    setShowFournisseurDropdown(false);
    setProduitsFiltres([]);
    setProduitSearch("");
    setProduitSearchResults([]);
    setLigneForm({ id_produit: "", quantite: "", id_unite_vente: "", prix_achat: "" });
    setSelectedUnite(null);
    setUnitesVente([]);

    const produitsFiltresList = produits.filter(
      p => p.id_fournisseur === fournisseur.id_fournisseur
    );
    setProduitsFiltres(produitsFiltresList);
  };

  const toggleFournisseurDropdown = () => {
    if (fournisseurSearch.length > 0) {
      setShowFournisseurDropdown(!showFournisseurDropdown);
    } else {
      setFournisseurSearchResults(fournisseurs);
      setShowFournisseurDropdown(!showFournisseurDropdown);
    }
  };

  // ============================================================
  // COMBOBOX PRODUIT
  // ============================================================
  const rechercherProduits = (texte) => {
    setProduitSearch(texte);

    if (texte.length === 0) {
      setProduitSearchResults(produitsFiltres);
      setShowProduitDropdown(false);
      return;
    }

    setIsSearchingProduit(true);
    setShowProduitDropdown(true);

    if (produitDebounce.current) clearTimeout(produitDebounce.current);

    produitDebounce.current = setTimeout(() => {
      const results = produitsFiltres.filter(p =>
        p.nom?.toLowerCase().includes(texte.toLowerCase()) ||
        p.modele_nom?.toLowerCase().includes(texte.toLowerCase()) ||
        p.reference?.toLowerCase().includes(texte.toLowerCase())
      );
      setProduitSearchResults(results);
      setIsSearchingProduit(false);
    }, 200);
  };

  const selectProduit = async (produit) => {
    setLigneForm({
      id_produit: produit.id_produit,
      quantite: "",
      id_unite_vente: "",
      prix_achat: ""
    });
    setProduitSearch(produit.nom + (produit.modele_nom ? ` - ${produit.modele_nom}` : ''));
    setShowProduitDropdown(false);
    setSelectedUnite(null);
    setUnitesVente([]);
    setLoadingUnites(true);

    try {
      const res = await UniteVenteService.getByProduit(token, produit.id_produit);
      const unitesPersonnalisees = (res.success && res.data) ? res.data : [];

      const uniteBase = {
        id_unite_vente: null,
        nom: produit.unite_nom || produit.unite_symbole || 'Unité',
        symbole: produit.unite_symbole || '',
        quantite_base: 1,
        prix_achat: produit.prix_achat || 0,
        prix_vente: produit.prix_vente || 0,
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
      setLigneForm(prev => ({
        ...prev,
        id_unite_vente: defaut.id_unite_vente,
        prix_achat: defaut.prix_achat || 0
      }));

    } catch (error) {
      console.error('❌ Erreur chargement unités:', error);
      const uniteBase = {
        id_unite_vente: null,
        nom: produit.unite_nom || produit.unite_symbole || 'Unité',
        quantite_base: 1,
        prix_achat: produit.prix_achat || 0,
        prix_vente: produit.prix_vente || 0,
        est_principal: true,
        est_unite_base: true,
      };
      setUnitesVente([uniteBase]);
      setSelectedUnite(uniteBase);
      setLigneForm(prev => ({
        ...prev,
        id_unite_vente: null,
        prix_achat: uniteBase.prix_achat
      }));
    } finally {
      setLoadingUnites(false);
    }

    setTimeout(() => {
      const qteInput = document.querySelector('input[name="quantite"]');
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
      setLigneForm(prev => ({
        ...prev,
        id_unite_vente: unite.id_unite_vente,
        prix_achat: unite.prix_achat || 0
      }));
    }
  };

  const toggleProduitDropdown = () => {
    if (produitSearch.length > 0) {
      setShowProduitDropdown(!showProduitDropdown);
    } else {
      setProduitSearchResults(produitsFiltres);
      setShowProduitDropdown(!showProduitDropdown);
    }
  };

  // ============================================================
  // FORMULAIRE
  // ============================================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLigneChange = (e) => {
    const { name, value } = e.target;
    if (name === 'quantite') {
      const cleanValue = value.replace(/[^0-9]/g, '');
      setLigneForm({ ...ligneForm, quantite: cleanValue });
    } else if (name === 'prix_achat') {
      const cleanValue = value.replace(/[^0-9,.]/g, '');
      setLigneForm({ ...ligneForm, prix_achat: cleanValue });
    } else {
      setLigneForm({ ...ligneForm, [name]: value });
    }
  };

  const addLigne = () => {
    if (!ligneForm.id_produit) {
      showNotification("Veuillez sélectionner un produit", 'warning');
      return;
    }

    if (!selectedUnite) {
      showNotification("Veuillez sélectionner une unité", 'warning');
      return;
    }

    if (!ligneForm.quantite || parseInt(ligneForm.quantite) <= 0) {
      showNotification("Veuillez saisir une quantité valide", 'warning');
      return;
    }

    const produit = produitsFiltres.find(p => p.id_produit === parseInt(ligneForm.id_produit));
    if (!produit) {
      showNotification("Produit non trouvé", 'error');
      return;
    }

    const quantite = parseInt(ligneForm.quantite);
    const idProduit = parseInt(ligneForm.id_produit);

    let prixAchat = null;
    if (ligneForm.prix_achat && ligneForm.prix_achat !== '') {
      const parsed = parseFloat(ligneForm.prix_achat);
      if (!isNaN(parsed) && parsed > 0) {
        prixAchat = parsed;
      }
    }

    const quantiteTotaleBase = quantite * (selectedUnite.quantite_base || 1);

    const ligneExistanteIndex = formData.lignes.findIndex(
      l => l.id_produit === idProduit &&
           l.id_unite_vente === selectedUnite.id_unite_vente
    );

    let nouvellesLignes;
    if (ligneExistanteIndex !== -1) {
      nouvellesLignes = [...formData.lignes];
      nouvellesLignes[ligneExistanteIndex].quantite += quantite;
      nouvellesLignes[ligneExistanteIndex].quantite_totale_base += quantiteTotaleBase;
      if (prixAchat !== null) {
        nouvellesLignes[ligneExistanteIndex].prix_achat = prixAchat;
      }
    } else {
      nouvellesLignes = [
        ...formData.lignes,
        {
          id_produit: idProduit,
          id_unite_vente: selectedUnite.id_unite_vente,
          nom_unite_vente: selectedUnite.nom,
          quantite_base: selectedUnite.quantite_base,
          quantite_totale_base: quantiteTotaleBase,
          quantite: quantite,
          prix_achat: prixAchat,
          produit_nom: produit.nom,
          modele_nom: produit.modele_nom || '',
          unite: selectedUnite.nom,
          reference: produit.reference || ''
        }
      ];
    }

    setFormData({ ...formData, lignes: nouvellesLignes });
    setLigneForm({ id_produit: "", quantite: "", id_unite_vente: "", prix_achat: "" });
    setSelectedUnite(null);
    setUnitesVente([]);
    setProduitSearch("");
    setProduitSearchResults([]);
    setShowProduitDropdown(false);

    const unitLabel = selectedUnite.nom + (quantite > 1 ? 's' : '');
    showNotification(
      `✅ ${produit.nom} ajouté (${quantite} ${unitLabel})`,
      'success'
    );

    setTimeout(() => {
      const searchInput = document.querySelector('input[name="produit_search"]');
      if (searchInput) searchInput.focus();
    }, 100);
  };

  const removeLigne = (index) => {
    const newLignes = [...formData.lignes];
    newLignes.splice(index, 1);
    setFormData({ ...formData, lignes: newLignes });
  };

  const startEditLigne = (index) => setEditingLigneIndex(index);
  const cancelEditLigne = () => setEditingLigneIndex(null);

  const updateLigne = (index, field, value) => {
    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes[index][field] = value;
    setFormData({ ...formData, lignes: nouvellesLignes });
  };

  const saveLigneEdit = (index) => {
    const ligne = formData.lignes[index];
    const q = parseInt(ligne.quantite) || 0;
    if (q <= 0) { showNotification("Quantité invalide", 'warning'); return; }

    let p = null;
    if (ligne.prix_achat !== null && ligne.prix_achat !== '' && ligne.prix_achat !== undefined) {
      const parsed = parseNumber(ligne.prix_achat);
      if (parsed > 0) p = parsed;
    }

    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes[index].quantite = q;
    nouvellesLignes[index].prix_achat = p;
    nouvellesLignes[index].quantite_totale_base = q * (nouvellesLignes[index].quantite_base || 1);
    setFormData({ ...formData, lignes: nouvellesLignes });
    setEditingLigneIndex(null);
  };

  const calculerTotalCommande = () => {
    return formData.lignes.reduce((sum, l) => {
      const q = parseFloat(l.quantite) || 0;
      const p = parseFloat(l.prix_achat) || 0;
      return sum + (q * p);
    }, 0);
  };

  // ============================================================
  // ACTIONS CRUD
  // ============================================================
  const handleAdd = () => {
    setEditingCommande(null);
    setFormData({
      id_fournisseur: "",
      date_commande: getTodayISO(),   // ← auto, invisible
      lignes: []
    });
    setFournisseurSearch("");
    setFournisseurSearchResults(fournisseurs);
    setProduitSearch("");
    setProduitSearchResults([]);
    setLigneForm({ id_produit: "", quantite: "", id_unite_vente: "", prix_achat: "" });
    setSelectedUnite(null);
    setUnitesVente([]);
    setEditingLigneIndex(null);
    setShowModal(true);
  };

  const handleEdit = async (commande) => {
    setLoading(true);
    try {
      const response = await CommandeAchatService.getCommandeById(token, commande.id_commande_achat);

      if (response.success) {
        const commandeComplete = response.data;
        setEditingCommande(commandeComplete);

        const lignesExistantes = commandeComplete.lignes?.map(l => ({
          id_produit: l.id_produit,
          id_unite_vente: l.id_unite_vente,
          nom_unite_vente: l.nom_unite_vente || 'Unité',
          quantite_base: parseFloat(l.quantite_base) || 1,
          quantite_totale_base: parseFloat(l.quantite_totale_base) || parseFloat(l.quantite),
          quantite: parseFloat(l.quantite) || 0,
          prix_achat: l.prix_achat !== null ? parseFloat(l.prix_achat) : null,
          produit_nom: l.produit_nom || 'Produit inconnu',
          modele_nom: l.modele_nom || '',
          unite: l.nom_unite_vente || l.unite_symbole || '',
          reference: l.reference || ''
        })) || [];

        setFormData({
          id_fournisseur: commandeComplete.id_fournisseur || "",
          date_commande: commandeComplete.date_commande
            ? commandeComplete.date_commande.split('T')[0]
            : getTodayISO(),
          lignes: lignesExistantes
        });

        const fournisseur = fournisseurs.find(f => f.id_fournisseur === commandeComplete.id_fournisseur);
        if (fournisseur) {
          setFournisseurSearch(fournisseur.nom);
          setFournisseurSearchResults(fournisseurs);
        }

        if (commandeComplete.id_fournisseur) {
          const produitsFiltresList = produits.filter(
            p => p.id_fournisseur === commandeComplete.id_fournisseur
          );
          setProduitsFiltres(produitsFiltresList);
          setProduitSearchResults(produitsFiltresList);
        }

        setLigneForm({ id_produit: "", quantite: "", id_unite_vente: "", prix_achat: "" });
        setSelectedUnite(null);
        setUnitesVente([]);
        setEditingLigneIndex(null);
        setShowModal(true);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la commande:', error);
      showNotification('Erreur lors du chargement de la commande', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (commande) => {
    setSelectedCommande(commande);
    setShowDetailModal(true);

    try {
      const res = await CommandeAchatService.getCommandeById(
        token,
        commande.id_commande_achat
      );
      if (res.success && res.data) {
        setSelectedCommande(res.data);
      }
    } catch (err) {
      console.error('❌ Impossible de charger la commande complète :', err);
    }
  };

  const handleSave = async () => {
    if (!formData.id_fournisseur) {
      showNotification("Veuillez sélectionner un fournisseur", 'warning');
      return;
    }
    if (formData.lignes.length === 0) {
      showNotification("Veuillez ajouter au moins un produit", 'warning');
      return;
    }
    if (editingLigneIndex !== null) {
      showNotification("Veuillez terminer la modification de la ligne en cours", 'warning');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        id_fournisseur: parseInt(formData.id_fournisseur),
        date_commande: formData.date_commande || getTodayISO(),   // ← auto
        notes: null,                                              // ← supprimé
        lignes: formData.lignes.map(l => ({
          id_produit: l.id_produit,
          id_unite_vente: l.id_unite_vente,
          nom_unite_vente: l.nom_unite_vente,
          quantite_base: l.quantite_base,
          quantite: l.quantite,
          quantite_totale_base: l.quantite_totale_base,
          prix_achat: l.prix_achat
        }))
      };

      let response;
      if (editingCommande) {
        response = await CommandeAchatService.updateCommande(
          token, editingCommande.id_commande_achat, data
        );
      } else {
        response = await CommandeAchatService.createCommande(token, data);
      }

      if (response.success) {
        await loadCommandes();
        setShowModal(false);
        setEditingCommande(null);
        showNotification(
          editingCommande ? 'Commande mise à jour avec succès' : 'Commande créée avec succès',
          'success'
        );
      } else {
        setError(response.message || 'Erreur lors de la sauvegarde');
        showNotification(response.message || 'Erreur lors de la sauvegarde', 'error');
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      setError(error.message || 'Erreur lors de la sauvegarde');
      showNotification(error.message || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAnnuler = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette commande ?")) return;

    setUpdatingStatut(id);
    setError(null);

    try {
      const response = await CommandeAchatService.annulerCommande(token, id);
      if (response.success) {
        await loadCommandes();
        showNotification('Commande annulée avec succès', 'warning');
      } else {
        setError(response.message || 'Erreur lors de l\'annulation');
      }
    } catch (error) {
      console.error('❌ Annuler error:', error);
      setError(error.message || 'Erreur lors de l\'annulation');
    } finally {
      setUpdatingStatut(null);
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
      const response = await CommandeAchatService.deleteCommande(
        token, commandeToDelete.id_commande_achat
      );

      if (response.success) {
        await loadCommandes();
        setShowDeleteModal(false);
        setCommandeToDelete(null);
        showNotification('Commande supprimée avec succès', 'info');
      } else {
        setError(response.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      setError(error.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await CommandeAchatService.exportCommandes(token);
      if (response.success && response.data) {
        const headers = ["ID", "Numéro", "Date", "Fournisseur", "Montant", "Statut", "Notes"];
        const rows = response.data.map(c => [
          c.id, c.numero, c.date, c.fournisseur,
          formatMontant(c.montant), c.statut, c.notes || ""
        ]);

        let csv = headers.join(",") + "\n";
        rows.forEach(row => {
          csv += row.map(cell => `"${cell}"`).join(",") + "\n";
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `commandes_achat_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('Exportation réussie', 'success');
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      showNotification('Erreur lors de l\'exportation', 'error');
    }
  };

  // ============================================================
  // RENDU STATUTS
  // ============================================================
  const renderStatut = (statut) => {
    const configs = {
      'en_attente': { label: 'En attente', className: 'status-en-attente', icon: Clock },
      'envoyee': { label: 'Envoyée', className: 'status-envoyee', icon: Send },
      'partiellement_recue': { label: 'Partiellement reçue', className: 'status-partiel', icon: AlertCircle },
      'recue': { label: 'Reçue', className: 'status-recue', icon: CheckCircle },
      'annulee': { label: 'Annulée', className: 'status-annulee', icon: Ban }
    };

    const config = configs[statut] || configs['en_attente'];
    const Icon = config.icon;

    return (
      <span className={`status-badge ${config.className}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  // ============================================================
  // RENDU MENU 3 POINTS
  // ============================================================
  const renderActionsMenu = (commande) => {
    const isOpen = openMenuId === commande.id_commande_achat;
    const isInactive = ['recue', 'annulee'].includes(commande.statut);

    return (
      <div className="actions-menu-wrapper">
        <button
          className="action-btn btn-more"
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuId(isOpen ? null : commande.id_commande_achat);
          }}
          title="Plus d'actions"
        >
          <MoreVertical size={16} />
        </button>

        {isOpen && (
          <div className="actions-dropdown" onClick={(e) => e.stopPropagation()}>
            <button
              className="dropdown-action"
              onClick={() => {
                handleView(commande);
                setOpenMenuId(null);
              }}
            >
              <Eye size={15} />
              <span>Voir les détails</span>
            </button>

            {canManage && !isInactive && (
              <button
                className="dropdown-action"
                onClick={() => {
                  handleEdit(commande);
                  setOpenMenuId(null);
                }}
              >
                <Edit size={15} />
                <span>Modifier</span>
              </button>
            )}

            {canManage && !isInactive && (
              <button
                className="dropdown-action warning"
                onClick={() => {
                  handleAnnuler(commande.id_commande_achat);
                  setOpenMenuId(null);
                }}
                disabled={updatingStatut === commande.id_commande_achat}
              >
                <Ban size={15} />
                <span>Annuler la commande</span>
              </button>
            )}

            {isAdmin && !isInactive && (
              <>
                <div className="dropdown-separator" />
                <button
                  className="dropdown-action danger"
                  onClick={() => {
                    confirmDelete(commande);
                    setOpenMenuId(null);
                  }}
                >
                  <Trash2 size={15} />
                  <span>Supprimer</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDU COMBOBOX FOURNISSEUR
  // ============================================================
  const renderFournisseurDropdown = () => {
    if (!showFournisseurDropdown) return null;

    return (
      <div className="dropdown-container" ref={fournisseurDropdownRef}>
        <div className="dropdown-list">
          {isSearchingFournisseur ? (
            <div className="dropdown-loading">
              <Loader size={20} className="spinning" />
              <span>Recherche en cours...</span>
            </div>
          ) : fournisseurSearchResults.length === 0 ? (
            <div className="dropdown-empty">
              <span>Aucun fournisseur trouvé</span>
            </div>
          ) : (
            fournisseurSearchResults.map((f) => (
              <div
                key={f.id_fournisseur}
                className={`dropdown-item ${formData.id_fournisseur === f.id_fournisseur ? 'selected' : ''}`}
                onClick={() => selectFournisseur(f)}
              >
                <div className="dropdown-item-info">
                  <span className="dropdown-item-name">{f.nom}</span>
                  <div className="dropdown-item-details">
                    {f.ville && <span><MapPin size={12} /> {f.ville}</span>}
                    {f.telephone && <span><Phone size={12} /> {f.telephone}</span>}
                  </div>
                </div>
                {f.email && (
                  <div className="dropdown-item-extra">
                    <Mail size={14} />
                    <span>{f.email}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDU COMBOBOX PRODUIT
  // ============================================================
  const renderProduitDropdown = () => {
    if (!showProduitDropdown) return null;

    return (
      <div className="dropdown-container" ref={produitDropdownRef}>
        <div className="dropdown-list">
          {isSearchingProduit ? (
            <div className="dropdown-loading">
              <Loader size={20} className="spinning" />
              <span>Recherche en cours...</span>
            </div>
          ) : produitSearchResults.length === 0 ? (
            <div className="dropdown-empty">
              <span>
                {formData.id_fournisseur
                  ? 'Aucun produit trouvé pour ce fournisseur'
                  : 'Sélectionnez d\'abord un fournisseur'}
              </span>
            </div>
          ) : (
            produitSearchResults.map((p) => (
              <div
                key={p.id_produit}
                className={`dropdown-item ${ligneForm.id_produit === p.id_produit ? 'selected' : ''}`}
                onClick={() => selectProduit(p)}
              >
                <div className="dropdown-item-info">
                  <span className="dropdown-item-name">{p.nom}</span>
                  {p.modele_nom && (
                    <span className="dropdown-item-sub">{p.modele_nom}</span>
                  )}
                  {p.reference && (
                    <span className="dropdown-item-ref">Ref: {p.reference}</span>
                  )}
                </div>
                <div className="dropdown-item-stock">
                  <Package size={14} />
                  <span>
                    {p.prix_achat && parseFloat(p.prix_achat) > 0
                      ? formatMontant(p.prix_achat)
                      : 'Prix à définir'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDU VUE LISTE
  // ============================================================
  const renderListView = () => (
    <div className="commandes-table-container">
      <table className="commandes-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}>
              <input
                type="checkbox"
                checked={selectedIds.length === currentItems.length && currentItems.length > 0}
                onChange={() => {
                  if (selectedIds.length === currentItems.length) {
                    setSelectedIds([]);
                  } else {
                    setSelectedIds(currentItems.map(c => c.id_commande_achat));
                  }
                }}
                className="checkbox-select"
              />
            </th>
            <th>N° Commande</th>
            <th>Fournisseur</th>
            <th>Date</th>
            <th>Montant</th>
            <th>Produits</th>
            <th>Statut</th>
            <th style={{ textAlign: 'right', width: '80px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length === 0 ? (
            <tr>
              <td colSpan="8">
                <div className="empty-state">
                  <ShoppingBasket size={48} className="empty-icon" />
                  <h3>Aucune commande trouvée</h3>
                  <p>Commencez par créer votre première commande d'achat</p>
                  {canManage && (
                    <button className="btn btn-primary" onClick={handleAdd}>
                      <Plus size={18} />
                      Nouvelle Commande
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            currentItems.map((commande) => (
              <tr
                key={commande.id_commande_achat}
                className={selectedIds.includes(commande.id_commande_achat) ? 'selected' : ''}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(commande.id_commande_achat)}
                    onChange={() => {
                      if (selectedIds.includes(commande.id_commande_achat)) {
                        setSelectedIds(selectedIds.filter(id => id !== commande.id_commande_achat));
                      } else {
                        setSelectedIds([...selectedIds, commande.id_commande_achat]);
                      }
                    }}
                    className="checkbox-select"
                  />
                </td>
                <td>
                  <span className="commande-numero">{commande.numero_commande}</span>
                </td>
                <td>
                  <div className="fournisseur-cell">
                    <Building size={14} />
                    <span>{commande.fournisseur_nom}</span>
                  </div>
                </td>
                <td>
                  <div className="date-cell">
                    <Calendar size={14} className="date-icon" />
                    {new Date(commande.date_commande).toLocaleDateString('fr-FR')}
                  </div>
                </td>
                <td className="montant-cell">
                  {parseFloat(commande.montant_total) > 0
                    ? formatMontant(commande.montant_total)
                    : <em style={{ color: '#94a3b8' }}>À définir</em>}
                </td>
                <td>{commande.nb_lignes || 0}</td>
                <td>{renderStatut(commande.statut)}</td>
                <td className="actions-cell">
                  {renderActionsMenu(commande)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // ============================================================
  // RENDU VUE GRILLE
  // ============================================================
  const renderGridView = () => (
    <div className="commandes-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state full">
          <ShoppingBasket size={48} className="empty-icon" />
          <h3>Aucune commande trouvée</h3>
          <p>Commencez par créer votre première commande d'achat</p>
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              Nouvelle Commande
            </button>
          )}
        </div>
      ) : (
        currentItems.map((commande) => (
          <div key={commande.id_commande_achat} className="commande-card">
            <div className="commande-card-header">
              <div className="commande-info">
                <span className="commande-numero">{commande.numero_commande}</span>
                <span className="commande-date">
                  <Calendar size={14} />
                  {new Date(commande.date_commande).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="commande-card-actions">
                {renderActionsMenu(commande)}
              </div>
            </div>
            <div className="commande-card-body">
              <div className="fournisseur-info">
                <Building size={16} />
                <span>{commande.fournisseur_nom}</span>
              </div>
              <div className="commande-meta">
                <span className="meta-item">
                  <Package size={14} />
                  {commande.nb_lignes || 0} produit(s)
                </span>
              </div>
              <div className="commande-montant">
                <span className="montant-label">Montant total</span>
                <span className="montant-value">
                  {parseFloat(commande.montant_total) > 0
                    ? formatMontant(commande.montant_total)
                    : <em style={{ color: '#94a3b8', fontSize: '14px' }}>À définir</em>}
                </span>
              </div>
              <div className="commande-status">
                {renderStatut(commande.statut)}
              </div>
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
    <div className="commandes-achat-container">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.type === 'success' && <CheckCircle size={20} />}
            {notification.type === 'error' && <AlertCircle size={20} />}
            {notification.type === 'warning' && <AlertTriangle size={20} />}
            {notification.type === 'info' && <AlertCircle size={20} />}
            <span>{notification.message}</span>
          </div>
          <button className="notification-close" onClick={() => setNotification(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* En-tête */}
      <div className="commandes-header">
        <div className="header-left">
          <div className="header-title-group">
            <h1 className="commandes-title">Commandes d'Achat</h1>
            <span className="header-badge">{stats.total} commandes</span>
          </div>
          <p className="commandes-subtitle">Gérez toutes vos commandes fournisseurs</p>
        </div>
        <div className="header-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              <span>Nouvelle Commande</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
          <button
            className="btn btn-icon"
            onClick={loadCommandes}
            title="Rafraîchir"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="commandes-stats">
        <div className="stat-card">
          <div className="stat-icon total"><ShoppingBasket size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Total</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon en-attente"><Clock size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">En attente</span>
            <span className="stat-value">{stats.enAttente}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon envoyee"><Send size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Envoyées</span>
            <span className="stat-value">{stats.envoyee}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon recue"><CheckCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Reçues</span>
            <span className="stat-value">{stats.recue}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon annulee"><Ban size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Annulées</span>
            <span className="stat-value">{stats.annulee}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon montant"><Banknote size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Total achats</span>
            <span className="stat-value">{formatMontant(stats.totalMontant)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon taux"><PackageCheck size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Taux réception</span>
            <span className="stat-value">{stats.tauxReception}%</span>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="commandes-filters">
        {/* <div className="search-box"> */}
          <input
            type="text"
            placeholder="Rechercher une commande..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        {/* </div> */}
        <div className="filter-group">
          <select
            className="filter-select"
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="envoyee">Envoyée</option>
            <option value="partiellement_recue">Partiellement reçue</option>
            <option value="recue">Reçue</option>
            <option value="annulee">Annulée</option>
          </select>
          <select
            className="filter-select"
            value={filterPeriode}
            onChange={(e) => setFilterPeriode(e.target.value)}
          >
            <option value="all">Toutes les périodes</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
          </select>
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date_desc">Plus récentes</option>
            <option value="date_asc">Plus anciennes</option>
            <option value="montant_desc">Montant ↓</option>
            <option value="montant_asc">Montant ↑</option>
            <option value="fournisseur">Par fournisseur</option>
          </select>
        </div>
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Vue grille"
          >
            <Grid size={18} />
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Vue liste"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Chargement des commandes...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="error-container">
          <AlertCircle size={24} />
          <p className="error-message">{error}</p>
          <button className="btn btn-secondary" onClick={loadCommandes}>
            Réessayer
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          <div className="commandes-results">
            <span className="results-count">
              {sortedCommandes.length} commande{sortedCommandes.length > 1 ? 's' : ''}
              {searchTerm && ` pour "${searchTerm}"`}
            </span>
            {selectedIds.length > 0 && (
              <div className="bulk-actions">
                <span>{selectedIds.length} sélectionnée(s)</span>
                <button className="btn btn-secondary btn-sm">Exporter</button>
                {isAdmin && (
                  <button className="btn btn-danger btn-sm">Supprimer</button>
                )}
              </div>
            )}
          </div>
          {viewMode === 'grid' ? renderGridView() : renderListView()}
        </>
      )}

      {/* Pagination */}
      {!loading && !error && sortedCommandes.length > itemsPerPage && (
        <div className="commandes-pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="pagination-pages">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <button
                  key={pageNum}
                  className={`pagination-page ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="pagination-ellipsis">…</span>
                <button
                  className="pagination-page"
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
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
          MODAL - NOUVELLE COMMANDE / ÉDITION (SPLIT-VIEW)
          ============================================================ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
          <div className="commande-modal" onClick={(e) => e.stopPropagation()}>

            {/* ================= HEADER ================= */}
            <header className="commande-modal-header">
              <div className="commande-modal-title-group">
                <div className="commande-modal-icon">
                  <ShoppingBasket size={22} />
                </div>
                <div>
                  <h2>{editingCommande ? "Modifier la commande" : "Nouvelle commande"}</h2>
                  <p className="commande-modal-subtitle">
                    {editingCommande
                      ? `Commande ${editingCommande.numero_commande}`
                      : 'Sélectionnez un fournisseur puis ajoutez vos produits'}
                  </p>
                </div>
              </div>
              <button
                className="commande-modal-close"
                onClick={() => !saving && setShowModal(false)}
              >
                <X size={20} />
              </button>
            </header>

            {/* ================= BODY SPLIT ================= */}
            <div className="commande-modal-body">

              {/* ---------- COLONNE GAUCHE ---------- */}
              <div className="commande-modal-left">

                {/* Section Fournisseur */}
                <section className="commande-section">
                  <h3 className="commande-section-title">
                    <Building size={15} />
                    Fournisseur
                  </h3>

                  <div className="commande-field">
                    <div className="combobox-wrapper">
                      <div className="combobox-input-wrapper">
                        <Building size={16} className="combobox-icon" />
                        <input
                          type="text"
                          className="combobox-input"
                          placeholder="Rechercher un fournisseur..."
                          value={fournisseurSearch}
                          onChange={(e) => rechercherFournisseurs(e.target.value)}
                          onFocus={() => {
                            if (fournisseurSearch.length === 0) {
                              setFournisseurSearchResults(fournisseurs);
                            }
                            setShowFournisseurDropdown(true);
                          }}
                          disabled={saving || (editingCommande && formData.lignes.length > 0)}
                          autoComplete="off"
                        />
                        <ChevronDown
                          size={16}
                          className="combobox-arrow"
                          onClick={toggleFournisseurDropdown}
                        />
                      </div>
                      {renderFournisseurDropdown()}
                    </div>
                    {editingCommande && formData.lignes.length > 0 && (
                      <small className="form-hint warning">
                        ⚠️ Le fournisseur ne peut pas être modifié car des produits ont déjà été ajoutés
                      </small>
                    )}
                  </div>
                </section>

                {/* Section Ajout produit (barre horizontale) */}
                <section className="commande-section">
                  <h3 className="commande-section-title">
                    <Plus size={15} />
                    Ajouter un produit
                  </h3>

                  <div className="add-product-bar">
                    {/* Produit */}
                    <div className="add-product-search">
                      <div className="combobox-wrapper">
                        <div className="combobox-input-wrapper">
                          <Search size={16} className="combobox-icon" />
                          <input
                            type="text"
                            name="produit_search"
                            className="combobox-input"
                            placeholder={
                              !formData.id_fournisseur
                                ? "Choisir un fournisseur d'abord"
                                : "Rechercher un produit..."
                            }
                            value={produitSearch}
                            onChange={(e) => rechercherProduits(e.target.value)}
                            onFocus={() => {
                              if (formData.id_fournisseur && produitSearch.length === 0) {
                                setProduitSearchResults(produitsFiltres);
                              }
                              setShowProduitDropdown(true);
                            }}
                            disabled={saving || !formData.id_fournisseur || editingLigneIndex !== null}
                            autoComplete="off"
                          />
                          {isSearchingProduit && (
                            <Loader size={14} className="combobox-spinner spinning" />
                          )}
                          <ChevronDown
                            size={16}
                            className="combobox-arrow"
                            onClick={toggleProduitDropdown}
                          />
                        </div>
                        {renderProduitDropdown()}
                      </div>
                    </div>

                    {/* Unité + Qté + Prix + Ajouter (si produit sélectionné) */}
                    {ligneForm.id_produit && (
                      <>
                        <div className="add-product-unite">
                          <div className="unite-chips">
                            {unitesVente.map((unite, idx) => (
                              <button
                                key={unite.id_unite_vente ?? `base-${idx}`}
                                type="button"
                                className={`unite-chip ${selectedUnite?.id_unite_vente === unite.id_unite_vente ? 'active' : ''}`}
                                onClick={() => handleUniteChange(unite.id_unite_vente)}
                                disabled={saving}
                                title={unite.est_unite_base ? 'Unité de base' : `× ${unite.quantite_base}`}
                              >
                                {unite.nom}
                                {unite.quantite_base > 1 && (
                                  <small>×{unite.quantite_base}</small>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        <input
                          type="text"
                          name="quantite"
                          className="add-product-qty"
                          placeholder="Qté"
                          value={ligneForm.quantite}
                          onChange={handleLigneChange}
                          disabled={saving || editingLigneIndex !== null}
                          autoFocus
                        />

                        <input
                          type="text"
                          name="prix_achat"
                          className="add-product-price"
                          placeholder="Prix (optionnel)"
                          value={ligneForm.prix_achat}
                          onChange={handleLigneChange}
                          disabled={saving || editingLigneIndex !== null}
                        />

                        <button
                          type="button"
                          className="add-product-btn"
                          onClick={addLigne}
                          disabled={
                            saving ||
                            editingLigneIndex !== null ||
                            !ligneForm.quantite ||
                            parseInt(ligneForm.quantite) <= 0
                          }
                          title="Ajouter au panier"
                        >
                          <Plus size={18} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Aperçu compact */}
                  {ligneForm.id_produit && selectedUnite && ligneForm.quantite > 0 && (
                    <div className="add-product-preview">
                      <span>
                        <strong>{ligneForm.quantite}</strong> {selectedUnite.nom}
                        {selectedUnite.quantite_base > 1 && (
                          <> → <strong>{calculerQuantiteBase()}</strong> unités de base</>
                        )}
                      </span>
                      {ligneForm.prix_achat > 0 && (
                        <span className="add-product-preview-total">
                          = {formatMontant(calculerSousTotalLigne())}
                        </span>
                      )}
                    </div>
                  )}
                </section>

                {/* Section Liste produits */}
                <section className="commande-section commande-section-list">
                  <h3 className="commande-section-title">
                    <Package size={15} />
                    Produits ({formData.lignes.length})
                  </h3>

                  {formData.lignes.length === 0 ? (
                    <div className="commande-empty">
                      <div className="commande-empty-icon">
                        <Package size={28} />
                      </div>
                      <p>Aucun produit ajouté</p>
                      <small>Utilisez la barre ci-dessus pour ajouter</small>
                    </div>
                  ) : (
                    <div className="commande-lignes-list">
                      {formData.lignes.map((ligne, index) => {
                        const isEditing = editingLigneIndex === index;
                        const quantite = parseFloat(ligne.quantite) || 0;
                        const prix = parseFloat(ligne.prix_achat) || 0;
                        const total = quantite * prix;
                        const hasPrix = ligne.prix_achat !== null && ligne.prix_achat > 0;

                        return (
                          <div
                            key={index}
                            className={`commande-ligne-item ${isEditing ? 'editing' : ''}`}
                          >
                            <div className="commande-ligne-main">
                              <span className="commande-ligne-nom">
                                {ligne.produit_nom}
                              </span>
                              {ligne.modele_nom && (
                                <span className="commande-ligne-modele">
                                  {ligne.modele_nom}
                                </span>
                              )}
                            </div>

                            <span className="commande-ligne-unite">
                              {ligne.nom_unite_vente}
                              {ligne.quantite_base > 1 && (
                                <small>×{ligne.quantite_base}</small>
                              )}
                            </span>

                            {isEditing ? (
                              <input
                                type="text"
                                value={ligne.quantite}
                                onChange={(e) =>
                                  updateLigne(index, 'quantite', e.target.value.replace(/[^0-9]/g, ''))
                                }
                                className="commande-ligne-input"
                              />
                            ) : (
                              <span className="commande-ligne-qty">
                                ×{quantite}
                              </span>
                            )}

                            {isEditing ? (
                              <input
                                type="text"
                                value={ligne.prix_achat ?? ''}
                                onChange={(e) =>
                                  updateLigne(index, 'prix_achat', e.target.value.replace(/[^0-9,.]/g, ''))
                                }
                                placeholder="—"
                                className="commande-ligne-input"
                              />
                            ) : (
                              <span className={`commande-ligne-price ${!hasPrix ? 'empty' : ''}`}>
                                {hasPrix ? formatMontant(prix) : 'À définir'}
                              </span>
                            )}

                            <span className="commande-ligne-total">
                              {hasPrix ? formatMontant(total) : '—'}
                            </span>

                            <div className="commande-ligne-actions">
                              {isEditing ? (
                                <>
                                  <button
                                    className="ligne-action-btn save"
                                    onClick={() => saveLigneEdit(index)}
                                    title="Valider"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    className="ligne-action-btn cancel"
                                    onClick={cancelEditLigne}
                                    title="Annuler"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="ligne-action-btn edit"
                                    onClick={() => startEditLigne(index)}
                                    disabled={saving}
                                    title="Modifier"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    className="ligne-action-btn delete"
                                    onClick={() => removeLigne(index)}
                                    disabled={saving}
                                    title="Supprimer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              {/* ---------- COLONNE DROITE : RÉCAP ---------- */}
              <aside className="commande-modal-right">
                <div className="commande-recap">
                  <h3 className="commande-recap-title">
                    <ShoppingBasket size={16} />
                    Récapitulatif
                  </h3>

                  <div className="commande-recap-info">
                    <div className="commande-recap-line">
                      <span className="recap-label">Fournisseur</span>
                      <span className="recap-value">
                        {fournisseurSearch || '—'}
                      </span>
                    </div>
                    <div className="commande-recap-line">
                      <span className="recap-label">Produits</span>
                      <span className="recap-value">{formData.lignes.length}</span>
                    </div>
                  </div>

                  <div className="commande-recap-divider" />

                  {formData.lignes.length > 0 && (
                    <div className="commande-recap-list">
                      {formData.lignes.map((l, i) => {
                        const hasPrix = l.prix_achat !== null && l.prix_achat > 0;
                        return (
                          <div key={i} className="commande-recap-item">
                            <span className="recap-item-name">
                              {l.produit_nom}
                            </span>
                            <span className="recap-item-qty">
                              ×{l.quantite} {l.nom_unite_vente}
                            </span>
                            {hasPrix ? (
                              <span className="recap-item-total">
                                {formatMontant(l.quantite * l.prix_achat)}
                              </span>
                            ) : (
                              <span className="recap-item-total empty">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="commande-recap-divider" />

                  <div className="commande-recap-totaux">
                    <div className="recap-total-line">
                      <span>Sous-total</span>
                      <span>
                        {calculerTotalCommande() > 0
                          ? formatMontant(calculerTotalCommande())
                          : '—'}
                      </span>
                    </div>

                    <div className="recap-total-final">
                      <span>Total</span>
                      <span>
                        {calculerTotalCommande() > 0
                          ? formatMontant(calculerTotalCommande())
                          : <em>À définir</em>}
                      </span>
                    </div>

                    {calculerTotalCommande() === 0 && formData.lignes.length > 0 && (
                      <p className="recap-note">
                        Les prix seront renseignés à la réception
                      </p>
                    )}
                  </div>
                </div>
              </aside>
            </div>

            {/* ================= FOOTER ================= */}
            <footer className="commande-modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => !saving && setShowModal(false)}
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
                  formData.lignes.length === 0 ||
                  editingLigneIndex !== null
                }
              >
                {saving ? (
                  <>
                    <Loader size={16} className="spinning" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>{editingCommande ? "Mettre à jour" : "Créer la commande"}</span>
                  </>
                )}
              </button>
            </footer>
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
              <div className="modal-header-content">
                <div className="modal-header-icon detail">
                  <FileText size={24} />
                </div>
                <div>
                  <h2>Détails de la commande</h2>
                  <p className="modal-subtitle">{selectedCommande.numero_commande}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-header-left">
                  <div className="detail-icon">
                    <FileText size={28} />
                  </div>
                  <div>
                    <h3 className="detail-numero">{selectedCommande.numero_commande}</h3>
                    <span className="detail-date">
                      <Calendar size={14} />
                      {new Date(selectedCommande.date_commande).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div className="detail-header-right">
                  {renderStatut(selectedCommande.statut)}
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-section">
                  <h4><Building size={16} /> Fournisseur</h4>
                  <div className="detail-item">
                    <label>Nom</label>
                    <span>{selectedCommande.fournisseur_nom}</span>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone</label>
                    <span>{selectedCommande.fournisseur_telephone || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <span>{selectedCommande.fournisseur_email || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Ville</label>
                    <span>{selectedCommande.fournisseur_ville || '-'}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4><FileText size={16} /> Informations</h4>
                  <div className="detail-item">
                    <label>Créé par</label>
                    <span>{selectedCommande.utilisateur_nom || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Montant total</label>
                    <span className="montant-total">
                      {parseFloat(selectedCommande.montant_total) > 0
                        ? formatMontant(selectedCommande.montant_total)
                        : <em style={{ color: '#94a3b8' }}>À définir</em>}
                    </span>
                  </div>
                </div>
              </div>

              {selectedCommande.lignes && selectedCommande.lignes.length > 0 && (
                <div className="detail-lignes">
                  <h4><Package size={16} /> Produits commandés</h4>
                  <div className="detail-lignes-wrapper">
                    <table className="detail-lignes-table">
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Unité</th>
                          <th>Qté</th>
                          <th>Prix unit.</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCommande.lignes.map((l, idx) => {
                          const qte = parseFloat(l.quantite) || 0;
                          const prix = l.prix_achat !== null ? parseFloat(l.prix_achat) : null;
                          const total = prix !== null ? qte * prix : null;
                          const qteBase = parseFloat(l.quantite_totale_base)
                            || (qte * (parseFloat(l.quantite_base) || 1));

                          return (
                            <tr key={idx}>
                              <td>
                                <div className="produit-nom">{l.produit_nom}</div>
                                {l.modele_nom && (
                                  <div className="produit-modele">{l.modele_nom}</div>
                                )}
                              </td>
                              <td>
                                <span className="unite-badge">
                                  <Box size={12} />
                                  {l.nom_unite_vente || 'Unité'}
                                  {l.quantite_base > 1 && <small> ({l.quantite_base})</small>}
                                </span>
                              </td>
                              <td>
                                <strong>{qte}</strong>
                                {l.quantite_base > 1 && (
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    = {qteBase} unités
                                  </div>
                                )}
                              </td>
                              <td>
                                {prix !== null
                                  ? formatMontant(prix)
                                  : <em style={{ color: '#94a3b8' }}>À définir</em>}
                              </td>
                              <td>
                                {total !== null
                                  ? <strong>{formatMontant(total)}</strong>
                                  : <em style={{ color: '#94a3b8' }}>—</em>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="total-row">
                          <td colSpan="4"><strong>Total commande</strong></td>
                          <td>
                            {parseFloat(selectedCommande.montant_total) > 0
                              ? <strong>{formatMontant(selectedCommande.montant_total)}</strong>
                              : <em style={{ color: '#94a3b8', fontWeight: 'normal' }}>À définir à la réception</em>}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Boutons PDF + WhatsApp */}
            <div className="modal-footer" style={{ padding: 0, border: 'none', display: 'block' }}>
              <BonCommandePDFActions
                commandeData={{
                  ...selectedCommande,
                  magasin: magasin,
                }}
                onClose={() => setShowDetailModal(false)}
              />
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
              <div className="modal-header-content">
                <div className="modal-header-icon danger">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2>Confirmer la suppression</h2>
                  <p className="modal-subtitle">Cette action est irréversible</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => !deleting && setShowDeleteModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-content">
                <p>Êtes-vous sûr de vouloir supprimer la commande</p>
                <p className="delete-item-name">
                  <strong>"{commandeToDelete?.numero_commande}"</strong>
                </p>
                <p className="delete-item-detail">
                  Fournisseur : {commandeToDelete?.fournisseur_nom || 'Fournisseur inconnu'}
                </p>
                <div className="delete-warning">
                  <AlertTriangle size={18} />
                  <span>⚠️ Cette action est irréversible</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Annuler
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <>
                    <Loader size={18} className="spinning" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Supprimer définitivement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandesAchat;