// pages/Alertes/Alertes.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    AlertTriangle, AlertCircle, TrendingDown, TrendingUp,
    Download, RefreshCw, Package, Search, X, Truck,
    CheckCircle, Phone, Mail, Banknote, Boxes, Bell
} from "lucide-react";
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import AlerteService from "../../services/alerteService";
import { useUser } from "../../context/AuthContext";
import "./Alertes.css";

// ========== FORMATAGE ==========
const formatMontant = (value) => {
    const num = parseFloat(value) || 0;
    return Math.round(num).toLocaleString('fr-FR') + ' FCFA';
};

// ✅ NOUVEAU : formate une quantité avec son unité de BASE
const formatQuantite = (valeur, alerte) => {
    const num = parseFloat(valeur) || 0;
    const unite = alerte?.unite_nom || alerte?.unite_symbole || 'u';
    return `${num} ${unite}`;
};

// ✅ NOUVEAU : formate une quantité en unité de VENTE (ex: carton)
const formatQuantiteVente = (valeur, alerte) => {
    if (!alerte?.unite_vente_nom || !alerte?.unite_vente_quantite_base) return null;
    const qteBase = parseFloat(alerte.unite_vente_quantite_base);
    if (!qteBase || qteBase <= 1) return null;
    const num = parseFloat(valeur) || 0;
    const qteVente = Math.ceil(num / qteBase);
    return `${qteVente} ${alerte.unite_vente_nom}${qteVente > 1 ? 's' : ''}`;
};

// ========== CONFIG TYPES D'ALERTES ==========
const TYPES_ALERTES = {
    rupture: {
        label: 'Rupture',
        icon: AlertCircle,
        color: '#ef4444',
        bg: '#fef2f2',
        text: '#991b1b',
        cls: 'type-rupture'
    },
    stock_bas: {
        label: 'Stock bas',
        icon: TrendingDown,
        color: '#f59e0b',
        bg: '#fffbeb',
        text: '#92400e',
        cls: 'type-stock-bas'
    },
    surstock: {
        label: 'Surstock',
        icon: TrendingUp,
        color: '#8b5cf6',
        bg: '#f5f3ff',
        text: '#5b21b6',
        cls: 'type-surstock'
    }
};

