// pages/SuperAdmin/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Store, MapPin, RefreshCw, AlertCircle,
  ChevronRight, Globe, Clock, UserCheck, UserX,
  TrendingUp, Phone, Building2, Award
} from "lucide-react";
import AdminService from "../../../services/superAdmin/adminService";
import "./Dashboard.css";

// ==================== UTILS ====================
const formatNumber = (n) => (parseInt(n) || 0).toLocaleString("fr-FR");

const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date)) return "—";
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "à l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
    return date.toLocaleDateString("fr-FR");
};

const getInitials = (name) => {
    if (!name) return "??";
    return name.split(" ").filter(Boolean).map((w) => w[0]).join("").substring(0, 2).toUpperCase();
};

// ==================== GRAPHIQUE : COURBE SVG ====================
const LineChart = ({ data, height = 180, color = "#C2410C" }) => {
    if (!data || data.length === 0) return null;

    const width = 100; // en pourcentage
    const points = data.map((v, i) => {
        const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
        const max = Math.max(...data, 1);
        const y = 100 - (v / max) * 100;
        return { x, y, value: v };
    });

    // Construire le path
    const pathD = points
        .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
        .join(" ");

    // Zone remplie sous la courbe
    const areaD = `${pathD} L 100 100 L 0 100 Z`;

    return (
        <svg
            className="adash-line-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ height: `${height}px`, width: "100%" }}
        >
            <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Grille horizontale */}
            {[0, 25, 50, 75, 100].map((y) => (
                <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="100"
                    y2={y}
                    stroke="#E2E8F0"
                    strokeWidth="0.2"
                    strokeDasharray="1 1"
                />
            ))}

            {/* Zone remplie */}
            <path d={areaD} fill="url(#lineGradient)" />

            {/* Courbe */}
            <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />

            {/* Points */}
            {points.map((p, i) => (
                <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="0.8"
                    fill="#fff"
                    stroke={color}
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                />
            ))}
        </svg>
    );
};

