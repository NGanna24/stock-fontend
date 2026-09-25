// pages/Rapports/BeneficesMarges/BeneficesMarges.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
    TrendingUp, TrendingDown, Download, RefreshCw,
    Banknote, Percent, ShoppingCart, Package, Award,
    Users, BarChart3, Receipt, Target, ArrowUp, ArrowDown,
    AlertTriangle, Info
} from "lucide-react";
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell,
    Legend, ComposedChart, Area
} from 'recharts';
import BeneficeService from "../../services/beneficeService";
import { useUser } from "../../context/AuthContext";
import StockSelector from "../../components/StockSelector/StockSelector";
import "./BeneficesMarges.css";

// ========== FORMATAGE ==========
const formatMontant = (value) => {
    if (value === null || value === undefined) return 'N/D';
    const num = parseFloat(value);
    if (isNaN(num)) return 'N/D';
    return Math.round(num).toLocaleString('fr-FR') + ' FCFA';
};

const formatMontantCourt = (value) => {
    const num = parseFloat(value) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num.toFixed(0);
};

const formatPct = (value) => {
    if (value === null || value === undefined) return 'N/D';
    const num = parseFloat(value);
    if (isNaN(num)) return 'N/D';
    return num.toFixed(2) + '%';
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
};

const renderBenefice = (row, opts = {}) => {
    const { className = '', showBadge = true } = opts;
    const dispo = row?.benefice_disponible !== false;
    const benefice = row?.benefice;
    const estime = row?.benefice_estime ?? benefice;

    if (dispo && benefice !== null && benefice !== undefined) {
        return (
            <span className={`benefice-value text-green ${className}`}>
                {formatMontant(benefice)}
            </span>
        );
    }

    return (
        <div className={`benefice-incomplet ${className}`}>
            <span className="benefice-estime">
                ≈ {formatMontant(estime)}
            </span>
            {showBadge && (
                <span className="badge-incomplet" title={`${row?.nb_lignes_sans_prix || 0} ligne(s) sans prix d'achat`}>
                    <AlertTriangle size={11} />
                    Incomplet
                </span>
            )}
        </div>
    );
};

const CATEGORIE_COLORS = [
    '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#995F2F',
    '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#6366f1'
];

const BeneficesMarges = () => {
    const { isAuthenticated } = useUser();
    const token = localStorage.getItem('token');

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const formatDateInput = (d) => d.toISOString().split('T')[0];

    const [dateDebut, setDateDebut] = useState(formatDateInput(firstDayOfMonth));
    const [dateFin, setDateFin] = useState(formatDateInput(lastDayOfMonth));

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState("resume");
    const [searchProduit, setSearchProduit] = useState("");

    const loadBenefices = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await BeneficeService.getBenefices(token, dateDebut, dateFin);
            if (res.success) {
                setData(res.data);
            } else {
                setError(res.message || 'Erreur lors du chargement');
            }
        } catch (e) {
            console.error('❌ loadBenefices error:', e);
            setError(e.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }, [token, dateDebut, dateFin]);

    useEffect(() => {
        if (isAuthenticated && token) {
            loadBenefices();
        }
    }, [isAuthenticated, token, loadBenefices]);

    const handleExport = async () => {
        try {
            const response = await BeneficeService.exportBenefices(token, dateDebut, dateFin);
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `benefices_${dateDebut}_${dateFin}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('❌ Export error:', e);
            alert('Erreur lors de l\'exportation');
        }
    };

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

    const totaux = data?.totaux || {
        nombre_commandes: 0,
        chiffre_affaires: 0,
        cout_achat: 0,
        benefice_brut: null,
        benefice_estime: 0,
        benefice_disponible: true,
        quantite_vendue: 0,
        marge_brute_pct: null,
        taux_marge: null,
        nb_lignes_sans_prix: 0,
        nb_lignes_total: 0,
        taux_couverture: 100
    };

    const commandes = data?.commandes || [];
    const parProduit = data?.par_produit || [];
    const parCategorie = data?.par_categorie || [];
    const parJour = data?.par_jour || [];
    const topProduits = data?.top_produits || [];
    const topClients = data?.top_clients || [];
    const produitsRentables = data?.produits_rentables || [];

    const aDesBeneficesIncomplets = !totaux.benefice_disponible;

    const produitsFiltres = searchProduit
        ? parProduit.filter(p =>
            p.produit_nom?.toLowerCase().includes(searchProduit.toLowerCase()) ||
            p.categorie_nom?.toLowerCase().includes(searchProduit.toLowerCase()) ||
            p.marque_nom?.toLowerCase().includes(searchProduit.toLowerCase())
        )
        : parProduit;

    if (loading && !data) {
        return (
            <div className="benefices-loading">
                <div className="spinner"></div>
                <p>Chargement des bénéfices...</p>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="benefices-error">
                <p>{error}</p>
                <button className="btn btn-primary" onClick={loadBenefices}>
                    <RefreshCw size={16} /> Réessayer
                </button>
            </div>
        );
    }

    return (
        <div className="benefices-container">
            {/* ==================== EN-TÊTE ==================== */}
            <div className="benefices-header">
                <div>
                    <h1 className="benefices-title">
                        <Banknote size={28} />
                        Bénéfices & Marges
                    </h1>
                    <p className="benefices-subtitle">
                        Analyse de la rentabilité du {formatDate(dateDebut)} au {formatDate(dateFin)}
                    </p>
                </div>
                <div className="benefices-actions">
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <Download size={18} />
                        <span>Exporter CSV</span>
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={loadBenefices}
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* ==================== FILTRES ==================== */}
            <div className="benefices-filters">
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
                    <div className="preset-buttons">
                        <button className="preset-btn" onClick={() => setPreset('today')}>Aujourd'hui</button>
                        <button className="preset-btn" onClick={() => setPreset('week')}>Cette semaine</button>
                        <button className="preset-btn" onClick={() => setPreset('month')}>Ce mois</button>
                        <button className="preset-btn" onClick={() => setPreset('year')}>Cette année</button>
                    </div>
                </div>
            </div>

            {/* ==================== BANDEAU BÉNÉFICE INCOMPLET ==================== */}
            {aDesBeneficesIncomplets && (
                <div className="benefice-warning-banner">
                    <AlertTriangle size={22} />
                    <div className="banner-content">
                        <strong>Bénéfice incomplet</strong>
                        <span>
                            {totaux.nb_lignes_sans_prix} ligne(s) sans prix d'achat sur{' '}
                            {totaux.nb_lignes_total} — le bénéfice affiché est une <strong>estimation</strong>.
                            Complétez les prix d'achat pour plus de précision.
                        </span>
                    </div>
                    <div className="banner-couverture">
                        <span className="couverture-label">Couverture</span>
                        <span className="couverture-value">{totaux.taux_couverture}%</span>
                    </div>
                </div>
            )}

            {/* ==================== KPIs ==================== */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon kpi-blue">
                        <ShoppingCart size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Chiffre d'affaires</span>
                        <span className="kpi-value">{formatMontant(totaux.chiffre_affaires)}</span>
                        <span className="kpi-sub">{totaux.nombre_commandes} commandes</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-orange">
                        <Package size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Coût d'achat</span>
                        <span className="kpi-value">{formatMontant(totaux.cout_achat)}</span>
                        <span className="kpi-sub">
                            {totaux.quantite_vendue} unités
                            {!totaux.benefice_disponible && ' (partiel)'}
                        </span>
                    </div>
                </div>

                <div className={`kpi-card highlight ${!totaux.benefice_disponible ? 'kpi-incomplete' : ''}`}>
                    <div className="kpi-icon kpi-green">
                        <TrendingUp size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">
                            Bénéfice brut
                            {!totaux.benefice_disponible && (
                                <span className="badge-inline-warning">
                                    <AlertTriangle size={11} /> Estimation
                                </span>
                            )}
                        </span>
                        <span className="kpi-value text-green">
                            {formatMontant(
                                totaux.benefice_disponible
                                    ? totaux.benefice_brut
                                    : totaux.benefice_estime
                            )}
                        </span>
                        <span className="kpi-sub">
                            {totaux.benefice_disponible
                                ? (totaux.benefice_brut >= 0 ? 'Rentable' : 'Perte')
                                : `${totaux.nb_lignes_sans_prix} ligne(s) sans prix`
                            }
                        </span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-purple">
                        <Percent size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Marge brute</span>
                        <span className="kpi-value">
                            {totaux.benefice_disponible
                                ? formatPct(totaux.marge_brute_pct)
                                : 'N/D'
                            }
                        </span>
                        <span className="kpi-sub">
                            {totaux.benefice_disponible
                                ? `Taux de marge : ${formatPct(totaux.taux_marge)}`
                                : 'Marge non calculable'
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* ==================== ONGLETS ==================== */}
            <div className="benefices-tabs">
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
                    <Package size={16} /> Produits ({parProduit.length})
                </button>
                <button
                    className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categories')}
                >
                    <Target size={16} /> Catégories ({parCategorie.length})
                </button>
                <button
                    className={`tab ${activeTab === 'rentables' ? 'active' : ''}`}
                    onClick={() => setActiveTab('rentables')}
                >
                    <Award size={16} /> Top Rentables ({produitsRentables.length})
                </button>
                <button
                    className={`tab ${activeTab === 'clients' ? 'active' : ''}`}
                    onClick={() => setActiveTab('clients')}
                >
                    <Users size={16} /> Top Clients ({topClients.length})
                </button>
            </div>

            {/* ==================== CONTENU ==================== */}
            <div className="benefices-content">

                {activeTab === 'resume' && (
                    <>
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3>Évolution du chiffre d'affaires et des bénéfices</h3>
                                {aDesBeneficesIncomplets && (
                                    <span className="chart-header-badge">
                                        <AlertTriangle size={12} /> Données partielles
                                    </span>
                                )}
                            </div>
                            <div className="chart-body">
                                {parJour.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={320}>
                                        <ComposedChart data={parJour}>
                                            <defs>
                                                <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#995F2F" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#995F2F" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorBenef" x1="0" y1="0" x2="0" y2="1">
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
                                                formatter={(v, name) => [formatMontant(v), name]}
                                                labelFormatter={(d) => formatDate(d)}
                                            />
                                            <Legend />
                                            <Area
                                                type="monotone"
                                                dataKey="chiffre_affaires"
                                                name="CA"
                                                stroke="#995F2F"
                                                fill="url(#colorCA)"
                                                strokeWidth={2}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey={aDesBeneficesIncomplets ? 'benefice_estime' : 'benefice'}
                                                name={aDesBeneficesIncomplets ? 'Bénéfice (estimé)' : 'Bénéfice'}
                                                stroke="#10b981"
                                                fill="url(#colorBenef)"
                                                strokeWidth={2}
                                                strokeDasharray={aDesBeneficesIncomplets ? '5 3' : '0'}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="empty-chart">
                                        <TrendingDown size={40} />
                                        <p>Aucune vente sur la période</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="charts-grid">
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Bénéfices par catégorie</h3>
                                </div>
                                <div className="chart-body">
                                    {parCategorie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={parCategorie.slice(0, 8)}
                                                    dataKey={parCategorie[0]?.benefice_disponible === false ? 'benefice_estime' : 'benefice'}
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
                                                <Tooltip formatter={(v) => formatMontant(v)} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="empty-chart">
                                            <Target size={40} />
                                            <p>Aucune donnée</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Top 5 produits par bénéfice</h3>
                                </div>
                                <div className="chart-body">
                                    {topProduits.slice(0, 5).length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={topProduits.slice(0, 5)} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis
                                                    type="number"
                                                    tickFormatter={formatMontantCourt}
                                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                                />
                                                <YAxis
                                                    dataKey="produit_nom"
                                                    type="category"
                                                    width={140}
                                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                                />
                                                <Tooltip formatter={(v) => [formatMontant(v), 'Bénéfice']} />
                                                <Bar
                                                    dataKey={topProduits[0]?.benefice_disponible === false ? 'benefice_estime' : 'benefice'}
                                                    fill="#10b981"
                                                    radius={[0, 6, 6, 0]}
                                                    maxBarSize={30}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="empty-chart">
                                            <Package size={40} />
                                            <p>Aucune vente</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'produits' && (
                    <div className="benefices-card">
                        <div className="card-header">
                            <h3>Rentabilité par produit</h3>
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
                                    <table className="benefices-table">
                                        <thead>
                                            <tr>
                                                <th>Produit</th>
                                                <th>Catégorie</th>
                                                <th>Qté</th>
                                                <th>Prix achat</th>
                                                <th>Prix vente</th>
                                                <th>Marge unit.</th>
                                                <th>Marge %</th>
                                                <th>CA</th>
                                                <th>Bénéfice</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {produitsFiltres.map((p) => (
                                                <tr key={p.id_produit}>
                                                    <td className="font-semibold">{p.produit_nom}</td>
                                                    <td className="text-muted">{p.categorie_nom || '-'}</td>
                                                    {/* ✅ StockSelector */}
                                                    <td className="text-center">
                                                        <StockSelector
                                                            idProduit={`benefice-${p.id_produit}`}
                                                            stockBase={p.quantite_vendue_base || p.quantite_vendue || 0}
                                                            unitesVente={p.unites_vente || []}
                                                            uniteBase={{
                                                                nom: p.unite_nom,
                                                                symbole: p.unite_symbole,
                                                            }}
                                                            variant="list"
                                                        />
                                                    </td>
                                                    <td>{formatMontant(p.prix_achat)}</td>
                                                    <td>{formatMontant(p.prix_vente)}</td>
                                                    <td className={p.marge_unitaire >= 0 ? 'text-success' : 'text-danger'}>
                                                        {formatMontant(p.marge_unitaire)}
                                                    </td>
                                                    <td>
                                                        {p.marge_unitaire_pct !== null ? (
                                                            <span className={`marge-badge ${
                                                                p.marge_unitaire_pct >= 30 ? 'marge-high' :
                                                                p.marge_unitaire_pct >= 15 ? 'marge-medium' : 'marge-low'
                                                            }`}>
                                                                {formatPct(p.marge_unitaire_pct)}
                                                            </span>
                                                        ) : (
                                                            <span className="badge-incomplet">N/D</span>
                                                        )}
                                                    </td>
                                                    <td>{formatMontant(p.chiffre_affaires)}</td>
                                                    <td>{renderBenefice(p)}</td>
                                                </tr>
                                            ))}
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

                {activeTab === 'categories' && (
                    <>
                        {parCategorie.length > 0 ? (
                            <>
                                <div className="chart-card">
                                    <div className="chart-header">
                                        <h3>Bénéfices par catégorie</h3>
                                    </div>
                                    <div className="chart-body">
                                        <ResponsiveContainer width="100%" height={350}>
                                            <BarChart data={parCategorie}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis
                                                    dataKey="categorie_nom"
                                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                                />
                                                <YAxis
                                                    tickFormatter={formatMontantCourt}
                                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                                    width={50}
                                                />
                                                <Tooltip formatter={(v) => [formatMontant(v), 'Bénéfice']} />
                                                <Bar
                                                    dataKey={parCategorie[0]?.benefice_disponible === false ? 'benefice_estime' : 'benefice'}
                                                    fill="#8b5cf6"
                                                    radius={[6, 6, 0, 0]}
                                                    maxBarSize={50}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="benefices-card">
                                    <div className="card-header">
                                        <h3>Détail par catégorie</h3>
                                    </div>
                                    <div className="card-body">
                                        <div className="table-container">
                                            <table className="benefices-table">
                                                <thead>
                                                    <tr>
                                                        <th>Catégorie</th>
                                                        <th>Produits</th>
                                                        <th>Qté vendue</th>
                                                        <th>CA</th>
                                                        <th>Coût achat</th>
                                                        <th>Bénéfice</th>
                                                        <th>Marge %</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parCategorie.map((c) => (
                                                        <tr key={c.id_categorie || 'none'}>
                                                            <td className="font-semibold">{c.categorie_nom}</td>
                                                            <td className="text-center">{c.nombre_produits}</td>
                                                            {/* ✅ StockSelector sur Qté vendue (agrégat) */}
                                                            <td className="text-center">
                                                                <StockSelector
                                                                    idProduit={`benefice-cat-${c.id_categorie || 'none'}`}
                                                                    stockBase={c.quantite_vendue_base || c.quantite_vendue || 0}
                                                                    unitesVente={[]}
                                                                    uniteBase={null}
                                                                    variant="list"
                                                                />
                                                            </td>
                                                            <td>{formatMontant(c.chiffre_affaires)}</td>
                                                            <td>{formatMontant(c.cout_achat)}</td>
                                                            <td>{renderBenefice(c)}</td>
                                                            <td>
                                                                {c.marge_pct !== null ? (
                                                                    <span className={`marge-badge ${
                                                                        c.marge_pct >= 30 ? 'marge-high' :
                                                                        c.marge_pct >= 15 ? 'marge-medium' : 'marge-low'
                                                                    }`}>
                                                                        {formatPct(c.marge_pct)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="badge-incomplet">N/D</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="benefices-card">
                                <div className="card-body">
                                    <div className="empty-chart">
                                        <Target size={48} />
                                        <p>Aucune donnée par catégorie</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'rentables' && (
                    <div className="benefices-card">
                        <div className="card-header">
                            <h3>
                                <Award size={18} />
                                Produits les plus rentables (par marge %)
                            </h3>
                        </div>
                        <div className="card-body">
                            {produitsRentables.length > 0 ? (
                                <div className="table-container">
                                    <table className="benefices-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Produit</th>
                                                <th>Marque</th>
                                                <th>Prix achat</th>
                                                <th>Prix vente</th>
                                                <th>Marge unit.</th>
                                                <th>Marge %</th>
                                                <th>Qté vendue</th>
                                                <th>Bénéfice total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {produitsRentables.map((p, i) => (
                                                <tr key={p.id_produit}>
                                                    <td>
                                                        <span className={`rank-badge rank-${i + 1}`}>
                                                            {i + 1}
                                                        </span>
                                                    </td>
                                                    <td className="font-semibold">{p.produit_nom}</td>
                                                    <td className="text-muted">{p.marque_nom || '-'}</td>
                                                    <td>{formatMontant(p.prix_achat)}</td>
                                                    <td>{formatMontant(p.prix_vente)}</td>
                                                    <td className="text-success font-semibold">
                                                        {formatMontant(p.marge_unitaire)}
                                                    </td>
                                                    <td>
                                                        {p.marge_pct !== null ? (
                                                            <span className={`marge-badge ${
                                                                p.marge_pct >= 30 ? 'marge-high' :
                                                                p.marge_pct >= 15 ? 'marge-medium' : 'marge-low'
                                                            }`}>
                                                                {formatPct(p.marge_pct)}
                                                            </span>
                                                        ) : (
                                                            <span className="badge-incomplet">N/D</span>
                                                        )}
                                                    </td>
                                                    {/* ✅ StockSelector */}
                                                    <td className="text-center">
                                                        <StockSelector
                                                            idProduit={`benefice-rent-${p.id_produit}`}
                                                            stockBase={p.quantite_vendue_base || p.quantite_vendue || 0}
                                                            unitesVente={p.unites_vente || []}
                                                            uniteBase={{
                                                                nom: p.unite_nom,
                                                                symbole: p.unite_symbole,
                                                            }}
                                                            variant="list"
                                                        />
                                                    </td>
                                                    <td className="font-bold text-green">
                                                        {formatMontant(p.benefice_total)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-chart">
                                    <Award size={48} />
                                    <p>Aucun produit rentable</p>
                                    <span>Les produits avec marge positive apparaîtront ici</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'clients' && (
                    <div className="benefices-card">
                        <div className="card-header">
                            <h3>
                                <Users size={18} />
                                Top 10 clients par bénéfice généré
                            </h3>
                        </div>
                        <div className="card-body">
                            {topClients.length > 0 ? (
                                <div className="table-container">
                                    <table className="benefices-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Client</th>
                                                <th>Téléphone</th>
                                                <th>Commandes</th>
                                                <th>Chiffre d'affaires</th>
                                                <th>Bénéfice généré</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topClients.map((c, i) => (
                                                <tr key={`${c.nomclient}-${i}`}>
                                                    <td>
                                                        <span className={`rank-badge rank-${i + 1}`}>
                                                            {i + 1}
                                                        </span>
                                                    </td>
                                                    <td className="font-semibold">{c.nomclient}</td>
                                                    <td className="text-muted">{c.telephone || '-'}</td>
                                                    <td className="text-center">{c.nombre_commandes}</td>
                                                    <td>{formatMontant(c.chiffre_affaires)}</td>
                                                    <td>{renderBenefice(c)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-chart">
                                    <Users size={48} />
                                    <p>Aucun client sur la période</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BeneficesMarges;