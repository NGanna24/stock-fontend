// pages/Recettes/Recettes.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Plus, Search, Trash2, Download, RefreshCw, X,
    Receipt, CreditCard, Wallet,
    Calendar, Eye, MoreVertical, CheckCircle, AlertCircle,
    Banknote, Building2, FileText
} from "lucide-react";
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import RecetteService from "../../services/recetteService";
import { useUser } from "../../context/AuthContext";
import "./Recettes.css";

// ========== FORMATAGE ==========
const formatMontant = (value) => {
    const num = parseFloat(value) || 0;
    return Math.round(num).toLocaleString('fr-FR') + ' FCFA';
};

const formatMontantCourt = (value) => {
    const num = parseFloat(value) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num.toFixed(0);
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
};

// ========== CONFIG MODES DE PAIEMENT ==========
const MODES_PAIEMENT = {
    'especes': { label: 'Espèces', icon: Banknote, color: '#10b981', bg: '#d1fae5' },
    'carte': { label: 'Carte', icon: CreditCard, color: '#3b82f6', bg: '#dbeafe' },
    'virement': { label: 'Virement', icon: Building2, color: '#8b5cf6', bg: '#e9d5ff' },
    'cheque': { label: 'Chèque', icon: FileText, color: '#f59e0b', bg: '#fef3c7' },
    'autre': { label: 'Autre', icon: Wallet, color: '#64748b', bg: '#f1f5f9' }
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b'];

// ========== ÉTAT INITIAL FORMULAIRE ==========
const INITIAL_FORM_DATA = {
    id_facture: '',
    date_paiement: new Date().toISOString().split('T')[0],
    montant: '',
    mode_paiement: 'especes',
    reference: '',
    note: ''
};

const Recettes = () => {
    const { isAuthenticated } = useUser();
    const token = localStorage.getItem('token');

    // ========== DATES PAR DÉFAUT ==========
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const formatDateInput = (d) => d.toISOString().split('T')[0];

    const [dateDebut, setDateDebut] = useState(formatDateInput(firstDayOfMonth));
    const [dateFin, setDateFin] = useState(formatDateInput(lastDayOfMonth));

    // ========== ÉTATS PRINCIPAUX ==========
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterMode, setFilterMode] = useState("");
    const [viewMode, setViewMode] = useState("table"); // "table" | "grid"

    // ========== MODAL AJOUT ==========
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [facturesImpayees, setFacturesImpayees] = useState([]);
    const [saving, setSaving] = useState(false);
    const [factureSelectionnee, setFactureSelectionnee] = useState(null);

    // ========== MODAL SUPPRESSION ==========
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [recetteToDelete, setRecetteToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ========== CHARGEMENT ==========
    const loadRecettes = useCallback(async () => {
        if (!token) return;

        setLoading(true);
        setError(null);

        try {
            const filters = {
                dateDebut,
                dateFin,
                modePaiement: filterMode || undefined,
                search: searchTerm || undefined
            };

            const res = await RecetteService.getAllRecettes(token, filters);
            if (res.success) {
                setData(res.data);
            } else {
                setError(res.message || 'Erreur lors du chargement');
            }
        } catch (e) {
            console.error('❌ loadRecettes error:', e);
            setError(e.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }, [token, dateDebut, dateFin, filterMode, searchTerm]);

    useEffect(() => {
        if (isAuthenticated && token) {
            loadRecettes();
        }
    }, [isAuthenticated, token, loadRecettes]);

    // ========== CHARGER FACTURES IMPAYÉES POUR LE FORMULAIRE ==========
    const loadFacturesImpayees = useCallback(async () => {
        if (!token) return;
        try {
            const res = await RecetteService.getFacturesImpayees(token);
            if (res.success) {
                setFacturesImpayees(res.data || []);
            }
        } catch (e) {
            console.error('❌ loadFacturesImpayees error:', e);
        }
    }, [token]);

    // ========== EXPORT ==========
    const handleExport = async () => {
        try {
            const response = await RecetteService.exportRecettes(token, {
                dateDebut,
                dateFin
            });
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `recettes_${dateDebut}_${dateFin}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('❌ Export error:', e);
            alert('Erreur lors de l\'exportation');
        }
    };

    // ========== PRESETS ==========
    const setPreset = (preset) => {
        const now = new Date();
        let debut, fin;

        switch (preset) {
            case 'today':
                debut = fin = now;
                break;
            case 'week':
                const dayOfWeek = now.getDay() || 7;
                debut = new Date(now);
                debut.setDate(now.getDate() - dayOfWeek + 1);
                fin = now;
                break;
            case 'month':
                debut = new Date(now.getFullYear(), now.getMonth(), 1);
                fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'year':
                debut = new Date(now.getFullYear(), 0, 1);
                fin = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                return;
        }

        setDateDebut(formatDateInput(debut));
        setDateFin(formatDateInput(fin));
    };

    // ========== OUVRIR MODAL AJOUT ==========
    const handleAdd = async () => {
        setFormData(INITIAL_FORM_DATA);
        setFactureSelectionnee(null);
        setError(null);
        await loadFacturesImpayees();
        setShowModal(true);
    };

    // ========== SÉLECTIONNER UNE FACTURE ==========
    const handleSelectFacture = (facture) => {
        setFactureSelectionnee(facture);
        setFormData(prev => ({
            ...prev,
            id_facture: facture.id_facture,
            montant: facture.montant_restant.toFixed(2)
        }));
    };

    // ========== CHANGEMENT FORMULAIRE ==========
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // ========== SAUVEGARDER ==========
    const handleSave = async () => {
        if (!formData.id_facture) {
            setError("Veuillez sélectionner une facture");
            return;
        }

        if (!formData.montant || parseFloat(formData.montant) <= 0) {
            setError("Le montant doit être supérieur à 0");
            return;
        }

        if (!formData.date_paiement) {
            setError("La date de paiement est obligatoire");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const payload = {
                ...formData,
                montant: parseFloat(formData.montant)
            };

            const res = await RecetteService.createRecette(token, payload);

            if (res.success) {
                await loadRecettes();
                setShowModal(false);
                setFormData(INITIAL_FORM_DATA);
                setFactureSelectionnee(null);
            } else {
                setError(res.message || 'Erreur lors de la sauvegarde');
            }
        } catch (e) {
            console.error('❌ Save error:', e);
            setError(e.message || 'Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    // ========== CONFIRMER SUPPRESSION ==========
    const confirmDelete = (recette) => {
        setRecetteToDelete(recette);
        setShowDeleteModal(true);
    };

    // ========== SUPPRIMER ==========
    const handleDelete = async () => {
        if (!recetteToDelete) return;

        setDeleting(true);
        setError(null);

        try {
            const res = await RecetteService.deleteRecette(token, recetteToDelete.id_paiement);

            if (res.success) {
                await loadRecettes();
                setShowDeleteModal(false);
                setRecetteToDelete(null);
            } else {
                setError(res.message || 'Erreur lors de la suppression');
            }
        } catch (e) {
            console.error('❌ Delete error:', e);
            setError(e.message || 'Erreur lors de la suppression');
        } finally {
            setDeleting(false);
        }
    };

    // ========== DONNÉES ==========
    const stats = data?.stats || {
        nombre_paiements: 0,
        total_recettes: 0,
        moyenne_paiement: 0,
        nombre_factures: 0,
        par_mode: { especes: 0, carte: 0, virement: 0, cheque: 0, autre: 0 }
    };

    const recettes = data?.recettes || [];
    const parJour = data?.par_jour || [];
    const parMode = data?.par_mode || [];
    const topClients = data?.top_clients || [];

    // ========== FILTRAGE LOCAL ==========
    const recettesFiltrees = useMemo(() => {
        let result = recettes;

        if (filterMode) {
            result = result.filter(r => r.mode_paiement === filterMode);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(r =>
                r.numero_facture?.toLowerCase().includes(term) ||
                r.numero_commande?.toLowerCase().includes(term) ||
                r.nomclient?.toLowerCase().includes(term) ||
                r.reference?.toLowerCase().includes(term)
            );
        }

        return result;
    }, [recettes, filterMode, searchTerm]);

    // ========== LOADER ==========
    if (loading && !data) {
        return (
            <div className="recettes-loading">
                <div className="spinner"></div>
                <p>Chargement des recettes...</p>
            </div>
        );
    }

    // ========== ERREUR ==========
    if (error && !data) {
        return (
            <div className="recettes-error">
                <p>{error}</p>
                <button className="btn btn-primary" onClick={loadRecettes}>
                    <RefreshCw size={16} /> Réessayer
                </button>
            </div>
        );
    }

    return (
        <div className="recettes-container">
            {/* ==================== EN-TÊTE ==================== */}
            <div className="recettes-header">
                <div>
                    <h1 className="recettes-title">
                        <banknote />
                        Recettes
                    </h1>
                    <p className="recettes-subtitle">
                        {stats.nombre_paiements} paiement(s) enregistré(s)
                    </p>
                </div>
                <div className="recettes-actions">
                    <button className="btn btn-primary" onClick={handleAdd}>
                        <Plus size={18} />
                        <span>Nouvelle Recette</span>
                    </button>
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <Download size={18} />
                        <span>Exporter CSV</span>
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={loadRecettes}
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* ==================== FILTRES ==================== */}
            <div className="recettes-filters">
                <div className="filter-row">
                    <div className="filter-group">
                        <label>Du</label>
                        <input
                            type="date"
                            value={dateDebut}
                            onChange={(e) => setDateDebut(e.target.value)}
                            max={dateFin}
                        />
                    </div>
                    <div className="filter-group">
                        <label>Au</label>
                        <input
                            type="date"
                            value={dateFin}
                            onChange={(e) => setDateFin(e.target.value)}
                            min={dateDebut}
                        />
                    </div>

                    <div className="filter-group">
                        <label>Mode paiement</label>
                        <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
                            <option value="">Tous</option>
                            <option value="especes">Espèces</option>
                            <option value="carte">Carte</option>
                            <option value="virement">Virement</option>
                            <option value="cheque">Chèque</option>
                            <option value="autre">Autre</option>
                        </select>
                    </div>

                    <div className="preset-buttons">
                        <button className="preset-btn" onClick={() => setPreset('today')}>Aujourd'hui</button>
                        <button className="preset-btn" onClick={() => setPreset('week')}>Cette semaine</button>
                        <button className="preset-btn" onClick={() => setPreset('month')}>Ce mois</button>
                        <button className="preset-btn" onClick={() => setPreset('year')}>Cette année</button>
                    </div>
                </div>
            </div>

            {/* ==================== KPIs ==================== */}
            <div className="kpi-grid">
                <div className="kpi-card kpi-highlight">
                    <div className="kpi-icon kpi-green">
                        <Banknote />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Total Recettes</span>
                        <span className="kpi-value text-green">
                            {formatMontant(stats.total_recettes)}
                        </span>
                        <span className="kpi-sub">{stats.nombre_paiements} paiements</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-blue">
                        <banknote size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Paiement moyen</span>
                        <span className="kpi-value">{formatMontant(stats.moyenne_paiement)}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-purple">
                        <Receipt size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Factures réglées</span>
                        <span className="kpi-value">{stats.nombre_factures}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-orange">
                        <Banknote size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">En espèces</span>
                        <span className="kpi-value">{formatMontant(stats.par_mode.especes)}</span>
                    </div>
                </div>
            </div>

            {/* ==================== GRAPHIQUES ==================== */}
            <div className="charts-grid">
                {/* Évolution des recettes */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3>Évolution des recettes</h3>
                    </div>
                    <div className="chart-body">
                        {parJour.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={parJour}>
                                    <defs>
                                        <linearGradient id="colorRecettes" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(d) => {
                                            const date = new Date(d);
                                            return `${date.getDate()}/${date.getMonth() + 1}`;
                                        }}
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                    />
                                    <YAxis
                                        tickFormatter={formatMontantCourt}
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                        width={50}
                                    />
                                    <Tooltip
                                        formatter={(v) => [formatMontant(v), 'Recettes']}
                                        labelFormatter={(d) => formatDate(d)}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fill="url(#colorRecettes)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-chart">
                                <Banknote size={40} />
                                <p>Aucune recette sur la période</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Répartition par mode */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3>Répartition par mode de paiement</h3>
                    </div>
                    <div className="chart-body">
                        {parMode.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={parMode}
                                        dataKey="total"
                                        nameKey="mode_paiement"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                    >
                                        {parMode.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={MODES_PAIEMENT[entry.mode_paiement]?.color || PIE_COLORS[index % PIE_COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(v, name, props) => [
                                            formatMontant(v),
                                            MODES_PAIEMENT[props.payload.mode_paiement]?.label || props.payload.mode_paiement
                                        ]}
                                    />
                                    <Legend
                                        formatter={(value, entry) => {
                                            const label = MODES_PAIEMENT[value]?.label || value;
                                            return label;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-chart">
                                <CreditCard size={40} />
                                <p>Aucun paiement enregistré</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ==================== BARRE DE RECHERCHE ==================== */}
            <div className="recettes-toolbar">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher par facture, commande, client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="search-clear" onClick={() => setSearchTerm("")}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="view-toggle">
                    <button
                        className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                        onClick={() => setViewMode('table')}
                        title="Vue tableau"
                    >
                        Tableau
                    </button>
                    <button
                        className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                        title="Vue cartes"
                    >
                        Cartes
                    </button>
                </div>
            </div>

            {/* ==================== LISTE DES RECETTES ==================== */}
            {recettesFiltrees.length > 0 ? (
                viewMode === 'table' ? (
                    /* ✅ VUE TABLEAU */
                    <div className="recettes-table-container">
                        <table className="recettes-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Facture</th>
                                    <th>Commande</th>
                                    <th>Client</th>
                                    <th>Montant</th>
                                    <th>Mode</th>
                                    <th>Référence</th>
                                    <th className="actions-header">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recettesFiltrees.map((r) => {
                                    const modeConfig = MODES_PAIEMENT[r.mode_paiement] || MODES_PAIEMENT.autre;
                                    const ModeIcon = modeConfig.icon;

                                    return (
                                        <tr key={r.id_paiement}>
                                            <td>
                                                <span className="date-cell">
                                                    <Calendar size={14} />
                                                    {r.date_formatee || formatDate(r.date_paiement)}
                                                </span>
                                            </td>
                                            <td className="font-semibold">{r.numero_facture || '-'}</td>
                                            <td>{r.numero_commande || '-'}</td>
                                            <td>
                                                <div className="client-cell">
                                                    <span className="client-name">{r.nomclient || '-'}</span>
                                                    {r.telephone && (
                                                        <span className="client-tel">{r.telephone}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="font-bold text-green">
                                                {formatMontant(r.montant)}
                                            </td>
                                            <td>
                                                <span
                                                    className="mode-badge"
                                                    style={{
                                                        background: modeConfig.bg,
                                                        color: modeConfig.color
                                                    }}
                                                >
                                                    <ModeIcon size={12} />
                                                    {modeConfig.label}
                                                </span>
                                            </td>
                                            <td className="text-muted">{r.reference || '-'}</td>
                                            <td className="actions-cell">
                                                <button
                                                    className="action-btn btn-delete"
                                                    onClick={() => confirmDelete(r)}
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* ✅ VUE CARTES */
                    <div className="recettes-grid">
                        {recettesFiltrees.map((r) => {
                            const modeConfig = MODES_PAIEMENT[r.mode_paiement] || MODES_PAIEMENT.autre;
                            const ModeIcon = modeConfig.icon;

                            return (
                                <div key={r.id_paiement} className="recette-card">
                                    <div className="recette-card-header">
                                        <div
                                            className="recette-card-icon"
                                            style={{ background: modeConfig.bg, color: modeConfig.color }}
                                        >
                                            <ModeIcon size={22} />
                                        </div>
                                        <button
                                            className="action-btn btn-delete"
                                            onClick={() => confirmDelete(r)}
                                            title="Supprimer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="recette-card-body">
                                        <div className="recette-montant text-green">
                                            {formatMontant(r.montant)}
                                        </div>
                                        <div className="recette-meta">
                                            <span className="recette-date">
                                                <Calendar size={12} />
                                                {r.date_formatee || formatDate(r.date_paiement)}
                                            </span>
                                        </div>
                                        <div className="recette-info">
                                            {r.numero_facture && (
                                                <div className="recette-info-item">
                                                    <Receipt size={12} />
                                                    <span>{r.numero_facture}</span>
                                                </div>
                                            )}
                                            {r.nomclient && (
                                                <div className="recette-info-item">
                                                    <span>{r.nomclient}</span>
                                                </div>
                                            )}
                                        </div>
                                        <span
                                            className="mode-badge"
                                            style={{
                                                background: modeConfig.bg,
                                                color: modeConfig.color
                                            }}
                                        >
                                            <ModeIcon size={12} />
                                            {modeConfig.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                <div className="empty-state-full">
                    <Banknote size={64} />
                    <h3>Aucune recette</h3>
                    <p>
                        {searchTerm || filterMode
                            ? 'Aucun résultat pour vos filtres'
                            : 'Commencez par enregistrer un paiement'}
                    </p>
                    {!searchTerm && !filterMode && (
                        <button className="btn btn-primary" onClick={handleAdd}>
                            <Plus size={18} /> Nouvelle Recette
                        </button>
                    )}
                </div>
            )}

            {/* ==================== MODAL AJOUT ==================== */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Nouvelle Recette</h2>
                            <button
                                className="modal-close"
                                onClick={() => !saving && setShowModal(false)}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {error && (
                                <div className="modal-error">
                                    <AlertCircle size={16} />
                                    <p>{error}</p>
                                </div>
                            )}

                            {/* Étape 1 : Sélectionner facture */}
                            {!factureSelectionnee ? (
                                <>
                                    <h3 className="modal-step-title">
                                        Sélectionnez une facture impayée
                                    </h3>

                                    {facturesImpayees.length > 0 ? (
                                        <div className="factures-list">
                                            {facturesImpayees.map((f) => (
                                                <div
                                                    key={f.id_facture}
                                                    className="facture-item"
                                                    onClick={() => handleSelectFacture(f)}
                                                >
                                                    <div className="facture-item-icon">
                                                        <Receipt size={20} />
                                                    </div>
                                                    <div className="facture-item-info">
                                                        <strong>{f.numero_facture}</strong>
                                                        <span>
                                                            {f.nomclient || 'Client inconnu'}
                                                            {f.numero_commande && ` • ${f.numero_commande}`}
                                                        </span>
                                                    </div>
                                                    <div className="facture-item-montant">
                                                        <span className="facture-total">
                                                            {formatMontant(f.montant_total)}
                                                        </span>
                                                        <span className="facture-restant">
                                                            Reste : {formatMontant(f.montant_restant)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-chart">
                                            <CheckCircle size={48} />
                                            <p>Aucune facture impayée</p>
                                            <span>Toutes vos factures sont réglées</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Étape 2 : Saisir le paiement */}
                                    <div className="selected-facture">
                                        <div className="selected-facture-info">
                                            <strong>{factureSelectionnee.numero_facture}</strong>
                                            <span>{factureSelectionnee.nomclient}</span>
                                        </div>
                                        <button
                                            className="btn-change"
                                            onClick={() => {
                                                setFactureSelectionnee(null);
                                                setFormData(INITIAL_FORM_DATA);
                                            }}
                                        >
                                            Changer
                                        </button>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Montant reçu (FCFA) *</label>
                                            <input
                                                type="number"
                                                name="montant"
                                                value={formData.montant}
                                                onChange={handleInputChange}
                                                placeholder="0"
                                                min="0"
                                                step="0.01"
                                                disabled={saving}
                                                autoFocus
                                            />
                                            <small className="form-hint">
                                                Reste à payer : {formatMontant(factureSelectionnee.montant_restant)}
                                            </small>
                                        </div>

                                        <div className="form-group">
                                            <label>Date de paiement *</label>
                                            <input
                                                type="date"
                                                name="date_paiement"
                                                value={formData.date_paiement}
                                                onChange={handleInputChange}
                                                disabled={saving}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Mode de paiement</label>
                                            <select
                                                name="mode_paiement"
                                                value={formData.mode_paiement}
                                                onChange={handleInputChange}
                                                disabled={saving}
                                            >
                                                <option value="especes">Espèces</option>
                                                <option value="carte">Carte bancaire</option>
                                                <option value="virement">Virement</option>
                                                <option value="cheque">Chèque</option>
                                                <option value="autre">Autre</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Référence</label>
                                            <input
                                                type="text"
                                                name="reference"
                                                value={formData.reference}
                                                onChange={handleInputChange}
                                                placeholder="N° de transaction, chèque..."
                                                disabled={saving}
                                                maxLength={100}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Note (optionnel)</label>
                                        <textarea
                                            name="note"
                                            value={formData.note}
                                            onChange={handleInputChange}
                                            placeholder="Détails supplémentaires..."
                                            rows="2"
                                            disabled={saving}
                                            maxLength={500}
                                        />
                                    </div>
                                </>
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
                            {factureSelectionnee && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSave}
                                    disabled={saving || !formData.montant}
                                >
                                    {saving ? (
                                        <>
                                            <span className="spinner-small"></span>
                                            <span>Enregistrement...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={18} />
                                            <span>Enregistrer</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== MODAL SUPPRESSION ==================== */}
            {showDeleteModal && recetteToDelete && (
                <div
                    className="modal-overlay"
                    onClick={() => !deleting && setShowDeleteModal(false)}
                >
                    <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Confirmer la suppression</h2>
                            <button
                                className="modal-close"
                                onClick={() => !deleting && setShowDeleteModal(false)}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Voulez-vous vraiment supprimer cette recette ?</p>
                            <div className="delete-recap">
                                <div className="delete-recap-item">
                                    <span>Montant</span>
                                    <strong>{formatMontant(recetteToDelete.montant)}</strong>
                                </div>
                                <div className="delete-recap-item">
                                    <span>Date</span>
                                    <strong>{recetteToDelete.date_formatee}</strong>
                                </div>
                                {recetteToDelete.numero_facture && (
                                    <div className="delete-recap-item">
                                        <span>Facture</span>
                                        <strong>{recetteToDelete.numero_facture}</strong>
                                    </div>
                                )}
                            </div>
                            <p className="delete-warning">
                                ⚠️ Cette action est irréversible.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleting}
                            >
                                Annuler
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
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

export default Recettes;