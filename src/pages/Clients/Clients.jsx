// pages/Clients/Clients.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Search, Eye, X, RefreshCw, Users, Download,
    UserPlus, ChevronLeft, ChevronRight, TrendingUp,
    UserCheck, UserX, ShoppingCart, Banknote, Phone
} from "lucide-react";
import ClientService from "../../services/clientService";
import { useUser } from "../../context/AuthContext";
import "./Clients.css";

const Clients = () => {
    const { isAuthenticated } = useUser();
    const { slug } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDateDebut, setFilterDateDebut] = useState("");
    const [filterDateFin, setFilterDateFin] = useState("");
    const [orderBy, setOrderBy] = useState("derniere_commande");
    const [orderDir, setOrderDir] = useState("DESC");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);

    const [stats, setStats] = useState({
        total_clients: 0,
        clients_actifs_30j: 0,
        clients_actifs_7j: 0,
        clients_actifs_24h: 0,
        panier_moyen: 0,
        nouveaux_clients_mois: 0
    });

    useEffect(() => {
        if (isAuthenticated && token) {
            loadClients();
            loadStats();
        }
    }, [isAuthenticated, token]);

    const loadClients = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (filterDateDebut) params.date_debut = filterDateDebut;
            if (filterDateFin) params.date_fin = filterDateFin;
            params.order_by = orderBy;
            params.order_dir = orderDir;

            const res = await ClientService.getAll(token, params);
            if (res.success) {
                setClients(res.data || []);
            } else {
                setError(res.message || 'Erreur de chargement');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const res = await ClientService.getStats(token);
            if (res.success) setStats(res.data);
        } catch (e) {
            console.error('Stats error:', e);
        }
    };

    const handleView = (client) => {
        if (!client.telephone) return;
        navigate(`/${slug}/clients/${encodeURIComponent(client.telephone)}`);
    };

    const handleExport = async () => {
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (filterDateDebut) params.date_debut = filterDateDebut;
            if (filterDateFin) params.date_fin = filterDateFin;
            await ClientService.export(token, params);
        } catch (e) {
            alert('Erreur lors de l\'exportation : ' + e.message);
        }
    };

    const handleRefresh = () => {
        loadClients();
        loadStats();
    };

    // ==================== FORMATAGE ====================
    const formatMontant = (value) => {
        const num = parseFloat(value) || 0;
        return Math.round(num).toLocaleString('fr-FR') + ' FCFA';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR');
    };

    const getClientStatus = (client) => {
        if (!client.derniere_commande) return { label: 'Inactif', cls: 'status-inactif' };
        const jours = Math.floor(
            (new Date() - new Date(client.derniere_commande)) / (1000 * 60 * 60 * 24)
        );
        if (jours <= 7) return { label: 'Actif', cls: 'status-actif' };
        if (jours <= 30) return { label: 'Récent', cls: 'status-recent' };
        if (jours <= 90) return { label: 'Occasionnel', cls: 'status-occasionnel' };
        return { label: 'Inactif', cls: 'status-inactif' };
    };

    // Pagination
    const filtered = clients;
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    return (
        <div className="clients-container">
            {/* En-tête */}
            <div className="clients-header">
                <div>
                    <h1 className="clients-title">👥 Clients</h1>
                    <p className="clients-subtitle">
                        {stats.total_clients} clients • {stats.clients_actifs_30j} actifs ce mois
                    </p>
                </div>
                <div className="clients-actions">
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
            <div className="clients-stats">
                <div className="stat-card">
                    <div className="stat-icon total"><Users size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Total clients</span>
                        <span className="stat-value">{stats.total_clients}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon actif"><UserCheck size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Actifs (7j)</span>
                        <span className="stat-value">{stats.clients_actifs_7j}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon recent"><UserCheck size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Actifs (30j)</span>
                        <span className="stat-value">{stats.clients_actifs_30j}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon nouveau"><UserPlus size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Nouveaux ce mois</span>
                        <span className="stat-value">{stats.nouveaux_clients_mois}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon panier"><ShoppingCart size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Panier moyen</span>
                        <span className="stat-value">{formatMontant(stats.panier_moyen)}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon actif24"><TrendingUp size={20} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Actifs (24h)</span>
                        <span className="stat-value">{stats.clients_actifs_24h}</span>
                    </div>
                </div>
            </div>

            {/* Filtres */}
            <div className="clients-filters">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher un client (nom ou téléphone)..."
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
                <input
                    type="date"
                    className="filter-date"
                    value={filterDateDebut}
                    onChange={(e) => setFilterDateDebut(e.target.value)}
                    placeholder="Date début"
                />
                <input
                    type="date"
                    className="filter-date"
                    value={filterDateFin}
                    onChange={(e) => setFilterDateFin(e.target.value)}
                    placeholder="Date fin"
                />
                <select
                    className="filter-select"
                    value={orderBy}
                    onChange={(e) => setOrderBy(e.target.value)}
                >
                    <option value="derniere_commande">Trier par : Dernière commande</option>
                    <option value="total_achats">Trier par : Total achats</option>
                    <option value="nb_commandes">Trier par : Nb commandes</option>
                    <option value="nomclient">Trier par : Nom</option>
                    <option value="premiere_commande">Trier par : Première commande</option>
                </select>
                <select
                    className="filter-select"
                    value={orderDir}
                    onChange={(e) => setOrderDir(e.target.value)}
                >
                    <option value="DESC">Décroissant</option>
                    <option value="ASC">Croissant</option>
                </select>
                <button className="btn btn-primary btn-filter" onClick={loadClients}>
                    Filtrer
                </button>
                {(searchTerm || filterDateDebut || filterDateFin) && (
                    <button
                        className="btn btn-secondary btn-filter"
                        onClick={() => {
                            setSearchTerm("");
                            setFilterDateDebut("");
                            setFilterDateFin("");
                            setTimeout(loadClients, 0);
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
                    <p>Chargement des clients...</p>
                </div>
            )}

            {error && !loading && (
                <div className="error-container">
                    <p className="error-message">{error}</p>
                    <button className="btn btn-secondary" onClick={loadClients}>
                        Réessayer
                    </button>
                </div>
            )}

            {!loading && !error && (
                <div className="clients-table-container">
                    <table className="clients-table">
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Téléphone</th>
                                <th>Commandes</th>
                                <th>Total achats</th>
                                <th>Panier moyen</th>
                                <th>Impayé</th>
                                <th>Dernière commande</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="empty-state">
                                        <Users size={32} />
                                        <p>Aucun client trouvé</p>
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((client) => {
                                    const status = getClientStatus(client);
                                    return (
                                        <tr key={client.telephone}>
                                            <td className="client-cell">
                                                <span className="client-avatar">
                                                    {client.nomclient
                                                        ? client.nomclient.charAt(0).toUpperCase()
                                                        : '?'}
                                                </span>
                                                <span className="client-nom">
                                                    {client.nomclient || 'Sans nom'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="client-tel">
                                                    <Phone size={14} />
                                                    {client.telephone}
                                                </span>
                                            </td>
                                            <td>
                                                <strong>{client.nb_commandes}</strong>
                                            </td>
                                            <td className="montant-cell">
                                                <strong>{formatMontant(client.total_achats)}</strong>
                                            </td>
                                            <td>{formatMontant(client.panier_moyen)}</td>
                                            <td>
                                                {client.montant_impaye > 0 ? (
                                                    <span className="impaye-badge">
                                                        {formatMontant(client.montant_impaye)}
                                                    </span>
                                                ) : (
                                                    <span className="ok-badge">—</span>
                                                )}
                                            </td>
                                            <td>{formatDate(client.derniere_commande)}</td>
                                            <td>
                                                <span className={`status-badge ${status.cls}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                <button
                                                    className="action-btn btn-view"
                                                    onClick={() => handleView(client)}
                                                    title="Voir la fiche"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {!loading && !error && filtered.length > itemsPerPage && (
                <div className="clients-pagination">
                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="pagination-info">
                        Page {currentPage} sur {totalPages}
                    </span>
                    <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Clients;