const Alertes = () => {
    const { isAuthenticated } = useUser();
    const token = localStorage.getItem('token');

    // ========== ÉTATS ==========
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState("toutes");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all");

    // ========== CHARGEMENT ==========
    const loadAlertes = useCallback(async () => {
        if (!token) return;

        setLoading(true);
        setError(null);

        try {
            const res = await AlerteService.getAllAlertes(token);
            if (res.success) {
                setData(res.data);
            } else {
                setError(res.message || 'Erreur lors du chargement');
            }
        } catch (e) {
            console.error('❌ loadAlertes error:', e);
            setError(e.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (isAuthenticated && token) {
            loadAlertes();
        }
    }, [isAuthenticated, token, loadAlertes]);

    // ========== EXPORT ==========
    const handleExport = async () => {
        try {
            const response = await AlerteService.exportAlertes(token);
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `alertes_stock_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('❌ Export error:', e);
            alert('Erreur lors de l\'exportation');
        }
    };

    // ========== DONNÉES ==========
    const stats = data?.stats || {
        total_alertes: 0,
        total_rupture: 0,
        total_stock_bas: 0,
        total_surstock: 0,
        valeur_reapprovisionnement: 0
    };

    const alertes = data?.alertes || [];
    const parCategorie = data?.par_categorie || [];
    const parFournisseur = data?.par_fournisseur || [];
    const ruptures = data?.ruptures || [];
    const stockBas = data?.stock_bas || [];

    // ========== FILTRAGE ==========
    const alertesFiltrees = useMemo(() => {
        let result = alertes;

        if (activeTab === 'rupture') {
            result = result.filter(a => a.type_alerte === 'rupture');
        } else if (activeTab === 'stock_bas') {
            result = result.filter(a => a.type_alerte === 'stock_bas');
        } else if (activeTab === 'surstock') {
            result = result.filter(a => a.type_alerte === 'surstock');
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(a =>
                a.produit_nom?.toLowerCase().includes(term) ||
                a.categorie_nom?.toLowerCase().includes(term) ||
                a.marque_nom?.toLowerCase().includes(term) ||
                a.fournisseur_nom?.toLowerCase().includes(term)
            );
        }

        return result;
    }, [alertes, activeTab, searchTerm]);

    // ========== DONNÉES POUR PIE CHART ==========
    const pieData = [
        { name: 'Rupture', value: stats.total_rupture, color: '#ef4444' },
        { name: 'Stock bas', value: stats.total_stock_bas, color: '#f59e0b' },
        { name: 'Surstock', value: stats.total_surstock, color: '#8b5cf6' }
    ].filter(d => d.value > 0);

    // ========== LOADER ==========
    if (loading && !data) {
        return (
            <div className="alertes-loading">
                <div className="spinner"></div>
                <p>Chargement des alertes...</p>
            </div>
        );
    }

    // ========== ERREUR ==========
    if (error && !data) {
        return (
            <div className="alertes-error">
                <p>{error}</p>
                <button className="btn btn-primary" onClick={loadAlertes}>
                    <RefreshCw size={16} /> Réessayer
                </button>
            </div>
        );
    }

    return (
        <div className="alertes-container">
            {/* ==================== EN-TÊTE ==================== */}
            <div className="alertes-header">
                <div>
                    <h1 className="alertes-title">
                        <Bell size={28} />
                        Alertes de Stock
                    </h1>
                    <p className="alertes-subtitle">
                        {stats.total_alertes} alerte(s) nécessitant votre attention
                    </p>
                </div>
                <div className="alertes-actions">
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <Download size={18} />
                        <span>Exporter CSV</span>
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={loadAlertes}
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* ==================== BANNIÈRE CRITIQUE ==================== */}
            {stats.total_rupture > 0 && (
                <div className="alert-banner critical">
                    <AlertCircle size={24} />
                    <div className="alert-banner-content">
                        <strong>Attention : {stats.total_rupture} produit(s) en rupture de stock</strong>
                        <span>Ces produits ne peuvent plus être vendus. Commandez-les rapidement.</span>
                    </div>
                    <button
                        className="alert-banner-btn"
                        onClick={() => setActiveTab('rupture')}
                    >
                        Voir les ruptures
                    </button>
                </div>
            )}

            {/* ==================== KPIs ==================== */}
            <div className="kpi-grid">
                <div className="kpi-card kpi-critical">
                    <div className="kpi-icon kpi-red">
                        <AlertCircle size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Ruptures</span>
                        <span className="kpi-value">{stats.total_rupture}</span>
                        <span className="kpi-sub">À commander d'urgence</span>
                    </div>
                </div>

                <div className="kpi-card kpi-warning">
                    <div className="kpi-icon kpi-orange">
                        <TrendingDown size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Stock bas</span>
                        <span className="kpi-value">{stats.total_stock_bas}</span>
                        <span className="kpi-sub">Sous le seuil minimum</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-purple">
                        <TrendingUp size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Surstock</span>
                        <span className="kpi-value">{stats.total_surstock}</span>
                        <span className="kpi-sub">Stock excessif</span>
                    </div>
                </div>

                <div className="kpi-card kpi-highlight">
                    <div className="kpi-icon kpi-blue">
                        <Banknote size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Réapprovisionnement</span>
                        <span className="kpi-value">{formatMontant(stats.valeur_reapprovisionnement)}</span>
                        <span className="kpi-sub">Coût estimé</span>
                    </div>
                </div>
            </div>

            {/* ==================== ONGLETS ==================== */}
            <div className="alertes-tabs">
                <button
                    className={`tab ${activeTab === 'toutes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('toutes')}
                >
                    <Package size={16} /> Toutes ({alertes.length})
                </button>
                <button
                    className={`tab ${activeTab === 'rupture' ? 'active' : ''} tab-danger`}
                    onClick={() => setActiveTab('rupture')}
                >
                    <AlertCircle size={16} /> Ruptures ({stats.total_rupture})
                </button>
                <button
                    className={`tab ${activeTab === 'stock_bas' ? 'active' : ''} tab-warning`}
                    onClick={() => setActiveTab('stock_bas')}
                >
                    <TrendingDown size={16} /> Stock bas ({stats.total_stock_bas})
                </button>
                <button
                    className={`tab ${activeTab === 'surstock' ? 'active' : ''}`}
                    onClick={() => setActiveTab('surstock')}
                >
                    <TrendingUp size={16} /> Surstock ({stats.total_surstock})
                </button>
                <button
                    className={`tab ${activeTab === 'fournisseurs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('fournisseurs')}
                >
                    <Truck size={16} /> Par fournisseur ({parFournisseur.length})
                </button>
            </div>

            {/* ==================== CONTENU ==================== */}
            <div className="alertes-content">

                {/* ✅ ONGLET TOUTES / RUPTURES / STOCK BAS / SURSTOCK */}
                {['toutes', 'rupture', 'stock_bas', 'surstock'].includes(activeTab) && (
                    <>
                        {/* Graphique résumé */}
                        {activeTab === 'toutes' && (parCategorie.length > 0 || pieData.length > 0) && (
                            <div className="charts-grid">
                                <div className="chart-card">
                                    <div className="chart-header">
                                        <h3>Répartition par type</h3>
                                    </div>
                                    <div className="chart-body">
                                        {pieData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={280}>
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={100}
                                                        paddingAngle={2}
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="empty-chart">
                                                <CheckCircle size={40} />
                                                <p>Aucune alerte</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="chart-card">
                                    <div className="chart-header">
                                        <h3>Alertes par catégorie</h3>
                                    </div>
                                    <div className="chart-body">
                                        {parCategorie.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={280}>
                                                <BarChart data={parCategorie.slice(0, 8)}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                    <XAxis
                                                        dataKey="categorie_nom"
                                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                                    />
                                                    <YAxis
                                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                                        width={30}
                                                    />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="ruptures" name="Ruptures" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
                                                    <Bar dataKey="stocks_bas" name="Stock bas" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="empty-chart">
                                                <CheckCircle size={40} />
                                                <p>Aucune alerte par catégorie</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Barre de recherche */}
                        <div className="alertes-search">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Rechercher un produit, une catégorie, un fournisseur..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    className="search-clear"
                                    onClick={() => setSearchTerm("")}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Liste des alertes */}
                        {alertesFiltrees.length > 0 ? (
                            <div className="alertes-list">
                                {alertesFiltrees.map((alerte) => {
                                    const config = TYPES_ALERTES[alerte.type_alerte] || TYPES_ALERTES.stock_bas;
                                    const Icon = config.icon;

                                    // ✅ Conversion en unité de vente
                                    const qteVente = formatQuantiteVente(
                                        alerte.quantite_a_commander,
                                        alerte
                                    );

                                    return (
                                        <div
                                            key={alerte.id_produit}
                                            className={`alerte-card ${config.cls}`}
                                        >
                                            <div className="alerte-icon" style={{ background: config.bg, color: config.color }}>
                                                <Icon size={22} />
                                            </div>

                                            <div className="alerte-content">
                                                <div className="alerte-header">
                                                    <div>
                                                        <h4 className="alerte-produit">{alerte.produit_nom}</h4>
                                                        <div className="alerte-meta">
                                                            {alerte.categorie_nom && <span>{alerte.categorie_nom}</span>}
                                                            {alerte.marque_nom && <span>• {alerte.marque_nom}</span>}
                                                        </div>
                                                    </div>
                                                    <span className={`alerte-badge ${config.cls}`}>
                                                        {config.label}
                                                    </span>
                                                </div>

                                                <div className="alerte-stock-info">
                                                    {/* ✅ Stock actuel AVEC unité */}
                                                    <div className="stock-info-item">
                                                        <span className="stock-info-label">Stock actuel</span>
                                                        <span className="stock-info-value" style={{ color: config.color }}>
                                                            {formatQuantite(alerte.quantite_stock, alerte)}
                                                        </span>
                                                    </div>

                                                    {/* ✅ Stock min AVEC unité */}
                                                    <div className="stock-info-item">
                                                        <span className="stock-info-label">Stock min</span>
                                                        <span className="stock-info-value">
                                                            {formatQuantite(alerte.quantite_minimale, alerte)}
                                                        </span>
                                                    </div>

                                                    {/* ✅ Stock max AVEC unité */}
                                                    {alerte.quantite_maximale > 0 && (
                                                        <div className="stock-info-item">
                                                            <span className="stock-info-label">Stock max</span>
                                                            <span className="stock-info-value">
                                                                {formatQuantite(alerte.quantite_maximale, alerte)}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* ✅ À commander AVEC unité + conversion */}
                                                    {(alerte.type_alerte === 'rupture' || alerte.type_alerte === 'stock_bas') && (
                                                        <>
                                                            <div className="stock-info-item highlight">
                                                                <span className="stock-info-label">À commander</span>
                                                                <span className="stock-info-value">
                                                                    {formatQuantite(alerte.quantite_a_commander, alerte)}
                                                                    {qteVente && (
                                                                        <small className="conversion-unite">
                                                                            ≈ {qteVente}
                                                                        </small>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="stock-info-item highlight">
                                                                <span className="stock-info-label">Coût estimé</span>
                                                                <span className="stock-info-value">
                                                                    {formatMontant(alerte.valeur_manque)}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {alerte.fournisseur_nom && (
                                                    <div className="alerte-fournisseur">
                                                        <Truck size={14} />
                                                        <span>{alerte.fournisseur_nom}</span>
                                                        {alerte.fournisseur_telephone && (
                                                            <>
                                                                <Phone size={12} />
                                                                <span>{alerte.fournisseur_telephone}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state-full">
                                <CheckCircle size={64} />
                                <h3>Aucune alerte</h3>
                                <p>
                                    {searchTerm
                                        ? 'Aucun résultat pour votre recherche'
                                        : 'Votre stock est bien géré !'}
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* ✅ ONGLET FOURNISSEURS */}
                {activeTab === 'fournisseurs' && (
                    <div className="fournisseurs-alertes">
                        {parFournisseur.length > 0 ? (
                            parFournisseur.map((f) => (
                                <div key={f.id_fournisseur || 'none'} className="fournisseur-card">
                                    <div className="fournisseur-header">
                                        <div className="fournisseur-info">
                                            <div className="fournisseur-icon">
                                                <Truck size={24} />
                                            </div>
                                            <div>
                                                <h4>{f.fournisseur_nom}</h4>
                                                <div className="fournisseur-contacts">
                                                    {f.fournisseur_telephone && (
                                                        <span>
                                                            <Phone size={12} />
                                                            {f.fournisseur_telephone}
                                                        </span>
                                                    )}
                                                    {f.fournisseur_email && (
                                                        <span>
                                                            <Mail size={12} />
                                                            {f.fournisseur_email}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="fournisseur-stats">
                                            <div className="fournisseur-stat">
                                                <span className="stat-value">{f.nombre_alertes}</span>
                                                <span className="stat-label">Alertes</span>
                                            </div>
                                            <div className="fournisseur-stat danger">
                                                <span className="stat-value">{f.ruptures}</span>
                                                <span className="stat-label">Ruptures</span>
                                            </div>
                                            <div className="fournisseur-stat warning">
                                                <span className="stat-value">{f.stocks_bas}</span>
                                                <span className="stat-label">Stock bas</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="fournisseur-footer">
                                        <span className="valeur-commande">
                                            Montant à commander : <strong>{formatMontant(f.valeur_a_commander)}</strong>
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state-full">
                                <CheckCircle size={64} />
                                <h3>Aucune alerte fournisseur</h3>
                                <p>Tous vos fournisseurs sont à jour</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Alertes;