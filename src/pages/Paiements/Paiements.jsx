// pages/Paiements/Paiements.jsx
import React, { useState, useEffect } from "react";
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  RefreshCw,
  Wallet,
  Banknote,
  Calendar,
  Clock,
  User,
  Phone,
  FileText,
  CreditCard,
  Building,
  Coins,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Ban
} from "lucide-react";
import PaiementService from "../../services/paiementService";
import { useUser } from "../../context/AuthContext";
import "../Paiements/Paiements.css";

const Paiements = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem('token');

  // États principaux
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState("");
  const [filterDateDebut, setFilterDateDebut] = useState("");
  const [filterDateFin, setFilterDateFin] = useState("");

  // États pour le modal de détails
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPaiement, setSelectedPaiement] = useState(null);

  // États pour les statistiques
  const [stats, setStats] = useState({
    total_paiements: 0,
    total_montant: 0,
    especes: 0,
    carte: 0,
    virement: 0,
    cheque: 0,
    autre: 0,
    paiements_aujourdhui: 0,
    montant_aujourdhui: 0
  });

  const canManage = user && ['admin', 'manager', 'caissier'].includes(user.role);

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================

  useEffect(() => {
    if (isAuthenticated && token) {
      loadPaiements();
      loadStats();
    }
  }, [isAuthenticated, token]);

  const loadPaiements = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterMode) params.mode_paiement = filterMode;
      if (filterDateDebut) params.date_debut = filterDateDebut;
      if (filterDateFin) params.date_fin = filterDateFin;

      const response = await PaiementService.getAllPaiements(token, params);
      if (response.success) {
        setPaiements(response.data || []);
      } else {
        setError(response.message || 'Erreur lors du chargement des paiements');
      }
    } catch (error) {
      console.error('❌ LoadPaiements error:', error);
      setError(error.message || 'Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await PaiementService.getStats(token);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('❌ LoadStats error:', error);
    }
  };

  // ============================================================
  // ACTIONS
  // ============================================================

  const handleView = (paiement) => {
    setSelectedPaiement(paiement);
    setShowDetailModal(true);
  };

  const handleExport = async () => {
    try {
      const response = await PaiementService.exportPaiements(token);
      if (response.success && response.data) {
        const headers = ["ID", "Date", "Client", "Téléphone", "Commande", "Facture", "Montant", "Mode", "Référence", "Notes", "Utilisateur"];
        const rows = response.data.map(p => [
          p.id,
          p.date,
          p.client,
          p.telephone,
          p.commande,
          p.facture,
          formatMontant(p.montant),
          p.mode,
          p.reference,
          p.note,
          p.utilisateur
        ]);
        
        let csv = headers.join(",") + "\n";
        rows.forEach(row => {
          csv += row.map(cell => `"${cell}"`).join(",") + "\n";
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      alert('Erreur lors de l\'exportation');
    }
  };

  const handleRefresh = () => {
    loadPaiements();
    loadStats();
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

  const getModeIcon = (mode) => {
    const icons = {
      'especes': <Coins size={16} />,
      'carte': <CreditCard size={16} />,
      'virement': <Building size={16} />,
      'cheque': <FileText size={16} />,
      'autre': <Wallet size={16} />
    };
    return icons[mode] || <Wallet size={16} />;
  };

  const getModeLabel = (mode) => {
    const labels = {
      'especes': 'Espèces',
      'carte': 'Carte bancaire',
      'virement': 'Virement',
      'cheque': 'Chèque',
      'autre': 'Autre'
    };
    return labels[mode] || mode;
  };

  const getModeBadge = (mode) => {
    const classes = {
      'especes': 'mode-especes',
      'carte': 'mode-carte',
      'virement': 'mode-virement',
      'cheque': 'mode-cheque',
      'autre': 'mode-autre'
    };
    return classes[mode] || 'mode-autre';
  };

  // Pagination
  const filteredPaiements = paiements;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPaiements.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPaiements.length / itemsPerPage);

  // ============================================================
  // RENDU DES COMPOSANTS
  // ============================================================

  const renderPaiementRow = (paiement) => (
    <tr key={paiement.id_paiement}>
      <td className="numero-cell">
        <span className="paiement-id">#{paiement.id_paiement}</span>
      </td>
      <td>{paiement.date_paiement_formatee || new Date(paiement.date_paiement).toLocaleDateString('fr-FR')}</td>
      <td className="client-cell">
        <User size={14} />
        <span>{paiement.nomclient || '-'}</span>
      </td>
      <td>{paiement.telephone || '-'}</td>
      <td>{paiement.numero_commande || '-'}</td>
      <td>{paiement.numero_facture || '-'}</td>
      <td className="montant-cell">
        <strong>{formatMontant(paiement.montant)}</strong>
      </td>
      <td>
        <span className={`mode-badge ${getModeBadge(paiement.mode_paiement)}`}>
          {getModeIcon(paiement.mode_paiement)}
          {getModeLabel(paiement.mode_paiement)}
        </span>
      </td>
      <td className="actions-cell">
        <button
          className="action-btn btn-view"
          onClick={() => handleView(paiement)}
          title="Voir"
        >
          <Eye size={16} />
        </button>
      </td>
    </tr>
  );

  return (
    <div className="paiements-container">
      {/* En-tête */}
      <div className="paiements-header">
        <div>
          <h1 className="paiements-title">💰 Paiements</h1>
          <p className="paiements-subtitle">
            {stats.total_paiements} paiements au total
          </p>
        </div>
        <div className="paiements-actions">
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            <span>Exporter</span>
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={handleRefresh} 
            title="Rafraîchir"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="paiements-stats">
        <div className="stat-card">
          <div className="stat-icon total"><Wallet size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Total paiements</span>
            <span className="stat-value">{stats.total_paiements}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon montant"><Banknote/></div>
          <div className="stat-info">
            <span className="stat-label">Montant total</span>
            <span className="stat-value">{formatMontant(stats.total_montant)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon aujourdhui"><Calendar size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Aujourd'hui</span>
            <span className="stat-value">{stats.paiements_aujourdhui}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon montant-jour"><TrendingUp size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Montant du jour</span>
            <span className="stat-value">{formatMontant(stats.montant_aujourdhui)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon especes"><Coins size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Espèces</span>
            <span className="stat-value">{formatMontant(stats.especes)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon carte"><CreditCard size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Carte</span>
            <span className="stat-value">{formatMontant(stats.carte)}</span>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="paiements-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher un paiement..."
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
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
          >
            <option value="">Tous les modes</option>
            <option value="especes">Espèces</option>
            <option value="carte">Carte bancaire</option>
            <option value="virement">Virement</option>
            <option value="cheque">Chèque</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div className="filter-group">
          <input
            type="date"
            className="filter-date"
            value={filterDateDebut}
            onChange={(e) => setFilterDateDebut(e.target.value)}
            placeholder="Date début"
          />
        </div>
        <div className="filter-group">
          <input
            type="date"
            className="filter-date"
            value={filterDateFin}
            onChange={(e) => setFilterDateFin(e.target.value)}
            placeholder="Date fin"
          />
        </div>
        <button className="btn btn-primary btn-filter" onClick={loadPaiements}>
          Filtrer
        </button>
        {(filterMode || filterDateDebut || filterDateFin || searchTerm) && (
          <button 
            className="btn btn-secondary btn-filter"
            onClick={() => {
              setFilterMode("");
              setFilterDateDebut("");
              setFilterDateFin("");
              setSearchTerm("");
              loadPaiements();
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Tableau */}
      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Chargement des paiements...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-secondary" onClick={loadPaiements}>
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="paiements-table-container">
          <table className="paiements-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Client</th>
                <th>Téléphone</th>
                <th>Commande</th>
                <th>Facture</th>
                <th>Montant</th>
                <th>Mode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-state">
                    <Wallet size={32} />
                    <p>Aucun paiement trouvé</p>
                  </td>
                </tr>
              ) : (
                currentItems.map(renderPaiementRow)
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && filteredPaiements.length > itemsPerPage && (
        <div className="paiements-pagination">
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

      {/* Modal - Détails */}
      {showDetailModal && selectedPaiement && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2> Détails du paiement</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-header">
                <div className="detail-header-left">
                  <div className="detail-icon"><Wallet size={28} /></div>
                  <div>
                    <h3 className="detail-numero">Paiement #{selectedPaiement.id_paiement}</h3>
                    <span className="detail-date">
                      <Calendar size={14} />
                      {selectedPaiement.date_paiement_formatee || new Date(selectedPaiement.date_paiement).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div className="detail-header-right">
                  <span className={`mode-badge ${getModeBadge(selectedPaiement.mode_paiement)}`}>
                    {getModeIcon(selectedPaiement.mode_paiement)}
                    {getModeLabel(selectedPaiement.mode_paiement)}
                  </span>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-section">
                  <h4><User size={16} /> Client</h4>
                  <div className="detail-item">
                    <label>Nom</label>
                    <span>{selectedPaiement.nomclient || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone</label>
                    <span>{selectedPaiement.telephone || '-'}</span>
                  </div>
                </div>
                <div className="detail-section">
                  <h4><FileText size={16} /> Informations</h4>
                  <div className="detail-item">
                    <label>Commande</label>
                    <span>{selectedPaiement.numero_commande || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Facture</label>
                    <span>{selectedPaiement.numero_facture || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Montant</label>
                    <span className="montant-total">{formatMontant(selectedPaiement.montant)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Référence</label>
                    <span>{selectedPaiement.reference || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Note</label>
                    <span>{selectedPaiement.note || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Enregistré par</label>
                    <span>{selectedPaiement.utilisateur_nom || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Paiements;