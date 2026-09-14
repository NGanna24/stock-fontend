// pages/Receptions/Receptions.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Check,
  RefreshCw,
  Grid,
  List,
  Package,
  Banknote,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Ban,
  FileText,
  Building,
  Truck,
  ClipboardList,
  CheckSquare,
  Square,
  AlertTriangle,
  Trash2,
  ShoppingBag,
  Box,
  CheckCheck,
  Info
} from "lucide-react";
import ReceptionService from "../../../services/receptionService";
import CommandeAchatService from "../../../services/commandeAchatService";
import FournisseurService from "../../../services/fournisseurService";
import ProduitService from "../../../services/produitService";
import { useUser } from "../../../context/AuthContext";
import "./Receptions.css";

const Receptions = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem('token');

  // États principaux
  const [receptions, setReceptions] = useState([]);
  const [commandesDisponibles, setCommandesDisponibles] = useState([]);
  const [commandesFiltrees, setCommandesFiltrees] = useState([]);
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

  // États pour les modals
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReception, setSelectedReception] = useState(null);
  const [receptionToDelete, setReceptionToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatut, setUpdatingStatut] = useState(null);

  // État du formulaire de réception
  const [formData, setFormData] = useState({
    id_commande_achat: "",
    lignes: []
  });

  // État pour suivre si toutes les lignes sont validées
  const [toutValide, setToutValide] = useState(false);
  const [commandeSelectionnee, setCommandeSelectionnee] = useState(null);

  // Ref pour le toast
  const toastTimeoutRef = useRef(null);

  // Vérifier les permissions
  const canManage = user && ['admin', 'manager'].includes(user.role);

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================

  useEffect(() => {
    if (isAuthenticated && token) {
      loadReceptions();
      loadCommandesDisponibles();
      loadFournisseurs();
      loadAllProduits();
    }
  }, [isAuthenticated, token]);

  // Nettoyer le toast
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Afficher un toast de succès
  const showToast = (message) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Charger les réceptions
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

  // Charger UNIQUEMENT les commandes en attente
  const loadCommandesDisponibles = async () => {
    setLoadingCommandes(true);
    try {
      const [responseEnAttente, responsePartiel] = await Promise.all([
        CommandeAchatService.getCommandesByStatut(token, 'en_attente'),
        CommandeAchatService.getCommandesByStatut(token, 'partiellement_recue')
      ]);

      let commandesList = [];
      if (responseEnAttente.success) {
        commandesList = [...commandesList, ...responseEnAttente.data];
      }
      if (responsePartiel.success) {
        commandesList = [...commandesList, ...responsePartiel.data];
      }

      commandesList.sort((a, b) => new Date(b.date_commande) - new Date(a.date_commande));

      setCommandesDisponibles(commandesList);
      setCommandesFiltrees(commandesList);
    } catch (error) {
      console.error('❌ LoadCommandesDisponibles error:', error);
    } finally {
      setLoadingCommandes(false);
    }
  };

  const loadFournisseurs = async () => {
    try {
      const response = await FournisseurService.getActiveFournisseurs(token);
      if (response.success) {
        setFournisseurs(response.data || []);
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

  // ============================================================
  // GESTION DU FORMULAIRE
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

  // ✅ CORRIGÉ : Charger les détails d'une commande AVEC les infos d'unité
  const chargerDetailsCommande = async (idCommande) => {
    setLoading(true);
    try {
      const response = await CommandeAchatService.getCommandeById(token, idCommande);
      if (response.success && response.data) {
        const commande = response.data;

        // ✅ Construire les lignes de réception avec TOUS les champs d'unité
        const lignesReception = (commande.lignes || []).map(l => {
          const qteBase = parseFloat(l.quantite_base) || 1;
          const quantiteCommandee = parseFloat(l.quantite) || 0;
          const prixAchatUV = l.prix_achat !== null && l.prix_achat !== undefined
            ? parseFloat(l.prix_achat)
            : null;

          return {
            id_produit: l.id_produit,
            id_ligne_achat: l.id_ligne_achat || null,
            produit_nom: l.produit_nom || 'Produit inconnu',
            produit_reference: l.reference || '',

            // ✅ Infos d'unité de vente
            id_unite_vente: l.id_unite_vente || null,
            nom_unite_vente: l.nom_unite_vente || l.unite_vente_nom || 'Unité',
            quantite_base: qteBase,

            // Quantités
            quantite_commandee: quantiteCommandee,
            quantite_totale_base_commandee: quantiteCommandee * qteBase,
            quantite_recue: quantiteCommandee,
            quantite_totale_base: quantiteCommandee * qteBase,
            ecart: 0,

            // ✅ Prix d'achat (saisi ou null)
            prix_achat_unite_vente: prixAchatUV,

            // Autres
            unite: l.nom_unite_vente || l.unite_symbole || '',
            valide: true,
            etat_marchandise: 'bon',
            num_lot: '',
            date_peremption: '',
            notes: ''
          };
        });

        setFormData(prev => ({
          ...prev,
          lignes: lignesReception
        }));

        const toutesValides = lignesReception.every(l => l.valide === true);
        setToutValide(toutesValides);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des détails:', error);
      setError('Impossible de charger les détails de la commande');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // ✅ CORRIGÉ : Basculer la validation d'une ligne
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

    const toutesValides = nouvellesLignes.every(l => l.valide === true);
    setToutValide(toutesValides);
  };

  // ✅ CORRIGÉ : Valider TOUTES les lignes
  const validerTout = () => {
    const nouvellesLignes = formData.lignes.map(l => {
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

  // ✅ CORRIGÉ : Désélectionner toutes les lignes
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

  // ✅ CORRIGÉ : Modifier la quantité reçue + recalculer quantite_totale_base
  const handleQuantiteRecueChange = (index, value) => {
    const nouvellesLignes = [...formData.lignes];
    const qteRecue = parseFloat(value) || 0;
    const qteCommandee = nouvellesLignes[index].quantite_commandee || 0;
    const qteBase = nouvellesLignes[index].quantite_base || 1;

    nouvellesLignes[index].quantite_recue = qteRecue;
    nouvellesLignes[index].quantite_totale_base = qteRecue * qteBase;
    nouvellesLignes[index].ecart = qteCommandee - qteRecue;

    if (qteRecue < qteCommandee) {
      nouvellesLignes[index].valide = false;
    } else if (qteRecue === qteCommandee) {
      nouvellesLignes[index].valide = true;
    }

    setFormData({ ...formData, lignes: nouvellesLignes });

    const toutesValides = nouvellesLignes.every(l => l.valide === true);
    setToutValide(toutesValides);
  };

  // ✅ NOUVEAU : Modifier le prix d'achat unitaire
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

  const handleLotChange = (index, value) => {
    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes[index].num_lot = value;
    setFormData({ ...formData, lignes: nouvellesLignes });
  };

  const handlePeremptionChange = (index, value) => {
    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes[index].date_peremption = value;
    setFormData({ ...formData, lignes: nouvellesLignes });
  };

  // ============================================================
  // ACTIONS CRUD
  // ============================================================

  const handleAdd = () => {
    setFormData({
      id_commande_achat: "",
      lignes: []
    });
    setToutValide(false);
    setCommandeSelectionnee(null);
    setError(null);
    setShowModal(true);
  };

  const handleView = (reception) => {
    setSelectedReception(reception);
    setShowDetailModal(true);
  };

  // ✅ CORRIGÉ : Enregistrer la réception avec TOUS les champs
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

    setSaving(true);
    setError(null);

    try {
      const data = {
        id_commande_achat: parseInt(formData.id_commande_achat),
        date_reception: new Date().toISOString().split('T')[0],
        notes: null,
        lignes: lignesValidees.map(l => {
          const qteBase = l.quantite_base || 1;
          const qteRecue = parseFloat(l.quantite_recue) || 0;
          const quantiteTotaleBase = qteRecue * qteBase;

          // ✅ Prix d'achat : null si non saisi
          let prixAchatUV = null;
          if (
            l.prix_achat_unite_vente !== null &&
            l.prix_achat_unite_vente !== undefined &&
            l.prix_achat_unite_vente !== ''
          ) {
            const parsed = parseFloat(l.prix_achat_unite_vente);
            if (!isNaN(parsed) && parsed > 0) {
              prixAchatUV = parsed;
            }
          }

          return {
            id_produit: l.id_produit,
            id_ligne_achat: l.id_ligne_achat || null,

            // ✅ Infos d'unité de vente
            id_unite_vente: l.id_unite_vente || null,
            nom_unite_vente: l.nom_unite_vente || 'Unité',
            quantite_base: qteBase,
            quantite_totale_base: quantiteTotaleBase,

            // Quantités
            quantite_commandee: l.quantite_commandee || 0,
            quantite_recue: qteRecue,

            // ✅ Prix d'achat (optionnel)
            prix_achat_unite_vente: prixAchatUV,

            // Autres
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
        setFormData({
          id_commande_achat: "",
          lignes: []
        });
        setToutValide(false);
        setCommandeSelectionnee(null);
        showToast('✅ Réception enregistrée avec succès !');
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
        showToast('🗑️ Réception supprimée avec succès');
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
        showToast('✅ Statut mis à jour avec succès');
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
          r.id,
          r.numero,
          r.date,
          r.fournisseur,
          r.commande,
          formatMontant(r.montant),
          r.statut,
          r.notes || ""
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
        showToast('📊 Exportation terminée');
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
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
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
        ? parseFloat(r.montant_total)
        : 0;
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

  // ============================================================
  // RENDU
  // ============================================================

  const renderStatut = (statut) => {
    const configs = {
      'en_attente': { label: 'En attente', className: 'status-en-attente', icon: Clock },
      'partielle': { label: 'Partielle', className: 'status-partiel', icon: AlertCircle },
      'complete': { label: 'Complète', className: 'status-recue', icon: CheckCircle },
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

  // ✅ CORRIGÉ : Tableau de réception avec prix d'achat
  const renderLignesReception = () => {
    if (formData.lignes.length === 0) {
      return (
        <div className="empty-lignes">
          <ClipboardList size={40} />
          <p>Aucun produit dans cette commande</p>
          <small>Sélectionnez une commande pour afficher les produits à recevoir</small>
        </div>
      );
    }

    const lignesValides = formData.lignes.filter(l => l.valide === true).length;
    const totalLignes = formData.lignes.length;
    const pourcentage = totalLignes > 0 ? Math.round((lignesValides / totalLignes) * 100) : 0;

    return (
      <div className="lignes-reception-container">
        <div className="lignes-reception-header">
          <div className="lignes-info">
            <span className="lignes-count">
              <Package size={16} />
              {totalLignes} produit(s) à recevoir
            </span>
            <span className={`lignes-status ${toutValide ? 'status-ok' : 'status-warning'}`}>
              {toutValide ? (
                <><CheckCircle size={14} /> Tous validés</>
              ) : (
                <><AlertCircle size={14} /> {lignesValides} validé(s)</>
              )}
            </span>
            <div className="validation-progress">
              <span style={{ fontSize: '12px', color: '#64748b' }}>{pourcentage}%</span>
              <div className="validation-progress-bar">
                <div className="fill" style={{ width: `${pourcentage}%` }} />
              </div>
            </div>
          </div>
          <div className="lignes-actions-buttons">
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={validerTout}
              disabled={saving || formData.lignes.length === 0 || toutValide}
            >
              <CheckSquare size={16} />
              Valider tout
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={deselectionnerTout}
              disabled={saving || formData.lignes.length === 0 || lignesValides === 0}
            >
              <Square size={16} />
              Tout désélectionner
            </button>
          </div>
        </div>

        <div className="lignes-table-wrapper">
          <table className="lignes-reception-table">
            <thead>
              <tr>
                <th style={{ width: '4%' }}>✅</th>
                <th style={{ width: '16%' }}>Produit</th>
                <th style={{ width: '9%' }}>Unité</th>
                <th style={{ width: '8%' }}>Commandé</th>
                <th style={{ width: '9%' }}>Reçu</th>
                <th style={{ width: '7%' }}>Écart</th>
                <th style={{ width: '11%' }}>Prix d'achat *</th>
                <th style={{ width: '10%' }}>État</th>
                <th style={{ width: '8%' }}>Lot</th>
                <th style={{ width: '9%' }}>Péremption</th>
                <th style={{ width: '9%' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {formData.lignes.map((ligne, index) => {
                const estValide = ligne.valide === true;
                const aEcart = ligne.ecart > 0;
                const qteBase = ligne.quantite_base || 1;
                const qteRecue = ligne.quantite_recue || 0;
                const qteTotaleBase = qteRecue * qteBase;
                const prixUV = parseFloat(ligne.prix_achat_unite_vente) || 0;
                const prixBase = prixUV > 0 ? prixUV / qteBase : 0;

                return (
                  <tr key={index} className={estValide ? 'ligne-valide' : 'ligne-invalide'}>
                    <td>
                      <button
                        type="button"
                        className="btn-check-ligne"
                        onClick={() => toggleValiderLigne(index)}
                        disabled={saving}
                        data-tooltip={estValide ? 'Désélectionner' : 'Valider cette ligne'}
                      >
                        {estValide ? <CheckSquare size={20} color="#10b981" /> : <Square size={20} color="#9ca3af" />}
                      </button>
                    </td>
                    <td>
                      <div className="produit-cell">
                        <strong>{ligne.produit_nom}</strong>
                        {ligne.produit_reference && (
                          <span className="ref-label"> ({ligne.produit_reference})</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="unite-badge">
                        <Box size={12} />
                        {ligne.nom_unite_vente}
                        {qteBase > 1 && <small> (×{qteBase})</small>}
                      </span>
                    </td>
                    <td className="quantite-commandee">{ligne.quantite_commandee}</td>
                    <td>
                      <input
                        type="number"
                        value={ligne.quantite_recue || ''}
                        onChange={(e) => handleQuantiteRecueChange(index, e.target.value)}
                        className={`form-input-number ${!estValide ? 'input-invalide' : ''}`}
                        min="0"
                        step="1"
                        disabled={saving}
                        placeholder="0"
                      />
                      {qteBase > 1 && qteRecue > 0 && (
                        <small className="unite-base-info">
                          = {qteTotaleBase} unités
                        </small>
                      )}
                    </td>
                    <td className={aEcart ? 'ecart-positif' : 'ecart-zero'}>
                      {aEcart ? `-${ligne.ecart}` : ligne.ecart === 0 ? '✓' : '+' + Math.abs(ligne.ecart)}
                    </td>
                    <td>
                      <input
                        type="number"
                        value={ligne.prix_achat_unite_vente ?? ''}
                        onChange={(e) => handlePrixAchatChange(index, e.target.value)}
                        className="form-input-small"
                        placeholder="À définir"
                        min="0"
                        step="0.01"
                        disabled={saving}
                      />
                      {prixUV > 0 && qteBase > 1 && (
                        <small className="prix-base-info">
                          = {formatMontant(prixBase)} / unité
                        </small>
                      )}
                    </td>
                    <td>
                      <select
                        value={ligne.etat_marchandise || 'bon'}
                        onChange={(e) => handleEtatChange(index, e.target.value)}
                        className="form-select-small"
                        disabled={saving}
                      >
                        <option value="bon">Bon</option>
                        <option value="endommager">Endommagé</option>
                        <option value="manquant">Manquant</option>
                        <option value="partiel">Partiel</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={ligne.num_lot || ''}
                        onChange={(e) => handleLotChange(index, e.target.value)}
                        className="form-input-small"
                        placeholder="Lot"
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={ligne.date_peremption || ''}
                        onChange={(e) => handlePeremptionChange(index, e.target.value)}
                        className="form-input-small"
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={ligne.notes || ''}
                        onChange={(e) => {
                          const nouvellesLignes = [...formData.lignes];
                          nouvellesLignes[index].notes = e.target.value;
                          setFormData({ ...formData, lignes: nouvellesLignes });
                        }}
                        className="form-input-small"
                        placeholder="Notes..."
                        disabled={saving}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="lignes-total-row">
                <td colSpan="11">
                  <div className="total-stats">
                    <div className="total-stats-left">
                      <span>
                        <strong>Lignes validées :</strong>
                        <span className="text-success"> {lignesValides}</span>
                        <span className="text-muted"> / {totalLignes}</span>
                      </span>
                      <span className="text-muted" style={{ fontSize: '13px' }}>
                        ({pourcentage}% complété)
                      </span>
                    </div>
                    <div className="total-stats-right">
                      {toutValide ? (
                        <span className="badge-success">
                          <CheckCircle size={16} /> Toutes les lignes sont validées
                        </span>
                      ) : (
                        <span className="badge-warning">
                          <AlertCircle size={16} /> Certaines lignes ne sont pas validées
                        </span>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const renderCommandeInfo = () => {
    if (!commandeSelectionnee) return null;

    return (
      <div className="commande-info-card">
        <div className="commande-info-grid">
          <div className="info-item">
            <span className="info-label">Commande</span>
            <span className="info-value">
              <FileText size={14} />
              {commandeSelectionnee.numero_commande}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Fournisseur</span>
            <span className="info-value">
              <Building size={14} />
              {commandeSelectionnee.fournisseur_nom}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Date commande</span>
            <span className="info-value">
              <Calendar size={14} />
              {new Date(commandeSelectionnee.date_commande).toLocaleDateString('fr-FR')}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Montant</span>
            <span className="info-value montant-highlight">
              <Banknote size={14} />
              {formatMontant(commandeSelectionnee.montant_total)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // VUES LISTE & GRILLE
  // ============================================================

  const renderListView = () => (
    <div className="receptions-table-container">
      <table className="receptions-table">
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Date</th>
            <th>Fournisseur</th>
            <th>Commande</th>
            <th>Montant</th>
            <th>Produits</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length === 0 ? (
            <tr>
              <td colSpan="8" className="empty-state">
                <Package size={32} className="empty-icon" />
                <p>Aucune réception trouvée</p>
              </td>
            </tr>
          ) : (
            currentItems.map((reception) => (
              <tr key={reception.id_reception}>
                <td className="numero-cell">
                  <span className="reception-numero">{reception.numero_reception}</span>
                </td>
                <td>{new Date(reception.date_reception).toLocaleDateString('fr-FR')}</td>
                <td className="fournisseur-cell">
                  <Building size={14} />
                  <span>{reception.fournisseur_nom || '-'}</span>
                </td>
                <td>{reception.numero_commande || '-'}</td>
                <td className="montant-cell">
                  <strong>{formatMontant(reception.montant_total)}</strong>
                </td>
                <td>{reception.lignes?.length || 0}</td>
                <td>{renderStatut(reception.statut)}</td>
                <td className="actions-cell">
                  <button
                    className="action-btn btn-view"
                    onClick={() => handleView(reception)}
                    data-tooltip="Voir les détails"
                  >
                    <Eye size={16} />
                  </button>
                  {canManage && reception.statut === 'en_attente' && (
                    <button
                      className="action-btn btn-success"
                      onClick={() => handleChangeStatut(reception.id_reception, 'complete')}
                      disabled={updatingStatut === reception.id_reception}
                      data-tooltip="Valider la réception"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  {canManage && reception.statut !== 'complete' && reception.statut !== 'annulee' && (
                    <button
                      className="action-btn btn-delete"
                      onClick={() => confirmDelete(reception)}
                      data-tooltip="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderGridView = () => (
    <div className="receptions-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state">
          <Package size={48} className="empty-icon" />
          <p>Aucune réception trouvée</p>
        </div>
      ) : (
        currentItems.map((reception) => (
          <div key={reception.id_reception} className="reception-card">
            <div className="reception-card-header">
              <div className="reception-info">
                <span className="reception-numero">{reception.numero_reception}</span>
                <span className="reception-date">
                  <Calendar size={14} />
                  {new Date(reception.date_reception).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="reception-actions">
                <button
                  className="action-btn btn-view"
                  onClick={() => handleView(reception)}
                  data-tooltip="Voir les détails"
                >
                  <Eye size={16} />
                </button>
                {canManage && reception.statut === 'en_attente' && (
                  <button
                    className="action-btn btn-success"
                    onClick={() => handleChangeStatut(reception.id_reception, 'complete')}
                    disabled={updatingStatut === reception.id_reception}
                    data-tooltip="Valider la réception"
                  >
                    <Check size={16} />
                  </button>
                )}
                {canManage && reception.statut !== 'complete' && reception.statut !== 'annulee' && (
                  <button
                    className="action-btn btn-delete"
                    onClick={() => confirmDelete(reception)}
                    data-tooltip="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="reception-card-body">
              <div className="fournisseur-info">
                <Building size={16} />
                <span>{reception.fournisseur_nom || 'Sans fournisseur'}</span>
              </div>
              {reception.numero_commande && (
                <div className="commande-info">
                  <FileText size={14} />
                  <span>{reception.numero_commande}</span>
                </div>
              )}
              <div className="reception-montant">
                <Banknote size={16} />
                <span>{formatMontant(reception.montant_total)}</span>
              </div>
              <div className="reception-lignes-count">
                <Package size={14} />
                <span>{reception.lignes?.length || 0} produit(s)</span>
              </div>
            </div>
            <div className="reception-card-footer">
              {renderStatut(reception.statut)}
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
    <div className="receptions-container">
      {toastMessage && (
        <div className="toast-success">
          <CheckCircle size={20} />
          {toastMessage}
        </div>
      )}

      <div className="receptions-header">
        <div>
          <h1 className="receptions-title">📦 Réceptions de Stock</h1>
          <p className="receptions-subtitle">{stats.total} réceptions au total</p>
        </div>
        <div className="receptions-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              <span>Nouvelle Réception</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { loadReceptions(); loadCommandesDisponibles(); }}
            title="Rafraîchir"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      <div className="receptions-stats">
        <div className="stat-card">
          <div className="stat-icon total"><Truck size={20} /></div>
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
          <div className="stat-icon partielle"><AlertCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Partielles</span>
            <span className="stat-value">{stats.partielle}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon complete"><CheckCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Complètes</span>
            <span className="stat-value">{stats.complete}</span>
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
            <span className="stat-label">Total réceptions</span>
            <span className="stat-value">{formatMontant(stats.totalMontant)}</span>
          </div>
        </div>
      </div>

      <div className="receptions-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher une réception..."
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
            <option value="partielle">Partielle</option>
            <option value="complete">Complète</option>
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

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Chargement...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-secondary" onClick={loadReceptions}>
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {viewMode === 'grid' ? renderGridView() : renderListView()}
        </>
      )}

      {!loading && !error && filteredReceptions.length > itemsPerPage && (
        <div className="receptions-pagination">
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

      {/* MODAL NOUVELLE RÉCEPTION */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📦 Nouvelle Réception</h2>
              <button className="modal-close" onClick={() => !saving && setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              {error && (
                <div className="modal-error">
                  <AlertTriangle size={18} />
                  <p>{error}</p>
                </div>
              )}

              <div className="form-section">
                <div className="section-header">
                  <h4>
                    <ShoppingBag size={18} />
                    1. Sélectionner une commande
                  </h4>
                  <span className="section-badge">
                    {commandesDisponibles.length} commande(s) en attente
                  </span>
                </div>

                <div className="form-group">
                  <label>Commande d'achat *</label>
                  <select
                    name="id_commande_achat"
                    value={formData.id_commande_achat}
                    onChange={handleInputChange}
                    className="form-select"
                    disabled={saving || loadingCommandes}
                  >
                    <option value="">-- Sélectionner une commande --</option>
                    {commandesDisponibles.map(c => (
                      <option key={c.id_commande_achat} value={c.id_commande_achat}>
                        {c.numero_commande} - {c.fournisseur_nom}
                        ({new Date(c.date_commande).toLocaleDateString('fr-FR')})
                      </option>
                    ))}
                  </select>
                  {loadingCommandes && (
                    <div className="commande-loading-indicator">
                      <span className="spinner-small"></span>
                      Chargement des commandes...
                    </div>
                  )}
                  {commandesDisponibles.length === 0 && !loadingCommandes && (
                    <div className="commande-loading-indicator" style={{ color: '#f59e0b' }}>
                      <AlertCircle size={16} />
                      ⚠️ Aucune commande en attente de réception
                    </div>
                  )}
                </div>
              </div>

              {formData.id_commande_achat && commandeSelectionnee && (
                <div className="form-section">
                  <div className="section-header">
                    <h4>
                      <CheckCheck size={18} />
                      2. Valider les produits reçus
                    </h4>
                    <span className="section-badge">
                      {formData.lignes.filter(l => l.valide).length} / {formData.lignes.length} validés
                    </span>
                  </div>

                  {renderCommandeInfo()}
                  {renderLignesReception()}

                  <div className="info-message" style={{ marginTop: '16px' }}>
                    <Info size={18} />
                    <div>
                      <p><strong>💡 Prix d'achat optionnel</strong></p>
                      <small>
                        Vous pouvez saisir le prix d'achat réel facturé par le fournisseur.
                        Il sera automatiquement mis à jour sur l'unité et le produit.
                        Laissez vide si vous ne le connaissez pas encore.
                      </small>
                    </div>
                  </div>
                </div>
              )}

              {!formData.id_commande_achat && (
                <div className="info-message">
                  <Info size={24} />
                  <div>
                    <p><strong>En attente de sélection</strong></p>
                    <small>Sélectionnez une commande ci-dessus pour afficher la fiche de réception</small>
                  </div>
                </div>
              )}
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
                  !formData.id_commande_achat ||
                  formData.lignes.filter(l => l.valide).length === 0
                }
              >
                {saving ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Enregistrer la réception</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAILS */}
      {showDetailModal && selectedReception && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Détails de la réception</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-header-left">
                  <div className="detail-icon"><Truck size={28} /></div>
                  <div>
                    <h3 className="detail-numero">{selectedReception.numero_reception}</h3>
                    <span className="detail-date">
                      <Calendar size={14} />
                      {new Date(selectedReception.date_reception).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div className="detail-header-right">
                  {renderStatut(selectedReception.statut)}
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-section">
                  <h4><Building size={16} /> Fournisseur</h4>
                  <div className="detail-item">
                    <label>Nom</label>
                    <span>{selectedReception.fournisseur_nom || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone</label>
                    <span>{selectedReception.fournisseur_telephone || '-'}</span>
                  </div>
                </div>
                <div className="detail-section">
                  <h4><FileText size={16} /> Informations</h4>
                  <div className="detail-item">
                    <label>Commande</label>
                    <span>{selectedReception.numero_commande || 'Sans commande'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Créé par</label>
                    <span>{selectedReception.utilisateur_nom || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Montant total</label>
                    <span className="montant-total">{formatMontant(selectedReception.montant_total)}</span>
                  </div>
                  {selectedReception.notes && (
                    <div className="detail-item">
                      <label>Notes</label>
                      <span>{selectedReception.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedReception.lignes && selectedReception.lignes.length > 0 && (
                <div className="detail-lignes">
                  <h4>📦 Produits reçus</h4>
                  <div className="detail-lignes-wrapper">
                    <table className="detail-lignes-table">
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
                          return (
                            <tr key={index}>
                              <td>
                                <span className="produit-nom">{ligne.produit_nom}</span>
                              </td>
                              <td>
                                <span className="unite-badge">
                                  <Box size={12} />
                                  {ligne.nom_unite_vente || 'Unité'}
                                  {qteBase > 1 && <small> (×{qteBase})</small>}
                                </span>
                              </td>
                              <td>{ligne.quantite_commandee || 0}</td>
                              <td className="quantite-recue">
                                <strong>{ligne.quantite_recue}</strong>
                                {qteBase > 1 && (
                                  <small style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                                    = {ligne.quantite_totale_base} unités
                                  </small>
                                )}
                              </td>
                              <td className={ligne.ecart > 0 ? 'ecart-positif' : 'ecart-zero'}>
                                {ligne.ecart > 0 ? `-${ligne.ecart}` : ligne.ecart === 0 ? '✓' : '+' + Math.abs(ligne.ecart)}
                              </td>
                              <td>
                                {prixUV !== null
                                  ? formatMontant(prixUV)
                                  : <em style={{ color: '#94a3b8' }}>À définir</em>}
                              </td>
                              <td>
                                <span className={`etat-badge etat-${ligne.etat_marchandise || 'bon'}`}>
                                  {ligne.etat_marchandise || 'bon'}
                                </span>
                              </td>
                              <td>{ligne.num_lot || '-'}</td>
                              <td>{ligne.date_peremption ? new Date(ligne.date_peremption).toLocaleDateString('fr-FR') : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🗑️ Confirmer la suppression</h2>
              <button className="modal-close" onClick={() => !deleting && setShowDeleteModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-icon-wrapper">
                <AlertTriangle size={48} color="#ef4444" />
              </div>
              <p>Êtes-vous sûr de vouloir supprimer cette réception ?</p>
              <p className="delete-item-name">
                <strong>"{receptionToDelete?.numero_reception}"</strong>
              </p>
              <p className="delete-item-detail">
                Fournisseur : {receptionToDelete?.fournisseur_nom || 'Sans fournisseur'}
              </p>
              <p className="delete-item-detail">
                Date : {receptionToDelete?.date_reception}
              </p>
              <p className="delete-warning">
                ⚠️ Cette action est irréversible
              </p>
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
                    <Trash2 size={18} />
                    <span>Supprimer</span>
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

export default Receptions;