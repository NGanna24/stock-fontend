// pages/Mouvements/Mouvements.jsx
import React, { useState, useEffect } from "react";
import {
    Search, Eye, X, RefreshCw, ClipboardList, Download,
    ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, Repeat,
    User, Calendar, Package, ChevronLeft, ChevronRight
} from "lucide-react";
import MouvementStockService from "../../services/mouvementStockService";
import { useUser } from "../../context/AuthContext";
import StockSelector from "../../components/StockSelector/StockSelector";
import "./Mouvements.css";

const Mouvements = () => {
    const { isAuthenticated } = useUser();
    const token = localStorage.getItem('token');

    const [mouvements, setMouvements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterDateDebut, setFilterDateDebut] = useState("");
    const [filterDateFin, setFilterDateFin] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);
    const [selectedMouvement, setSelectedMouvement] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [stats, setStats] = useState({
        total: 0, total_entrees: 0, total_sorties: 0,
        total_ajustements: 0, total_transferts: 0,
        qte_entrees: 0, qte_sorties: 0, aujourdhui: 0
    });

    useEffect(() => {
        if (isAuthenticated && token) {
            loadMouvements();
            loadStats();
        }
    }, [isAuthenticated, token]);

    const loadMouvements = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (filterType) params.type_mouvement = filterType;
            if (filterDateDebut) params.date_debut = filterDateDebut;
            if (filterDateFin) params.date_fin = filterDateFin;

            const response = await MouvementStockService.getAll(token, params);
            if (response.success) {
                setMouvements(response.data || []);
            } else {
                setError(response.message || 'Erreur de chargement');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await MouvementStockService.getStats(token);
            if (response.success) setStats(response.data);
        } catch (err) {
            console.error('❌ LoadStats error:', err);
        }
    };

    const handleRefresh = () => {
        loadMouvements();
        loadStats();
    };

    const handleExport = async () => {
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (filterType) params.type_mouvement = filterType;
            if (filterDateDebut) params.date_debut = filterDateDebut;
            if (filterDateFin) params.date_fin = filterDateFin;
            await MouvementStockService.export(token, params);
        } catch (err) {
            alert('Erreur lors de l\'exportation : ' + err.message);
        }
    };

    const handleView = (mouvement) => {
        setSelectedMouvement(mouvement);
        setShowDetailModal(true);
    };

    const formatQte = (value) => {
        const n = parseFloat(value) || 0;
        return n.toLocaleString('fr-FR');
    };

    const getTypeBadge = (type) => {
        const configs = {
            'entree':     { label: 'Entrée',     className: 'type-entree',     icon: ArrowDownCircle },
            'sortie':     { label: 'Sortie',     className: 'type-sortie',     icon: ArrowUpCircle },
            'ajustement': { label: 'Ajustement', className: 'type-ajustement', icon: SlidersHorizontal },
            'transfert':  { label: 'Transfert',  className: 'type-transfert',  icon: Repeat },
        };
        const config = configs[type] || configs['entree'];
        const Icon = config.icon;
        return (
            <span className={`type-badge ${config.className}`}>
                <Icon size={14} />
                {config.label}
            </span>
        );
    };

    const getReferenceLabel = (m) => {
        if (!m.type_reference) return '-';
        const labels = {
            reception: 'Réception',
            vente: 'Vente',
            ajustement: 'Ajustement',
            transfert: 'Transfert',
            retour_client: 'Retour client',
            retour_fournisseur: 'Retour fournisseur',
            perte: 'Perte / Casse'
        };
        const label = labels[m.type_reference] || m.type_reference;
        return m.id_reference ? `${label} #${m.id_reference}` : label;
    };

    // Pagination
    const filtered = mouvements;
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    return (
        <div className="mouvements-container">
            {/* En-tête */}
            <div className="mouvements-header">
                <div>
                    <h1 className="mouvements-title">Mouvements de stock</h1>
                    <p className="mouvements-subtitle">
                        {stats.total} mouvements enregistrés • Historique automatique
                    </p>
                </div>
                <div className="mouvements-actions">
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <Download size={18} />
                        <span>Exporter</span>
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Rafraîchir"
                    >
                        <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* Statistiques */}
            <div className="mouvements-stats">
                <div className="stat-card">
                    <div className="stat-icon total"><ClipboardList size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Total</span>
                        <span className="stat-value">{stats.total}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon entree"><ArrowDownCircle size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Entrées</span>
                        <span className="stat-value">{stats.total_entrees} ({formatQte(stats.qte_entrees)})</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon sortie"><ArrowUpCircle size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Sorties</span>
                        <span className="stat-value">{stats.total_sorties} ({formatQte(stats.qte_sorties)})</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon ajust"><SlidersHorizontal size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Ajustements</span>
                        <span className="stat-value">{stats.total_ajustements}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon trans"><Repeat size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Transferts</span>
                        <span className="stat-value">{stats.total_transferts}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon auj"><Calendar size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Aujourd'hui</span>
                        <span className="stat-value">{stats.aujourdhui}</span>
                    </div>
                </div>
            </div>

            {/* Filtres */}
            <div className="mouvements-filters">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher un mouvement..."
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

                <select
                    className="filter-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="">Tous les types</option>
                    <option value="entree">Entrées</option>
                    <option value="sortie">Sorties</option>
                    <option value="ajustement">Ajustements</option>
                    <option value="transfert">Transferts</option>
                </select>

                <input
                    type="date"
                    className="filter-date"
                    value={filterDateDebut}
                    onChange={(e) => setFilterDateDebut(e.target.value)}
                />
                <input
                    type="date"
                    className="filter-date"
                    value={filterDateFin}
                    onChange={(e) => setFilterDateFin(e.target.value)}
                />

                <button className="btn btn-primary btn-filter" onClick={loadMouvements}>
                    Filtrer
                </button>

                {(filterType || filterDateDebut || filterDateFin || searchTerm) && (
                    <button
                        className="btn btn-secondary btn-filter"
                        onClick={() => {
                            setFilterType("");
                            setFilterDateDebut("");
                            setFilterDateFin("");
                            setSearchTerm("");
                            setTimeout(loadMouvements, 0);
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
                    <p>Chargement des mouvements...</p>
                </div>
            )}

            {error && !loading && (
                <div className="error-container">
                    <p className="error-message">{error}</p>
                    <button className="btn btn-secondary" onClick={loadMouvements}>
                        Réessayer
                    </button>
                </div>
            )}

            {!loading && !error && (
                <div className="mouvements-table-container">
                    <table className="mouvements-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Produit</th>
                                <th>Quantité</th>
                                <th>Ancien</th>
                                <th>Nouveau</th>
                                <th>Référence</th>
                                <th>Utilisateur</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="empty-state">
                                        <ClipboardList size={32} />
                                        <p>Aucun mouvement trouvé</p>
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((m) => (
                                    <tr key={m.id_mouvement}>
                                        <td>
                                            {m.date_mouvement_formatee ||
                                                new Date(m.date_mouvement).toLocaleString('fr-FR')}
                                        </td>
                                        <td>{getTypeBadge(m.type_mouvement)}</td>
                                        <td>
                                            <span className="produit-nom">{m.produit_nom || '-'}</span>
                                            {m.marque_nom && (
                                                <span className="produit-marque"> — {m.marque_nom}</span>
                                            )}
                                        </td>
                                        {/* ✅ Utilisation du composant StockSelector */}
                                        <td className="qte-cell">
                                            <StockSelector
                                                idProduit={m.id_produit}
                                                stockBase={m.quantite}
                                                unitesVente={m.unites_vente || []}
                                                uniteBase={{
                                                    nom: m.unite_nom,
                                                    symbole: m.unite_symbole
                                                }}
                                                isRupture={false}
                                                variant="list"
                                            />
                                        </td>
                                        <td>{formatQte(m.ancienne_quantite)}</td>
                                        <td>{formatQte(m.nouvelle_quantite)}</td>
                                        <td>{getReferenceLabel(m)}</td>
                                        <td>{m.utilisateur_nom || '-'}</td>
                                        <td className="actions-cell">
                                            <button
                                                className="action-btn btn-view"
                                                onClick={() => handleView(m)}
                                                title="Voir détails"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {!loading && !error && filtered.length > itemsPerPage && (
                <div className="mouvements-pagination">
                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="pagination-info">
                        Page {currentPage} sur {totalPages}
                    </span>
                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* Modal détails */}
            {showDetailModal && selectedMouvement && (
                <div className="modal-overlay">
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Détails du mouvement</h2>
                            <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="detail-item">
                                <label>Type</label>
                                <span>{getTypeBadge(selectedMouvement.type_mouvement)}</span>
                            </div>

                            <div className="detail-item">
                                <label>Produit</label>
                                <span>
                                    <Package size={14} />
                                    {' '}
                                    {selectedMouvement.produit_nom || '-'}
                                    {selectedMouvement.marque_nom && ` (${selectedMouvement.marque_nom})`}
                                </span>
                            </div>

                            {/* ✅ Quantité via StockSelector */}
                            <div className="detail-item">
                                <label>Quantité</label>
                                <span>
                                    <StockSelector
                                        idProduit={selectedMouvement.id_produit}
                                        stockBase={selectedMouvement.quantite}
                                        unitesVente={selectedMouvement.unites_vente || []}
                                        uniteBase={{
                                            nom: selectedMouvement.unite_nom,
                                            symbole: selectedMouvement.unite_symbole
                                        }}
                                        isRupture={false}
                                        variant="details"
                                    />
                                </span>
                            </div>

                            <div className="detail-item">
                                <label>Ancienne quantité</label>
                                <span>{formatQte(selectedMouvement.ancienne_quantite)}</span>
                            </div>

                            <div className="detail-item">
                                <label>Nouvelle quantité</label>
                                <span>{formatQte(selectedMouvement.nouvelle_quantite)}</span>
                            </div>

                            <div className="detail-item">
                                <label>Référence</label>
                                <span>{getReferenceLabel(selectedMouvement)}</span>
                            </div>

                            <div className="detail-item">
                                <label>Date</label>
                                <span>
                                    <Calendar size={14} />
                                    {' '}
                                    {selectedMouvement.date_mouvement_formatee ||
                                        new Date(selectedMouvement.date_mouvement).toLocaleString('fr-FR')}
                                </span>
                            </div>

                            <div className="detail-item">
                                <label>Utilisateur</label>
                                <span>
                                    <User size={14} />
                                    {' '}
                                    {selectedMouvement.utilisateur_nom || '-'}
                                </span>
                            </div>

                            <div className="detail-item">
                                <label>Notes</label>
                                <span>{selectedMouvement.notes || '-'}</span>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDetailModal(false)}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Mouvements;