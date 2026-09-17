// pages/Dashboard/Dashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAlertSound from "../../hooks/useAlertSound";

import {
    Package, Users, ShoppingCart, Banknote, TrendingUp,
    AlertCircle, RefreshCw, ArrowDownCircle, ArrowUpCircle,
    SlidersHorizontal, Repeat, FileText, ChevronRight, TrendingDown,
    Clock, Volume2, VolumeX
} from "lucide-react";
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    Tooltip, CartesianGrid, BarChart, Bar
} from 'recharts';
import DashboardService from "../../services/DashboardService";
import { useUser } from "../../context/AuthContext";
import "./Dashboard.css";

// ========== ÉTAT INITIAL ==========
const INITIAL_DATA = {
    kpis: {
        total_produits: 0,
        total_clients: 0,
        commandes_en_attente: 0,
        ventes_mois: 0,
        ventes_jour: 0,
        factures_impayees: 0,
        montant_impaye: 0,
        benefices_mois: 0
    },
    ventes_chart: [],
    ventes_jour_chart: [],
    ventes_semaine: [],
    top_produits: [],
    alertes: {
        rupture: [],
        stock_bas: [],
        total_rupture: 0,
        total_stock_bas: 0
    },
    derniers_mouvements: [],
    dernieres_factures: [],
    dernieres_commandes: []
};