// ==================== COMPOSANT ====================
const Dashboard = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadDashboard = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const res = await AdminService.getDashboard();
            if (res.success) {
                setData(res);
            } else {
                setError(res.message || "Erreur de chargement");
            }
        } catch (e) {
            console.error("❌ Dashboard load error:", e);
            setError(e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // ==================== LOADING ====================
    if (loading) {
        return (
            <div className="adash-page">
                <div className="adash-loading">
                    <div className="adash-spinner" />
                    <p>Chargement du tableau de bord…</p>
                </div>
            </div>
        );
    }

    // ==================== ERREUR ====================
    if (error) {
        return (
            <div className="adash-page">
                <div className="adash-error">
                    <div className="adash-error-icon">
                        <AlertCircle size={28} />
                    </div>
                    <h2>Impossible de charger les données</h2>
                    <p>{error}</p>
                    <button className="adash-btn adash-btn--primary" onClick={() => loadDashboard()}>
                        <RefreshCw size={14} />
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { stats, derniers_utilisateurs, magasins, croissance_12m, repartition_geo, qualite } = data;

    // Croissance vs mois précédent
    const calcGrowth = () => {
        if (!croissance_12m || croissance_12m.length < 2) return null;
        const curr = croissance_12m[croissance_12m.length - 1].inscriptions;
        const prev = croissance_12m[croissance_12m.length - 2].inscriptions;
        if (prev === 0) return null;
        return Math.round(((curr - prev) / prev) * 100);
    };
    const growth = calcGrowth();

    // Données pour les graphiques
    const lineData = (croissance_12m || []).map((m) => parseInt(m.inscriptions));
    const lineLabels = (croissance_12m || []).map((m) => {
        const [y, mo] = m.mois.split("-");
        return new Date(y, parseInt(mo) - 1).toLocaleDateString("fr-FR", { month: "short" });
    });

    return (
        <div className="adash-page">

            {/* ==================== HEADER ==================== */}
            <header className="adash-header">
                <div>
                    <h1 className="adash-title">Vue d'ensemble</h1>
                    <p className="adash-subtitle">
                        Patrons et magasins inscrits sur Miyo
                    </p>
                </div>
                <button
                    className="adash-btn adash-btn--outline"
                    onClick={() => loadDashboard(true)}
                    disabled={refreshing}
                >
                    <RefreshCw size={14} className={refreshing ? "adash-spin" : ""} />
                    {refreshing ? "Actualisation…" : "Actualiser"}
                </button>
            </header>

            {/* ==================== KPI CARDS ==================== */}
            <section className="adash-kpis">
                <KpiCard
                    icon={Users}
                    label="Utilisateurs actifs"
                    value={formatNumber(stats.total_utilisateurs)}
                    sub={`+${formatNumber(stats.nouveaux_7j)} cette semaine`}
                    color="brand"
                    trend={growth}
                    onClick={() => navigate("/super-admin/utilisateurs")}
                />
                <KpiCard
                    icon={Store}
                    label="Magasins"
                    value={formatNumber(stats.total_magasins)}
                    sub={`${formatNumber(stats.magasins_geolocalises)} géolocalisés`}
                    color="info"
                    onClick={() => navigate("/super-admin/magasins")}
                />
                <KpiCard
                    icon={Globe}
                    label="Pays couverts"
                    value={formatNumber(stats.nb_pays)}
                    sub={`${formatNumber(stats.nb_villes)} villes`}
                    color="success"
                />
                <KpiCard
                    icon={MapPin}
                    label="Couverture GPS"
                    value={`${stats.total_magasins > 0
                        ? Math.round((stats.magasins_geolocalises / stats.total_magasins) * 100)
                        : 0}%`}
                    sub={`${stats.magasins_geolocalises}/${stats.total_magasins} magasins`}
                    color="warning"
                />
            </section>

            {/* ==================== MINI STATS ==================== */}
            <section className="adash-stats-row">
                <MiniStat
                    icon={MapPin}
                    label="Sans GPS"
                    value={formatNumber(stats.magasins_non_geolocalises)}
                    highlight={stats.magasins_non_geolocalises > 0}
                />
                <MiniStat icon={Users} label="Nouveaux (30j)" value={formatNumber(stats.nouveaux_30j)} />
                <MiniStat icon={UserCheck} label="Actifs cette semaine" value={formatNumber(stats.actifs_7j)} />
                <MiniStat
                    icon={UserX}
                    label="Comptes désactivés"
                    value={formatNumber(stats.utilisateurs_inactifs)}
                    highlight={stats.utilisateurs_inactifs > 0}
                />
            </section>

            {/* ==================== GRAPHIQUE PRINCIPAL ==================== */}
            <section className="adash-section adash-chart-section">
                <div className="adash-section-head">
                    <div>
                        <h3 className="adash-section-title">
                            <TrendingUp size={16} />
                            Croissance sur 12 mois
                        </h3>
                        <p className="adash-section-desc">
                            Inscriptions par mois
                            {growth !== null && (
                                <span className={`adash-inline-trend ${growth >= 0 ? "is-up" : "is-down"}`}>
                                    {growth >= 0 ? " ▲ " : " ▼ "}
                                    {Math.abs(growth)}% vs mois dernier
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {lineData.length > 0 ? (
                    <div className="adash-line-chart">
                        <LineChart data={lineData} height={200} color="#C2410C" />
                        <div className="adash-line-labels">
                            {lineLabels.map((label, i) => (
                                <span key={i}>{label}</span>
                            ))}
                        </div>
                        <div className="adash-line-footer">
                            <span>Total : <strong>{lineData.reduce((s, v) => s + v, 0)}</strong> inscriptions sur 12 mois</span>
                            <span>Maximum : <strong>{Math.max(...lineData)}</strong> sur un mois</span>
                        </div>
                    </div>
                ) : (
                    <div className="adash-empty">
                        <TrendingUp size={28} />
                        <p>Pas encore de données</p>
                    </div>
                )}
            </section>

            {/* ==================== LAYOUT ==================== */}
            <div className="adash-grid">

                {/* ---------- COLONNE GAUCHE ---------- */}
                <div className="adash-col">

                    {/* Derniers inscrits */}
                    <section className="adash-section">
                        <div className="adash-section-head">
                            <div>
                                <h3 className="adash-section-title">
                                    <UserCheck size={16} />
                                    Derniers inscrits
                                </h3>
                                <p className="adash-section-desc">
                                    Nouveaux patrons et leur magasin
                                </p>
                            </div>
                            <button
                                className="adash-link"
                                onClick={() => navigate("/super-admin/utilisateurs")}
                            >
                                Voir tout <ChevronRight size={14} />
                            </button>
                        </div>

                        <div className="adash-list">
                            {(derniers_utilisateurs || []).map((u) => (
                                <div
                                    key={u.id_utilisateur}
                                    className="adash-user-row"
                                    onClick={() => navigate(`/super-admin/utilisateurs/${u.id_utilisateur}`)}
                                >
                                    <div className="adash-avatar">
                                        {getInitials(u.fullname)}
                                    </div>
                                    <div className="adash-user-info">
                                        <strong>{u.fullname}</strong>
                                        <span>{u.email || u.telephone || "—"}</span>
                                    </div>
                                    <div className="adash-user-meta">
                                        {u.nom_magasin && (
                                            <span className="adash-tag adash-tag--brand">
                                                <Store size={11} />
                                                {u.nom_magasin}
                                            </span>
                                        )}
                                        {(u.ville || u.pays) && (
                                            <span className="adash-tag">
                                                <MapPin size={11} />
                                                {[u.ville, u.pays].filter(Boolean).join(", ")}
                                            </span>
                                        )}
                                    </div>
                                    <div className="adash-user-date">
                                        <Clock size={11} />
                                        {formatDate(u.date_creation)}
                                    </div>
                                </div>
                            ))}
                            {(!derniers_utilisateurs || derniers_utilisateurs.length === 0) && (
                                <div className="adash-empty">
                                    <Users size={28} />
                                    <p>Aucun utilisateur pour le moment</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Liste des magasins */}
                    <section className="adash-section">
                        <div className="adash-section-head">
                            <div>
                                <h3 className="adash-section-title">
                                    <Store size={16} />
                                    Derniers magasins créés
                                </h3>
                                <p className="adash-section-desc">
                                    {magasins?.length || 0} magasins au total
                                </p>
                            </div>
                            <button
                                className="adash-link"
                                onClick={() => navigate("/super-admin/magasins")}
                            >
                                Voir tout <ChevronRight size={14} />
                            </button>
                        </div>

                        <div className="adash-list">
                            {(magasins || []).slice(0, 8).map((m) => (
                                <div
                                    key={m.id_magasin}
                                    className="adash-user-row"
                                    onClick={() => navigate(`/super-admin/magasins/${m.id_magasin}`)}
                                >
                                    <div className="adash-avatar adash-avatar--store">
                                        <Store size={16} />
                                    </div>
                                    <div className="adash-user-info">
                                        <strong>{m.nom_commercial || "Sans nom"}</strong>
                                        <span>{m.nom_patron}</span>
                                    </div>
                                    <div className="adash-user-meta">
                                        {(m.ville || m.pays) && (
                                            <span className="adash-tag">
                                                <MapPin size={11} />
                                                {[m.ville, m.pays].filter(Boolean).join(", ")}
                                            </span>
                                        )}
                                        {m.telephone && (
                                            <span className="adash-tag">
                                                <Phone size={11} />
                                                {m.telephone}
                                            </span>
                                        )}
                                        {m.latitude && m.longitude && (
                                            <span className="adash-tag adash-tag--success">
                                                📡 GPS
                                            </span>
                                        )}
                                    </div>
                                    <div className="adash-user-date">
                                        <Clock size={11} />
                                        {formatDate(m.date_creation)}
                                    </div>
                                </div>
                            ))}
                            {(!magasins || magasins.length === 0) && (
                                <div className="adash-empty">
                                    <Store size={28} />
                                    <p>Aucun magasin pour le moment</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* ---------- COLONNE DROITE ---------- */}
                <div className="adash-col">

                    {/* Qualité des données */}
                    <section className="adash-section adash-section--compact">
                        <div className="adash-section-head">
                            <div>
                                <h3 className="adash-section-title">
                                    <AlertCircle size={16} />
                                    Qualité des données
                                </h3>
                            </div>
                        </div>
                        <div className="adash-health">
                            <HealthRow
                                label="Magasins sans GPS"
                                value={qualite?.magasins_sans_gps || 0}
                                warn={(qualite?.magasins_sans_gps || 0) > 0}
                            />
                            <HealthRow
                                label="Magasins sans ville"
                                value={qualite?.magasins_sans_ville || 0}
                                warn={(qualite?.magasins_sans_ville || 0) > 0}
                            />
                            <HealthRow
                                label="Magasins sans nom"
                                value={qualite?.magasins_sans_nom || 0}
                                warn={(qualite?.magasins_sans_nom || 0) > 0}
                            />
                            <HealthRow
                                label="Jamais connectés"
                                value={qualite?.jamais_connectes || 0}
                                warn={(qualite?.jamais_connectes || 0) > 0}
                            />
                            <HealthRow
                                label="Comptes désactivés"
                                value={qualite?.comptes_desactives || 0}
                                warn={(qualite?.comptes_desactives || 0) > 0}
                            />
                        </div>
                    </section>

                    {/* Répartition par pays */}
                    <section className="adash-section adash-section--compact">
                        <div className="adash-section-head">
                            <div>
                                <h3 className="adash-section-title">
                                    <Globe size={16} />
                                    Répartition par pays
                                </h3>
                            </div>
                        </div>
                        <div className="adash-geo">
                            {(repartition_geo?.parPays || []).slice(0, 8).map((g) => {
                                const total = (repartition_geo?.parPays || [])
                                    .reduce((s, x) => s + parseInt(x.nb_magasins), 0) || 1;
                                const pct = Math.round((parseInt(g.nb_magasins) / total) * 100);
                                return (
                                    <div key={g.pays} className="adash-geo-row">
                                        <div className="adash-geo-info">
                                            <strong>{g.pays}</strong>
                                            <span>{g.nb_magasins} magasins • {g.nb_utilisateurs} patrons</span>
                                        </div>
                                        <div className="adash-geo-bar">
                                            <div
                                                className="adash-geo-fill"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="adash-geo-pct">{pct}%</span>
                                    </div>
                                );
                            })}
                            {(!repartition_geo?.parPays || repartition_geo.parPays.length === 0) && (
                                <div className="adash-empty adash-empty--sm">
                                    <Globe size={22} />
                                    <p>Pas encore de données</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Top villes */}
                    <section className="adash-section adash-section--compact">
                        <div className="adash-section-head">
                            <div>
                                <h3 className="adash-section-title">
                                    <Award size={16} />
                                    Top villes
                                </h3>
                            </div>
                        </div>
                        <div className="adash-geo">
                            {(repartition_geo?.parVille || []).slice(0, 8).map((v, i) => (
                                <div key={`${v.ville}-${v.pays}-${i}`} className="adash-geo-row">
                                    <div className="adash-geo-info">
                                        <strong>{v.ville}</strong>
                                        <span>{v.pays || "—"} • {v.nb_utilisateurs} patrons</span>
                                    </div>
                                    <div className="adash-geo-bar">
                                        <div
                                            className="adash-geo-fill"
                                            style={{
                                                width: `${Math.round((v.nb_magasins / ((repartition_geo?.parVille || [])[0]?.nb_magasins || 1)) * 100)}%`
                                            }}
                                        />
                                    </div>
                                    <span className="adash-geo-pct">{v.nb_magasins}</span>
                                </div>
                            ))}
                            {(!repartition_geo?.parVille || repartition_geo.parVille.length === 0) && (
                                <div className="adash-empty adash-empty--sm">
                                    <Award size={22} />
                                    <p>Pas encore de données</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

// ==================== SOUS-COMPOSANTS ====================

const KpiCard = ({ icon: Icon, label, value, sub, color = "brand", trend, onClick }) => (
    <div
        className={`adash-kpi adash-kpi--${color} ${onClick ? "is-clickable" : ""}`}
        onClick={onClick}
    >
        <div className="adash-kpi-head">
            <div className="adash-kpi-icon">
                <Icon size={20} />
            </div>
            {trend !== null && trend !== undefined && (
                <span className={`adash-kpi-trend ${trend >= 0 ? "is-up" : "is-down"}`}>
                    {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
                </span>
            )}
        </div>
        <div className="adash-kpi-body">
            <span className="adash-kpi-label">{label}</span>
            <strong className="adash-kpi-value">{value}</strong>
            {sub && <small className="adash-kpi-sub">{sub}</small>}
        </div>
    </div>
);

const MiniStat = ({ icon: Icon, label, value, highlight }) => (
    <div className={`adash-mini ${highlight ? "is-highlight" : ""}`}>
        <Icon size={16} className="adash-mini-icon" />
        <div>
            <strong>{value}</strong>
            <span>{label}</span>
        </div>
    </div>
);

const HealthRow = ({ label, value, warn }) => (
    <div className={`adash-health-row ${warn ? "is-warn" : ""}`}>
        <span className="adash-health-label">{label}</span>
        <span className="adash-health-value">{value}</span>
    </div>
);

export default Dashboard;