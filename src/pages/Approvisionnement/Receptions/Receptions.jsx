// pages/Receptions/Receptions.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus, Search, Eye, ChevronLeft, ChevronRight, Download, X, Check,
  RefreshCw, Grid, List, Package, Banknote, Calendar, Clock,
  AlertCircle, CheckCircle, Ban, FileText, Building, Truck,
  ClipboardList, CheckSquare, Square, AlertTriangle, Trash2,
  ShoppingBag, ChevronDown
} from "lucide-react";
import ReceptionService from "../../../services/receptionService";
import CommandeAchatService from "../../../services/commandeAchatService";
import FournisseurService from "../../../services/fournisseurService";
import ProduitService from "../../../services/produitService";
import { useUser } from "../../../context/AuthContext";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import "./Receptions.css";

const Receptions = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem('token');

  // ============ ÉTATS PRINCIPAUX ============
  const [receptions, setReceptions] = useState([]);
  const [commandesDisponibles, setCommandesDisponibles] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCommandes, setLoadingCommandes] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState("list");
  const [error, setError] = useState(null);
  const [filterStatut, setFilterStatut] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  // ============ MODALS ============
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReception, setSelectedReception] = useState(null);
  const [receptionToDelete, setReceptionToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatut, setUpdatingStatut] = useState(null);

  // ============ FORMULAIRE ============
  const [formData, setFormData] = useState({
    id_commande_achat: "",
    lignes: []
  });
  const [toutValide, setToutValide] = useState(false);
  const [commandeSelectionnee, setCommandeSelectionnee] = useState(null);

  // ============ SÉLECTEUR DE COMMANDE ============
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerHighlighted, setPickerHighlighted] = useState(0);
  const pickerRef = useRef(null);
  const pickerInputRef = useRef(null);

  // ============ MODAL DE CONFIRMATION GÉNÉRIQUE ============
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    details: null,
    type: 'warning',
    confirmLabel: 'Confirmer',
    onConfirm: null,
  });

  const openConfirm = (config) => {
    setConfirmModal({
      isOpen: true,
      title: config.title || 'Confirmation',
      message: config.message || '',
      details: config.details || null,
      type: config.type || 'warning',
      confirmLabel: config.confirmLabel || 'Confirmer',
      onConfirm: config.onConfirm || null,
    });
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  const toastTimeoutRef = useRef(null);
  const canManage = user && ['admin', 'manager'].includes(user.role);

  // ============================================================
  // CHARGEMENT
  // ============================================================
  useEffect(() => {
    if (isAuthenticated && token) {
      loadReceptions();
      loadCommandesDisponibles();
      loadFournisseurs();
      loadAllProduits();
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Fermer le picker au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    if (pickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [pickerOpen]);

  const showToast = (message) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  const loadReceptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ReceptionService.getAllReceptions(token);
      if (response.success) {
        setReceptions(response.data || []);
      } else {
        setError(response.message || 'Erreur lors du chargement des réceptions');
      }
    } catch (error) {
      console.error('❌ LoadReceptions error:', error);
      setError(error.message || 'Erreur lors du chargement des réceptions');
    } finally {
      setLoading(false);
    }
  };

  const loadCommandesDisponibles = async () => {
    setLoadingCommandes(true);
    try {
      const [responseEnAttente, responsePartiel] = await Promise.all([
        CommandeAchatService.getCommandesByStatut(token, 'en_attente'),
        CommandeAchatService.getCommandesByStatut(token, 'partiellement_recue')
      ]);

      let commandesList = [];
      if (responseEnAttente.success) commandesList = [...commandesList, ...responseEnAttente.data];
      if (responsePartiel.success) commandesList = [...commandesList, ...responsePartiel.data];

      commandesList.sort((a, b) => new Date(b.date_commande) - new Date(a.date_commande));
      setCommandesDisponibles(commandesList);
    } catch (error) {
      console.error('❌ LoadCommandesDisponibles error:', error);
    } finally {
      setLoadingCommandes(false);
    }
  };

  const loadFournisseurs = async () => {
    try {
      const response = await FournisseurService.getActiveFournisseurs(token);
      if (response.success) setFournisseurs(response.data || []);
    } catch (error) {
      console.error('❌ LoadFournisseurs error:', error);
    }
  };

  const loadAllProduits = async () => {
    try {
      const response = await ProduitService.getAllProduits(token);
      if (response.success) setProduits(response.data || []);
    } catch (error) {
      console.error('❌ LoadProduits error:', error);
    }
  };

  // ============================================================
  // COMMANDES FILTRÉES POUR LE PICKER
  // ============================================================
  const filteredCommandes = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    if (!term) {
      // Par défaut : TOP 10 des plus urgentes (anciennes d'abord)
      const sorted = [...commandesDisponibles].sort((a, b) => {
        const aPartiel = a.statut === 'partiellement_recue' ? 0 : 1;
        const bPartiel = b.statut === 'partiellement_recue' ? 0 : 1;
        if (aPartiel !== bPartiel) return aPartiel - bPartiel;
        return new Date(a.date_commande) - new Date(b.date_commande);
      });
      return sorted.slice(0, 10);
    }

    return commandesDisponibles
      .filter(c =>
        c.numero_commande?.toLowerCase().includes(term) ||
        c.fournisseur_nom?.toLowerCase().includes(term) ||
        new Date(c.date_commande).toLocaleDateString('fr-FR').includes(term)
      )
      .slice(0, 50);
  }, [commandesDisponibles, pickerSearch]);

  const isDefaultList = pickerSearch.trim() === "";

  // ============================================================
  // FORMULAIRE
  // ============================================================
  useEffect(() => {
    if (formData.id_commande_achat) {
      const commande = commandesDisponibles.find(
        c => c.id_commande_achat === parseInt(formData.id_commande_achat)
      );
      if (commande) {
        setCommandeSelectionnee(commande);
        chargerDetailsCommande(commande.id_commande_achat);
      }
    } else {
      setFormData(prev => ({ ...prev, lignes: [] }));
      setToutValide(false);
      setCommandeSelectionnee(null);
    }
  }, [formData.id_commande_achat, commandesDisponibles]);

  const chargerDetailsCommande = async (idCommande) => {
    setLoading(true);
    try {
      const response = await CommandeAchatService.getCommandeById(token, idCommande);
      if (response.success && response.data) {
        const commande = response.data;

        const lignesReception = (commande.lignes || []).map(l => {
          const qteBase = parseFloat(l.quantite_base) || 1;

          // On utilise le reste à recevoir renvoyé par le back
          const resteUV = l.reste_a_recevoir !== undefined
            ? parseFloat(l.reste_a_recevoir) || 0
            : parseFloat(l.quantite) || 0;

          const dejaRecueUV = l.quantite_deja_recue !== undefined
            ? parseFloat(l.quantite_deja_recue) || 0
            : 0;

          const totalCommandeUV = parseFloat(l.quantite) || 0;

          const prixAchatUV = l.prix_achat !== null && l.prix_achat !== undefined
            ? parseFloat(l.prix_achat)
            : null;

          return {
            id_produit: l.id_produit,
            id_ligne_achat: l.id_ligne_achat || null,
            produit_nom: l.produit_nom || 'Produit inconnu',
            produit_reference: l.reference || '',
            id_unite_vente: l.id_unite_vente || null,
            nom_unite_vente: l.nom_unite_vente || l.unite_vente_nom || 'Unité',
            quantite_base: qteBase,

            // reste à recevoir (utilisé dans l'UI)
            quantite_commandee: resteUV,

            // infos affichées en bonus
            quantite_totale_commandee: totalCommandeUV,
            quantite_deja_recue: dejaRecueUV,

            quantite_totale_base_commandee: totalCommandeUV * qteBase,
            quantite_recue: resteUV,
            quantite_totale_base: resteUV * qteBase,
            ecart: 0,
            prix_achat_unite_vente: prixAchatUV,
            unite: l.nom_unite_vente || l.unite_symbole || '',
            valide: true,
            etat_marchandise: 'bon',
            num_lot: '',
            date_peremption: '',
            notes: ''
          };
        });

        // Cas : commande déjà totalement reçue
        const rienARecevoir = lignesReception.length === 0
          || lignesReception.every(l => l.quantite_commandee <= 0);

        if (rienARecevoir) {
          setError('Cette commande a déjà été entièrement reçue.');
          setFormData(prev => ({ ...prev, lignes: [] }));
          setToutValide(false);
          return;
        }

        setFormData(prev => ({ ...prev, lignes: lignesReception }));
        setToutValide(lignesReception.every(l => l.valide === true));
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des détails:', error);
      setError('Impossible de charger les détails de la commande');
    } finally {
      setLoading(false);
    }
  };

  const toggleValiderLigne = (index) => {
    const nouvellesLignes = [...formData.lignes];
    const qteBase = nouvellesLignes[index].quantite_base || 1;

    nouvellesLignes[index].valide = !nouvellesLignes[index].valide;

    if (!nouvellesLignes[index].valide) {
      nouvellesLignes[index].quantite_recue = 0;
      nouvellesLignes[index].quantite_totale_base = 0;
    } else {
      nouvellesLignes[index].quantite_recue = nouvellesLignes[index].quantite_commandee;
      nouvellesLignes[index].quantite_totale_base =
        nouvellesLignes[index].quantite_commandee * qteBase;
    }

    nouvellesLignes[index].ecart =
      nouvellesLignes[index].quantite_commandee - nouvellesLignes[index].quantite_recue;

    setFormData({ ...formData, lignes: nouvellesLignes });
    setToutValide(nouvellesLignes.every(l => l.valide === true));
  };

  const validerTout = () => {
    const nouvellesLignes = formData.lignes.map(l => {
      // Ne pas écraser les lignes déjà validées
      if (l.valide === true) return l;

      const qteBase = l.quantite_base || 1;
      return {
        ...l,
        valide: true,
        quantite_recue: l.quantite_commandee,
        quantite_totale_base: l.quantite_commandee * qteBase,
        ecart: 0
      };
    });
    setFormData({ ...formData, lignes: nouvellesLignes });
    setToutValide(true);
  };

  const deselectionnerTout = () => {
    const nouvellesLignes = formData.lignes.map(l => ({
      ...l,
      valide: false,
      quantite_recue: 0,
      quantite_totale_base: 0,
      ecart: l.quantite_commandee
    }));
    setFormData({ ...formData, lignes: nouvellesLignes });
    setToutValide(false);
  };

  const handleQuantiteRecueChange = (index, value) => {
    const nouvellesLignes = [...formData.lignes];
    const qteRecue = parseFloat(value) || 0;
    const qteCommandee = nouvellesLignes[index].quantite_commandee || 0;
    const qteBase = nouvellesLignes[index].quantite_base || 1;

    nouvellesLignes[index].quantite_recue = qteRecue;
    nouvellesLignes[index].quantite_totale_base = qteRecue * qteBase;
    nouvellesLignes[index].ecart = qteCommandee - qteRecue;

    nouvellesLignes[index].valide = qteRecue > 0;
    nouvellesLignes[index].etat_marchandise = qteRecue < qteCommandee ? 'partiel' : 'bon';

    setFormData({ ...formData, lignes: nouvellesLignes });
    setToutValide(nouvellesLignes.every(l => l.valide === true));
  };

  const handlePrixAchatChange = (index, value) => {
    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes[index].prix_achat_unite_vente =
      value === '' ? null : parseFloat(value) || null;
    setFormData({ ...formData, lignes: nouvellesLignes });
  };

  const handleEtatChange = (index, value) => {
    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes[index].etat_marchandise = value;
    setFormData({ ...formData, lignes: nouvellesLignes });
  };

  const handlePeremptionChange = (index, value) => {
    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes[index].date_peremption = value;
    setFormData({ ...formData, lignes: nouvellesLignes });
  };

  // ============================================================
  // ACTIONS PICKER
  // ============================================================
  const handlePickerOpen = () => {
    if (saving || loadingCommandes) return;
    setPickerOpen(true);
    setPickerSearch("");
    setPickerHighlighted(0);
    setTimeout(() => pickerInputRef.current?.focus(), 50);
  };

  const handlePickerSelect = (commande) => {
    setFormData(prev => ({
      ...prev,
      id_commande_achat: commande.id_commande_achat
    }));
    setPickerOpen(false);
    setPickerSearch("");
  };

  const handlePickerClear = () => {
    setFormData(prev => ({ ...prev, id_commande_achat: "", lignes: [] }));
    setCommandeSelectionnee(null);
    setToutValide(false);
    setTimeout(() => handlePickerOpen(), 50);
  };

  const handlePickerKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPickerHighlighted(prev => Math.min(prev + 1, filteredCommandes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPickerHighlighted(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommandes[pickerHighlighted]) {
        handlePickerSelect(filteredCommandes[pickerHighlighted]);
      }
    } else if (e.key === 'Escape') {
      setPickerOpen(false);
    }
  };

  const formatDateCommande = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  };

  const formatJoursEcoules = (dateStr) => {
    try {
      const diff = Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
      if (diff === 0) return "Aujourd'hui";
      if (diff === 1) return "Hier";
      return `J+${diff}`;
    } catch {
      return "";
    }
  };

  // ============================================================
  // ACTIONS CRUD
  // ============================================================
  const handleAdd = () => {
    setFormData({ id_commande_achat: "", lignes: [] });
    setToutValide(false);
    setCommandeSelectionnee(null);
    setError(null);
    setPickerSearch("");
    setShowModal(true);
  };

  const handleView = (reception) => {
    setSelectedReception(reception);
    setShowDetailModal(true);
  };

  const handleSave = async () => {
    if (!formData.id_commande_achat) {
      setError("Veuillez sélectionner une commande");
      return;
    }

    const lignesValidees = formData.lignes.filter(l => l.valide === true);
    if (lignesValidees.length === 0) {
      setError("Veuillez valider au moins un produit");
      return;
    }

    for (const ligne of lignesValidees) {
      if (!ligne.quantite_recue || parseFloat(ligne.quantite_recue) <= 0) {
        setError(`La quantité reçue pour ${ligne.produit_nom} doit être positive`);
        return;
      }
    }

    const lignesAvecEcart = formData.lignes.filter(l => l.valide && l.ecart !== 0);

    if (lignesAvecEcart.length > 0) {
      const manquants = lignesAvecEcart.filter(l => l.ecart > 0);
      const surplus = lignesAvecEcart.filter(l => l.ecart < 0);

      openConfirm({
        title: 'Écarts détectés',
        message: `${lignesAvecEcart.length} ligne(s) présente(nt) un écart avec la commande initiale.`,
        details: (
          <>
            {manquants.length > 0 && (
              <div className="detail-section">
                <span className="detail-label">Manquants</span>
                <ul>
                  {manquants.map((l, i) => (
                    <li key={i}>
                      <strong>{l.produit_nom}</strong> : commandé <strong>{l.quantite_commandee} {l.nom_unite_vente}</strong>, reçu <strong>{l.quantite_recue} {l.nom_unite_vente}</strong>
                      <span style={{ color: '#b42318', marginLeft: '6px' }}>
                        (-{l.ecart} {l.nom_unite_vente})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {surplus.length > 0 && (
              <div className="detail-section">
                <span className="detail-label">Surplus</span>
                <ul>
                  {surplus.map((l, i) => (
                    <li key={i}>
                      <strong>{l.produit_nom}</strong> : commandé <strong>{l.quantite_commandee} {l.nom_unite_vente}</strong>, reçu <strong>{l.quantite_recue} {l.nom_unite_vente}</strong>
                      <span style={{ color: '#175cd3', marginLeft: '6px' }}>
                        (+{Math.abs(l.ecart)} {l.nom_unite_vente})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p style={{ marginTop: '10px', fontSize: '12px', color: '#5b6672' }}>
              La commande sera marquée <strong>« partiellement reçue »</strong> si des manquants existent.
            </p>
          </>
        ),
        type: 'warning',
        confirmLabel: 'Confirmer la réception',
        onConfirm: () => {
          closeConfirm();
          handleSaveConfirmed();
        },
      });
      return;
    }

    handleSaveConfirmed();
  };

  const handleSaveConfirmed = async () => {
    setSaving(true);
    setError(null);

    try {
      const lignesValidees = formData.lignes.filter(l => l.valide === true);

      const data = {
        id_commande_achat: parseInt(formData.id_commande_achat),
        date_reception: new Date().toISOString().split('T')[0],
        notes: null,
        lignes: lignesValidees.map(l => {
          const qteBase = l.quantite_base || 1;
          const qteRecue = parseFloat(l.quantite_recue) || 0;
          const quantiteTotaleBase = qteRecue * qteBase;

          let prixAchatUV = null;
          if (
            l.prix_achat_unite_vente !== null &&
            l.prix_achat_unite_vente !== undefined &&
            l.prix_achat_unite_vente !== ''
          ) {
            const parsed = parseFloat(l.prix_achat_unite_vente);
            if (!isNaN(parsed) && parsed > 0) prixAchatUV = parsed;
          }

          return {
            id_produit: l.id_produit,
            id_ligne_achat: l.id_ligne_achat || null,
            id_unite_vente: l.id_unite_vente || null,
            nom_unite_vente: l.nom_unite_vente || 'Unité',
            quantite_base: qteBase,
            quantite_totale_base: quantiteTotaleBase,
            quantite_commandee: l.quantite_commandee || 0,
            quantite_recue: qteRecue,
            prix_achat_unite_vente: prixAchatUV,
            etat_marchandise: l.etat_marchandise || 'bon',
            num_lot: l.num_lot || null,
            date_peremption: l.date_peremption || null,
            notes_ligne: l.notes || null
          };
        })
      };

      const response = await ReceptionService.createReception(token, data);

      if (response.success) {
        await loadReceptions();
        await loadCommandesDisponibles();
        setShowModal(false);
        setFormData({ id_commande_achat: "", lignes: [] });
        setToutValide(false);
        setCommandeSelectionnee(null);
        showToast('Réception enregistrée avec succès');
      } else {
        setError(response.message || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      setError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (reception) => {
    setReceptionToDelete(reception);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!receptionToDelete) return;
    setDeleting(true);
    setError(null);

    try {
      const response = await ReceptionService.deleteReception(
        token,
        receptionToDelete.id_reception
      );

      if (response.success) {
        await loadReceptions();
        await loadCommandesDisponibles();
        setShowDeleteModal(false);
        setReceptionToDelete(null);
        showToast('Réception supprimée');
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

  const handleChangeStatut = async (id, statut) => {
    if (updatingStatut === id) return;
    setUpdatingStatut(id);
    setError(null);

    try {
      const response = await ReceptionService.updateStatut(token, id, statut);
      if (response.success) {
        await loadReceptions();
        await loadCommandesDisponibles();
        showToast('Statut mis à jour');
      } else {
        setError(response.message || 'Erreur lors du changement de statut');
      }
    } catch (error) {
      console.error('❌ Change statut error:', error);
      setError(error.message || 'Erreur lors du changement de statut');
    } finally {
      setUpdatingStatut(null);
    }
  };

  const handleExport = async () => {
    try {
      const response = await ReceptionService.exportReceptions(token);
      if (response.success && response.data) {
        const headers = ["ID", "Numéro", "Date", "Fournisseur", "Commande", "Montant", "Statut", "Notes"];
        const rows = response.data.map(r => [
          r.id, r.numero, r.date, r.fournisseur, r.commande,
          formatMontant(r.montant), r.statut, r.notes || ""
        ]);

        let csv = headers.join(",") + "\n";
        rows.forEach(row => {
          csv += row.map(cell => `"${cell}"`).join(",") + "\n";
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receptions_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Export terminé');
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      setError('Erreur lors de l\'exportation');
    }
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

  const getStats = () => {
    const total = receptions.length;
    const enAttente = receptions.filter(r => r.statut === 'en_attente').length;
    const partielle = receptions.filter(r => r.statut === 'partielle').length;
    const complete = receptions.filter(r => r.statut === 'complete').length;
    const annulee = receptions.filter(r => r.statut === 'annulee').length;

    const totalMontant = receptions.reduce((sum, r) => {
      const montant = r.montant_total !== undefined && r.montant_total !== null
        ? parseFloat(r.montant_total) : 0;
      return sum + (isNaN(montant) ? 0 : montant);
    }, 0);

    return { total, enAttente, partielle, complete, annulee, totalMontant };
  };

  const stats = getStats();

  const filteredReceptions = receptions.filter((reception) => {
    const matchSearch =
      reception.numero_reception?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reception.fournisseur_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reception.numero_commande?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reception.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatut = filterStatut ? reception.statut === filterStatut : true;
    return matchSearch && matchStatut;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReceptions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReceptions.length / itemsPerPage);

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '-');

  // ============================================================
  // RENDU STATUT
  // ============================================================
  const renderStatut = (statut) => {
    const configs = {
      'en_attente': { label: 'En attente', key: 'en-attente' },
      'partielle': { label: 'Partielle', key: 'partielle' },
      'complete': { label: 'Complète', key: 'complete' },
      'annulee': { label: 'Annulée', key: 'annulee' }
    };
    const config = configs[statut] || configs['en_attente'];

    return (
      <span className={`rc-status rc-status--${config.key}`}>
        <span className="rc-status-dot" />
        {config.label}
      </span>
    );
  };

  const renderEcart = (ecart, uniteLabel) => {
    if (ecart > 0) {
      return (
        <span className="rc-ecart rc-ecart--manque">
          −{ecart} <small>{uniteLabel}</small>
        </span>
      );
    }
    if (ecart < 0) {
      return (
        <span className="rc-ecart rc-ecart--surplus">
          +{Math.abs(ecart)} <small>{uniteLabel}</small>
        </span>
      );
    }
    return (
      <span className="rc-ecart rc-ecart--ok">
        <Check size={13} /> Conforme
      </span>
    );
  };

  // ============================================================
  // PICKER DE COMMANDE
  // ============================================================
  const renderCommandePicker = () => {
    const isSelected = !!commandeSelectionnee;

    return (
      <div className="rc-picker" ref={pickerRef}>
        <label className="rc-field-label">
          <ShoppingBag size={14} />
          Commande d'achat
        </label>

        {isSelected ? (
          <div className="rc-picker-selected">
            <div className="rc-picker-selected-icon">
              <FileText size={18} />
            </div>
            <div className="rc-picker-selected-info">
              <span className="rc-picker-selected-num">
                {commandeSelectionnee.numero_commande}
              </span>
              <span className="rc-picker-selected-meta">
                <span><Building size={12} /> {commandeSelectionnee.fournisseur_nom}</span>
                <span><Calendar size={12} /> {formatDateCommande(commandeSelectionnee.date_commande)}</span>
                <span><Banknote size={12} /> {formatMontant(commandeSelectionnee.montant_total)}</span>
              </span>
            </div>
            <button
              type="button"
              className="rc-btn rc-btn--outline rc-btn--sm"
              onClick={handlePickerClear}
              disabled={saving}
            >
              Changer
            </button>
          </div>
        ) : (
          <div className="rc-picker-input-wrap">
            <Search size={17} className="rc-picker-icon" />
            <input
              ref={pickerInputRef}
              type="text"
              className="rc-picker-input"
              placeholder="Rechercher par numéro, fournisseur ou date"
              value={pickerSearch}
              onChange={(e) => {
                setPickerSearch(e.target.value);
                setPickerHighlighted(0);
              }}
              onFocus={handlePickerOpen}
              onClick={handlePickerOpen}
              onKeyDown={handlePickerKeyDown}
              disabled={saving || loadingCommandes}
            />
            {loadingCommandes ? (
              <span className="rc-spinner rc-spinner--sm rc-picker-end" />
            ) : (
              <ChevronDown
                size={17}
                className={`rc-picker-end rc-picker-chevron ${pickerOpen ? 'is-open' : ''}`}
              />
            )}
          </div>
        )}

        {pickerOpen && !isSelected && (
          <div className="rc-picker-dropdown">
            <div className="rc-picker-dropdown-head">
              {isDefaultList ? (
                <>
                  <Clock size={14} />
                  <span>Les {filteredCommandes.length} commandes les plus urgentes</span>
                </>
              ) : (
                <>
                  <Search size={14} />
                  <span>{filteredCommandes.length} résultat(s) pour « {pickerSearch} »</span>
                </>
              )}
            </div>

            <div className="rc-picker-list">
              {filteredCommandes.length === 0 ? (
                <div className="rc-picker-empty">
                  <Search size={26} />
                  <p>Aucune commande trouvée</p>
                  <small>Essayez un autre numéro ou un autre fournisseur</small>
                </div>
              ) : (
                filteredCommandes.map((c, idx) => {
                  const isPartiel = c.statut === 'partiellement_recue';
                  return (
                    <div
                      key={c.id_commande_achat}
                      className={`rc-picker-item ${idx === pickerHighlighted ? 'is-highlighted' : ''}`}
                      onClick={() => handlePickerSelect(c)}
                      onMouseEnter={() => setPickerHighlighted(idx)}
                    >
                      <div className="rc-picker-item-main">
                        <span className="rc-picker-item-num">{c.numero_commande}</span>
                        <span className={`rc-chip ${isPartiel ? 'rc-chip--info' : 'rc-chip--warn'}`}>
                          {isPartiel ? 'Partielle' : 'En attente'}
                        </span>
                      </div>
                      <div className="rc-picker-item-side">
                        <span><Building size={12} /> {c.fournisseur_nom}</span>
                        <span>
                          <Calendar size={12} /> {formatDateCommande(c.date_commande)}
                          <em className="rc-age">{formatJoursEcoules(c.date_commande)}</em>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {filteredCommandes.length > 0 && (
              <div className="rc-picker-foot">
                ↑↓ naviguer · Entrée sélectionner · Échap fermer
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // LIGNES DE RÉCEPTION
  // ============================================================
  const renderLignesReception = () => {
    if (formData.lignes.length === 0) {
      return (
        <div className="rc-empty">
          <ClipboardList size={40} />
          <p>Aucun produit à recevoir dans cette commande</p>
        </div>
      );
    }

    const lignesValides = formData.lignes.filter(l => l.valide === true).length;
    const totalLignes = formData.lignes.length;
    const pourcentage = totalLignes > 0 ? Math.round((lignesValides / totalLignes) * 100) : 0;
    const nbLignesAvecEcart = formData.lignes.filter(l => l.ecart !== 0).length;

    return (
      <div className="rc-lines">
        <div className="rc-lines-head">
          <div className="rc-lines-summary">
            <span className="rc-lines-count">
              <Package size={16} />
              {totalLignes} produit(s) à recevoir
            </span>
            <span className={`rc-chip ${toutValide ? 'rc-chip--ok' : 'rc-chip--warn'}`}>
              {toutValide ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
              {toutValide ? 'Tous validés' : `${lignesValides} validé(s)`}
            </span>
            {nbLignesAvecEcart > 0 && (
              <span className="rc-chip rc-chip--warn">
                <AlertTriangle size={13} /> {nbLignesAvecEcart} écart(s)
              </span>
            )}
            <div className="rc-progress" aria-label={`${pourcentage}% validé`}>
              <div className="rc-progress-bar">
                <div className="rc-progress-fill" style={{ width: `${pourcentage}%` }} />
              </div>
              <span>{pourcentage}%</span>
            </div>
          </div>
          <div className="rc-lines-actions">
            <button
              type="button"
              className="rc-btn rc-btn--primary rc-btn--sm"
              onClick={validerTout}
              disabled={saving || formData.lignes.length === 0 || toutValide}
            >
              <CheckSquare size={15} />
              Valider tout
            </button>
            <button
              type="button"
              className="rc-btn rc-btn--ghost rc-btn--sm"
              onClick={deselectionnerTout}
              disabled={saving || formData.lignes.length === 0 || lignesValides === 0}
            >
              <Square size={15} />
              Tout désélectionner
            </button>
          </div>
        </div>

        <div className="rc-scroll">
          <table className="rc-lines-table">
            <thead>
              <tr>
                <th className="c-check"></th>
                <th className="c-produit">Produit</th>
                <th className="c-qte">Commandé</th>
                <th className="c-recu">Reçu</th>
                <th className="c-ecart">Écart</th>
                <th className="c-prix">Prix d'achat</th>
                <th className="c-etat">État</th>
                <th className="c-date">Péremption</th>
              </tr>
            </thead>
            <tbody>
              {formData.lignes.map((ligne, index) => {
                const estValide = ligne.valide === true;
                const uniteLabel = ligne.nom_unite_vente || 'Unité';

                return (
                  <tr key={index} className={estValide ? 'is-valid' : 'is-invalid'}>
                    <td className="c-check">
                      <button
                        type="button"
                        className="rc-check"
                        onClick={() => toggleValiderLigne(index)}
                        disabled={saving}
                        title={estValide ? 'Désélectionner' : 'Valider cette ligne'}
                        aria-pressed={estValide}
                      >
                        {estValide ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="c-produit">
                      <div className="rc-product">
                        <strong>{ligne.produit_nom}</strong>
                        {ligne.produit_reference && (
                          <span>Réf. {ligne.produit_reference}</span>
                        )}
                      </div>
                    </td>
                    <td className="c-qte">
                      <div className="rc-qty">
                        <strong>{ligne.quantite_commandee}</strong>
                        <span>{uniteLabel}</span>
                        {ligne.quantite_deja_recue > 0 && (
                          <small>déjà reçu : {ligne.quantite_deja_recue}</small>
                        )}
                      </div>
                    </td>
                    <td className="c-recu">
                      <div className={`rc-input-group ${!estValide ? 'is-invalid' : ''}`}>
                        <input
                          type="number"
                          value={ligne.quantite_recue || ''}
                          onChange={(e) => handleQuantiteRecueChange(index, e.target.value)}
                          min="0"
                          step="1"
                          disabled={saving}
                          placeholder="0"
                        />
                        <span>{uniteLabel}</span>
                      </div>
                    </td>
                    <td className="c-ecart">{renderEcart(ligne.ecart, uniteLabel)}</td>
                    <td className="c-prix">
                      <div className="rc-input-group">
                        <input
                          type="number"
                          value={ligne.prix_achat_unite_vente ?? ''}
                          onChange={(e) => handlePrixAchatChange(index, e.target.value)}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          disabled={saving}
                        />
                      </div>
                    </td>
                    <td className="c-etat">
                      <select
                        value={ligne.etat_marchandise || 'bon'}
                        onChange={(e) => handleEtatChange(index, e.target.value)}
                        className={`rc-select rc-select--etat etat-${ligne.etat_marchandise || 'bon'}`}
                        disabled={saving}
                      >
                        <option value="bon">Bon</option>
                        <option value="endommager">Endommagé</option>
                        <option value="manquant">Manquant</option>
                        <option value="partiel">Partiel</option>
                      </select>
                    </td>
                    <td className="c-date">
                      <input
                        type="date"
                        value={ligne.date_peremption || ''}
                        onChange={(e) => handlePeremptionChange(index, e.target.value)}
                        className="rc-input"
                        disabled={saving}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rc-lines-foot">
          <span>
            <strong>{lignesValides}</strong> / {totalLignes} lignes validées
          </span>
          <span className={toutValide ? 'rc-foot-ok' : 'rc-foot-warn'}>
            {toutValide ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {toutValide ? 'Toutes les lignes sont validées' : 'Certaines lignes ne sont pas validées'}
          </span>
        </div>
      </div>
    );
  };

  // ============================================================
  // ACTIONS DE LIGNE (liste & grille)
  // ============================================================
  const renderRowActions = (reception) => (
    <>
      <button
        className="rc-icon-btn"
        onClick={() => handleView(reception)}
        title="Voir les détails"
        aria-label="Voir les détails"
      >
        <Eye size={16} />
      </button>
      {canManage && reception.statut === 'en_attente' && (
        <button
          className="rc-icon-btn rc-icon-btn--ok"
          onClick={() => handleChangeStatut(reception.id_reception, 'complete')}
          disabled={updatingStatut === reception.id_reception}
          title="Valider la réception"
          aria-label="Valider la réception"
        >
          <Check size={16} />
        </button>
      )}
      {canManage && reception.statut !== 'complete' && reception.statut !== 'annulee' && (
        <button
          className="rc-icon-btn rc-icon-btn--danger"
          onClick={() => confirmDelete(reception)}
          title="Supprimer"
          aria-label="Supprimer"
        >
          <Trash2 size={16} />
        </button>
      )}
    </>
  );

  // ============================================================
  // VUES LISTE & GRILLE
  // ============================================================
  const renderListView = () => (
    <div className="rc-table-wrap rc-scroll">
      <table className="rc-table">
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Date</th>
            <th>Fournisseur</th>
            <th>Commande</th>
            <th className="is-num">Montant</th>
            <th className="is-num">Produits</th>
            <th>Statut</th>
            <th className="is-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length === 0 ? (
            <tr>
              <td colSpan="8">
                <div className="rc-empty">
                  <Package size={36} />
                  <p>Aucune réception trouvée</p>
                </div>
              </td>
            </tr>
          ) : (
            currentItems.map((reception) => (
              <tr key={reception.id_reception}>
                <td><span className="rc-num">{reception.numero_reception}</span></td>
                <td>{formatDate(reception.date_reception)}</td>
                <td>
                  <span className="rc-with-icon">
                    <Building size={14} />
                    {reception.fournisseur_nom || '-'}
                  </span>
                </td>
                <td>{reception.numero_commande || '-'}</td>
                <td className="is-num"><strong>{formatMontant(reception.montant_total)}</strong></td>
                <td className="is-num">{reception.lignes?.length || 0}</td>
                <td>{renderStatut(reception.statut)}</td>
                <td className="is-end">
                  <div className="rc-row-actions">{renderRowActions(reception)}</div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderGridView = () => (
    <div className="rc-grid">
      {currentItems.length === 0 ? (
        <div className="rc-empty rc-empty--wide">
          <Package size={40} />
          <p>Aucune réception trouvée</p>
        </div>
      ) : (
        currentItems.map((reception) => (
          <article key={reception.id_reception} className="rc-card" data-statut={reception.statut}>
            <header className="rc-card-head">
              <div>
                <span className="rc-num">{reception.numero_reception}</span>
                <span className="rc-card-date">
                  <Calendar size={13} />
                  {formatDate(reception.date_reception)}
                </span>
              </div>
              <div className="rc-row-actions">{renderRowActions(reception)}</div>
            </header>
            <div className="rc-card-body">
              <span className="rc-with-icon rc-card-supplier">
                <Building size={15} />
                {reception.fournisseur_nom || 'Sans fournisseur'}
              </span>
              {reception.numero_commande && (
                <span className="rc-with-icon rc-muted">
                  <FileText size={14} />
                  {reception.numero_commande}
                </span>
              )}
              <span className="rc-card-amount">{formatMontant(reception.montant_total)}</span>
            </div>
            <footer className="rc-card-foot">
              <span className="rc-with-icon rc-muted">
                <Package size={14} />
                {reception.lignes?.length || 0} produit(s)
              </span>
              {renderStatut(reception.statut)}
            </footer>
          </article>
        ))
      )}
    </div>
  );

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  const statItems = [
    { key: 'total', label: 'Total', value: stats.total },
    { key: 'en-attente', label: 'En attente', value: stats.enAttente },
    { key: 'partielle', label: 'Partielles', value: stats.partielle },
    { key: 'complete', label: 'Complètes', value: stats.complete },
    { key: 'annulee', label: 'Annulées', value: stats.annulee },
  ];

  return (
    <div className="rc-page">
      {toastMessage && (
        <div className="rc-toast" role="status">
          <CheckCircle size={18} />
          {toastMessage}
        </div>
      )}

      {/* EN-TÊTE */}
      <div className="rc-header">
        <div>
          <h1 className="rc-title">Réceptions de stock</h1>
          <p className="rc-subtitle">
            {stats.total} réception(s) · {commandesDisponibles.length} commande(s) en attente de livraison
          </p>
        </div>
        <div className="rc-header-actions">
          <button
            className="rc-btn rc-btn--ghost rc-btn--icon"
            onClick={() => { loadReceptions(); loadCommandesDisponibles(); }}
            title="Rafraîchir"
            aria-label="Rafraîchir"
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? 'rc-spin' : ''} />
          </button>
          <button className="rc-btn rc-btn--outline" onClick={handleExport}>
            <Download size={17} />
            Exporter
          </button>
          {canManage && (
            <button className="rc-btn rc-btn--primary" onClick={handleAdd}>
              <Plus size={17} />
              Nouvelle réception
            </button>
          )}
        </div>
      </div>

      {/* BANDEAU DE CHIFFRES */}
      <div className="rc-stats">
        {statItems.map((s) => (
          <div key={s.key} className={`rc-stat rc-stat--${s.key}`}>
            <span className="rc-stat-label">{s.label}</span>
            <span className="rc-stat-value">{s.value}</span>
          </div>
        ))}
        <div className="rc-stat rc-stat--montant">
          <span className="rc-stat-label">Montant total</span>
          <span className="rc-stat-value">{formatMontant(stats.totalMontant)}</span>
        </div>
      </div>

      {/* BARRE D'OUTILS */}
      <div className="rc-toolbar">
        <div className="rc-search">
          <Search size={17} className="rc-search-icon" />
          <input
            type="text"
            placeholder="Rechercher une réception, un fournisseur, une commande"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="rc-search-clear" onClick={() => setSearchTerm('')} aria-label="Effacer la recherche">
              <X size={15} />
            </button>
          )}
        </div>
        <select
          className="rc-select"
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="partielle">Partielle</option>
          <option value="complete">Complète</option>
          <option value="annulee">Annulée</option>
        </select>
        <div className="rc-view-toggle" role="group" aria-label="Mode d'affichage">
          <button
            className={viewMode === 'grid' ? 'is-active' : ''}
            onClick={() => setViewMode('grid')}
            title="Vue grille"
            aria-label="Vue grille"
          >
            <Grid size={17} />
          </button>
          <button
            className={viewMode === 'list' ? 'is-active' : ''}
            onClick={() => setViewMode('list')}
            title="Vue liste"
            aria-label="Vue liste"
          >
            <List size={17} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="rc-loading">
          <div className="rc-spinner" />
          <p>Chargement en cours</p>
        </div>
      )}

      {error && !loading && !showModal && (
        <div className="rc-error">
          <AlertTriangle size={18} />
          <p>{error}</p>
          <button className="rc-btn rc-btn--outline rc-btn--sm" onClick={loadReceptions}>
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && (viewMode === 'grid' ? renderGridView() : renderListView())}

      {!loading && !error && filteredReceptions.length > itemsPerPage && (
        <div className="rc-pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            aria-label="Page précédente"
          >
            <ChevronLeft size={17} />
          </button>
          <span>Page {currentPage} sur {totalPages}</span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            aria-label="Page suivante"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      )}

      {/* PANNEAU NOUVELLE RÉCEPTION */}
      {showModal && (
        <div className="rc-overlay rc-overlay--sheet">
          <div className="rc-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="rc-sheet-head">
              <div>
                <h2>Nouvelle réception</h2>
                <p>Enregistrez la livraison d'une commande fournisseur</p>
              </div>
              <button className="rc-icon-btn" onClick={() => !saving && setShowModal(false)} aria-label="Fermer">
                <X size={20} />
              </button>
            </div>

            <div className="rc-sheet-body">
              {error && (
                <div className="rc-alert">
                  <AlertTriangle size={17} />
                  <p>{error}</p>
                </div>
              )}

              <section className="rc-section">
                <div className="rc-section-head">
                  <h3>Choisir la commande</h3>
                  <span className="rc-chip">{commandesDisponibles.length} disponible(s)</span>
                </div>
                {renderCommandePicker()}
              </section>

              {formData.id_commande_achat && commandeSelectionnee && (
                <section className="rc-section">
                  <div className="rc-section-head">
                    <h3>Produits reçus</h3>
                    <span className="rc-chip">
                      {formData.lignes.filter(l => l.valide).length} / {formData.lignes.length} validés
                    </span>
                  </div>
                  {renderLignesReception()}
                </section>
              )}
            </div>

            <div className="rc-sheet-foot">
              <button
                className="rc-btn rc-btn--ghost"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                className="rc-btn rc-btn--primary"
                onClick={handleSave}
                disabled={
                  saving ||
                  !formData.id_commande_achat ||
                  formData.lignes.filter(l => l.valide).length === 0
                }
              >
                {saving ? (
                  <>
                    <span className="rc-spinner rc-spinner--sm rc-spinner--light" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check size={17} />
                    Enregistrer la réception
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANNEAU DÉTAILS */}
      {showDetailModal && selectedReception && (
        <div className="rc-overlay rc-overlay--sheet" onClick={() => setShowDetailModal(false)}>
          <div className="rc-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="rc-sheet-head">
              <div>
                <h2>{selectedReception.numero_reception}</h2>
                <p>
                  <Calendar size={13} /> {formatDate(selectedReception.date_reception)}
                </p>
              </div>
              <div className="rc-sheet-head-end">
                {renderStatut(selectedReception.statut)}
                <button className="rc-icon-btn" onClick={() => setShowDetailModal(false)} aria-label="Fermer">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="rc-sheet-body">
              <div className="rc-detail-grid">
                <div className="rc-detail-block">
                  <h3><Building size={15} /> Fournisseur</h3>
                  <dl>
                    <div><dt>Nom</dt><dd>{selectedReception.fournisseur_nom || '-'}</dd></div>
                    <div><dt>Téléphone</dt><dd>{selectedReception.fournisseur_telephone || '-'}</dd></div>
                  </dl>
                </div>
                <div className="rc-detail-block">
                  <h3><FileText size={15} /> Informations</h3>
                  <dl>
                    <div><dt>Commande</dt><dd>{selectedReception.numero_commande || 'Sans commande'}</dd></div>
                    <div><dt>Créé par</dt><dd>{selectedReception.utilisateur_nom || '-'}</dd></div>
                    <div>
                      <dt>Montant total</dt>
                      <dd className="rc-detail-total">{formatMontant(selectedReception.montant_total)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {selectedReception.lignes && selectedReception.lignes.length > 0 && (
                <section className="rc-section">
                  <div className="rc-section-head">
                    <h3>Produits reçus</h3>
                    <span className="rc-chip">{selectedReception.lignes.length} ligne(s)</span>
                  </div>
                  <div className="rc-lines">
                    <div className="rc-scroll">
                      <table className="rc-detail-table">
                        <thead>
                          <tr>
                            <th>Produit</th>
                            <th>Unité</th>
                            <th>Commandé</th>
                            <th>Reçu</th>
                            <th>Écart</th>
                            <th>Prix unit.</th>
                            <th>État</th>
                            <th>Lot</th>
                            <th>Péremption</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReception.lignes.map((ligne, index) => {
                            const qteBase = parseFloat(ligne.quantite_base) || 1;
                            const prixUV = ligne.prix_achat_unite_vente !== null
                              ? parseFloat(ligne.prix_achat_unite_vente) : null;
                            const ecart = parseFloat(ligne.ecart) || 0;
                            const uniteLabel = ligne.nom_unite_vente || 'Unité';

                            return (
                              <tr key={index}>
                                <td><strong>{ligne.produit_nom}</strong></td>
                                <td>
                                  {uniteLabel}
                                  {qteBase > 1 && <small className="rc-muted"> ×{qteBase}</small>}
                                </td>
                                <td>{ligne.quantite_commandee || 0}</td>
                                <td className="rc-received">{ligne.quantite_recue}</td>
                                <td>{renderEcart(ecart, uniteLabel)}</td>
                                <td>
                                  {prixUV !== null
                                    ? formatMontant(prixUV)
                                    : <em className="rc-muted">À définir</em>}
                                </td>
                                <td>
                                  <span className={`rc-etat etat-${ligne.etat_marchandise || 'bon'}`}>
                                    {ligne.etat_marchandise || 'bon'}
                                  </span>
                                </td>
                                <td>{ligne.num_lot || '-'}</td>
                                <td>{ligne.date_peremption ? formatDate(ligne.date_peremption) : '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <div className="rc-sheet-foot">
              <button className="rc-btn rc-btn--outline" onClick={() => setShowDetailModal(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {showDeleteModal && (
        <div className="rc-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="rc-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="rc-dialog-icon">
              <Trash2 size={24} />
            </div>
            <h2>Supprimer cette réception ?</h2>
            <p className="rc-dialog-name">{receptionToDelete?.numero_reception}</p>
            <p className="rc-dialog-meta">
              {receptionToDelete?.fournisseur_nom || 'Sans fournisseur'} · {formatDate(receptionToDelete?.date_reception)}
            </p>
            <p className="rc-dialog-warning">Cette action est irréversible.</p>
            <div className="rc-dialog-actions">
              <button className="rc-btn rc-btn--ghost" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Annuler
              </button>
              <button className="rc-btn rc-btn--danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <>
                    <span className="rc-spinner rc-spinner--sm rc-spinner--light" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMATION GÉNÉRIQUE */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        details={confirmModal.details}
        type={confirmModal.type}
        confirmLabel={confirmModal.confirmLabel}
        loading={saving}
      />
    </div>
  );
};

export default Receptions;