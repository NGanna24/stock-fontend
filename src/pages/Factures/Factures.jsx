// pages/Factures/Factures.jsx
import React, { useState, useEffect } from "react";
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  RefreshCw,
  FileText,
  Banknote,
  Calendar,
  Clock,
  User,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Ban,
} from "lucide-react"; 
import FactureService from "../../services/factureService";
import MagasinService from "../../services/magasinService";
import { useUser } from "../../context/AuthContext";
import FacturePDFActions from "../../components/Facture/FacturePDFActions";
import "./Factures.css";

// ============================================================
// HELPERS INTERNES
// ============================================================
const formatMontant = (value) => {
  const num = Number(value || 0);
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
// COMPOSANT
// ============================================================
const Factures = () => {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem('token');

  // États principaux
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [error, setError] = useState(null);
  const [filterStatut, setFilterStatut] = useState("");
  const [filterDateDebut, setFilterDateDebut] = useState("");
  const [filterDateFin, setFilterDateFin] = useState("");

  // Modal détails
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState(null);

  // ✅ NOUVEAU : Magasin (pour le PDF)
  const [magasin, setMagasin] = useState(null);

  // Statistiques
  const [stats, setStats] = useState({
    total_factures: 0,
    total_montant: 0,
    en_attente: 0,
    payee: 0,
    partiellement_payee: 0,
    en_retard: 0,
    annulee: 0,
    montant_impaye: 0,
    montant_moyen: 0,
  });

  const canManage = user && ['admin', 'manager', 'caissier'].includes(user.role);

  // ============================================================
  // CHARGEMENT
  // ============================================================
  useEffect(() => {
    if (isAuthenticated && token) {
      loadFactures();
      loadStats();
      loadMagasin();   
    }
  }, [isAuthenticated, token]);

  const loadFactures = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatut) params.statut = filterStatut;
      if (filterDateDebut) params.date_debut = filterDateDebut;
      if (filterDateFin) params.date_fin = filterDateFin;

      const response = await FactureService.getAllFactures(token, params);
      if (response.success) {
        setFactures(response.data || []);
      } else {
        setError(response.message || 'Erreur lors du chargement');
      }
    } catch (error) {
      console.error('❌ LoadFactures error:', error);
      setError(error.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await FactureService.getStats(token);
      if (response.success) setStats(response.data);
    } catch (error) {
      console.error('❌ LoadStats error:', error);
    }
  };

  // ✅ NOUVEAU : Chargement du magasin
  const loadMagasin = async () => {
    try {
      const res = await MagasinService.getMonMagasin(token);
      if (res.success) setMagasin(res.magasin);
    } catch (error) {
      console.error('❌ LoadMagasin error:', error);
    }
  };

  // ============================================================
  // HELPERS DE CALCUL
  // ============================================================
  const getMontantPaye = (facture) => {
    if (facture.paiements && facture.paiements.length > 0) {
      return facture.paiements.reduce(
        (sum, p) => sum + parseFloat(p.montant || 0),
        0
      );
    }
    return parseFloat(facture.total_paye || 0);
  };

  const getResteAPayer = (facture) => {
    const total = parseFloat(facture.montant_total || 0);
    const paye = getMontantPaye(facture);
    return Math.max(0, total - paye);
  };

  const getStatutCalcule = (facture) => {
    if (facture.statut === 'annulee') return 'annulee';
    const total = parseFloat(facture.montant_total || 0);
    const paye = getMontantPaye(facture);
    const reste = Math.max(0, total - paye);

    if (reste <= 0 && total > 0) return 'payee';
    if (paye > 0 && reste > 0) return 'partiellement_payee';

    const dateEch = facture.date_echeance ? new Date(facture.date_echeance) : null;
    if (dateEch && dateEch < new Date() && reste > 0) return 'en_retard';

    return facture.statut || 'en_attente';
  };

  // ============================================================
  // ACTIONS
  // ============================================================
