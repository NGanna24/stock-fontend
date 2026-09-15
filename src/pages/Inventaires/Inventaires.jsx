// pages/Inventaires/Inventaires.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Search, Eye, Plus, X, RefreshCw, ClipboardList,
    Calendar, CheckCircle, Clock, Ban, AlertCircle,
    PlayCircle, ChevronLeft, ChevronRight, Trash2
} from "lucide-react";
import InventaireService from "../../services/inventaireService";
import { useUser } from "../../context/AuthContext";
import "./Inventaires.css";

const Inventaires = () => {
    const { isAuthenticated, user } = useUser();
    const { slug } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [inventaires, setInventaires] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatut, setFilterStatut] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterDateDebut, setFilterDateDebut] = useState("");
    const [filterDateFin, setFilterDateFin] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [stats, setStats] = useState({
        total: 0, planifie: 0, en_cours: 0, termine: 0, annule: 0, aujourdhui: 0
    });

    // Formulaire de création
    const [formData, setFormData] = useState({
        libelle: "",
        date_debut: new Date().toISOString().split('T')[0],
        type_inventaire: "complet",
        notes: ""
    });

    const canManage = user && ['admin', 'manager', 'gestionnaire'].includes(user.role);

    useEffect(() => {
        if (isAuthenticated && token) {
            loadInventaires();
            loadStats();
        }
    }, [isAuthenticated, token]);

    // ✅ Charge la LISTE (getAll) — pas getById
    const loadInventaires = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (filterStatut) params.statut = filterStatut;
            if (filterType) params.type_inventaire = filterType;
            if (filterDateDebut) params.date_debut = filterDateDebut;
            if (filterDateFin) params.date_fin = filterDateFin;

            const res = await InventaireService.getAll(token, params);
            if (res.success) setInventaires(res.data || []);
            else setError(res.message || 'Erreur de chargement');
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const res = await InventaireService.getStats(token);
            if (res.success) setStats(res.data);
        } catch (e) {
            console.error('Stats error:', e);
        }
    };

    const handleCreate = async () => {
        if (!formData.libelle.trim()) {
            alert('Le libellé est obligatoire');
            return;
        }
        try {
            const res = await InventaireService.create(token, formData);
            if (res.success && res.data?.id_inventaire) {
                setShowCreateModal(false);
                setFormData({
                    libelle: "",
                    date_debut: new Date().toISOString().split('T')[0],
                    type_inventaire: "complet",
                    notes: ""
                });
                loadInventaires();
                loadStats();
                // ✅ Naviguer vers le détail avec le bon id
                navigate(`/${slug}/inventaires/${res.data.id_inventaire}`);
            }
        } catch (e) {
            alert('Erreur : ' + e.message);
        }
    };

    const handleDemarrer = async (id) => {
        if (!window.confirm('Démarrer cet inventaire ? Les lignes seront générées à partir du stock actuel.')) return;
        try {
            const res = await InventaireService.demarrer(token, id);
            if (res.success) {
                loadInventaires();
                loadStats();
                navigate(`/${slug}/inventaires/${id}`);
            }
        } catch (e) {
            alert('Erreur : ' + e.message);
        }
    };

    const handleAnnuler = async (id) => {
        if (!window.confirm('Annuler cet inventaire ?')) return;
        try {
            await InventaireService.annuler(token, id);
            loadInventaires();
            loadStats();
        } catch (e) {
            alert('Erreur : ' + e.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer définitivement cet inventaire ?')) return;
        try {
            await InventaireService.delete(token, id);
            loadInventaires();
            loadStats();
        } catch (e) {
            alert('Erreur : ' + e.message);
        }
    };

    // ✅ Navigation vers le détail (vérifie id_inventaire)
    const handleView = (inv) => {
        const invId = inv.id_inventaire || inv.id;
        console.log("L'id est : ",invId);
        if (!invId) {
            console.error('❌ id_inventaire manquant dans:', inv);
            alert('Erreur : identifiant d\'inventaire manquant');
            return;
        }
        navigate(`/${slug}/inventaires/${invId}`);
    };

    const getStatutBadge = (statut) => {
        const configs = {
            'planifie': { label: 'Planifié', className: 'status-planifie', icon: Clock },
            'en_cours': { label: 'En cours',  className: 'status-en-cours', icon: PlayCircle },
            'termine':  { label: 'Terminé',   className: 'status-termine',  icon: CheckCircle },
            'annule':   { label: 'Annulé',    className: 'status-annule',   icon: Ban }
        };
        const c = configs[statut] || configs['planifie'];
        const Icon = c.icon;
        return (
            <span className={`status-badge ${c.className}`}>
                <Icon size={14} />
                {c.label}
            </span>
        );
    };

    const getTypeLabel = (type) => {
        const labels = { complet: 'Complet', partiel: 'Partiel', tournant: 'Tournant' };
        return labels[type] || type;
    };

    const filtered = inventaires;
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    return (
        <div className="inventaires-container">
            {/* En-tête */}
            <div className="inventaires-header">
                <div>
                    <h1 className="inventaires-title">Inventaires</h1>
                    <p className="inventaires-subtitle">
                        {stats.total} inventaires • {stats.en_cours} en cours
                    </p>
                </div>
                <div className="inventaires-actions">
                    {canManage && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={18} />
                            <span>Nouvel inventaire</span>
                        </button>
                    )}
                    <button
                        className="btn btn-secondary"
                        onClick={() => { loadInventaires(); loadStats(); }}
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* Statistiques */}
            <div className="inventaires-stats">
                <div className="stat-card">
                    <div className="stat-icon total"><ClipboardList size={20} /></div>
                    <div className="stat-info"><span className="stat-label">Total</span><span className="stat-value">{stats.total}</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon planifie"><Clock size={20} /></div>
                    <div className="stat-info"><span className="stat-label">Planifiés</span><span className="stat-value">{stats.planifie}</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon encours"><PlayCircle size={20} /></div>
                    <div className="stat-info"><span className="stat-label">En cours</span><span className="stat-value">{stats.en_cours}</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon termine"><CheckCircle size={20} /></div>
                    <div className="stat-info"><span className="stat-label">Terminés</span><span className="stat-value">{stats.termine}</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon annule"><Ban size={20} /></div>
                    <div className="stat-info"><span className="stat-label">Annulés</span><span className="stat-value">{stats.annule}</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon auj"><Calendar size={20} /></div>
                    <div className="stat-info"><span className="stat-label">Aujourd'hui</span><span className="stat-value">{stats.aujourdhui}</span></div>
                </div>
            </div>

            {/* Filtres */}
            <div className="inventaires-filters">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher un inventaire..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    {searchTerm && <button className="search-clear" onClick={() => setSearchTerm('')}><X size={16} /></button>}
                </div>
                <select className="filter-select" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
                    <option value="">Tous les statuts</option>
                    <option value="planifie">Planifié</option>
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                </select>
                <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">Tous les types</option>
                    <option value="complet">Complet</option>
                    <option value="partiel">Partiel</option>
                    <option value="tournant">Tournant</option>
                </select>
                <input type="date" className="filter-date" value={filterDateDebut} onChange={e => setFilterDateDebut(e.target.value)} />
                <input type="date" className="filter-date" value={filterDateFin} onChange={e => setFilterDateFin(e.target.value)} />
                <button className="btn btn-primary btn-filter" onClick={loadInventaires}>Filtrer</button>
                {(filterStatut || filterType || filterDateDebut || filterDateFin || searchTerm) && (
                    <button className="btn btn-secondary btn-filter" onClick={() => {
                        setFilterStatut(""); setFilterType(""); setFilterDateDebut(""); setFilterDateFin(""); setSearchTerm("");
                        setTimeout(loadInventaires, 0);
                    }}>Réinitialiser</button>
                )}
            </div>

            {/* Tableau */}
            {loading && <div className="loading-container"><div className="spinner"></div><p>Chargement...</p></div>}
            {error && !loading && <div className="error-container"><p>{error}</p><button className="btn btn-secondary" onClick={loadInventaires}>Réessayer</button></div>}

            {!loading && !error && (
                <div className="inventaires-table-container">
                    <table className="inventaires-table">
                        <thead>
                            <tr>
                                <th>Référence</th>
                                <th>Libellé</th>
                                <th>Type</th>
                                <th>Date début</th>
                                <th>Lignes</th>
                                <th>Écarts</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length === 0 ? (
                                <tr><td colSpan="8" className="empty-state"><ClipboardList size={32} /><p>Aucun inventaire</p></td></tr>
                            ) : currentItems.map(inv => (
                                <tr key={inv.id_inventaire}>
                                    <td><span className="inv-ref">{inv.reference}</span></td>
                                    <td>{inv.libelle}</td>
                                    <td>{getTypeLabel(inv.type_inventaire)}</td>
                                    <td>{new Date(inv.date_debut).toLocaleDateString('fr-FR')}</td>
                                    <td>{inv.nb_lignes || 0}</td>
                                    <td>
                                        {inv.nb_ecarts > 0
                                            ? <span className="ecart-badge ecart-warn">{inv.nb_ecarts}</span>
                                            : <span className="ecart-badge ecart-ok">0</span>}
                                    </td>
                                    <td>{getStatutBadge(inv.statut)}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="action-btn btn-view"
                                            onClick={() => handleView(inv)}
                                            title="Voir"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        {inv.statut === 'planifie' && canManage && (
                                            <button
                                                className="action-btn btn-play"
                                                onClick={() => handleDemarrer(inv.id_inventaire)}
                                                title="Démarrer"
                                            >
                                                <PlayCircle size={16} />
                                            </button>
                                        )}
                                        {(inv.statut === 'planifie' || inv.statut === 'en_cours') && canManage && (
                                            <button
                                                className="action-btn btn-cancel"
                                                onClick={() => handleAnnuler(inv.id_inventaire)}
                                                title="Annuler"
                                            >
                                                <Ban size={16} />
                                            </button>
                                        )}
                                        {(inv.statut === 'planifie' || inv.statut === 'annule') && canManage && (
                                            <button
                                                className="action-btn btn-delete"
                                                onClick={() => handleDelete(inv.id_inventaire)}
                                                title="Supprimer"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {!loading && !error && filtered.length > itemsPerPage && (
                <div className="inventaires-pagination">
                    <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft size={18} /></button>
                    <span className="pagination-info">Page {currentPage} sur {totalPages}</span>
                    <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight size={18} /></button>
                </div>
            )}

            {/* Modal création */}
            {showCreateModal && (
                <div className="modal-overlay" >
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2> Nouvel inventaire</h2>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}><X size={24} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Libellé *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ex: Inventaire mensuel Mars 2026"
                                    value={formData.libelle}
                                    onChange={e => setFormData({ ...formData, libelle: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Date de début *</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.date_debut}
                                    onChange={e => setFormData({ ...formData, date_debut: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Type d'inventaire *</label>
                                <select
                                    className="form-input"
                                    value={formData.type_inventaire}
                                    onChange={e => setFormData({ ...formData, type_inventaire: e.target.value })}
                                >
                                    <option value="complet">Complet (tous les produits)</option>
                                    <option value="partiel">Partiel (par emplacement)</option>
                                    <option value="tournant">Tournant (par échantillon)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    placeholder="Commentaires optionnels..."
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Annuler</button>
                            <button className="btn btn-primary" onClick={handleCreate}>Créer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventaires;