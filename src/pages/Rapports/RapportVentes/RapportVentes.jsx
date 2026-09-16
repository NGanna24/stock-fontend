// pages/Rapports/RapportVentes/RapportVentes.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
    TrendingUp, TrendingDown, Download, RefreshCw,
    Users, ShoppingCart, Banknote, BarChart3, Package,
    Receipt
} from "lucide-react";
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import RapportVenteService from "../../../services/rapportVenteService";
import { useUser } from "../../../context/AuthContext";
import "./RapportVentes.css";

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

// ========== COULEURS STATUTS ==========
const STATUT_COLORS = {
    'livree': '#10b981',
    'expediee': '#995F2F',
    'en_preparation': '#8b5cf6',
    'confirmee': '#f59e0b',
    'en_attente': '#f97316',
    'annulee': '#ef4444'
};

const STATUT_LABELS = {
    'livree': 'Livrée',
    'expediee': 'Expédiée',
    'en_preparation': 'Préparation',
    'confirmee': 'Confirmée',
    'en_attente': 'En attente',
    'annulee': 'Annulée'
};

const RapportVentes = () => {
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

    // ========== CHARGEMENT ==========
    const loadRapport = useCallback(async () => {
        if (!token) return;

        setLoading(true);
        setError(null);

        try {
            const res = await RapportVenteService.getRapportVentes(token, dateDebut, dateFin);
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
            const response = await RapportVenteService.exportRapportVentes(token, dateDebut, dateFin);
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `rapport_ventes_${dateDebut}_${dateFin}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('❌ Export error:', e);
            alert('Erreur lors de l\'exportation');
        }
    };

    // ========== PRÉSETS DE PÉRIODE ==========
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

    // ========== DONNÉES ==========
    const totaux = data?.totaux || {
        nombre_commandes: 0,
        chiffre_affaires: 0,
        panier_moyen: 0,
        commandes_livrees: 0,
        commandes_en_attente: 0,
        commandes_annulees: 0
    };

    const commandes = data?.commandes || [];
    const parProduit = data?.par_produit || [];
    const parJour = data?.par_jour || [];
    const parStatut = data?.par_statut || [];
    const topClients = data?.top_clients || [];

    // ========== LOADER ==========
    if (loading && !data) {
        return (
            <div className="rapport-loading">
                <div className="spinner"></div>
                <p>Chargement du rapport des ventes...</p>
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
        <div className="rapport-ventes-container">
            {/* ==================== EN-TÊTE ==================== */}
            <div className="rapport-header">
                <div>
                    <h1 className="rapport-title">
                        <Receipt size={28} />
                        Rapport des Ventes
                    </h1>
                    <p className="rapport-subtitle">
                        Analyse détaillée des ventes du {formatDate(dateDebut)} au {formatDate(dateFin)}
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

            {/* ==================== FILTRES ==================== */}
            <div className="rapport-filters">
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
                        <button className="preset-btn" onClick={() => setPreset('today')}>
                            Aujourd'hui
                        </button>
                        <button className="preset-btn" onClick={() => setPreset('week')}>
                            Cette semaine
                        </button>
                        <button className="preset-btn" onClick={() => setPreset('month')}>
                            Ce mois
                        </button>
                        <button className="preset-btn" onClick={() => setPreset('year')}>
                            Cette année
                        </button>
                    </div>
                </div>
            </div>

            {/* ==================== KPIs ==================== */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon kpi-blue">
                        <ShoppingCart size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Commandes</span>
                        <span className="kpi-value">{totaux.nombre_commandes}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-green">
                        <Banknote size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Chiffre d'affaires</span>
                        <span className="kpi-value">{formatMontant(totaux.chiffre_affaires)}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-purple">
                        <TrendingUp size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Panier moyen</span>
                        <span className="kpi-value">{formatMontant(totaux.panier_moyen)}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-orange">
                        <Package size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Commandes livrées</span>
                        <span className="kpi-value">{totaux.commandes_livrees}</span>
                        <span className="kpi-sub">
                            {totaux.commandes_en_attente} en attente
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
                    <Package size={16} /> Produits ({parProduit.length})
                </button>
                <button
                    className={`tab ${activeTab === 'clients' ? 'active' : ''}`}
                    onClick={() => setActiveTab('clients')}
                >
                    <Users size={16} /> Top Clients ({topClients.length})
                </button>
                <button
                    className={`tab ${activeTab === 'commandes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('commandes')}
                >
                    <ShoppingCart size={16} /> Commandes ({commandes.length})
                </button>
            </div>

            {/* ==================== CONTENU ==================== */}
            <div className="rapport-content">

                {/* ✅ ONGLET RÉSUMÉ */}
                {activeTab === 'resume' && (
                    <>
                        <div className="charts-grid">
                            {/* Évolution des ventes */}
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Évolution des ventes</h3>
                                </div>
                                <div className="chart-body">
                                    {parJour.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <LineChart data={parJour}>
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
                                                    formatter={(v) => [formatMontant(v), 'CA']}
                                                    labelFormatter={(d) => formatDate(d)}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="chiffre_affaires"
                                                    stroke="#2563eb"
                                                    strokeWidth={2}
                                                    dot={{ fill: '#2563eb', r: 4 }}
                                                    activeDot={{ r: 6 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="empty-chart">
                                            <TrendingDown size={40} />
                                            <p>Aucune vente sur la période</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Répartition par statut */}
                            <div className="chart-card">
                                <div className="chart-header">
                                    <h3>Répartition par statut</h3>
                                </div>
                                <div className="chart-body">
                                    {parStatut.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie
                                                    data={parStatut}
                                                    dataKey="nombre"
                                                    nameKey="statut"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                >
                                                    {parStatut.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={STATUT_COLORS[entry.statut] || '#64748b'}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(v, name, props) => [
                                                        `${v} commande(s)`,
                                                        STATUT_LABELS[props.payload.statut] || props.payload.statut
                                                    ]}
                                                />
                                                <Legend
                                                    formatter={(value, entry) => {
                                                        const payload = entry.payload;
                                                        return `${STATUT_LABELS[payload.statut] || payload.statut} (${payload.nombre})`;
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="empty-chart">
                                            <ShoppingCart size={40} />
                                            <p>Aucune donnée</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top 5 produits */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3>Top 5 produits</h3>
                            </div>
                            <div className="chart-body">
                                {parProduit.slice(0, 5).length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={parProduit.slice(0, 5)} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis
                                                type="number"
                                                tickFormatter={formatMontantCourt}
                                                tick={{ fontSize: 11, fill: '#64748b' }}
                                            />
                                            <YAxis
                                                dataKey="produit_nom"
                                                type="category"
                                                width={150}
                                                tick={{ fontSize: 11, fill: '#64748b' }}
                                            />
                                            <Tooltip formatter={(v) => [formatMontant(v), 'CA']} />
                                            <Bar
                                                dataKey="chiffre_affaires"
                                                fill="#2563eb"
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
                    </>
                )}

                {/* ✅ ONGLET PRODUITS */}
                {activeTab === 'produits' && (
                    <div className="rapport-card">
                        <div className="card-header">
                            <h3>Détail des ventes par produit</h3>
                        </div>
                        <div className="card-body">
                            {parProduit.length > 0 ? (
                                <div className="table-container">
                                    <table className="rapport-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Produit</th>
                                                <th>Marque</th>
                                                <th>Catégorie</th>
                                                <th>Qté vendue</th>
                                                <th>Commandes</th>
                                                <th>Chiffre d'affaires</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parProduit.map((p, i) => (
                                                <tr key={p.id_produit}>
                                                    <td>{i + 1}</td>
                                                    <td className="font-semibold">{p.produit_nom}</td>
                                                    <td>{p.marque_nom || '-'}</td>
                                                    <td>{p.categorie_nom || '-'}</td>
                                                    <td className="text-center">{p.total_vendu}</td>
                                                    <td className="text-center">{p.nombre_commandes}</td>
                                                    <td className="font-bold">{formatMontant(p.chiffre_affaires)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-chart">
                                    <Package size={40} />
                                    <p>Aucune vente sur la période</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ✅ ONGLET CLIENTS */}
                {activeTab === 'clients' && (
                    <div className="rapport-card">
                        <div className="card-header">
                            <h3>Top 10 clients</h3>
                        </div>
                        <div className="card-body">
                            {topClients.length > 0 ? (
                                <div className="table-container">
                                    <table className="rapport-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Client</th>
                                                <th>Téléphone</th>
                                                <th>Commandes</th>
                                                <th>Chiffre d'affaires</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topClients.map((c, i) => (
                                                <tr key={`${c.nomclient}-${i}`}>
                                                    <td>{i + 1}</td>
                                                    <td className="font-semibold">{c.nomclient}</td>
                                                    <td>{c.telephone || '-'}</td>
                                                    <td className="text-center">{c.nombre_commandes}</td>
                                                    <td className="font-bold">{formatMontant(c.chiffre_affaires)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-chart">
                                    <Users size={40} />
                                    <p>Aucun client sur la période</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ✅ ONGLET COMMANDES */}
                {activeTab === 'commandes' && (
                    <div className="rapport-card">
                        <div className="card-header">
                            <h3>Liste détaillée des commandes</h3>
                        </div>
                        <div className="card-body">
                            {commandes.length > 0 ? (
                                <div className="table-container">
                                    <table className="rapport-table">
                                        <thead>
                                            <tr>
                                                <th>N° Commande</th>
                                                <th>Date</th>
                                                <th>Client</th>
                                                <th>Téléphone</th>
                                                <th>Statut</th>
                                                <th>Montant</th>
                                                <th>Facture</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {commandes.map((c) => (
                                                <tr key={c.id_commande}>
                                                    <td className="font-semibold">{c.numero_commande}</td>
                                                    <td>{c.date_formatee || formatDate(c.date_commande)}</td>
                                                    <td>{c.nomclient || '-'}</td>
                                                    <td>{c.telephone || '-'}</td>
                                                    <td>
                                                        <span className={`status-badge status-${c.statut}`}>
                                                            {STATUT_LABELS[c.statut] || c.statut}
                                                        </span>
                                                    </td>
                                                    <td className="font-bold">{formatMontant(c.montant_total)}</td>
                                                    <td>{c.numero_facture || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-chart">
                                    <ShoppingCart size={40} />
                                    <p>Aucune commande sur la période</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RapportVentes;