const handleView = async (facture) => {
    console.log('📦 Facture sélectionnée :', facture);

    // Ouvrir le modal tout de suite avec les données de la liste
    setSelectedFacture(facture);
    setShowDetailModal(true);

    // Puis recharger la facture complète avec ses lignes
    try {
        const res = await FactureService.getFactureById(token, facture.id_facture);
        console.log('✅ Facture complète :', res);

        if (res.success && res.data) {
            console.log('📋 Lignes reçues :', res.data.lignes);
            setSelectedFacture(res.data);
        }
    } catch (err) {
        console.error('❌ Impossible de charger la facture complète :', err);
    }
};

  const handleExport = async () => {
    try {
      const response = await FactureService.exportFactures(token);
      if (response.success && response.data) {
        const headers = [
          "ID", "Numéro", "Date", "Échéance", "Client", "Téléphone",
          "Commande", "Montant", "Payé", "Reste", "Statut", "Mode",
          "Notes", "Utilisateur",
        ];
        const rows = response.data.map((f) => [
          f.id,
          f.numero,
          f.date,
          f.echeance,
          f.client,
          f.telephone,
          f.commande,
          formatMontant(f.montant),
          formatMontant(f.paye),
          formatMontant(f.reste),
          f.statut,
          f.mode,
          f.notes,
          f.utilisateur,
        ]);

        let csv = headers.join(",") + "\n";
        rows.forEach((row) => {
          csv += row.map((cell) => `"${cell}"`).join(",") + "\n";
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `factures_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      alert('Erreur lors de l\'exportation');
    }
  };

  const handleRefresh = () => {
    loadFactures();
    loadStats();
    loadMagasin();
  };

  const getStatutBadge = (statut) => {
    const configs = {
      en_attente: { label: 'En attente', className: 'status-en-attente', icon: Clock },
      payee: { label: 'Payée', className: 'status-payee', icon: CheckCircle },
      partiellement_payee: { label: 'Partiellement payée', className: 'status-partiel', icon: AlertCircle },
      en_retard: { label: 'En retard', className: 'status-retard', icon: AlertCircle },
      annulee: { label: 'Annulée', className: 'status-annulee', icon: Ban },
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

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = factures.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(factures.length / itemsPerPage);

  // ============================================================
  // RENDER
  // ============================================================
  const renderFactureRow = (facture) => {
    const statutCalcule = getStatutCalcule(facture);
    return (
      <tr key={facture.id_facture}>
        <td className="numero-cell">
          <span className="facture-numero">{facture.numero_facture}</span>
        </td>
        <td>{facture.date_facture_formatee || formatDateFR(facture.date_facture)}</td>
        <td>{facture.date_echeance_formatee || formatDateFR(facture.date_echeance)}</td>
        <td className="client-cell">
          <User size={14} />
          <span>{facture.nomclient || '-'}</span>
        </td>
        <td>{facture.telephone || '-'}</td>
        <td>{facture.numero_commande || '-'}</td>
        <td className="montant-cell">
          <strong>{formatMontant(facture.montant_total)}</strong>
        </td>
        <td>{getStatutBadge(statutCalcule)}</td>
        <td className="actions-cell">
          <button
            className="action-btn btn-view"
            onClick={() => handleView(facture)}
            title="Voir"
          >
            <Eye size={16} />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="factures-container">
      {/* En-tête */}
      <div className="factures-header">
        <div>
          <h1 className="factures-title">Factures</h1>
          <p className="factures-subtitle">
            {stats.total_factures} factures au total
          </p>
        </div>
        <div className="factures-actions">
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
      <div className="factures-stats">
        <div className="stat-card">
          <div className="stat-icon total"><FileText size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Total</span>
            <span className="stat-value">{stats.total_factures}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon montant"><Banknote /></div>
          <div className="stat-info">
            <span className="stat-label">Montant total</span>
            <span className="stat-value">{formatMontant(stats.total_montant)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon impaye"><AlertCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Montant impayé</span>
            <span className="stat-value">{formatMontant(stats.montant_impaye)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon moyen"><TrendingUp size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Panier moyen</span>
            <span className="stat-value">{formatMontant(stats.montant_moyen)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon payee"><CheckCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Payées</span>
            <span className="stat-value">{stats.payee}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon retard"><AlertCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">En retard</span>
            <span className="stat-value">{stats.en_retard}</span>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="factures-filters">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher une facture..."
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
            <option value="payee">Payée</option>
            <option value="partiellement_payee">Partiellement payée</option>
            <option value="en_retard">En retard</option>
            <option value="annulee">Annulée</option>
          </select>
        </div>
        <div className="filter-group">
          <input
            type="date"
            className="filter-date"
            value={filterDateDebut}
            onChange={(e) => setFilterDateDebut(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <input
            type="date"
            className="filter-date"
            value={filterDateFin}
            onChange={(e) => setFilterDateFin(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-filter" onClick={loadFactures}>
          Filtrer
        </button>
        {(filterStatut || filterDateDebut || filterDateFin || searchTerm) && (
          <button
            className="btn btn-secondary btn-filter"
            onClick={() => {
              setFilterStatut("");
              setFilterDateDebut("");
              setFilterDateFin("");
              setSearchTerm("");
              loadFactures();
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
          <p>Chargement des factures...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-secondary" onClick={loadFactures}>
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="factures-table-container">
          <table className="factures-table">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Date</th>
                <th>Échéance</th>
                <th>Client</th>
                <th>Téléphone</th>
                <th>Commande</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-state">
                    <FileText size={32} />
                    <p>Aucune facture trouvée</p>
                  </td>
                </tr>
              ) : (
                currentItems.map(renderFactureRow)
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && factures.length > itemsPerPage && (
        <div className="factures-pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="pagination-info">
            Page {currentPage} sur {totalPages}
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

      {/* Modal Détails */}
      {showDetailModal && selectedFacture && (() => {
        const montantTotal = parseFloat(selectedFacture.montant_total || 0);
        const montantPaye = getMontantPaye(selectedFacture);
        const resteAPayer = getResteAPayer(selectedFacture);
        const statutCalcule = getStatutCalcule(selectedFacture);

        return (
          <div className="modal-overlay">
            <div className="modal-content large">
              <div className="modal-header">
                <h2>Détails de la facture</h2>
                <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                  <X size={24} />
                </button>
              </div>
              <div className="modal-body">
                <div className="detail-header">
                  <div className="detail-header-left">
                    <div className="detail-icon"><FileText size={28} /></div>
                    <div>
                      <h3 className="detail-numero">{selectedFacture.numero_facture}</h3>
                      <span className="detail-date">
                        <Calendar size={14} />
                        {selectedFacture.date_facture_formatee ||
                          formatDateFR(selectedFacture.date_facture)}
                      </span>
                    </div>
                  </div>
                  <div className="detail-header-right">
                    {getStatutBadge(statutCalcule)}
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-section">
                    <h4><User size={16} /> Client</h4>
                    <div className="detail-item">
                      <label>Nom</label>
                      <span>{selectedFacture.nomclient || '-'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Téléphone</label>
                      <span>{selectedFacture.telephone || '-'}</span>
                    </div>
                  </div>
                  <div className="detail-section">
                    <h4><FileText size={16} /> Informations</h4>
                    <div className="detail-item">
                      <label>Commande</label>
                      <span>{selectedFacture.numero_commande || '-'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Date d'échéance</label>
                      <span>
                        {selectedFacture.date_echeance_formatee ||
                          formatDateFR(selectedFacture.date_echeance)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Mode de paiement</label>
                      <span>{selectedFacture.mode_paiement || '-'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Montant total</label>
                      <span className="montant-total">{formatMontant(montantTotal)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Montant payé</label>
                      <span className="montant-paye">{formatMontant(montantPaye)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Reste à payer</label>
                      <span
                        className="montant-reste"
                        style={{ color: resteAPayer > 0 ? '#ef4444' : '#10b981' }}
                      >
                        {formatMontant(resteAPayer)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Notes</label>
                      <span>{selectedFacture.notes || '-'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Enregistré par</label>
                      <span>{selectedFacture.utilisateur_nom || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Lignes produits */}
                {selectedFacture.lignes && selectedFacture.lignes.length > 0 && (
                  <div className="detail-lignes">
                    <h4>Produits</h4>
                    <div className="detail-lignes-wrapper">
                      <table className="detail-lignes-table">
                        <thead>
                          <tr>
                            <th>Produit</th>
                            <th>Quantité</th>
                            <th>Prix unitaire</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFacture.lignes.map((ligne, index) => {
                            const qte = parseFloat(ligne.quantite || 0);
                            const prix = parseFloat(ligne.prix_vente || 0);
                            const remise = parseFloat(ligne.remise || 0);
                            const totalLigne = qte * prix * (1 - remise / 100);
                            return (
                              <tr key={index}>
                                <td>
                                  <span className="produit-nom">{ligne.produit_nom}</span>
                                  {ligne.marque_nom && (
                                    <span className="produit-marque"> - {ligne.marque_nom}</span>
                                  )}
                                </td>
                                <td>{qte} {ligne.unite_symbole || ''}</td>
                                <td>{formatMontant(prix)}</td>
                                <td className="montant-cell">{formatMontant(totalLigne)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="total-row">
                            <td colSpan="3"><strong>Total</strong></td>
                            <td><strong>{formatMontant(montantTotal)}</strong></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Paiements */}
                {selectedFacture.paiements && selectedFacture.paiements.length > 0 && (
                  <div className="detail-paiements">
                    <h4>Paiements</h4>
                    <table className="detail-paiements-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Montant</th>
                          <th>Mode</th>
                          <th>Référence</th>
                          <th>Par</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFacture.paiements.map((paiement, index) => (
                          <tr key={index}>
                            <td>
                              {paiement.date_paiement_formatee ||
                                formatDateFR(paiement.date_paiement)}
                            </td>
                            <td className="montant-cell">{formatMontant(paiement.montant)}</td>
                            <td>{paiement.mode_paiement}</td>
                            <td>{paiement.reference || '-'}</td>
                            <td>{paiement.utilisateur_nom || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <FacturePDFActions
                  factureData={{
                    ...selectedFacture,
                    montant_total: montantTotal,
                    total_paye: montantPaye,
                    reste_a_payer: resteAPayer,
                    statut: statutCalcule,
                    magasin: magasin,   // ✅ NOUVEAU : infos du magasin pour le PDF
                  }}
                  onClose={() => setShowDetailModal(false)}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Factures;