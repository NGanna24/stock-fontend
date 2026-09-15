// pages/Employes/Employes.jsx
import React, { useState, useEffect, useRef } from "react";
import {
    Users, UserPlus, Search, X, RefreshCw,
    Shield, Store, Phone, Eye, EyeOff, Lock, User,
    Edit3, Trash2, ToggleLeft, ToggleRight,
    CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight,
    MoreVertical, Info, Mail, Calendar, Clock, Hash, Briefcase
} from "lucide-react";
import EmployeService from "../../services/employeService";
import { useUser } from "../../context/AuthContext";
import "./Employes.css";

// Rôles disponibles pour les employés (admin exclu)
const ROLES_DISPONIBLES = [
    { value: "caissier",   label: "Caissier",   description: "Ventes, paiements, clients" },
    { value: "magasinier", label: "Magasinier", description: "Stocks, réceptions, inventaires" },
    { value: "manager",    label: "Manager",    description: "Toutes les opérations sauf admin" },
];

const Employes = () => {
    const { user } = useUser();
    const token = localStorage.getItem('token');

    // ==================== ÉTATS ====================
    const [employes, setEmployes]     = useState([]);
    const [stats, setStats]           = useState(null);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage]              = useState(10);

    // Menu d'actions (3 points)
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuRef = useRef(null);

    // Modal création / édition
    const [showModal, setShowModal]   = useState(false);
    const [editingId, setEditingId]   = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving]         = useState(false);
    const [formError, setFormError]   = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modal détails
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailEmploye, setDetailEmploye]     = useState(null);

    const [formData, setFormData] = useState({
        fullname: '',
        telephone: '',
        password: '',
        roleName: 'caissier',
    });

    // ==================== CHARGEMENT ====================
    useEffect(() => {
        if (token) {
            loadEmployes();
            loadStats();
        }
    }, [token]);

    // Fermer le menu au clic extérieur
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadEmployes = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await EmployeService.getAll(token);
            if (res.success) {
                setEmployes(res.employes || []);
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
            const res = await EmployeService.getStats(token);
            if (res.success) setStats(res.stats);
        } catch (e) {
            console.error('Stats error:', e);
        }
    };

    const handleRefresh = () => {
        loadEmployes();
        loadStats();
    };

    // ==================== MODAL CRÉATION / ÉDITION ====================
    const openCreateModal = () => {
        setEditingId(null);
        setFormData({
            fullname: '',
            telephone: '',
            password: '',
            roleName: 'caissier',
        });
        setFormError('');
        setShowPassword(false);
        setShowModal(true);
    };

    const openEditModal = (employe) => {
        setEditingId(employe.id_employe);
        setFormData({
            fullname: employe.fullname,
            telephone: employe.telephone,
            password: '',
            roleName: employe.role_nom,
        });
        setFormError('');
        setShowPassword(false);
        setShowModal(true);
        setOpenMenuId(null);
    };

    const closeModal = () => {
        setShowModal(false);
        setFormError('');
        setEditingId(null);
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError('');

        try {
            let res;

            if (editingId) {
                const payload = {
                    fullname:  formData.fullname,
                    telephone: formData.telephone,
                    roleName:  formData.roleName,
                };
                if (formData.password) payload.password = formData.password;
                res = await EmployeService.update(token, editingId, payload);
            } else {
                if (!/^\d{4}$/.test(formData.password)) {
                    setFormError('Le mot de passe doit contenir exactement 4 chiffres');
                    setSaving(false);
                    return;
                }
                res = await EmployeService.create(token, formData);
            }

            if (res.success) {
                setSuccessMessage(editingId ? 'Employé modifié' : 'Employé créé');
                closeModal();
                handleRefresh();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setFormError(res.message || 'Erreur');
            }
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // ==================== MODAL DÉTAILS ====================
    const openDetailModal = async (employe) => {
        setOpenMenuId(null);
        // On utilise l'objet local, pas besoin de re-fetch
        setDetailEmploye(employe);
        setShowDetailModal(true);
    };

    const closeDetailModal = () => {
        setShowDetailModal(false);
        setDetailEmploye(null);
    };

    // ==================== ACTIONS ====================
    const handleToggle = async (employe) => {
        setOpenMenuId(null);
        if (!window.confirm(`Voulez-vous ${employe.actif ? 'désactiver' : 'activer'} ${employe.fullname} ?`)) return;
        try {
            await EmployeService.toggleActivation(token, employe.id_employe, !employe.actif);
            handleRefresh();
        } catch (e) {
            alert('Erreur : ' + e.message);
        }
    };

    const handleDelete = async (employe) => {
        setOpenMenuId(null);
        if (!window.confirm(`Supprimer définitivement ${employe.fullname} ?`)) return;
        try {
            await EmployeService.delete(token, employe.id_employe);
            handleRefresh();
        } catch (e) {
            alert('Erreur : ' + e.message);
        }
    };

    const toggleMenu = (id) => {
        setOpenMenuId(prev => (prev === id ? null : id));
    };

    // ==================== FORMATAGE ====================
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'Jamais';
        return new Date(dateStr).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getRoleBadge = (role) => {
        const map = {
            admin:      { label: 'Admin',      color: 'role-admin' },
            manager:    { label: 'Manager',    color: 'role-manager' },
            caissier:   { label: 'Caissier',   color: 'role-caissier' },
            magasinier: { label: 'Magasinier', color: 'role-magasinier' },
        };
        const c = map[role] || { label: role, color: 'role-default' };
        return <span className={`role-badge ${c.color}`}>{c.label}</span>;
    };

    const getRoleLabel = (role) => {
        const map = {
            admin: 'Administrateur',
            manager: 'Manager',
            caissier: 'Caissier',
            magasinier: 'Magasinier',
        };
        return map[role] || role;
    };

    // ==================== FILTRAGE + PAGINATION ====================
    const filtered = employes.filter(e =>
        !searchTerm ||
        e.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.telephone?.includes(searchTerm)
    );

    const indexOfLast  = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirst, indexOfLast);
    const totalPages   = Math.ceil(filtered.length / itemsPerPage) || 1;

    // ==================== RENDER ====================
    return (
        <div className="employes-container">
            {/* ==================== EN-TÊTE ==================== */}
            <div className="employes-header">
                <div>
                    <h1 className="employes-title">Employés</h1>
                    <p className="employes-subtitle">
                        Gérez les comptes de vos employés et leurs permissions
                    </p>
                </div>
                <div className="employes-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Rafraîchir"
                    >
                        <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                    </button>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <UserPlus size={18} />
                        Ajouter un employé
                    </button>
                </div>
            </div>

            {/* ==================== MESSAGES ==================== */}
            {successMessage && (
                <div className="alert alert-success">
                    <CheckCircle size={20} />
                    <span>{successMessage}</span>
                </div>
            )}

            {error && !loading && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* ==================== STATS ==================== */}
            {stats && (
                <div className="employes-stats">
                    <div className="stat-card">
                        <div className="stat-icon total"><Users size={20} /></div>
                        <div className="stat-info">
                            <span className="stat-label">Total</span>
                            <span className="stat-value">{stats.total}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon actif"><CheckCircle size={20} /></div>
                        <div className="stat-info">
                            <span className="stat-label">Actifs</span>
                            <span className="stat-value">{stats.actifs}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon inactif"><Shield size={20} /></div>
                        <div className="stat-info">
                            <span className="stat-label">Inactifs</span>
                            <span className="stat-value">{stats.inactifs}</span>
                        </div>
                    </div>
                    {stats.byRole?.map(r => (
                        <div className="stat-card" key={r.role}>
                            <div className="stat-icon role"><User size={20} /></div>
                            <div className="stat-info">
                                <span className="stat-label">{r.role}</span>
                                <span className="stat-value">{r.total}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ==================== FILTRES ==================== */}
            <div className="employes-filters">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou téléphone..."
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
            </div>

            {/* ==================== TABLEAU ==================== */}
            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Chargement des employés...</p>
                </div>
            ) : (
                <div className="employes-table-container">
                    <table className="employes-table">
                        <thead>
                            <tr>
                                <th>Employé</th>
                                <th>Téléphone</th>
                                <th>Rôle</th>
                                <th>Magasin</th>
                                <th>Statut</th>
                                <th>Dernière connexion</th>
                                <th style={{ width: 60 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="empty-state">
                                        <Users size={40} />
                                        <p>Aucun employé trouvé</p>
                                        <button className="btn btn-primary" onClick={openCreateModal}>
                                            <UserPlus size={16} /> Ajouter le premier employé
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((employe) => (
                                    <tr key={employe.id_employe}>
                                        <td className="employe-cell">
                                            <span className="employe-avatar">
                                                {employe.fullname?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                            <div>
                                                <div className="employe-nom">{employe.fullname}</div>
                                                <div className="employe-slug">@{employe.slug}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="employe-tel">
                                                <Phone size={14} />
                                                {employe.telephone}
                                            </span>
                                        </td>
                                        <td>{getRoleBadge(employe.role_nom)}</td>
                                        <td>
                                            <span className="employe-magasin">
                                                <Store size={14} />
                                                {employe.magasin_ville || `#${employe.id_magasin}`}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${employe.actif ? 'status-actif' : 'status-inactif'}`}>
                                                {employe.actif ? 'Actif' : 'Inactif'}
                                            </span>
                                        </td>
                                        <td>{formatDate(employe.derniere_connexion)}</td>

                                        {/* ✅ Colonne Actions : 3 points avec dropdown */}
                                        <td className="actions-cell">
                                            <div
                                                className="menu-container"
                                                ref={openMenuId === employe.id_employe ? menuRef : null}
                                            >
                                                <button
                                                    className={`menu-trigger ${openMenuId === employe.id_employe ? 'active' : ''}`}
                                                    onClick={() => toggleMenu(employe.id_employe)}
                                                    title="Actions"
                                                >
                                                    <MoreVertical size={18} />
                                                </button>

                                                {openMenuId === employe.id_employe && (
                                                    <div className="menu-dropdown">
                                                        <button
                                                            className="menu-item-action"
                                                            onClick={() => openDetailModal(employe)}
                                                        >
                                                            <Info size={16} />
                                                            <span>Voir les détails</span>
                                                        </button>

                                                        <button
                                                            className="menu-item-action"
                                                            onClick={() => openEditModal(employe)}
                                                        >
                                                            <Edit3 size={16} />
                                                            <span>Modifier</span>
                                                        </button>

                                                        <button
                                                            className="menu-item-action"
                                                            onClick={() => handleToggle(employe)}
                                                        >
                                                            {employe.actif
                                                                ? <><ToggleLeft size={16} /><span>Désactiver</span></>
                                                                : <><ToggleRight size={16} /><span>Activer</span></>}
                                                        </button>

                                                        <div className="menu-divider"></div>

                                                        <button
                                                            className="menu-item-action danger"
                                                            onClick={() => handleDelete(employe)}
                                                        >
                                                            <Trash2 size={16} />
                                                            <span>Supprimer</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ==================== PAGINATION ==================== */}
            {!loading && filtered.length > itemsPerPage && (
                <div className="employes-pagination">
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

            {/* ==================== MODAL CRÉATION / ÉDITION ==================== */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Modifier l\'employé' : 'Ajouter un employé'}</h2>
                            <button className="modal-close" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body">
                            {formError && (
                                <div className="alert alert-error">
                                    <AlertCircle size={18} />
                                    <span>{formError}</span>
                                </div>
                            )}

                            {/* Nom */}
                            <div className="form-group">
                                <label htmlFor="fullname">Nom complet *</label>
                                <div className="input-wrapper">
                                    <User size={18} className="input-icon-left" />
                                    <input
                                        type="text"
                                        id="fullname"
                                        name="fullname"
                                        placeholder="Ex: Jean Kouassi"
                                        value={formData.fullname}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Téléphone */}
                            <div className="form-group">
                                <label htmlFor="telephone">Téléphone *</label>
                                <div className="input-wrapper">
                                    <Phone size={18} className="input-icon-left" />
                                    <input
                                        type="tel"
                                        id="telephone"
                                        name="telephone"
                                        placeholder="Ex: 0707070707"
                                        value={formData.telephone}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Mot de passe */}
                            <div className="form-group">
                                <label htmlFor="password">
                                    Mot de passe {editingId ? '(laisser vide pour ne pas changer)' : '*'}
                                </label>
                                <div className="input-wrapper">
                                    <Lock size={18} className="input-icon-left" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        name="password"
                                        placeholder="4 chiffres"
                                        maxLength="4"
                                        value={formData.password}
                                        onChange={handleFormChange}
                                        disabled={saving}
                                        required={!editingId}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex="-1"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Rôle */}
                            <div className="form-group">
                                <label>Rôle *</label>
                                <div className="role-options">
                                    {ROLES_DISPONIBLES.map(r => (
                                        <label
                                            key={r.value}
                                            className={`role-option ${formData.roleName === r.value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="roleName"
                                                value={r.value}
                                                checked={formData.roleName === r.value}
                                                onChange={handleFormChange}
                                                disabled={saving}
                                            />
                                            <div className="role-option-content">
                                                <span className="role-option-title">{r.label}</span>
                                                <span className="role-option-desc">{r.description}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <><Loader2 size={18} className="spinner" /> Enregistrement...</>
                                    ) : (
                                        editingId ? 'Enregistrer' : 'Créer l\'employé'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==================== MODAL DÉTAILS ==================== */}
            {showDetailModal && detailEmploye && (
                <div className="modal-overlay" onClick={closeDetailModal}>
                    <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Détails de l'employé</h2>
                            <button className="modal-close" onClick={closeDetailModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {/* Bandeau identité */}
                            <div className="detail-header-card">
                                <div className="detail-avatar">
                                    {detailEmploye.fullname?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="detail-identity">
                                    <h3>{detailEmploye.fullname}</h3>
                                    <div className="detail-badges">
                                        {getRoleBadge(detailEmploye.role_nom)}
                                        <span className={`status-badge ${detailEmploye.actif ? 'status-actif' : 'status-inactif'}`}>
                                            {detailEmploye.actif ? 'Actif' : 'Inactif'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Grille d'infos */}
                            <div className="detail-info-grid">
                                <div className="detail-info-item">
                                    <div className="detail-info-label">
                                        <Hash size={14} /> ID Employé
                                    </div>
                                    <div className="detail-info-value">#{detailEmploye.id_employe}</div>
                                </div>

                                <div className="detail-info-item">
                                    <div className="detail-info-label">
                                        <Phone size={14} /> Téléphone
                                    </div>
                                    <div className="detail-info-value">{detailEmploye.telephone}</div>
                                </div>

                                <div className="detail-info-item">
                                    <div className="detail-info-label">
                                        <User size={14} /> Slug / Identifiant
                                    </div>
                                    <div className="detail-info-value mono">@{detailEmploye.slug}</div>
                                </div>

                                <div className="detail-info-item">
                                    <div className="detail-info-label">
                                        <Briefcase size={14} /> Rôle
                                    </div>
                                    <div className="detail-info-value">
                                        {getRoleLabel(detailEmploye.role_nom)}
                                    </div>
                                </div>

                                <div className="detail-info-item">
                                    <div className="detail-info-label">
                                        <Store size={14} /> Magasin
                                    </div>
                                    <div className="detail-info-value">
                                        {detailEmploye.magasin_ville || `Magasin #${detailEmploye.id_magasin}`}
                                    </div>
                                </div>

                                <div className="detail-info-item">
                                    <div className="detail-info-label">
                                        <Calendar size={14} /> Date de création
                                    </div>
                                    <div className="detail-info-value">
                                        {formatDate(detailEmploye.date_creation)}
                                    </div>
                                </div>

                                <div className="detail-info-item full-width">
                                    <div className="detail-info-label">
                                        <Clock size={14} /> Dernière connexion
                                    </div>
                                    <div className="detail-info-value">
                                        {formatDateTime(detailEmploye.derniere_connexion)}
                                    </div>
                                </div>
                            </div>

                            {/* Actions du modal détails */}
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={closeDetailModal}
                                >
                                    Fermer
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => {
                                        closeDetailModal();
                                        openEditModal(detailEmploye);
                                    }}
                                >
                                    <Edit3 size={16} />
                                    Modifier
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Employes;