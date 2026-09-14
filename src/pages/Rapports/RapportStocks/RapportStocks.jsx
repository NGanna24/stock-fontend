// pages/Rapports/RapportStocks/RapportStocks.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
    TrendingUp, TrendingDown, Download, RefreshCw,
    Package, Boxes, Banknote, AlertTriangle,
    Warehouse, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal,
    Repeat, ClipboardList, Receipt,BarChart3
} from "lucide-react";
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import RapportStockService from "../../../services/rapportStockService";
import { useUser } from "../../../context/AuthContext";
import "./RapportStocks.css";

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

// ========== COULEURS PIE CHART ============
const CATEGORIE_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#6366f1'
];

const ETAT_CONFIG = {
    'rupture': { label: 'Rupture', cls: 'etat-rupture', color: '#ef4444' },
    'stock_bas': { label: 'Stock bas', cls: 'etat-stock-bas', color: '#f59e0b' },
    'surstock': { label: 'Surstock', cls: 'etat-surstock', color: '#8b5cf6' },
    'normal': { label: 'Normal', cls: 'etat-normal', color: '#10b981' }
};

const RapportStocks = () => {
    const { isAuthenticated } = useUser();
    const token = localStorage.getItem('token');

    // ========== DATES PAR DÉFAUT ==========
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const formatDateInput = (d) => d.toISOString().split('T')[0];

    const [dateDebut, setDateDebut] = useState(formatDateInput(firstDayOfMonth));
    const [dateFin, setDateFin] = useState(formatDateInput(lastDayOfMonth));

    // ========== ÉTATS ==========
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState("resume");
    const [searchProduit, setSearchProduit] = useState("");

    // ========== CHARGEMENT ==========
    const loadRapport = useCallback(async () => {
        if (!token) return;

        setLoading(true);
        setError(null);

        try {
            const res = await RapportStockService.getRapportStocks(token, dateDebut, dateFin);
            if (res.success) {
                setData(res.data);
            } else {
                setError(res.message || 'Erreur lors du chargement');
            }
        } catch (e) {
            console.error('❌ loadRapport error:', e);
            setError(e.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }, [token, dateDebut, dateFin]);

    useEffect(() => {
        if (isAuthenticated && token) {
            loadRapport();
        }
    }, [isAuthenticated, token, loadRapport]);

    // ========== EXPORT CSV ==========
    const handleExport = async () => {
        try {
            const response = await RapportStockService.exportRapportStocks(token, dateDebut, dateFin);
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `rapport_stocks_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('❌ Export error:', e);
            alert('Erreur lors de l\'exportation');
        }
    };

    // ========== DONNÉES ==========
    const totaux = data?.totaux || {
        nombre_produits: 0,
        quantite_totale: 0,
        valeur_achat: 0,
        valeur_vente: 0,
        total_rupture: 0,
        total_stock_bas: 0,
        total_surstock: 0
    };

    const produits = data?.produits || [];
    const parCategorie = data?.par_categorie || [];
    const parMarque = data?.par_marque || [];
    const alertes = data?.alertes || { rupture: [], stock_bas: [], surstock: [] };
    const topValeur = data?.top_valeur || [];
    const mouvements = data?.mouvements || [];

    // ========== FILTRAGE PRODUITS ==========
    const produitsFiltres = searchProduit
        ? produits.filter(p =>
            p.produit_nom?.toLowerCase().includes(searchProduit.toLowerCase()) ||
            p.categorie_nom?.toLowerCase().includes(searchProduit.toLowerCase()) ||
            p.marque_nom?.toLowerCase().includes(searchProduit.toLowerCase())
        )
        : produits;

    // ========== ICÔNES MOUVEMENTS ==========
    const getMouvementIcon = (type) => {
        const icons = {
            'entree': <ArrowDownCircle size={16} />,
            'sortie': <ArrowUpCircle size={16} />,
            'ajustement': <SlidersHorizontal size={16} />,
            'transfert': <Repeat size={16} />
        };
        const classes = {
            'entree': 'mv-entree',
            'sortie': 'mv-sortie',
            'ajustement': 'mv-ajustement',
            'transfert': 'mv-transfert'
        };
        return (
            <span className={`mv-icon ${classes[type] || ''}`}>
                {icons[type] || <Repeat size={16} />}
            </span>
        );
    };

    // ========== LOADER ==========
    if (loading && !data) {
        return (
            <div className="rapport-loading">
                <div className="spinner"></div>
                <p>Chargement du rapport des stocks...</p>
            </div>
        );
    }

    // ========== ERREUR ==========
    if (error && !data) {
        return (
            <div className="rapport-error">
                <p>{error}</p>
                <button className="btn btn-primary" onClick={loadRapport}>
                    <RefreshCw size={16} /> Réessayer
                </button>
            </div>
        );
    }

    return (
        <div className="rapport-stocks-container">
            {/* ==================== EN-TÊTE ==================== */}
            <div className="rapport-header">
                <div>
                    <h1 className="rapport-title">
                        <Warehouse size={28} />
                        Rapport des Stocks
                    </h1>
                    <p className="rapport-subtitle">
                        État actuel du stock - {totaux.nombre_produits} produit(s)
                    </p>
                </div>
                <div className="rapport-actions">
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <Download size={18} />
                        <span>Exporter CSV</span>
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={loadRapport}
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* ==================== FILTRES PÉRIODE (pour mouvements) ==================== */}
            <div className="rapport-filters">
                <div className="filter-row">
                    <div className="filter-group">
                        <label>Du (mouvements)</label>
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
                    <button className="btn btn-secondary" onClick={loadRapport}>
                        <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                        Actualiser
                    </button>
                </div>
            </div>

            {/* ==================== KPIs ==================== */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon kpi-blue">
                        <Package size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Produits</span>
                        <span className="kpi-value">{totaux.nombre_produits}</span>
                        <span className="kpi-sub">
                            {totaux.quantite_totale} unités en stock
                        </span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-purple">
                        <Banknote size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Valeur d'achat</span>
                        <span className="kpi-value">{formatMontant(totaux.valeur_achat)}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-green">
                        <TrendingUp size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Valeur de vente</span>
                        <span className="kpi-value">{formatMontant(totaux.valeur_vente)}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-red">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Alertes</span>
                        <span className="kpi-value">
                            {totaux.total_rupture + totaux.total_stock_bas}
                        </span>
                        <span className="kpi-sub">
                            {totaux.total_rupture} ruptures • {totaux.total_stock_bas} stock bas
                        </span>
                    </div>
                </div>
            </div>

            {/* ==================== ONGLETS ==================== */}
            <div className="rapport-tabs">
                <button
                    className={`tab ${activeTab === 'resume' ? 'active' : ''}`}
                    onClick={() => setActiveTab('resume')}
                >
                    <BarChart3 size={16} /> Résumé
                </button>
                <button
                    className={`tab ${activeTab === 'produits' ? 'active' : ''}`}
                    onClick={() => setActiveTab('produits')}
                >
                    <Package size={16} /> Produits ({produits.length})
                </button>
                <button
                    className={`tab ${activeTab === 'alertes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('alertes')}
                >
                    <AlertTriangle size={16} /> Alertes (
                    {alertes.rupture.length + alertes.stock_bas.length + alertes.surstock.length})
                </button>
                <button
                    className={`tab ${activeTab === 'mouvements' ? 'active' : ''}`}
                    onClick={() => setActiveTab('mouvements')}
                >
                    <ClipboardList size={16} /> Mouvements ({mouvements.length})
                </button>
            </div>

            {/* ==================== CONTENU ==================== */}
            <div className="rapport-content">

                {/* ✅ ONGLET RÉSUMÉ */}
                {activeTab === 'resume' && (
                    <>
                        <div className="charts-grid">
                            {/* Valeur par catégorie */}
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Valeur du stock par catégorie</h3>
                                </div>
                                <div className="chart-body">
                                    {parCategorie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie
                                                    data={parCategorie.slice(0, 8)}
                                                    dataKey="valeur_achat"
                                                    nameKey="categorie_nom"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                >
                                                    {parCategorie.slice(0, 8).map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={CATEGORIE_COLORS[index % CATEGORIE_COLORS.length]}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(v, name) => [formatMontant(v), name]}
                                                />
                                                <Legend
                                                    formatter={(value) => value.length > 20
                                                        ? value.substring(0, 20) + '…'
                                                        : value}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="empty-chart">
                                            <Boxes size={40} />
                                            <p>Aucune donnée</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Top produits par valeur */}
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Top 8 produits (valeur immobilisée)</h3>
                                </div>
                                <div className="chart-body">
                                    {topValeur.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={topValeur.slice(0, 8)} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis
                                                    type="number"
                                                    tickFormatter={formatMontantCourt}
                                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                                />
                                                <YAxis
                                                    dataKey="produit_nom"
                                                    type="category"
                                                    width={130}
                                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                                />
                                                <Tooltip formatter={(v) => [formatMontant(v), 'Valeur stock']} />
                                                <Bar
                                                    dataKey="valeur_stock"
                                                    fill="#8b5cf6"
                                                    radius={[0, 6, 6, 0]}
                                                    maxBarSize={25}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="empty-chart">
                                            <Package size={40} />
                                            <p>Aucun produit</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Valeur par marque */}
                        {parMarque.length > 0 && (
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Valeur du stock par marque</h3>
                                </div>
                                <div className="chart-body">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={parMarque.slice(0, 10)}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="marque_nom"
                                                tick={{ fontSize: 11, fill: '#64748b' }}
                                            />
                                            <YAxis
                                                tickFormatter={formatMontantCourt}
                                                tick={{ fontSize: 11, fill: '#64748b' }}
                                                width={50}
                                            />
                                            <Tooltip formatter={(v) => [formatMontant(v), 'Valeur achat']} />
                                            <Bar
                                                dataKey="valeur_achat"
                                                fill="#3b82f6"
                                                radius={[6, 6, 0, 0]}
                                                maxBarSize={50}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ✅ ONGLET PRODUITS */}
                {activeTab === 'produits' && (
                    <div className="rapport-card">
                        <div className="card-header">
                            <h3>Liste des produits en stock</h3>
                            <div className="search-box-small">
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={searchProduit}
                                    onChange={(e) => setSearchProduit(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="card-body">
                            {produitsFiltres.length > 0 ? (
                                <div className="table-container">
                                    <table className="rapport-table">
                                        <thead>
                                            <tr>
                                                <th>Produit</th>
                                                <th>Catégorie</th>
                                                <th>Marque</th>
                                                <th>Stock</th>
                                                <th>Min/Max</th>
                                                <th>Prix achat</th>
                                                <th>Valeur</th>
                                                <th>État</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {produitsFiltres.map((p) => {
                                                const etat = ETAT_CONFIG[p.etat_stock] || ETAT_CONFIG.normal;
                                                return (
                                                    <tr key={p.id_produit}>
                                                        <td className="font-semibold">{p.produit_nom}</td>
                                                        <td>{p.categorie_nom || '-'}</td>
                                                        <td>{p.marque_nom || '-'}</td>
                                                        <td className="text-center">
                                                            <strong>{p.quantite_stock}</strong>
                                                            {p.unite_symbole && ` ${p.unite_symbole}`}
                                                        </td>
                                                        <td className="text-muted">
                                                            {p.quantite_minimale} / {p.quantite_maximale}
                                                        </td>
                                                        <td>{formatMontant(p.prix_achat)}</td>
                                                        <td className="font-bold">{formatMontant(p.valeur_stock)}</td>
                                                        <td>
                                                            <span className={`etat-badge ${etat.cls}`}>
                                                                {etat.label}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-chart">
                                    <Package size={40} />
                                    <p>Aucun produit trouvé</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ✅ ONGLET ALERTES */}
                {activeTab === 'alertes' && (
                    <>
                        {alertes.rupture.length > 0 && (
                            <div className="rapport-card">
                                <div className="card-header danger">
                                    <h3>
                                        <AlertTriangle size={18} />
                                        Ruptures de stock ({alertes.rupture.length})
                                    </h3>
                                </div>
                                <div className="card-body">
                                    <div className="table-container">
                                        <table className="rapport-table">
                                            <thead>
                                                <tr>
                                                    <th>Produit</th>
                                                    <th>Stock</th>
                                                    <th>Stock min</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {alertes.rupture.map((p) => (
                                                    <tr key={p.id_produit}>
                                                        <td className="font-semibold">{p.produit_nom}</td>
                                                        <td className="text-center text-danger">
                                                            <strong>{p.quantite_stock}</strong>
                                                        </td>
                                                        <td className="text-center">{p.quantite_minimale}</td>
                                                        <td>
                                                            <span className="action-badge danger">
                                                                Commander
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {alertes.stock_bas.length > 0 && (
                            <div className="rapport-card">
                                <div className="card-header warning">
                                    <h3>
                                        <AlertTriangle size={18} />
                                        Stock bas ({alertes.stock_bas.length})
                                    </h3>
                                </div>
                                <div className="card-body">
                                    <div className="table-container">
                                        <table className="rapport-table">
                                            <thead>
                                                <tr>
                                                    <th>Produit</th>
                                                    <th>Stock</th>
                                                    <th>Stock min</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {alertes.stock_bas.map((p) => (
                                                    <tr key={p.id_produit}>
                                                        <td className="font-semibold">{p.produit_nom}</td>
                                                        <td className="text-center text-warning">
                                                            <strong>{p.quantite_stock}</strong>
                                                        </td>
                                                        <td className="text-center">{p.quantite_minimale}</td>
                                                        <td>
                                                            <span className="action-badge warning">
                                                                Réapprovisionner
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {alertes.surstock.length > 0 && (
                            <div className="rapport-card">
                                <div className="card-header info">
                                    <h3>
                                        <Boxes size={18} />
                                        Surstock ({alertes.surstock.length})
                                    </h3>
                                </div>
                                <div className="card-body">
                                    <div className="table-container">
                                        <table className="rapport-table">
                                            <thead>
                                                <tr>
                                                    <th>Produit</th>
                                                    <th>Stock</th>
                                                    <th>Stock max</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {alertes.surstock.map((p) => (
                                                    <tr key={p.id_produit}>
                                                        <td className="font-semibold">{p.produit_nom}</td>
                                                        <td className="text-center">
                                                            <strong>{p.quantite_stock}</strong>
                                                        </td>
                                                        <td className="text-center">{p.quantite_maximale}</td>
                                                        <td>
                                                            <span className="action-badge info">
                                                                Vérifier
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {alertes.rupture.length === 0 &&
                         alertes.stock_bas.length === 0 &&
                         alertes.surstock.length === 0 && (
                            <div className="rapport-card">
                                <div className="card-body">
                                    <div className="empty-chart">
                                        <Package size={48} />
                                        <p>Aucune alerte</p>
                                        <span>Votre stock est bien géré</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ✅ ONGLET MOUVEMENTS */}
                {activeTab === 'mouvements' && (
                    <div className="rapport-card">
                        <div className="card-header">
                            <h3>
                                Mouvements du {formatDate(dateDebut)} au {formatDate(dateFin)}
                            </h3>
                        </div>
                        <div className="card-body">
                            {mouvements.length > 0 ? (
                                <div className="table-container">
                                    <table className="rapport-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Type</th>
                                                <th>Produit</th>
                                                <th>Quantité</th>
                                                <th>Avant → Après</th>
                                                <th>Référence</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mouvements.map((m) => (
                                                <tr key={m.id_mouvement}>
                                                    <td>{m.date_formatee}</td>
                                                    <td>
                                                        <span className="mouvement-type">
                                                            {getMouvementIcon(m.type_mouvement)}
                                                            {m.type_mouvement}
                                                        </span>
                                                    </td>
                                                    <td className="font-semibold">{m.produit_nom}</td>
                                                    <td className={`text-center ${
                                                        m.quantite > 0 ? 'text-success' : 'text-danger'
                                                    }`}>
                                                        <strong>
                                                            {m.quantite > 0 ? `+${m.quantite}` : m.quantite}
                                                        </strong>
                                                        {m.unite_symbole && ` ${m.unite_symbole}`}
                                                    </td>
                                                    <td className="text-muted">
                                                        {m.ancienne_quantite} → {m.nouvelle_quantite}
                                                    </td>
                                                    <td>{m.type_reference || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-chart">
                                    <ClipboardList size={40} />
                                    <p>Aucun mouvement sur la période</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RapportStocks;