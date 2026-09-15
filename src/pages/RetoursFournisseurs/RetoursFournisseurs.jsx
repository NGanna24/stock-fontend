// pages/RetoursFournisseurs/RetoursFournisseurs.jsx - COMPLET CORRIGÉ
import React, { useState, useEffect } from "react";
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
  AlertTriangle,
  Trash2,
  Send,
  CheckCheck,
  RotateCcw,
  Box
} from "lucide-react";
import RetourFournisseurService from "../../services/retourFournisseur/retourFournisseurService";
import FournisseurService from "../../services/fournisseurService";
import CommandeAchatService from "../../services/commandeAchatService";
import ReceptionService from "../../services/receptionService";
import ProduitService from "../../services/produitService";
import { useUser } from "../../context/AuthContext";
import "./RetoursFournisseurs.css";
import RetourPDFActions from "../../components/RetourFournisseur/RetourPDFActions";

const RetoursFournisseurs = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem('token');

  // États principaux
  const [retours, setRetours] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [receptions, setReceptions] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState("list");
  const [error, setError] = useState(null);
  const [filterStatut, setFilterStatut] = useState("");
  const [filterMotif, setFilterMotif] = useState("");

  // États pour les modals
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRetour, setSelectedRetour] = useState(null);
  const [retourToDelete, setRetourToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatut, setUpdatingStatut] = useState(null);

  // État du formulaire
  const [formData, setFormData] = useState({
    id_fournisseur: "",
    id_commande_achat: "",
    id_reception: "",
    date_retour: "",
    motif_retour: "",
    notes: "",
    lignes: []
  });

  // État pour la ligne en cours d'ajout
  const [ligneForm, setLigneForm] = useState({
    id_produit: "",
    quantite: "",
    prix_achat: "",
    motif_retour: "",
    etat_produit: "neuf",
    notes: ""
  });

  // État pour les produits filtrés par fournisseur
  const [produitsFiltres, setProduitsFiltres] = useState([]);

  // Vérifier les permissions
  const canManage = user && ['admin', 'manager'].includes(user.role);

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================

  useEffect(() => {
    if (isAuthenticated && token) {
      loadRetours();
      loadFournisseurs();
      loadCommandes();
      loadReceptions();
      loadAllProduits();
    }
  }, [isAuthenticated, token]);

  // Charger les retours
  const loadRetours = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await RetourFournisseurService.getAllRetours(token);
      if (response.success) {
        setRetours(response.data || []);
      } else {
        setError(response.message || 'Erreur lors du chargement des retours');
      }
    } catch (error) {
      console.error('❌ LoadRetours error:', error);
      setError(error.message || 'Erreur lors du chargement des retours');
    } finally {
      setLoading(false);
    }
  };

  // Charger les fournisseurs
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

  // Charger les commandes
  const loadCommandes = async () => {
    try {
      const response = await CommandeAchatService.getAllCommandes(token);
      if (response.success) {
        setCommandes(response.data || []);
      }
    } catch (error) {
      console.error('❌ LoadCommandes error:', error);
    }
  };

  // Charger les réceptions
  const loadReceptions = async () => {
    try {
      const response = await ReceptionService.getAllReceptions(token);
      if (response.success) {
        setReceptions(response.data || []);
      }
    } catch (error) {
      console.error('❌ LoadReceptions error:', error);
    }
  };

  // Charger tous les produits
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

  // Filtrer les produits quand le fournisseur change
  useEffect(() => {
    if (formData.id_fournisseur) {
      const produitsDuFournisseur = produits.filter(p => {
        return p.id_fournisseur === parseInt(formData.id_fournisseur);
      });
      setProduitsFiltres(produitsDuFournisseur);
    } else {
      setProduitsFiltres([]);
    }
  }, [formData.id_fournisseur, produits]);

  // Gérer les changements du formulaire
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Gérer les changements de la ligne
  const handleLigneChange = (e) => {
    const { name, value } = e.target;
    setLigneForm({ ...ligneForm, [name]: value });
  };

  // Ajouter une ligne
  const addLigne = () => {
    if (!ligneForm.id_produit) {
      alert("Veuillez sélectionner un produit");
      return;
    }

    if (!ligneForm.quantite || parseFloat(ligneForm.quantite) <= 0) {
      alert("Veuillez saisir une quantité valide");
      return;
    }

    const produit = produits.find(p => p.id_produit === parseInt(ligneForm.id_produit));
    if (!produit) {
      alert("Produit non trouvé");
      return;
    }

    const stockDisponible = parseFloat(produit.quantite_stock) || 0;
    if (parseFloat(ligneForm.quantite) > stockDisponible) {
      alert(`Stock insuffisant ! Disponible: ${stockDisponible}`);
      return;
    }

    const nouvelleLigne = {
      id_produit: parseInt(ligneForm.id_produit),
      produit_nom: produit.nom,
      quantite: parseFloat(ligneForm.quantite),
      prix_achat: parseFloat(ligneForm.prix_achat) || parseFloat(produit.prix_achat) || 0,
      unite: produit.unite_symbole || '',
      motif_retour: ligneForm.motif_retour || formData.motif_retour || 'autre',
      etat_produit: ligneForm.etat_produit || 'neuf',
      notes: ligneForm.notes || '',
      id_ligne_achat: null
    };

    setFormData({
      ...formData,
      lignes: [...formData.lignes, nouvelleLigne]
    });

    setLigneForm({
      id_produit: "",
      quantite: "",
      prix_achat: "",
      motif_retour: "",
      etat_produit: "neuf",
      notes: ""
    });
  };

  // Supprimer une ligne
  const removeLigne = (index) => {
    const nouvellesLignes = [...formData.lignes];
    nouvellesLignes.splice(index, 1);
    setFormData({ ...formData, lignes: nouvellesLignes });
  };

  // ============================================================
  // ACTIONS CRUD
  // ============================================================

  const handleAdd = () => {
    setFormData({
      id_fournisseur: "",
      id_commande_achat: "",
      id_reception: "",
      date_retour: new Date().toISOString().split('T')[0],
      motif_retour: "",
      notes: "",
      lignes: []
    });
    setLigneForm({
      id_produit: "",
      quantite: "",
      prix_achat: "",
      motif_retour: "",
      etat_produit: "neuf",
      notes: ""
    });
    setProduitsFiltres([]);
    setShowModal(true);
  };

  // ✅ CORRECTION ICI - Récupérer les données complètes du retour
  const handleView = async (retour) => {
    setLoading(true);
    try {
      const response = await RetourFournisseurService.getRetourById(token, retour.id_retour);
      
      if (response.success && response.data) {
        console.log('✅ Données complètes chargées:', response.data);
        console.log('📦 Nombre de lignes:', response.data.lignes?.length || 0);
        setSelectedRetour(response.data);
        setShowDetailModal(true);
      } else {
        console.error('❌ Erreur: données incomplètes', response);
        alert('Erreur lors du chargement des détails du retour');
      }
    } catch (error) {
      console.error('❌ Error loading retour details:', error);
      alert('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  };

  // Enregistrer le retour
  const handleSave = async () => {
    if (!formData.id_fournisseur) {
      alert("Veuillez sélectionner un fournisseur");
      return;
    }

    if (!formData.date_retour) {
      alert("Veuillez sélectionner une date");
      return;
    }

    if (!formData.motif_retour) {
      alert("Veuillez sélectionner un motif de retour");
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
        id_fournisseur: parseInt(formData.id_fournisseur),
        id_commande_achat: formData.id_commande_achat ? parseInt(formData.id_commande_achat) : null,
        id_reception: formData.id_reception ? parseInt(formData.id_reception) : null,
        date_retour: formData.date_retour,
        motif_retour: formData.motif_retour,
        notes: formData.notes || null,
        lignes: formData.lignes.map(l => ({
          id_produit: l.id_produit,
          id_ligne_achat: l.id_ligne_achat || null,
          quantite: l.quantite,
          prix_achat: l.prix_achat || 0,
          remise: l.remise || 0,
          motif_retour: l.motif_retour || formData.motif_retour,
          etat_produit: l.etat_produit || 'neuf',
          notes: l.notes || null
        }))
      };

      const response = await RetourFournisseurService.createRetour(token, data);

      if (response.success) {
        await loadRetours();
        setShowModal(false);
        alert('✅ Retour fournisseur créé avec succès !');
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

  // Changer le statut
  const handleChangeStatut = async (id, statut) => {
    if (updatingStatut === id) return;
    setUpdatingStatut(id);
    setError(null);

    try {
      const response = await RetourFournisseurService.updateStatut(token, id, statut);
      if (response.success) {
        await loadRetours();
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

  // Annuler un retour
  const handleAnnuler = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler ce retour ?")) return;

    setUpdatingStatut(id);
    setError(null);

    try {
      const response = await RetourFournisseurService.annulerRetour(token, id);
      if (response.success) {
        await loadRetours();
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

  // Supprimer un retour
  const confirmDelete = (retour) => {
    setRetourToDelete(retour);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!retourToDelete) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await RetourFournisseurService.deleteRetour(
        token,
        retourToDelete.id_retour
      );

      if (response.success) {
        await loadRetours();
        setShowDeleteModal(false);
        setRetourToDelete(null);
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

  // Exporter
  const handleExport = async () => {
    try {
      const response = await RetourFournisseurService.exportRetours(token);
      if (response.success && response.data) {
        const headers = ["ID", "Numéro", "Date", "Fournisseur", "Commande", "Motif", "Montant", "Statut", "Notes"];
        const rows = response.data.map(r => [
          r.id,
          r.numero,
          r.date,
          r.fournisseur,
          r.commande,
          r.motif,
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
        link.download = `retours_fournisseurs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      alert('Erreur lors de l\'exportation');
    }
  };

  // ============================================================
  // FONCTIONS UTILITAIRES
  // ============================================================

  const formatMontant = (value) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(num)) return '0';
    return Math.round(num).toLocaleString('fr-FR') + ' FCFA';
  };

  const getMotifLabel = (motif) => {
    const motifs = {
      'defectueux': 'Défectueux',
      'non_conforme': 'Non conforme',
      'surplus': 'Surplus',
      'perime': 'Périmé',
      'autre': 'Autre'
    };
    return motifs[motif] || motif;
  };

  const getMotifBadge = (motif) => {
    const classes = {
      'defectueux': 'motif-defectueux',
      'non_conforme': 'motif-non_conforme',
      'surplus': 'motif-surplus',
      'perime': 'motif-perime',
      'autre': 'motif-autre'
    };
    return classes[motif] || 'motif-autre';
  };

  const getStats = () => {
    const total = retours.length;
    const enAttente = retours.filter(r => r.statut === 'en_attente').length;
    const envoye = retours.filter(r => r.statut === 'envoye').length;
    const recuParFournisseur = retours.filter(r => r.statut === 'recu_par_fournisseur').length;
    const traite = retours.filter(r => r.statut === 'traite').length;
    const annule = retours.filter(r => r.statut === 'annule').length;
    
    const totalMontant = retours.reduce((sum, r) => {
      const montant = r.montant_total !== undefined && r.montant_total !== null 
        ? parseFloat(r.montant_total) 
        : 0;
      return sum + (isNaN(montant) ? 0 : montant);
    }, 0);

    return { total, enAttente, envoye, recuParFournisseur, traite, annule, totalMontant };
  };

  const stats = getStats();

  // Filtrer les retours
  const filteredRetours = retours.filter((retour) => {
    const matchSearch = 
      retour.numero_retour?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retour.fournisseur_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retour.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatut = filterStatut ? retour.statut === filterStatut : true;
    const matchMotif = filterMotif ? retour.motif_retour === filterMotif : true;
    
    return matchSearch && matchStatut && matchMotif;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRetours.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRetours.length / itemsPerPage);

  // ============================================================
  // RENDU DES COMPOSANTS
  // ============================================================

  const renderStatut = (statut) => {
    const configs = {
      'en_attente': { label: 'En attente', className: 'status-en-attente', icon: Clock },
      'envoye': { label: 'Envoyé', className: 'status-envoye', icon: Send },
      'recu_par_fournisseur': { label: 'Reçu par fournisseur', className: 'status-recu-fournisseur', icon: CheckCircle },
      'traite': { label: 'Traité', className: 'status-traite', icon: CheckCheck },
      'annule': { label: 'Annulé', className: 'status-annule', icon: Ban }
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

  const renderMotif = (motif) => {
    return (
      <span className={`motif-badge ${getMotifBadge(motif)}`}>
        {getMotifLabel(motif)}
      </span>
    );
  };

  // Rendu du tableau des lignes dans le formulaire
  const renderLignesForm = () => {
    if (formData.lignes.length === 0) {
      return (
        <div className="empty-lignes">
          <Box size={32} />
          <p>Aucun produit ajouté</p>
          <small>Ajoutez des produits à retourner</small>
        </div>
      );
    }

    return (
      <div className="lignes-table-container">
        <table className="lignes-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Produit</th>
              <th style={{ width: '12%' }}>Quantité</th>
              <th style={{ width: '15%' }}>Prix unitaire</th>
              <th style={{ width: '15%' }}>Total</th>
              <th style={{ width: '15%' }}>Motif</th>
              <th style={{ width: '8%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {formData.lignes.map((ligne, index) => {
              const total = ligne.quantite * ligne.prix_achat;
              return (
                <tr key={index}>
                  <td>
                    <strong>{ligne.produit_nom}</strong>
                    {ligne.unite && <span className="unite-label"> ({ligne.unite})</span>}
                  </td>
                  <td>{ligne.quantite}</td>
                  <td>{formatMontant(ligne.prix_achat)}</td>
                  <td className="montant-cell">{formatMontant(total)}</td>
                  <td>{renderMotif(ligne.motif_retour || formData.motif_retour)}</td>
                  <td>
                    <button
                      className="btn-remove"
                      onClick={() => removeLigne(index)}
                      disabled={saving}
                      title="Supprimer"
                    >
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan="3"><strong>Total du retour</strong></td>
              <td>
                <strong>
                  {formatMontant(
                    formData.lignes.reduce((sum, l) => sum + (l.quantite * l.prix_achat), 0)
                  )}
                </strong>
              </td>
              <td colSpan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // ============================================================
  // RENDU DES VUES (LISTE & GRILLE)
  // ============================================================

  const renderListView = () => (
    <div className="retours-table-container">
      <table className="retours-table">
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Date</th>
            <th>Fournisseur</th>
            <th>Commande</th>
            <th>Motif</th>
            <th>Montant</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.length === 0 ? (
            <tr>
              <td colSpan="8" className="empty-state">
                <Package size={32} />
                <p>Aucun retour trouvé</p>
              </td>
            </tr>
          ) : (
            currentItems.map((retour) => (
              <tr key={retour.id_retour}>
                <td className="numero-cell">
                  <span className="retour-numero">{retour.numero_retour}</span>
                </td>
                <td>{new Date(retour.date_retour).toLocaleDateString('fr-FR')}</td>
                <td className="fournisseur-cell">
                  <Building size={14} />
                  <span>{retour.fournisseur_nom || '-'}</span>
                </td>
                <td>{retour.numero_commande || '-'}</td>
                <td>{renderMotif(retour.motif_retour)}</td>
                <td className="montant-cell">
                  <strong>{formatMontant(retour.montant_total)}</strong>
                </td>
                <td>{renderStatut(retour.statut)}</td>
                <td className="actions-cell">
                  <button
                    className="action-btn btn-view"
                    onClick={() => handleView(retour)}
                    title="Voir"
                  >
                    <Eye size={16} />
                  </button>
                  {canManage && retour.statut === 'en_attente' && (
                    <>
                      <button
                        className="action-btn btn-send"
                        onClick={() => handleChangeStatut(retour.id_retour, 'envoye')}
                        disabled={updatingStatut === retour.id_retour}
                        title="Envoyer au fournisseur"
                      >
                        <Send size={16} />
                      </button>
                      <button
                        className="action-btn btn-delete"
                        onClick={() => confirmDelete(retour)}
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  {canManage && retour.statut === 'envoye' && (
                    <button
                      className="action-btn btn-recu"
                      onClick={() => handleChangeStatut(retour.id_retour, 'recu_par_fournisseur')}
                      disabled={updatingStatut === retour.id_retour}
                      title="Marquer comme reçu par fournisseur"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  {canManage && retour.statut === 'recu_par_fournisseur' && (
                    <button
                      className="action-btn btn-traite"
                      onClick={() => handleChangeStatut(retour.id_retour, 'traite')}
                      disabled={updatingStatut === retour.id_retour}
                      title="Marquer comme traité"
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                  {canManage && ['en_attente', 'envoye'].includes(retour.statut) && (
                    <button
                      className="action-btn btn-annuler"
                      onClick={() => handleAnnuler(retour.id_retour)}
                      disabled={updatingStatut === retour.id_retour}
                      title="Annuler"
                    >
                      <Ban size={16} />
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
    <div className="retours-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state">
          <RotateCcw size={48} className="empty-icon" />
          <p>Aucun retour trouvé</p>
        </div>
      ) : (
        currentItems.map((retour) => (
          <div key={retour.id_retour} className="retour-card">
            <div className="retour-card-header">
              <div className="retour-info">
                <span className="retour-numero">{retour.numero_retour}</span>
                <span className="retour-date">
                  <Calendar size={14} />
                  {new Date(retour.date_retour).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="retour-actions">
                <button
                  className="action-btn btn-view"
                  onClick={() => handleView(retour)}
                  title="Voir"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
            <div className="retour-card-body">
              <div className="fournisseur-info">
                <Building size={16} />
                <span>{retour.fournisseur_nom || 'Sans fournisseur'}</span>
              </div>
              <div className="retour-motif">
                {renderMotif(retour.motif_retour)}
              </div>
              <div className="retour-montant">
                <Banknote size={16} />
                <span>{formatMontant(retour.montant_total)}</span>
              </div>
              <div className="retour-lignes-count">
                <Package size={14} />
                <span>{retour.lignes?.length || 0} produit(s)</span>
              </div>
            </div>
            <div className="retour-card-footer">
              {renderStatut(retour.statut)}
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
    <div className="retours-container">
      {/* En-tête */}
      <div className="retours-header">
        <div>
          <h1 className="retours-title">🔄 Retours Fournisseurs</h1>
          <p className="retours-subtitle">
            {stats.total} retours au total
          </p>
        </div>
        <div className="retours-actions">
          {canManage && (
            <button className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              <span>Nouveau Retour</span>
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={loadRetours} 
            title="Rafraîchir"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="retours-stats">
        <div className="stat-card">
          <div className="stat-icon total"><RotateCcw size={20} /></div>
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
          <div className="stat-icon envoye"><Send size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Envoyés</span>
            <span className="stat-value">{stats.envoye}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon recu-par-fournisseur"><CheckCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Reçus par fournisseur</span>
            <span className="stat-value">{stats.recuParFournisseur}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon traite"><CheckCheck size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Traités</span>
            <span className="stat-value">{stats.traite}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon annule"><Ban size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Annulés</span>
            <span className="stat-value">{stats.annule}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon montant"><Banknote size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Total retours</span>
            <span className="stat-value">{formatMontant(stats.totalMontant)}</span>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="retours-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher un retour..."
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
            <option value="envoye">Envoyé</option>
            <option value="recu_par_fournisseur">Reçu par fournisseur</option>
            <option value="traite">Traité</option>
            <option value="annule">Annulé</option>
          </select>
        </div>
        <div className="filter-group">
          <select
            className="filter-select"
            value={filterMotif}
            onChange={(e) => setFilterMotif(e.target.value)}
          >
            <option value="">Tous les motifs</option>
            <option value="defectueux">Défectueux</option>
            <option value="non_conforme">Non conforme</option>
            <option value="surplus">Surplus</option>
            <option value="perime">Périmé</option>
            <option value="autre">Autre</option>
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
          <p>Chargement des retours...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-secondary" onClick={loadRetours}>
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {viewMode === 'grid' ? renderGridView() : renderListView()}
        </>
      )}

      {/* Pagination */}
      {!loading && !error && filteredRetours.length > itemsPerPage && (
        <div className="retours-pagination">
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
          MODAL - NOUVEAU RETOUR
          ============================================================ */}
      {showModal && (
        <div className="modal-overlay" >
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouveau Retour Fournisseur</h2>
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

              {/* Section 1: Informations générales */}
              <div className="form-section">
                <div className="section-header">
                  <h4>
                    <FileText size={18} />
                    1. Informations générales
                  </h4>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Fournisseur *</label>
                    <select
                      name="id_fournisseur"
                      value={formData.id_fournisseur}
                      onChange={handleInputChange}
                      className="form-select"
                      disabled={saving}
                    >
                      <option value="">Sélectionner un fournisseur</option>
                      {fournisseurs.map(f => (
                        <option key={f.id_fournisseur} value={f.id_fournisseur}>
                          {f.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date de retour *</label>
                    <input
                      type="date"
                      name="date_retour"
                      value={formData.date_retour}
                      onChange={handleInputChange}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Commande associée (optionnel)</label>
                    <select
                      name="id_commande_achat"
                      value={formData.id_commande_achat}
                      onChange={handleInputChange}
                      className="form-select"
                      disabled={saving}
                    >
                      <option value="">Sans commande</option>
                      {commandes.map(c => (
                        <option key={c.id_commande_achat} value={c.id_commande_achat}>
                          {c.numero_commande} - {c.fournisseur_nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Réception associée (optionnel)</label>
                    <select
                      name="id_reception"
                      value={formData.id_reception}
                      onChange={handleInputChange}
                      className="form-select"
                      disabled={saving}
                    >
                      <option value="">Sans réception</option>
                      {receptions.map(r => (
                        <option key={r.id_reception} value={r.id_reception}>
                          {r.numero_reception} - {r.fournisseur_nom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Motif de retour *</label>
                    <select
                      name="motif_retour"
                      value={formData.motif_retour}
                      onChange={handleInputChange}
                      className="form-select"
                      disabled={saving}
                    >
                      <option value="">Sélectionner un motif</option>
                      <option value="defectueux">Défectueux</option>
                      <option value="non_conforme">Non conforme</option>
                      <option value="surplus">Surplus</option>
                      <option value="perime">Périmé</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <input
                      type="text"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Notes supplémentaires..."
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Produits */}
              <div className="form-section">
                <div className="section-header">
                  <h4>
                    <Package size={18} />
                    2. Produits à retourner
                  </h4>
                  <span className="section-badge">
                    {formData.lignes.length} produit(s)
                  </span>
                </div>

                {renderLignesForm()}

                <div className="add-ligne-section">
                  <p className="add-ligne-title">Ajouter un produit</p>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Produit *</label>
                      <select
                        value={ligneForm.id_produit}
                        onChange={(e) => setLigneForm({...ligneForm, id_produit: e.target.value})}
                        className="form-select"
                        disabled={saving || !formData.id_fournisseur}
                      >
                        <option value="">
                          {!formData.id_fournisseur 
                            ? "Sélectionnez d'abord un fournisseur"
                            : produitsFiltres.length === 0
                              ? "Aucun produit pour ce fournisseur"
                              : "Sélectionner un produit"}
                        </option>
                        {produitsFiltres.map(p => (
                          <option key={p.id_produit} value={p.id_produit}>
                            {p.nom} (Stock: {p.quantite_stock || 0} {p.unite_symbole || ''})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Quantité *</label>
                      <input
                        type="number"
                        value={ligneForm.quantite}
                        onChange={(e) => setLigneForm({...ligneForm, quantite: e.target.value})}
                        placeholder="Ex: 10"
                        disabled={saving || !formData.id_fournisseur}
                        min="1"
                        step="1"
                      />
                    </div>
                    <div className="form-group">
                      <label>Motif (spécifique)</label>
                      <select
                        value={ligneForm.motif_retour}
                        onChange={(e) => setLigneForm({...ligneForm, motif_retour: e.target.value})}
                        className="form-select"
                        disabled={saving}
                      >
                        <option value="">Même que le retour</option>
                        <option value="defectueux">Défectueux</option>
                        <option value="non_conforme">Non conforme</option>
                        <option value="surplus">Surplus</option>
                        <option value="perime">Périmé</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={addLigne}
                        disabled={saving || !formData.id_fournisseur || !ligneForm.id_produit || !ligneForm.quantite}
                      >
                        Ajouter
                      </button>
                    </div>
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
                disabled={saving || formData.lignes.length === 0}
              >
                {saving ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Créer le retour</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL - DÉTAILS
          ============================================================ */}
      {showDetailModal && selectedRetour && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Détails du retour</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-header-left">
                  <div className="detail-icon"><RotateCcw size={28} /></div>
                  <div>
                    <h3 className="detail-numero">{selectedRetour.numero_retour}</h3>
                    <span className="detail-date">
                      <Calendar size={14} />
                      {new Date(selectedRetour.date_retour).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div className="detail-header-right">
                  {renderStatut(selectedRetour.statut)}
                  {renderMotif(selectedRetour.motif_retour)}
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-section">
                  <h4><Building size={16} /> Fournisseur</h4>
                  <div className="detail-item">
                    <label>Nom</label>
                    <span>{selectedRetour.fournisseur_nom || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone</label>
                    <span>{selectedRetour.fournisseur_telephone || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <span>{selectedRetour.fournisseur_email || '-'}</span>
                  </div>
                </div>
                <div className="detail-section">
                  <h4><FileText size={16} /> Informations</h4>
                  <div className="detail-item">
                    <label>Commande</label>
                    <span>{selectedRetour.numero_commande || 'Sans commande'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Réception</label>
                    <span>{selectedRetour.numero_reception || 'Sans réception'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Créé par</label>
                    <span>{selectedRetour.utilisateur_nom || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Montant total</label>
                    <span className="montant-total">{formatMontant(selectedRetour.montant_total)}</span>
                  </div>
                  {selectedRetour.notes && (
                    <div className="detail-item">
                      <label>Notes</label>
                      <span>{selectedRetour.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedRetour.lignes && selectedRetour.lignes.length > 0 && (
                <div className="detail-lignes">
                  <h4>📦 Produits retournés ({selectedRetour.lignes.length})</h4>
                  <div className="detail-lignes-wrapper">
                    <table className="detail-lignes-table">
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Quantité</th>
                          <th>Prix unitaire</th>
                          <th>Total</th>
                          <th>Motif</th>
                          <th>État</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRetour.lignes.map((ligne, index) => (
                          <tr key={index}>
                            <td>
                              <span className="produit-nom">{ligne.produit_nom}</span>
                              {ligne.marque_nom && (
                                <span className="produit-marque"> - {ligne.marque_nom}</span>
                              )}
                              {ligne.modele_nom && (
                                <span className="produit-modele"> ({ligne.modele_nom})</span>
                              )}
                            </td>
                            <td>{ligne.quantite} {ligne.unite_symbole || ''}</td>
                            <td>{formatMontant(ligne.prix_achat)}</td>
                            <td className="montant-cell">{formatMontant(ligne.montant_total || (ligne.quantite * ligne.prix_achat))}</td>
                            <td>{renderMotif(ligne.motif_retour)}</td>
                            <td>
                              <span className={`etat-badge etat-${ligne.etat_produit || 'neuf'}`}>
                                {ligne.etat_produit || 'Neuf'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Si pas de lignes, afficher un message */}
              {(!selectedRetour.lignes || selectedRetour.lignes.length === 0) && (
                <div className="detail-lignes-empty">
                  <AlertCircle size={24} />
                  <p>Aucun produit retourné trouvé pour ce retour.</p>
                </div>
              )}
            </div>

            {/* ✅ RetourPDFActions avec les données complètes */}
            <RetourPDFActions 
              retourData={selectedRetour}
              onClose={() => setShowDetailModal(false)}
            />
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
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-icon-wrapper">
                <AlertTriangle size={48} color="#ef4444" />
              </div>
              <p>Êtes-vous sûr de vouloir supprimer ce retour ?</p>
              <p className="delete-item-name">
                <strong>"{retourToDelete?.numero_retour}"</strong>
              </p>
              <p className="delete-item-detail">
                Fournisseur : {retourToDelete?.fournisseur_nom || 'Sans fournisseur'}
              </p>
              <p className="delete-item-detail">
                Date : {retourToDelete?.date_retour}
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

export default RetoursFournisseurs;