const Dashboard = () => {
    const { isAuthenticated, user } = useUser();
    const { slug = '' } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    // ✅ Hook sonore
    const { playWarning, playCritical, startAlertLoop, stopAlertLoop } = useAlertSound();


    // ✅ Verrou : ne pas rejouer le son à chaque render
    const soundPlayedRef = useRef(false);
    // ✅ État : activer/désactiver le son
    const [soundEnabled, setSoundEnabled] = useState(true);
    

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(INITIAL_DATA);

    // ========== CHARGEMENT ==========
    const loadDashboard = useCallback(async () => {
        if (!token) return;

        setLoading(true);
        setError(null);

        try {
            const res = await DashboardService.getStats(token);
            const d = res?.data || res || {};

            setData({
                kpis: d.kpis || INITIAL_DATA.kpis,
                ventes_chart: Array.isArray(d.ventes_chart) ? d.ventes_chart : [],
                ventes_jour_chart: Array.isArray(d.ventes_jour_chart) ? d.ventes_jour_chart : [],
                ventes_semaine: Array.isArray(d.ventes_semaine) ? d.ventes_semaine : [],
                top_produits: Array.isArray(d.top_produits) ? d.top_produits : [],
                alertes: d.alertes || INITIAL_DATA.alertes,
                derniers_mouvements: Array.isArray(d.derniers_mouvements) ? d.derniers_mouvements : [],
                dernieres_factures: Array.isArray(d.dernieres_factures) ? d.dernieres_factures : [],
                dernieres_commandes: Array.isArray(d.dernieres_commandes) ? d.dernieres_commandes : []
            });
        } catch (e) {
            console.error('❌ loadDashboard error:', e);
            setError(e.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (isAuthenticated && token) {
            loadDashboard();
        }
    }, [isAuthenticated, token, loadDashboard]);

// ========== EFFET SONORE : BOUCLE TANT QU'IL Y A DES ALERTES ==========
useEffect(() => {
    // Récupérer les compteurs d'alertes
    const totalRupture = data.alertes?.total_rupture || 0;
    const totalStockBas = data.alertes?.total_stock_bas || 0;

    // Conditions : son activé ET au moins une alerte
    const hasAlerts = totalRupture > 0 || totalStockBas > 0;

    if (soundEnabled && hasAlerts) {
        // Rupture → son critique (prioritaire)
        // Stock bas → son d'avertissement
        const type = totalRupture > 0 ? 'critical' : 'warning';

        // ✅ Démarrer la boucle (répète toutes les 5 secondes)
        startAlertLoop(type, 5000);
    } else {
        // ✅ Stopper la boucle si :
        //    - Son désactivé
        //    - OU plus d'alertes
        stopAlertLoop();
    }

    // ✅ Cleanup : stopper la boucle au démontage ou changement
    return () => {
        stopAlertLoop();
    };
}, [data.alertes, soundEnabled, startAlertLoop, stopAlertLoop]);
    // ========== REFRESH AVEC RESET DU SON ==========
    const handleRefresh = useCallback(() => {
        soundPlayedRef.current = false;   
        loadDashboard();
    }, [loadDashboard]);

    // ========== TOGGLE SON ==========
    const toggleSound = useCallback(() => {
        setSoundEnabled(prev => {
            const newValue = !prev;
            // Si on réactive, on réinitialise le verrou pour rejouer
            if (newValue) soundPlayedRef.current = false;
            return newValue;
        });
    }, []);

    // ========== FORMATAGE ==========
    const formatMontant = useCallback((value) => {
        if (value === undefined || value === null || isNaN(value)) return '0 FCFA';
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return '0 FCFA';
        return Math.round(num).toLocaleString('fr-FR') + ' FCFA';
    }, []);

    const formatMontantCourt = useCallback((value) => {
        const num = parseFloat(value) || 0;
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
        return num.toFixed(0);
    }, []);

    const formatDateHeure = useCallback((dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }, []);

    // ========== BADGES ==========
    const getStatutFactureBadge = (statut) => {
        const configs = {
            'payee': { label: 'Payée', cls: 'status-payee' },
            'en_attente': { label: 'En attente', cls: 'status-en-attente' },
            'partiellement_payee': { label: 'Partielle', cls: 'status-partiel' },
            'en_retard': { label: 'En retard', cls: 'status-retard' },
            'annulee': { label: 'Annulée', cls: 'status-annulee' }
        };
        const c = configs[statut] || configs['en_attente'];
        return <span className={`badge ${c.cls}`}>{c.label}</span>;
    };

    const getStatutCommandeBadge = (statut) => {
        const configs = {
            'en_attente': { label: 'En attente', cls: 'status-en-attente' },
            'confirmee': { label: 'Confirmée', cls: 'status-confirmee' },
            'en_preparation': { label: 'Préparation', cls: 'status-prep' },
            'expediee': { label: 'Expédiée', cls: 'status-expediee' },
            'livree': { label: 'Livrée', cls: 'status-livree' },
            'annulee': { label: 'Annulée', cls: 'status-annulee' }
        };
        const c = configs[statut] || configs['en_attente'];
        return <span className={`badge ${c.cls}`}>{c.label}</span>;
    };

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

    // ========== ÉCRANS DE CHARGEMENT / ERREUR ==========
    if (loading && !data.kpis.total_produits) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Chargement du tableau de bord...</p>
            </div>
        );
    }

    if (error && !data.kpis.total_produits) {
        return (
            <div className="dashboard-error">
                <AlertCircle size={40} />
                <p>{error}</p>
                <button className="btn btn-primary" onClick={loadDashboard}>
                    <RefreshCw size={16} />
                    Réessayer
                </button>
            </div>
        );
    }

    // ========== DESTRUCTURATION ==========
    const {
        kpis,
        ventes_chart,
        ventes_jour_chart = [],
        ventes_semaine = [],
        top_produits,
        alertes,
        derniers_mouvements,
        dernieres_factures,
        dernieres_commandes
    } = data;

    // ========== RENDU ==========
    return (
        <div className="dashboard-container">
            {/* ==================== EN-TÊTE ==================== */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Tableau de bord</h1>
                    <p className="dashboard-subtitle">
                        Bienvenue, {user?.fullname || 'Utilisateur'}
                    </p>
                </div>
                <div className="dashboard-header-actions">
                    {/* ✅ Bouton mute/unmute */}
                    <button
                        className={`btn btn-secondary ${soundEnabled ? 'sound-on' : 'sound-off'}`}
                        onClick={toggleSound}
                        title={
                            soundEnabled
                                ? 'Désactiver les alertes sonores'
                                : 'Activer les alertes sonores'
                        }
                    >
                        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        <span>{soundEnabled ? 'Son actif' : 'Son coupé'}</span>
                    </button>

                    {/* Bouton actualiser */}
                    <button
                        className="btn btn-secondary"
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                        <span>Actualiser</span>
                    </button>
                </div>
            </div>

            {/* ==================== ALERTES ==================== */}
            {(alertes.total_rupture > 0 || alertes.total_stock_bas > 0) && (
                <div className="alerts-banner">
                    <div className="alerts-banner-header">
                        <AlertCircle size={20} />
                        <span>Alertes importantes</span>
                    </div>
                    <div className="alerts-banner-items">
                        {alertes.total_rupture > 0 && (
                            <div className="alert-item alert-danger">
                                <span className="alert-count">{alertes.total_rupture}</span>
                                <span>produit(s) en rupture</span>
                                <button
                                    className="alert-link"
                                    onClick={() => navigate(`/${slug}/produits`)}
                                >
                                    Voir <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                        {alertes.total_stock_bas > 0 && (
                            <div className="alert-item alert-warning">
                                <span className="alert-count">{alertes.total_stock_bas}</span>
                                <span>produit(s) en stock bas</span>
                                <button
                                    className="alert-link"
                                    onClick={() => navigate(`/${slug}/produits`)}
                                >
                                    Voir <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== KPIs ==================== */}
            <div className="kpi-grid">
                <div className="kpi-card" onClick={() => navigate(`/${slug}/produits`)}>
                    <div className="kpi-icon kpi-produits">
                        <Package size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Produits</span>
                        <span className="kpi-value">
                            {kpis.total_produits.toLocaleString('fr-FR')}
                        </span>
                    </div>
                </div>

                <div className="kpi-card" onClick={() => navigate(`/${slug}/commandes-clients`)}>
                    <div className="kpi-icon kpi-ventes">
                        <Banknote size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Ventes du mois</span>
                        <span className="kpi-value">{formatMontant(kpis.ventes_mois)}</span>
                        <span className="kpi-sub">
                            Aujourd'hui : {formatMontant(kpis.ventes_jour)}
                        </span>
                    </div>
                </div>

                <div className="kpi-card" onClick={() => navigate(`/${slug}/commandes-clients`)}>
                    <div className="kpi-icon kpi-commandes">
                        <ShoppingCart size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Commandes en attente</span>
                        <span className="kpi-value">{kpis.commandes_en_attente}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-clients">
                        <Users size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Clients</span>
                        <span className="kpi-value">
                            {kpis.total_clients.toLocaleString('fr-FR')}
                        </span>
                    </div>
                </div>

                <div className="kpi-card" onClick={() => navigate(`/${slug}/factures`)}>
                    <div className="kpi-icon kpi-impaye">
                        <AlertCircle size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Factures impayées</span>
                        <span className="kpi-value">{kpis.factures_impayees}</span>
                        <span className="kpi-sub">{formatMontant(kpis.montant_impaye)}</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon kpi-benefices">
                        <TrendingUp size={24} />
                    </div>
                    <div className="kpi-content">
                        <span className="kpi-label">Bénéfices (mois)</span>
                        <span className="kpi-value">{formatMontant(kpis.benefices_mois)}</span>
                    </div>
                </div>
            </div>

            {/* ==================== SECTION 1 : GRAPHIQUES ==================== */}
            <section className="dashboard-section">
                <div className="dashboard-row dashboard-row-3">
                    {/* Graphique 1 : Ventes 30 jours */}
                    <div className="dashboard-card chart-card">
                        <div className="card-header">
                            <h3>Ventes - 30 derniers jours</h3>
                        </div>
                        <div className="card-body">
                            {ventes_chart.length > 0 ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={ventes_chart}>
                                        <defs>
                                            <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(d) => {
                                                const date = new Date(d);
                                                return `${date.getDate()}/${date.getMonth() + 1}`;
                                            }}
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                            interval={Math.floor(ventes_chart.length / 5)}
                                        />
                                        <YAxis
                                            tickFormatter={formatMontantCourt}
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                            width={40}
                                        />
                                        <Tooltip
                                            formatter={(v) => [formatMontant(v), 'Ventes']}
                                            labelFormatter={(d) => new Date(d).toLocaleDateString('fr-FR')}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="montant"
                                            stroke="#2563eb"
                                            strokeWidth={2}
                                            fill="url(#colorVentes)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-chart">
                                    <TrendingDown size={36} />
                                    <p>Aucune vente sur les 30 derniers jours</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Graphique 2 : Ventes par semaine */}
                    <div className="dashboard-card chart-card">
                        <div className="card-header">
                            <h3>Ventes par semaine</h3>
                        </div>
                        <div className="card-body">
                            {ventes_semaine.length > 0 ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={ventes_semaine}>
                                        <defs>
                                            <linearGradient id="colorSemaine" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                                <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                        />
                                        <YAxis
                                            tickFormatter={formatMontantCourt}
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                            width={40}
                                        />
                                        <Tooltip
                                            formatter={(v) => [formatMontant(v), 'Ventes']}
                                            labelFormatter={(label, payload) => {
                                                if (payload && payload[0]) {
                                                    const d = payload[0].payload;
                                                    return `${label} (${new Date(d.date_debut).toLocaleDateString('fr-FR')} → ${new Date(d.date_fin).toLocaleDateString('fr-FR')})`;
                                                }
                                                return label;
                                            }}
                                        />
                                        <Bar
                                            dataKey="montant"
                                            fill="url(#colorSemaine)"
                                            radius={[6, 6, 0, 0]}
                                            maxBarSize={50}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-chart">
                                    <TrendingDown size={36} />
                                    <p>Aucune vente sur les 4 dernières semaines</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Graphique 3 : Ventes du jour */}
                    <div className="dashboard-card chart-card">
                        <div className="card-header">
                            <h3>Ventes du jour</h3>
                           
                        </div>
                        <div className="card-body">
                            {ventes_jour_chart.some(h => h.montant > 0) ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={ventes_jour_chart}>
                                        <defs>
                                            <linearGradient id="colorJour" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                                                <stop offset="100%" stopColor="#d97706" stopOpacity={0.7} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 9, fill: '#64748b' }}
                                            interval={3}
                                        />
                                        <YAxis
                                            tickFormatter={formatMontantCourt}
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                            width={40}
                                        />
                                        <Tooltip
                                            formatter={(v, name, props) => [
                                                `${formatMontant(v)} (${props.payload.nb_commandes} cmd)`,
                                                'Ventes'
                                            ]}
                                            labelFormatter={(label) => `À ${label}`}
                                        />
                                        <Bar
                                            dataKey="montant"
                                            fill="url(#colorJour)"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={20}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-chart">
                                    <Clock size={36} />
                                    <p>Aucune vente aujourd'hui</p>
                                    <span>Les ventes apparaîtront au fur et à mesure</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================== SECTION 2 : TOP PRODUITS ==================== */}
            <section className="dashboard-section">
                <div className="dashboard-row">
                    <div className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
                        <div className="card-header">
                            <h3>Top 5 produits vendus (30 derniers jours)</h3>
                        </div>
                        <div className="card-body">
                            {top_produits.length > 0 ? (
                                <ul className="top-list">
                                    {top_produits.map((p, i) => (
                                        <li key={p.id_produit} className="top-item">
                                            <span className={`top-rank rank-${i + 1}`}>{i + 1}</span>
                                            <div className="top-info">
                                                <span className="top-name">{p.produit_nom}</span>
                                                {p.marque_nom && (
                                                    <span className="top-marque">{p.marque_nom}</span>
                                                )}
                                            </div>
                                            <div className="top-stats">
                                                <span className="top-qte">{p.total_vendu} vendus</span>
                                                <span className="top-ca">{formatMontant(p.chiffre_affaires)}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="empty-chart">
                                    <Package size={40} />
                                    <p>Aucune vente sur la période</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================== SECTION 3 : ACTIVITÉ RÉCENTE ==================== */}
            <section className="dashboard-section">
                <div className="dashboard-row">
                    {/* Derniers mouvements */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>Derniers mouvements</h3>
                            <button
                                className="card-link"
                                onClick={() => navigate(`/${slug}/mouvements`)}
                            >
                                Voir tout <ChevronRight size={14} />
                            </button>
                        </div>
                        <div className="card-body">
                            {derniers_mouvements.length > 0 ? (
                                <ul className="mv-list">
                                    {derniers_mouvements.map((m) => (
                                        <li key={m.id_mouvement} className="mv-item">
                                            {getMouvementIcon(m.type_mouvement)}
                                            <div className="mv-info">
                                                <span className="mv-produit">{m.produit_nom}</span>
                                                <span className="mv-meta">
                                                    {m.quantite > 0 ? `+${m.quantite}` : m.quantite} {m.unite_symbole || ''}
                                                    {m.type_reference && ` • ${m.type_reference}`}
                                                </span>
                                            </div>
                                            <span className="mv-date">{formatDateHeure(m.date_mouvement)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="empty-chart">
                                    <ArrowDownCircle size={40} />
                                    <p>Aucun mouvement récent</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dernières factures */}
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>Dernières factures</h3>
                            <button
                                className="card-link"
                                onClick={() => navigate(`/${slug}/factures`)}
                            >
                                Voir tout <ChevronRight size={14} />
                            </button>
                        </div>
                        <div className="card-body">
                            {dernieres_factures.length > 0 ? (
                                <ul className="fact-list">
                                    {dernieres_factures.map((f) => (
                                        <li key={f.id_facture} className="fact-item">
                                            <div className="fact-icon">
                                                <FileText size={18} />
                                            </div>
                                            <div className="fact-info">
                                                <span className="fact-num">{f.numero_facture}</span>
                                                <span className="fact-client">{f.nomclient || '-'}</span>
                                            </div>
                                            <div className="fact-right">
                                                <span className="fact-montant">
                                                    {formatMontant(f.montant_total)}
                                                </span>
                                                {getStatutFactureBadge(f.statut)}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="empty-chart">
                                    <FileText size={40} />
                                    <p>Aucune facture récente</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================== SECTION 4 : DERNIÈRES COMMANDES ==================== */}
            <section className="dashboard-section">
                <div className="dashboard-row">
                    <div className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
                        <div className="card-header">
                            <h3>Dernières commandes</h3>
                            <button
                                className="card-link"
                                onClick={() => navigate(`/${slug}/commandes-clients`)}
                            >
                                Voir tout <ChevronRight size={14} />
                            </button>
                        </div>
                        <div className="card-body">
                            {dernieres_commandes.length > 0 ? (
                                <ul className="fact-list">
                                    {dernieres_commandes.map((c) => (
                                        <li key={c.id_commande} className="fact-item">
                                            <div className="fact-icon">
                                                <ShoppingCart size={18} />
                                            </div>
                                            <div className="fact-info">
                                                <span className="fact-num">{c.numero_commande}</span>
                                                <span className="fact-client">
                                                    {c.nomclient || '-'}
                                                    {c.telephone && ` • ${c.telephone}`}
                                                </span>
                                            </div>
                                            <div className="fact-right">
                                                <span className="fact-montant">
                                                    {formatMontant(c.montant_total)}
                                                </span>
                                                {getStatutCommandeBadge(c.statut)}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="empty-chart">
                                    <ShoppingCart size={40} />
                                    <p>Aucune commande récente</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;