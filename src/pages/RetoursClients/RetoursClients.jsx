// pages/RetoursClients/RetoursClients.jsx
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
  AlertTriangle,
  Trash2,
  RotateCcw,
  Box,
  User,
  Phone,
  Mail,
  ShoppingBag,
  Search as SearchIcon
} from "lucide-react";
import RetourClientService from "../../services/retourClient/retourClientService";
import { useUser } from "../../context/AuthContext";
import "./RetoursClients.css";
import RetourClientPDFActions from "../../components/RetourClient/RetourClientPDFActions";

const RetoursClients = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem('token');

  // États principaux
  const [retours, setRetours] = useState([]);
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

  // État du formulaire (retour)
  const [formData, setFormData] = useState({
    id_commande_vente: "",
    id_facture: "",
    date_retour: new Date().toISOString().split('T')[0],
    nomclient: "",
    telephone: "",
    email: "",
    adresse: "",
    motif_retour: "",
    notes: "",
    lignes: []
  });

  // Recherche par numéro de commande
  const [commandeSearch, setCommandeSearch] = useState("");
  const [commandeTrouvee, setCommandeTrouvee] = useState(null);
  const [searchingCommande, setSearchingCommande] = useState(false);
  const [searchCommandeError, setSearchCommandeError] = useState(null);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [lignesCommande, setLignesCommande] = useState([]);
  const [lignesSelectionnees, setLignesSelectionnees] = useState({});

  // Permissions
  const canManage = user && ['admin', 'manager'].includes(user.role);

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================

  useEffect(() => {
    if (isAuthenticated && token) {
      loadRetours();
    }
  }, [isAuthenticated, token]);

  const loadRetours = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await RetourClientService.getAllRetours(token);
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

  // ============================================================
  // GESTION DU FORMULAIRE
  // ============================================================

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const resetRetourForm = () => {
    setFormData({
      id_commande_vente: "",
      id_facture: "",
      date_retour: new Date().toISOString().split('T')[0],
      nomclient: "",
      telephone: "",
      email: "",
      adresse: "",
      motif_retour: "",
      notes: "",
      lignes: []
    });
    setCommandeSearch("");
    setCommandeTrouvee(null);
    setSearchCommandeError(null);
    setSelectedCommande(null);
    setLignesCommande([]);
    setLignesSelectionnees({});
  };

  // ============================================================
  // RECHERCHE COMMANDE PAR NUMÉRO
  // ============================================================

  const rechercherCommande = async (numero) => {
    setCommandeSearch(numero);
    setCommandeTrouvee(null);
    setSearchCommandeError(null);
    setSelectedCommande(null);
    setLignesCommande([]);
    setLignesSelectionnees({});

    if (!numero || numero.trim().length < 3) {
      return;
    }

    setSearchingCommande(true);

    try {
      const response = await RetourClientService.searchCommandeByNumero(token, numero.trim());
      
      if (response.success && response.data) {
        setCommandeTrouvee(response.data);
      } else {
        setSearchCommandeError('Aucune commande trouvée');
      }
    } catch (error) {
      console.error('❌ Erreur recherche commande:', error);
      setSearchCommandeError(error.message || 'Erreur lors de la recherche');
    } finally {
      setSearchingCommande(false);
    }
  };

  const selectCommandeFromSearch = (commande) => {
    setSelectedCommande(commande);

    setFormData({
      ...formData,
      id_commande_vente: commande.id_commande,
      id_facture: commande.id_facture || '',
      nomclient: commande.nomclient,
      telephone: commande.telephone,
      email: '',
      adresse: '',
      lignes: []
    });

    if (commande.lignes && commande.lignes.length > 0) {
      const lignesInit = {};
      commande.lignes.forEach(l => {
        lignesInit[l.id_ligne_vente] = {
          selected: false,
          quantite: 0,
          motif_retour: '',
          etat_produit: 'neuf',
          notes: '',
          quantite_max_retournable: l.quantite_max_retournable || parseFloat(l.quantite)
        };
      });
      setLignesSelectionnees(lignesInit);
      setLignesCommande(commande.lignes);
    }
  };

  const changerCommande = () => {
    setSelectedCommande(null);
    setLignesCommande([]);
    setLignesSelectionnees({});
    setCommandeSearch("");
    setCommandeTrouvee(null);
    setSearchCommandeError(null);
    setFormData({
      ...formData,
      id_commande_vente: "",
      id_facture: "",
      nomclient: "",
      telephone: "",
      lignes: []
    });
  };

  // ============================================================
  // GESTION DES LIGNES
  // ============================================================

  const toggleLigneRetour = (idLigne) => {
    const ligne = lignesSelectionnees[idLigne];
    const ligneCommande = lignesCommande.find(l => l.id_ligne_vente === idLigne);
    const maxRetournable = ligne?.quantite_max_retournable || 
                           ligneCommande?.quantite_max_retournable || 
                           parseFloat(ligneCommande?.quantite) || 1;
    
    setLignesSelectionnees({
      ...lignesSelectionnees,
      [idLigne]: {
        ...ligne,
        selected: !ligne.selected,
        quantite: !ligne.selected ? Math.min(1, maxRetournable) : 0
      }
    });
  };

  const updateLigneRetour = (idLigne, field, value) => {
    const ligne = lignesSelectionnees[idLigne];
    
    if (field === 'quantite') {
      const maxRetournable = ligne?.quantite_max_retournable || 
                             lignesCommande.find(l => l.id_ligne_vente === idLigne)?.quantite_max_retournable || 
                             1;
      const quantiteNum = parseFloat(value) || 0;
      
      if (quantiteNum > maxRetournable) {
        value = maxRetournable.toString();
      }
      if (quantiteNum < 1 && value !== '') {
        value = '1';
      }
    }

    setLignesSelectionnees({
      ...lignesSelectionnees,
      [idLigne]: {
        ...lignesSelectionnees[idLigne],
        [field]: value
      }
    });
  };

  const calculerMontantRetour = () => {
    return Object.entries(lignesSelectionnees).reduce((total, [idLigne, data]) => {
      if (!data.selected) return total;
      const ligneCommande = lignesCommande.find(l => l.id_ligne_vente === parseInt(idLigne));
      if (!ligneCommande) return total;
      return total + (parseFloat(ligneCommande.prix_vente) * parseFloat(data.quantite || 0));
    }, 0);
  };

  // ============================================================
  // ACTIONS CRUD
  // ============================================================

  const handleAdd = () => {
    resetRetourForm();
    setShowModal(true);
  };

  const handleView = async (retour) => {
    setLoading(true);
    try {
      const response = await RetourClientService.getRetourById(token, retour.id_retour_client);
      if (response.success && response.data) {
        setSelectedRetour(response.data);
        setShowDetailModal(true);
      } else {
        alert('Erreur lors du chargement des détails du retour');
      }
    } catch (error) {
      console.error('❌ Error loading retour details:', error);
      alert('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCommande) {
      alert("Veuillez rechercher et sélectionner une commande");
      return;
    }

    if (!formData.motif_retour) {
      alert("Veuillez sélectionner un motif de retour");
      return;
    }

    const lignesARetourner = Object.entries(lignesSelectionnees)
      .filter(([_, data]) => data.selected && data.quantite > 0)
      .map(([idLigne, data]) => {
        const ligneCommande = lignesCommande.find(l => l.id_ligne_vente === parseInt(idLigne));
        return {
          id_produit: ligneCommande.id_produit,
          id_ligne_commande_vente: parseInt(idLigne),
          quantite: parseFloat(data.quantite),
          prix_vente: parseFloat(ligneCommande.prix_vente),
          remise: 0,
          motif_retour: data.motif_retour || formData.motif_retour,
          etat_produit: data.etat_produit || 'neuf',
          notes: data.notes || null
        };
      });

    if (lignesARetourner.length === 0) {
      alert("Veuillez sélectionner au moins un produit à retourner");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        id_commande_vente: selectedCommande.id_commande,
        id_facture: selectedCommande.id_facture || null,
        date_retour: new Date().toISOString().split('T')[0],
        email: null,
        adresse: null,
        motif_retour: formData.motif_retour,
        notes: formData.notes || null,
        lignes: lignesARetourner
      };

      const response = await RetourClientService.createRetour(token, data);

      if (response.success) {
        await loadRetours();
        setShowModal(false);
        resetRetourForm();
        alert('✅ Retour client créé avec succès !');
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

  const handleChangeStatut = async (id, statut) => {
    if (updatingStatut === id) return;
    setUpdatingStatut(id);
    setError(null);

    try {
      const response = await RetourClientService.updateStatut(token, id, statut);
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

  const confirmDelete = (retour) => {
    setRetourToDelete(retour);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!retourToDelete) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await RetourClientService.deleteRetour(
        token,
        retourToDelete.id_retour_client
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

  const handleExport = async () => {
    try {
      const response = await RetourClientService.exportRetours(token);
      if (response.success && response.data) {
        const headers = ["ID", "Numéro", "Date", "Client", "Commande", "Motif", "Montant", "Statut", "Notes"];
        const rows = response.data.map(r => [
          r.id,
          r.numero,
          r.date,
          r.client,
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
        link.download = `retours_clients_${new Date().toISOString().split('T')[0]}.csv`;
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
      'mecontentement': 'Mécontentement',
      'erreur_livraison': 'Erreur de livraison',
      'echange': 'Échange',
      'autre': 'Autre'
    };
    return motifs[motif] || motif;
  };

  const getMotifBadge = (motif) => {
    const classes = {
      'defectueux': 'motif-defectueux',
      'non_conforme': 'motif-non_conforme',
      'mecontentement': 'motif-mecontentement',
      'erreur_livraison': 'motif-erreur_livraison',
      'echange': 'motif-echange',
      'autre': 'motif-autre'
    };
    return classes[motif] || 'motif-autre';
  };

  const getStats = () => {
    const total = retours.length;
    const enAttente = retours.filter(r => r.statut === 'en_attente').length;
    const recu = retours.filter(r => r.statut === 'recu').length;
    const controle = retours.filter(r => r.statut === 'controle').length;
    const accepte = retours.filter(r => r.statut === 'accepte').length;
    const refuse = retours.filter(r => r.statut === 'refuse').length;
    const rembourse = retours.filter(r => r.statut === 'rembourse').length;
    const echange = retours.filter(r => r.statut === 'echange').length;
    const annule = retours.filter(r => r.statut === 'annule').length;
    
    const totalMontant = retours.reduce((sum, r) => {
      const montant = r.montant_total !== undefined && r.montant_total !== null 
        ? parseFloat(r.montant_total) 
        : 0;
      return sum + (isNaN(montant) ? 0 : montant);
    }, 0);

    return { total, enAttente, recu, controle, accepte, refuse, rembourse, echange, annule, totalMontant };
  };

  const stats = getStats();

  const filteredRetours = retours.filter((retour) => {
    const matchSearch = 
      retour.numero_retour?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retour.nomclient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retour.telephone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retour.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retour.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatut = filterStatut ? retour.statut === filterStatut : true;
    const matchMotif = filterMotif ? retour.motif_retour === filterMotif : true;
    
    return matchSearch && matchStatut && matchMotif;
  });

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
      'recu': { label: 'Reçu', className: 'status-recu', icon: Package },
      'controle': { label: 'Contrôle', className: 'status-controle', icon: AlertCircle },
      'accepte': { label: 'Accepté', className: 'status-accepte', icon: CheckCircle },
      'refuse': { label: 'Refusé', className: 'status-refuse', icon: Ban },
      'rembourse': { label: 'Remboursé', className: 'status-rembourse', icon: Banknote},
      'echange': { label: 'Échangé', className: 'status-echange', icon: RotateCcw },
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

  // Vue liste
  const renderListView = () => (
    <div className="retours-clients-table-container">
      <table className="retours-clients-table">
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Date</th>
            <th>Client</th>
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
                <p>Aucun retour client trouvé</p>
              </td>
            </tr>
          ) : (
            currentItems.map((retour) => (
              <tr key={retour.id_retour_client}>
                <td className="numero-cell">
                  <span className="retour-numero">{retour.numero_retour}</span>
                </td>
                <td>{new Date(retour.date_retour).toLocaleDateString('fr-FR')}</td>
                <td className="client-cell">
                  <User size={14} />
                  <span>{retour.nomclient || '-'}</span>
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
                        className="action-btn btn-recu"
                        onClick={() => handleChangeStatut(retour.id_retour_client, 'recu')}
                        disabled={updatingStatut === retour.id_retour_client}
                        title="Marquer comme reçu"
                      >
                        <Package size={16} />
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
                  {canManage && retour.statut === 'recu' && (
                    <button
                      className="action-btn btn-controle"
                      onClick={() => handleChangeStatut(retour.id_retour_client, 'controle')}
                      disabled={updatingStatut === retour.id_retour_client}
                      title="Passer en contrôle"
                    >
                      <AlertCircle size={16} />
                    </button>
                  )}
                  {canManage && retour.statut === 'controle' && (
                    <>
                      <button
                        className="action-btn btn-accepte"
                        onClick={() => handleChangeStatut(retour.id_retour_client, 'accepte')}
                        disabled={updatingStatut === retour.id_retour_client}
                        title="Accepter"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        className="action-btn btn-refuse"
                        onClick={() => handleChangeStatut(retour.id_retour_client, 'refuse')}
                        disabled={updatingStatut === retour.id_retour_client}
                        title="Refuser"
                      >
                        <Ban size={16} />
                      </button>
                    </>
                  )}
                  {canManage && retour.statut === 'accepte' && (
                    <>
                      <button
                        className="action-btn btn-rembourse"
                        onClick={() => handleChangeStatut(retour.id_retour_client, 'rembourse')}
                        disabled={updatingStatut === retour.id_retour_client}
                        title="Rembourser"
                      >
                        <Banknote size={16} />
                      </button>
                      <button
                        className="action-btn btn-echange"
                        onClick={() => handleChangeStatut(retour.id_retour_client, 'echange')}
                        disabled={updatingStatut === retour.id_retour_client}
                        title="Échanger"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </>
                  )}
                  {canManage && ['en_attente', 'recu', 'controle'].includes(retour.statut) && (
                    <button
                      className="action-btn btn-annuler"
                      onClick={() => {
                        if (window.confirm("Annuler ce retour ?")) {
                          handleChangeStatut(retour.id_retour_client, 'annule');
                        }
                      }}
                      disabled={updatingStatut === retour.id_retour_client}
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
    <div className="retours-clients-grid">
      {currentItems.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={48} className="empty-icon" />
          <p>Aucun retour client trouvé</p>
        </div>
      ) : (
        currentItems.map((retour) => (
          <div key={retour.id_retour_client} className="retour-client-card">
            <div className="retour-client-card-header">
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
            <div className="retour-client-card-body">
              <div className="client-info">
                <User size={16} />
                <span>{retour.nomclient || 'Client sans nom'}</span>
              </div>
              {retour.telephone && (
                <div className="client-info">
                  <Phone size={14} />
                  <span>{retour.telephone}</span>
                </div>
              )}
              {retour.email && (
                <div className="client-info">
                  <Mail size={14} />
                  <span>{retour.email}</span>
                </div>
              )}
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
            <div className="retour-client-card-footer">
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
    <div className="retours-clients-container">
      {/* En-tête */}
      <div className="retours-clients-header">
        <div>
          <h1 className="retours-clients-title">🔄 Retours Clients</h1>
          <p className="retours-clients-subtitle">
            {stats.total} retours au total
          </p>
        </div>
        <div className="retours-clients-actions">
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

      {/* ==================== VUE D'ENSEMBLE (KPI) ==================== */}
      <div className="retours-kpi-grid">
        <div className="retour-kpi-card kpi-total">
          <div className="kpi-icon">
            <ShoppingBag size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total retours</span>
            <span className="kpi-value">{stats.total}</span>
            <span className="kpi-sub">{formatMontant(stats.totalMontant)}</span>
          </div>
        </div>

        <div className="retour-kpi-card kpi-encours">
          <div className="kpi-icon">
            <Clock size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">En cours</span>
            <span className="kpi-value">
              {stats.enAttente + stats.recu + stats.controle}
            </span>
            <span className="kpi-sub">à traiter</span>
          </div>
        </div>

        <div className="retour-kpi-card kpi-traite">
          <div className="kpi-icon">
            <CheckCircle size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Traités</span>
            <span className="kpi-value">
              {stats.accepte + stats.refuse + stats.rembourse + stats.echange}
            </span>
            <span className="kpi-sub">terminés</span>
          </div>
        </div>

        <div className="retour-kpi-card kpi-annule">
          <div className="kpi-icon">
            <Ban size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Annulés</span>
            <span className="kpi-value">{stats.annule}</span>
            <span className="kpi-sub">clôturés</span>
          </div>
        </div>
      </div>

      {/* ==================== DÉTAIL PAR STATUT ==================== */}
      <div className="retours-detail-grid">
        <div className="detail-stat">
          <span className="detail-stat-label">En attente</span>
          <span className="detail-stat-value">{stats.enAttente}</span>
        </div>
        <div className="detail-stat">
          <span className="detail-stat-label">Reçus</span>
          <span className="detail-stat-value">{stats.recu}</span>
        </div>
        <div className="detail-stat">
          <span className="detail-stat-label">Contrôle</span>
          <span className="detail-stat-value">{stats.controle}</span>
        </div>
        <div className="detail-stat">
          <span className="detail-stat-label">Acceptés</span>
          <span className="detail-stat-value text-success">{stats.accepte}</span>
        </div>
        <div className="detail-stat">
          <span className="detail-stat-label">Refusés</span>
          <span className="detail-stat-value text-danger">{stats.refuse}</span>
        </div>
        <div className="detail-stat">
          <span className="detail-stat-label">Remboursés</span>
          <span className="detail-stat-value">{stats.rembourse}</span>
        </div>
        <div className="detail-stat">
          <span className="detail-stat-label">Échangés</span>
          <span className="detail-stat-value">{stats.echange}</span>
        </div>
        <div className="detail-stat">
          <span className="detail-stat-label">Annulés</span>
          <span className="detail-stat-value text-muted">{stats.annule}</span>
        </div>
      </div>

      {/* Filtres */}
      <div className="retours-clients-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher un retour client..."
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
            <option value="recu">Reçu</option>
            <option value="controle">Contrôle</option>
            <option value="accepte">Accepté</option>
            <option value="refuse">Refusé</option>
            <option value="rembourse">Remboursé</option>
            <option value="echange">Échangé</option>
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
            <option value="mecontentement">Mécontentement</option>
            <option value="erreur_livraison">Erreur de livraison</option>
            <option value="echange">Échange</option>
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
          <p>Chargement des retours clients...</p>
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
        <div className="retours-clients-pagination">
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
          MODAL - NOUVEAU RETOUR CLIENT
          ============================================================ */}
      {showModal && (
        <div className="modal-overlay" >
          <div className="modal-content large vente-modal" onClick={(e) => e.stopPropagation()}>
            
            {/* HEADER */}
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-header-icon retour">
                  <RotateCcw size={22} />
                </div>
                <div>
                  <h2>Nouveau Retour Client</h2>
                  <p className="modal-header-sub">Créer un retour à partir d'une commande</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => !saving && setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            {/* BODY */}
            <div className="modal-body">
              {error && (
                <div className="modal-error">
                  <AlertTriangle size={18} />
                  <p>{error}</p>
                </div>
              )}

              {/* ÉTAPE 1 : RECHERCHER LA COMMANDE */}
              <div className="form-section step-section">
                <div className="section-header">
                  <div className="section-header-left">
                    <div className="step-badge">1</div>
                    <h4>Rechercher la commande</h4>
                  </div>
                  <span className="section-badge required">Requis</span>
                </div>

                <div className="commande-search-wrapper">
                  <div className="combobox-input-wrapper large">
                    <SearchIcon size={20} className="combobox-icon" />
                    <input
                      type="text"
                      className="combobox-input"
                      placeholder="Entrez le numéro de commande (ex: CV-202609-0001)"
                      value={commandeSearch}
                      onChange={(e) => rechercherCommande(e.target.value)}
                      disabled={saving || !!selectedCommande}
                      autoComplete="off"
                    />
                    {searchingCommande && (
                      <div className="combobox-spinner spinning">
                        <RefreshCw size={18} />
                      </div>
                    )}
                  </div>
                </div>

                {searchCommandeError && (
                  <div className="search-error">
                    <AlertCircle size={16} />
                    <span>{searchCommandeError}</span>
                  </div>
                )}

                {commandeTrouvee && !selectedCommande && (
                  <div className="commande-result-card">
                    <div className="commande-result-header">
                      <div>
                        <strong>{commandeTrouvee.numero_commande}</strong>
                        <span className="commande-result-date">
                          <Calendar size={12} />
                          {new Date(commandeTrouvee.date_commande).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <span className={`status-badge status-${commandeTrouvee.statut === 'livree' ? 'livree' : 'expediee'}`}>
                        {commandeTrouvee.statut === 'livree' ? 'Livrée' : 'Expédiée'}
                      </span>
                    </div>

                    <div className="commande-result-info">
                      <div className="commande-result-item">
                        <User size={14} />
                        <span>{commandeTrouvee.nomclient}</span>
                      </div>
                      <div className="commande-result-item">
                        <Phone size={14} />
                        <span>{commandeTrouvee.telephone}</span>
                      </div>
                      <div className="commande-result-item">
                        <Banknote size={14} />
                        <span>{formatMontant(commandeTrouvee.montant_total)}</span>
                      </div>
                      <div className="commande-result-item">
                        <Package size={14} />
                        <span>{commandeTrouvee.lignes?.length || 0} produit(s)</span>
                      </div>
                    </div>

                    <button
                      className="btn btn-primary btn-select-commande"
                      onClick={() => selectCommandeFromSearch(commandeTrouvee)}
                      disabled={saving}
                    >
                      <Check size={18} />
                      <span>Sélectionner cette commande</span>
                    </button>
                  </div>
                )}

                {selectedCommande && (
                  <div className="commande-selected-badge">
                    <CheckCircle size={18} />
                    <div>
                      <strong>{selectedCommande.numero_commande}</strong>
                      <span>{selectedCommande.nomclient} • {selectedCommande.telephone}</span>
                    </div>
                    <button
                      className="btn-change-commande"
                      onClick={changerCommande}
                      disabled={saving}
                    >
                      <X size={14} />
                      Changer
                    </button>
                  </div>
                )}
              </div>

              {/* ÉTAPE 2 : PRODUITS À RETOURNER */}
              {selectedCommande && (
                <div className="form-section step-section">
                  <div className="section-header">
                    <div className="section-header-left">
                      <div className="step-badge">2</div>
                      <h4>Produits à retourner</h4>
                    </div>
                    <span className="section-badge">
                      {Object.values(lignesSelectionnees).filter(l => l.selected).length} sélectionné(s)
                    </span>
                  </div>

                  <div className="form-group">
                    <label>Motif global du retour *</label>
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
                      <option value="mecontentement">Mécontentement</option>
                      <option value="erreur_livraison">Erreur de livraison</option>
                      <option value="echange">Échange</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>

                  {lignesCommande.length === 0 ? (
                    <div className="empty-lignes">
                      <Box size={32} />
                      <p>Aucun produit dans cette commande</p>
                    </div>
                  ) : (
                    <div className="lignes-selection-table">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}></th>
                            <th>Produit</th>
                            <th style={{ width: '100px' }}>Qté achetée</th>
                            <th style={{ width: '100px' }}>Qté retour</th>
                            <th style={{ width: '150px' }}>Motif</th>
                            <th style={{ width: '110px' }}>État</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lignesCommande.map((ligne) => {
                            const selection = lignesSelectionnees[ligne.id_ligne_vente] || {};
                            const maxRetournable = selection.quantite_max_retournable || 
                                                   ligne.quantite_max_retournable || 
                                                   parseFloat(ligne.quantite);
                            const dejaRetourne = parseFloat(ligne.quantite_deja_retournee) || 0;
                            const estEpuise = maxRetournable <= 0;
                            
                            return (
                              <tr 
                                key={ligne.id_ligne_vente}
                                className={selection.selected ? 'selected' : ''}
                              >
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={selection.selected || false}
                                    onChange={() => toggleLigneRetour(ligne.id_ligne_vente)}
                                    disabled={saving || estEpuise}
                                    className="checkbox-input"
                                  />
                                </td>
                                <td>
                                  <strong>{ligne.produit_nom}</strong>
                                  {ligne.modele_nom && (
                                    <span className="unite-label"> - {ligne.modele_nom}</span>
                                  )}
                                  <div className="ligne-prix">
                                    {formatMontant(ligne.prix_vente)}
                                  </div>
                                  {dejaRetourne > 0 && (
                                    <div className="ligne-deja-retournee">
                                      Déjà retourné: {dejaRetourne}
                                    </div>
                                  )}
                                  {estEpuise && (
                                    <div className="ligne-deja-retournee">
                                      ⚠️ Entièrement retourné
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <span className="quantite-achetee">
                                    {ligne.quantite} {ligne.unite_symbole || ''}
                                  </span>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={selection.quantite || ''}
                                    onChange={(e) => updateLigneRetour(
                                      ligne.id_ligne_vente, 
                                      'quantite', 
                                      e.target.value
                                    )}
                                    min="1"
                                    max={maxRetournable}
                                    disabled={!selection.selected || saving || estEpuise}
                                    className="input-quantite"
                                    placeholder="0"
                                  />
                                  <div className="input-max-hint">
                                    Max: {maxRetournable}
                                  </div>
                                </td>
                                <td>
                                  <select
                                    value={selection.motif_retour || ''}
                                    onChange={(e) => updateLigneRetour(
                                      ligne.id_ligne_vente, 
                                      'motif_retour', 
                                      e.target.value
                                    )}
                                    disabled={!selection.selected || saving}
                                    className="select-motif"
                                  >
                                    <option value="">Auto</option>
                                    <option value="defectueux">Défectueux</option>
                                    <option value="non_conforme">Non conforme</option>
                                    <option value="mecontentement">Mécontentement</option>
                                    <option value="erreur_livraison">Erreur livraison</option>
                                    <option value="echange">Échange</option>
                                    <option value="autre">Autre</option>
                                  </select>
                                </td>
                                <td>
                                  <select
                                    value={selection.etat_produit || 'neuf'}
                                    onChange={(e) => updateLigneRetour(
                                      ligne.id_ligne_vente, 
                                      'etat_produit', 
                                      e.target.value
                                    )}
                                    disabled={!selection.selected || saving}
                                    className="select-etat"
                                  >
                                    <option value="neuf">Neuf</option>
                                    <option value="endommage">Endommagé</option>
                                    <option value="usage">Usagé</option>
                                    <option value="incomplet">Incomplet</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label>Notes (optionnel)</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Notes supplémentaires..."
                      rows="2"
                      disabled={saving}
                      className="form-textarea"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="modal-footer vente-footer">
              <div className="footer-summary">
                <div className="summary-item">
                  <span className="summary-label">Produits</span>
                  <span className="summary-value">
                    {Object.values(lignesSelectionnees).filter(l => l.selected).length}
                  </span>
                </div>
                <div className="summary-divider" />
                <div className="summary-item total">
                  <span className="summary-label">Montant du retour</span>
                  <span className="summary-value-total">
                    {formatMontant(calculerMontantRetour())}
                  </span>
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
                  className="btn btn-primary" 
                  onClick={handleSave}
                  disabled={
                    saving || 
                    !selectedCommande || 
                    !formData.motif_retour ||
                    Object.values(lignesSelectionnees).filter(l => l.selected).length === 0
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
                      <span>Créer le retour</span>
                    </>
                  )}
                </button>
              </div>
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
              <h2>Détails du retour client</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-header-left">
                  <div className="detail-icon"><ShoppingBag size={28} /></div>
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
                  <h4><User size={16} /> Client</h4>
                  <div className="detail-item">
                    <label>Nom</label>
                    <span>{selectedRetour.nomclient || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone</label>
                    <span>{selectedRetour.telephone || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <span>{selectedRetour.email || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Adresse</label>
                    <span>{selectedRetour.adresse || '-'}</span>
                  </div>
                </div>
                <div className="detail-section">
                  <h4><FileText size={16} /> Informations</h4>
                  <div className="detail-item">
                    <label>Commande</label>
                    <span>{selectedRetour.numero_commande || 'Sans commande'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Facture</label>
                    <span>{selectedRetour.numero_facture || 'Sans facture'}</span>
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
                            </td>
                            <td>{ligne.quantite} {ligne.unite_symbole || ''}</td>
                            <td>{formatMontant(ligne.prix_vente)}</td>
                            <td className="montant-cell">{formatMontant(ligne.montant_total || (ligne.quantite * ligne.prix_vente))}</td>
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
            </div>

            <RetourClientPDFActions 
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
              <p>Êtes-vous sûr de vouloir supprimer ce retour client ?</p>
              <p className="delete-item-name">
                <strong>"{retourToDelete?.numero_retour}"</strong>
              </p>
              <p className="delete-item-detail">
                Client : {retourToDelete?.nomclient || 'Client sans nom'}
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

export default RetoursClients;