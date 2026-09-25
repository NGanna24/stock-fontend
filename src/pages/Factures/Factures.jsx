// pages/Factures/Factures.jsx
import React, { useState, useEffect, useRef } from "react";
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
  Wallet,
  CreditCard,
  Building,
  Coins,
  Printer,
  Loader,
  Phone,
  Box,
} from "lucide-react"; 
import FactureService from "../../services/factureService";
import CommandeVenteService from "../../services/commandeVenteService";
import MagasinService from "../../services/magasinService";
import { useUser } from "../../context/AuthContext";
import FacturePDFActions from "../../components/Facture/FacturePDFActions";
import "./Factures.css";

// ============================================================
// HELPERS
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

const getTodayISO = () => new Date().toISOString().split('T')[0];

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

  // Filtres
  const [filterStatut, setFilterStatut] = useState("");
  const [filterDateDebut, setFilterDateDebut] = useState("");
  const [filterDateFin, setFilterDateFin] = useState("");

  const debounceRef = useRef(null);

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState(null);

  // Modal Paiement
  const [showPaiementModal, setShowPaiementModal] = useState(false);
  const [factureEnCours, setFactureEnCours] = useState(null);
  const [paiementData, setPaiementData] = useState({
    montant: "",
    mode_paiement: "especes",
  });
  const [savingPaiement, setSavingPaiement] = useState(false);

  // Modal Facture (après paiement)
  const [showFactureModal, setShowFactureModal] = useState(false);
  const [facturePourImpression, setFacturePourImpression] = useState(null);

  // Magasin
  const [magasin, setMagasin] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Stats
  const [stats, setStats] = useState({
    total_factures: 0,
    total_montant: 0,
    en_attente: 0,
    payee: 0,
    partiellement_payee: 0,
    en_retard: 0,
    annulee: 0,
    total_impayees: 0,
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

  // Debounce filtres
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      loadFactures();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, filterStatut, filterDateDebut, filterDateFin, isAuthenticated, token]);

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
    if (facture.statut_effectif) return facture.statut_effectif;

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

  // ✅ Construire une facture complète depuis une commande (même logique que Ventes.jsx)
  const construireFactureComplete = (commandeComplete) => {
    const montantTotal = parseFloat(commandeComplete.montant_total) || 0;
    const totalPaye = (commandeComplete.paiements || []).reduce(
      (sum, p) => sum + (parseFloat(p.montant) || 0),
      0
    );
    const resteAPayer = montantTotal - totalPaye;

    return {
      id_facture: commandeComplete.id_facture,
      numero_facture: commandeComplete.numero_facture,
      date_facture: commandeComplete.date_facture,
      date_echeance: commandeComplete.date_echeance,
      nomclient: commandeComplete.nomclient,
      telephone: commandeComplete.telephone,
      montant_total: montantTotal,
      statut: commandeComplete.statut_facture || 'en_attente',
      statut_effectif: commandeComplete.statut_facture || 'en_attente',
      mode_paiement: commandeComplete.mode_paiement || 'especes',
      notes: commandeComplete.notes,
      // ✅ Lignes avec fallback complet
      lignes: (commandeComplete.lignes || []).map(l => ({
        ...l,
        produit_nom: l.produit_nom || '-',
        nom_unite_vente: l.nom_unite_vente || l.unite_vente_nom || 'Unité',
        unite_symbole: l.unite_symbole || l.nom_unite_vente || '',
        quantite_base: parseFloat(l.quantite_base) || 1,
        quantite_totale_base: parseFloat(l.quantite_totale_base)
          || (parseFloat(l.quantite) * (parseFloat(l.quantite_base) || 1)),
        prix_vente: parseFloat(l.prix_vente) || 0,
        montant_total: parseFloat(l.montant_total)
          || (parseFloat(l.quantite) * parseFloat(l.prix_vente || 0)),
      })),
      paiements: commandeComplete.paiements || [],
      total_paye: totalPaye,
      reste_a_payer: resteAPayer,
      numero_commande: commandeComplete.numero_commande,
      id_commande: commandeComplete.id_commande,
      magasin: magasin,
    };
  };

  // ============================================================
  // ACTIONS
  // ============================================================
  const handleView = async (facture) => {
    setSelectedFacture(facture);
    setShowDetailModal(true);

    try {
      const res = await FactureService.getFactureById(token, facture.id_facture);
      if (res.success && res.data) {
        setSelectedFacture(res.data);
      }
    } catch (err) {
      console.error('❌ Impossible de charger la facture complète :', err);
    }
  };

  // ✅ Ouvrir le modal de paiement
  const handleOpenPaiement = (facture) => {
    const reste = getResteAPayer(facture);
    if (reste <= 0) {
      showToast('Cette facture est déjà totalement payée', 'info');
      return;
    }
    if (facture.statut === 'annulee') {
      showToast('Impossible de payer une facture annulée', 'error');
      return;
    }

    setFactureEnCours(facture);
    setPaiementData({
      montant: reste.toString(),
      mode_paiement: facture.mode_paiement || 'especes',
    });
    setShowPaiementModal(true);
    setShowDetailModal(false);
  };

  // ✅ Enregistrer le paiement (même logique que Ventes.jsx)
  const handleSavePaiement = async () => {
    if (!factureEnCours) return;

    const montant = parseFloat(paiementData.montant);
    if (!montant || montant <= 0) {
      showToast('Veuillez saisir un montant valide', 'warning');
      return;
    }

    const reste = getResteAPayer(factureEnCours);
    if (montant > reste) {
      showToast(
        `Le montant ne peut pas dépasser le reste à payer (${formatMontant(reste)})`,
        'warning'
      );
      return;
    }

    // ✅ Vérifier qu'on a bien un id_commande pour utiliser l'API de CommandeVente
    if (!factureEnCours.id_commande) {
      showToast('Impossible de trouver la commande associée', 'error');
      return;
    }

    setSavingPaiement(true);
    try {
      // ✅ Utiliser l'API CommandeVente (comme dans Ventes.jsx)
      const paiementResponse = await CommandeVenteService.addPaiement(
        token,
        factureEnCours.id_commande,
        {
          id_facture: factureEnCours.id_facture,
          date_paiement: getTodayISO(),
          montant: montant,
          mode_paiement: paiementData.mode_paiement || 'especes',
          note: `Paiement pour facture ${factureEnCours.numero_facture}`,
          reference: null,
        }
      );

      if (!paiementResponse.success) {
        throw new Error(paiementResponse.message || 'Erreur lors du paiement');
      }

      // ✅ Recharger la COMMANDE complète (comme dans Ventes.jsx)
      const commandeComplete = await CommandeVenteService.getCommandeById(
        token,
        factureEnCours.id_commande
      );

      let factureComplete = null;

      if (commandeComplete.success && commandeComplete.data) {
        factureComplete = construireFactureComplete(commandeComplete.data);

        setFactureEnCours(factureComplete);
        setFacturePourImpression(factureComplete);
      }

      // ✅ Recharger la liste + stats
      await Promise.all([loadFactures(), loadStats()]);

      // ✅ Fermer le modal paiement
      setShowPaiementModal(false);

      // ✅ Ouvrir le modal Facture
      if (factureComplete) {
        setFacturePourImpression(factureComplete);
        setShowFactureModal(true);
      }

      showToast(
        `Paiement de ${formatMontant(montant)} enregistré avec succès`,
        'success'
      );
    } catch (e) {
      console.error('❌ SavePaiement error:', e);
      showToast(e.message || 'Erreur lors du paiement', 'error');
    } finally {
      setSavingPaiement(false);
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
      showToast('Erreur lors de l\'exportation', 'error');
    }
  };

  const handleRefresh = () => {
    loadFactures();
    loadStats();
    loadMagasin();
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterStatut("");
    setFilterDateDebut("");
    setFilterDateFin("");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || filterStatut || filterDateDebut || filterDateFin;

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
  // RENDER LIGNE
  // ============================================================
  const renderFactureRow = (facture) => {
    const statutCalcule = getStatutCalcule(facture);
    const reste = getResteAPayer(facture);
    const peutPayer = canManage && facture.statut !== 'annulee' && reste > 0;

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
          <div className="actions-buttons">
            <button
              className="action-btn btn-view"
              onClick={() => handleView(facture)}
              title="Voir les détails"
            >
              <Eye size={16} />
            </button>

            {peutPayer && (
              <button
                className="action-btn btn-pay"
                onClick={() => handleOpenPaiement(facture)}
                title={`Enregistrer un paiement (reste: ${formatMontant(reste)})`}
              >
                <Wallet size={16} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="factures-container">
      {/* Toast */}
      {toast && (
        <div className={`factures-toast factures-toast-${toast.type}`}>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {/* En-tête */}
      <div className="factures-header">
        <div>
          <h1 className="factures-title">Factures</h1>
          <p className="factures-subtitle">
            {stats.total_factures} factures au total
            {hasActiveFilters && ` • ${factures.length} résultat(s) affiché(s)`}
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

      {/* Stats */}
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

        <div
          className="stat-card clickable"
          onClick={() => setFilterStatut('impayees')}
          title="Cliquer pour voir toutes les factures impayées"
        >
          <div className="stat-icon impaye"><AlertCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">
              Impayées
              {stats.total_impayees > 0 && (
                <span className="badge-count">{stats.total_impayees}</span>
              )}
            </span>
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
            <option value="impayees">🔴 Impayées (toutes)</option>
            <option value="en_attente">En attente</option>
            <option value="partiellement_payee">Partiellement payée</option>
            <option value="en_retard">En retard</option>
            <option value="payee">Payée</option>
            <option value="annulee">Annulée</option>
          </select>
        </div>
        <div className="filter-group">
          <input
            type="date"
            className="filter-date"
            value={filterDateDebut}
            onChange={(e) => setFilterDateDebut(e.target.value)}
            title="Date de début"
          />
        </div>
        <div className="filter-group">
          <input
            type="date"
            className="filter-date"
            value={filterDateFin}
            onChange={(e) => setFilterDateFin(e.target.value)}
            title="Date de fin"
          />
        </div>
        {hasActiveFilters && (
          <button
            className="btn btn-secondary btn-filter"
            onClick={handleResetFilters}
          >
            <X size={16} />
            <span>Réinitialiser</span>
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
                    {hasActiveFilters && (
                      <small>Essayez de modifier vos filtres</small>
                    )}
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

      {/* ============================================================
          MODAL DÉTAILS
          ============================================================ */}
      {showDetailModal && selectedFacture && (() => {
        const montantTotal = parseFloat(selectedFacture.montant_total || 0);
        const montantPaye = getMontantPaye(selectedFacture);
        const resteAPayer = getResteAPayer(selectedFacture);
        const statutCalcule = getStatutCalcule(selectedFacture);
        const peutPayer = canManage && selectedFacture.statut !== 'annulee' && resteAPayer > 0;

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

                {selectedFacture.lignes && selectedFacture.lignes.length > 0 && (
                  <div className="detail-lignes">
                    <h4>Produits</h4>
                    <div className="detail-lignes-wrapper">
                      <table className="detail-lignes-table">
                        <thead>
                          <tr>
                            <th>Produit</th>
                            <th>Unité</th>
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
                                <td>
                                  <span className="unite-badge">
                                    <Box size={11} />
                                    {ligne.nom_unite_vente || ligne.unite_symbole || 'Unité'}
                                    {ligne.quantite_base > 1 && ` (${ligne.quantite_base})`}
                                  </span>
                                </td>
                                <td>{qte}</td>
                                <td>{formatMontant(prix)}</td>
                                <td className="montant-cell">{formatMontant(totalLigne)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="total-row">
                            <td colSpan="4"><strong>Total</strong></td>
                            <td><strong>{formatMontant(montantTotal)}</strong></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

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
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  Fermer
                </button>

                {peutPayer && (
                  <button
                    className="btn btn-success"
                    onClick={() => handleOpenPaiement(selectedFacture)}
                  >
                    <Wallet size={16} />
                    <span>
                      {statutCalcule === 'partiellement_payee'
                        ? 'Compléter le paiement'
                        : 'Payer'}
                    </span>
                  </button>
                )}

                <FacturePDFActions
                  factureData={{
                    ...selectedFacture,
                    montant_total: montantTotal,
                    total_paye: montantPaye,
                    reste_a_payer: resteAPayer,
                    statut: statutCalcule,
                    magasin: magasin,
                  }}
                  onClose={() => setShowDetailModal(false)}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================
          MODAL PAIEMENT
          ============================================================ */}
      {showPaiementModal && factureEnCours && (
        <div
          className="modal-overlay"
          onClick={() => !savingPaiement && setShowPaiementModal(false)}
        >
          <div
            className="modal-content modal-paiement"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon success">
                  <Wallet size={22} />
                </div>
                <div>
                  <h2>Paiement de la facture</h2>
                  <p className="modal-subtitle">
                    Facture {factureEnCours.numero_facture}
                  </p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => !savingPaiement && setShowPaiementModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="paiement-recap">
                <div className="recap-client">
                  <User size={18} />
                  <span>{factureEnCours.nomclient || 'Client'}</span>
                </div>
                <div className="recap-line">
                  <span>Montant total</span>
                  <strong>{formatMontant(factureEnCours.montant_total)}</strong>
                </div>
                <div className="recap-line">
                  <span>Déjà payé</span>
                  <strong className="text-success">
                    {formatMontant(getMontantPaye(factureEnCours))}
                  </strong>
                </div>
                <div className="recap-line highlight">
                  <span>Reste à payer</span>
                  <strong className="text-danger">
                    {formatMontant(getResteAPayer(factureEnCours))}
                  </strong>
                </div>
              </div>

              <div className="form-group">
                <label>
                  Montant à payer <span className="required">*</span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={paiementData.montant}
                  onChange={(e) =>
                    setPaiementData({ ...paiementData, montant: e.target.value })
                  }
                  placeholder="0"
                  min="0"
                  step="0.01"
                  autoFocus
                  disabled={savingPaiement}
                />
                <small>
                  Maximum : {formatMontant(getResteAPayer(factureEnCours))}
                </small>
              </div>

              <div className="form-group">
                <label>Mode de paiement</label>
                <div className="paiement-modes">
                  <button
                    type="button"
                    className={`paiement-mode-btn ${paiementData.mode_paiement === 'especes' ? 'active' : ''}`}
                    onClick={() => setPaiementData({ ...paiementData, mode_paiement: 'especes' })}
                    disabled={savingPaiement}
                  >
                    <Coins size={20} />
                    <span>Espèces</span>
                  </button>
                  <button
                    type="button"
                    className={`paiement-mode-btn ${paiementData.mode_paiement === 'carte' ? 'active' : ''}`}
                    onClick={() => setPaiementData({ ...paiementData, mode_paiement: 'carte' })}
                    disabled={savingPaiement}
                  >
                    <CreditCard size={20} />
                    <span>Carte</span>
                  </button>
                  <button
                    type="button"
                    className={`paiement-mode-btn ${paiementData.mode_paiement === 'virement' ? 'active' : ''}`}
                    onClick={() => setPaiementData({ ...paiementData, mode_paiement: 'virement' })}
                    disabled={savingPaiement}
                  >
                    <Building size={20} />
                    <span>Virement</span>
                  </button>
                  <button
                    type="button"
                    className={`paiement-mode-btn ${paiementData.mode_paiement === 'cheque' ? 'active' : ''}`}
                    onClick={() => setPaiementData({ ...paiementData, mode_paiement: 'cheque' })}
                    disabled={savingPaiement}
                  >
                    <FileText size={20} />
                    <span>Chèque</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowPaiementModal(false)}
                disabled={savingPaiement}
              >
                Annuler
              </button>
              <button
                className="btn btn-success"
                onClick={handleSavePaiement}
                disabled={savingPaiement || !paiementData.montant}
              >
                {savingPaiement ? (
                  <>
                    <Loader size={16} className="spinning" />
                    <span>Paiement...</span>
                  </>
                ) : (
                  <>
                    <Wallet size={16} />
                    <span>Payer {formatMontant(paiementData.montant || 0)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL FACTURE (après paiement)
          ============================================================ */}
      {showFactureModal && facturePourImpression && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-icon">
                  <FileText size={20} />
                </div>
                <div>
                  <h2>Facture {facturePourImpression.numero_facture}</h2>
                  <p className="modal-subtitle">
                    {getStatutCalcule(facturePourImpression) === 'payee'
                      ? '✅ Facture totalement payée'
                      : `Reste à payer : ${formatMontant(getResteAPayer(facturePourImpression))}`
                    }
                  </p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowFactureModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="paiement-recap">
                <div className="recap-client">
                  <User size={18} />
                  <span>{facturePourImpression.nomclient || 'Client'}</span>
                </div>
                <div className="recap-line">
                  <span>Montant total</span>
                  <strong>{formatMontant(facturePourImpression.montant_total)}</strong>
                </div>
                <div className="recap-line">
                  <span>Total payé</span>
                  <strong className="text-success">
                    {formatMontant(getMontantPaye(facturePourImpression))}
                  </strong>
                </div>
                <div className="recap-line highlight">
                  <span>Reste à payer</span>
                  <strong className={
                    getResteAPayer(facturePourImpression) > 0 ? 'text-danger' : 'text-success'
                  }>
                    {formatMontant(getResteAPayer(facturePourImpression))}
                  </strong>
                </div>
              </div>

              {facturePourImpression.lignes && facturePourImpression.lignes.length > 0 ? (
                <div className="detail-lignes">
                  <h4>Produits ({facturePourImpression.lignes.length})</h4>
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
                      {facturePourImpression.lignes.map((l, i) => (
                        <tr key={i}>
                          <td>{l.produit_nom || '-'}</td>
                          <td>
                            {l.nom_unite_vente || l.unite_symbole || 'Unité'}
                            {l.quantite_base > 1 && ` (${l.quantite_base})`}
                          </td>
                          <td>{l.quantite}</td>
                          <td>{formatMontant(l.prix_vente)}</td>
                          <td className="montant-cell">
                            {formatMontant(l.montant_total || (l.quantite * l.prix_vente))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan="4"><strong>TOTAL</strong></td>
                        <td><strong>{formatMontant(facturePourImpression.montant_total)}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="facture-info-banner warning">
                  <AlertCircle size={20} />
                  <span>
                    ⚠️ Aucune ligne détectée. Vérifiez que la facture contient bien des produits.
                  </span>
                </div>
              )}

              <div className="facture-info-banner">
                <CheckCircle size={20} />
                <span>
                  Vous pouvez maintenant imprimer ou télécharger la facture.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowFactureModal(false)}
              >
                Fermer
              </button>

              <FacturePDFActions
                factureData={{
                  ...facturePourImpression,
                  magasin: magasin,
                }}
                onClose={() => setShowFactureModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Factures;