// pages/Dashboard/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAlertSound from "../../hooks/useAlertSound";
import StockSelector from "../../components/StockSelector/StockSelector";


import {
  Package, Users, ShoppingCart, AlertCircle, RefreshCw, ArrowDownCircle, ArrowUpCircle,
  SlidersHorizontal, Repeat, FileText, ChevronRight, TrendingDown, Clock, Volume2, VolumeX,
  AlertTriangle, X,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, ComposedChart, Line, Legend,
} from "recharts";
import DashboardService from "../../services/DashboardService";
import { useUser } from "../../context/AuthContext";
import "./Dashboard.css";

/* ============================================================
   CONSTANTES & UTILITAIRES
   ============================================================ */
const INITIAL_KPIS = {
  total_produits: 0, total_clients: 0, commandes_en_attente: 0, ventes_mois: 0, ventes_jour: 0,
  factures_impayees: 0, montant_impaye: 0, benefices_mois: 0, benefices_jour: 0,
  marge_moyenne_pct: 0, produits_sans_cout: 0,
};
const INITIAL_ALERTES = { rupture: [], stock_bas: [], total_rupture: 0, total_stock_bas: 0 };
const INITIAL_DATA = {
  kpis: INITIAL_KPIS, ventes_chart: [], benefices_chart: [], ventes_jour_chart: [], ventes_semaine: [],
  top_produits: [], alertes: INITIAL_ALERTES, derniers_mouvements: [], dernieres_factures: [], dernieres_commandes: [],
};

const SOUND_KEY = "miyo:dashboard-sound";

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const arr = (v) => (Array.isArray(v) ? v : []);
const fmtNum = (v) => Math.round(num(v)).toLocaleString("fr-FR");
const fmtMontant = (v) => `${fmtNum(v)} FCFA`;
const fmtCourt = (v) => {
  const n = num(v);
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toFixed(0);
};
const fmtDateHeure = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  return isNaN(date) ? "-" : date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};
// Évite le décalage d'un jour lié aux fuseaux horaires pour les dates AAAA-MM-JJ
const parseDay = (s) => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
};
const fmtDay = (s) => {
  const d = parseDay(s);
  return d && !isNaN(d) ? `${d.getDate()}/${d.getMonth() + 1}` : "";
};
const fmtDayLong = (s) => {
  const d = parseDay(s);
  return d && !isNaN(d) ? d.toLocaleDateString("fr-FR") : "";
};

const FACTURE_STATUTS = {
  payee: { label: "Payée", tone: "ok" },
  en_attente: { label: "En attente", tone: "pending" },
  partiellement_payee: { label: "Partielle", tone: "partial" },
  en_retard: { label: "En retard", tone: "bad" },
  annulee: { label: "Annulée", tone: "off" },
};
const COMMANDE_STATUTS = {
  en_attente: { label: "En attente", tone: "pending" },
  confirmee: { label: "Confirmée", tone: "sent" },
  en_preparation: { label: "Préparation", tone: "partial" },
  expediee: { label: "Expédiée", tone: "ship" },
  livree: { label: "Livrée", tone: "ok" },
  annulee: { label: "Annulée", tone: "off" },
};
const MOUVEMENTS = {
  entree: { label: "Entrée", icon: ArrowDownCircle, tone: "ok" },
  sortie: { label: "Sortie", icon: ArrowUpCircle, tone: "bad" },
  ajustement: { label: "Ajustement", icon: SlidersHorizontal, tone: "pending" },
  transfert: { label: "Transfert", icon: Repeat, tone: "sent" },
};

const TOOLTIP_STYLE = {
  contentStyle: { background: "#12201b", border: "1.5px solid #f4b400", borderRadius: 4, color: "#fff", fontSize: 13, boxShadow: "3px 3px 0 rgba(0,0,0,.25)" },
  labelStyle: { color: "#9fb3a9", marginBottom: 4 },
  itemStyle: { color: "#fff" },
  cursor: { fill: "rgba(244,180,0,.18)", stroke: "#12201b", strokeDasharray: "3 3" },
};
const AXIS_TICK = { fontSize: 11, fill: "#5b6a63" };

/* ============================================================
   PETITS COMPOSANTS
   ============================================================ */
const Tag = ({ cfg }) => (
  <span className={`db-tag db-tag--${cfg.tone}`}>
    <i className="db-tag-dot" />
    {cfg.label}
  </span>
);

const EmptyBlock = ({ icon: Icon, title, hint }) => (
  <div className="db-empty">
    <Icon size={30} />
    <p>{title}</p>
    {hint && <small>{hint}</small>}
  </div>
);

const Panel = ({ title, badge, action, children, className = "" }) => (
  <section className={`db-panel ${className}`}>
    <header className="db-panel-head">
      <h2>{title}</h2>
      {badge && <span className="db-panel-badge">{badge}</span>}
      {action}
    </header>
    <div className="db-panel-body">{children}</div>
  </section>
);

const SeeAll = ({ onClick }) => (
  <button className="db-seeall" onClick={onClick}>Voir tout <ChevronRight size={14} /></button>
);

/* ============================================================
   PAGE
   ============================================================ */
const Dashboard = () => {
  const { isAuthenticated, user } = useUser();
  const { slug: paramSlug } = useParams();
  const slug = paramSlug || user?.slug || "";
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const { startAlertLoop, stopAlertLoop } = useAlertSound();

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [refreshError, setRefreshError] = useState(null);
  const [data, setData] = useState(INITIAL_DATA);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [chartTab, setChartTab] = useState("ventes");
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem(SOUND_KEY) !== "0"; } catch { return true; }
  });
  const reqRef = useRef(0);
  const readyRef = useRef(false);

  const go = (path) => navigate(`/${slug}${path}`);

  /* ---------- Chargement ---------- */
  const loadDashboard = useCallback(async () => {
    if (!token) {
      setError("Session introuvable. Reconnectez-vous.");
      setStatus("error");
      return;
    }
    const reqId = ++reqRef.current;
    if (readyRef.current) setRefreshing(true);
    try {
      const res = await DashboardService.getStats(token);
      if (res && res.success === false) throw new Error(res.message || "Erreur lors du chargement");
      if (reqId !== reqRef.current) return;
      const d = res?.data || res || {};
      setData({
        kpis: { ...INITIAL_KPIS, ...(d.kpis || {}) },
        ventes_chart: arr(d.ventes_chart),
        benefices_chart: arr(d.benefices_chart),
        ventes_jour_chart: arr(d.ventes_jour_chart),
        ventes_semaine: arr(d.ventes_semaine),
        top_produits: arr(d.top_produits),
        alertes: { ...INITIAL_ALERTES, ...(d.alertes || {}) },
        derniers_mouvements: arr(d.derniers_mouvements),
        dernieres_factures: arr(d.dernieres_factures),
        dernieres_commandes: arr(d.dernieres_commandes),
      });
      readyRef.current = true;
      setStatus("ready");
      setError(null);
      setRefreshError(null);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("❌ loadDashboard error:", e);
      if (reqId !== reqRef.current) return;
      const message = e.message || "Erreur lors du chargement";
      if (readyRef.current) setRefreshError(message); // on garde les données affichées
      else { setError(message); setStatus("error"); }
    } finally {
      if (reqId === reqRef.current) setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) loadDashboard();
  }, [isAuthenticated, token, loadDashboard]);

  /* ---------- Alerte sonore (boucle tant qu'il y a des alertes) ---------- */
  const totalRupture = num(data.alertes.total_rupture);
  const totalStockBas = num(data.alertes.total_stock_bas);
  const hasAlerts = totalRupture > 0 || totalStockBas > 0;

  useEffect(() => {
    if (soundEnabled && hasAlerts) startAlertLoop(totalRupture > 0 ? "critical" : "warning", 5000);
    else stopAlertLoop();
    return () => stopAlertLoop();
  }, [soundEnabled, hasAlerts, totalRupture, startAlertLoop, stopAlertLoop]);

  const toggleSound = () =>
    setSoundEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem(SOUND_KEY, next ? "1" : "0"); } catch { /* stockage indisponible */ }
      return next;
    });

  /* ---------- Données dérivées ---------- */
  const { kpis, ventes_chart, benefices_chart, ventes_jour_chart, ventes_semaine, top_produits, derniers_mouvements, dernieres_factures, dernieres_commandes } = data;

  const totalVentes30 = useMemo(() => ventes_chart.reduce((s, d) => s + num(d.montant), 0), [ventes_chart]);
  const totalBenefices30 = useMemo(() => benefices_chart.reduce((s, d) => s + num(d.benefice), 0), [benefices_chart]);
  const maxCA = useMemo(() => Math.max(1, ...top_produits.map((p) => num(p.chiffre_affaires))), [top_produits]);
  const margePct = num(kpis.marge_moyenne_pct);
  const margeTicks = Math.round(Math.min(Math.max(margePct, 0), 100) / 10);
  const impayes = num(kpis.factures_impayees);

  const hour = new Date().getHours();
  const greeting = hour < 5 || hour >= 18 ? "Bonsoir" : "Bonjour";
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const firstName = (user?.fullname || "").split(" ")[0] || "Utilisateur";

  /* ---------- États plein écran ---------- */
  if (status === "loading") {
    return (
      <div className="db-root" aria-busy="true">
        <div className="db-skel db-skel--head" />
        <div className="db-skel db-skel--ledger" />
        <div className="db-skel-row"><div className="db-skel" /><div className="db-skel" /><div className="db-skel" /></div>
        <div className="db-skel db-skel--chart" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="db-root">
        <div className="db-state">
          <AlertCircle size={34} />
          <h2>Impossible de charger le tableau de bord</h2>
          <p>{error}</p>
          <button className="db-btn db-btn--dark" onClick={() => { setStatus("loading"); loadDashboard(); }}>
            <RefreshCw size={16} /> Réessayer
          </button>
        </div>
      </div>
    );
  }

  /* ============================================================
     RENDU
     ============================================================ */
  return (
    <div className="db-root">
      {/* ---------- En-tête ---------- */}
      <header className="db-head">
        <div>
          <p className="db-head-date">{today}</p>
          <h1>{greeting}, {firstName}</h1>
        </div>
        <div className="db-head-actions">
          {lastUpdated && (
            <span className="db-updated">Mis à jour à {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          )}
          <button
            className={`db-btn ${soundEnabled ? "is-on" : "is-off"}`}
            onClick={toggleSound}
            aria-pressed={soundEnabled}
            title={soundEnabled ? "Désactiver les alertes sonores" : "Activer les alertes sonores"}
          >
            {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            <span>{soundEnabled ? "Son actif" : "Son coupé"}</span>
          </button>
          <button className="db-btn" onClick={loadDashboard} disabled={refreshing}>
            <RefreshCw size={17} className={refreshing ? "db-spin" : ""} />
            <span>Actualiser</span>
          </button>
        </div>
      </header>

      {refreshError && (
        <div className="db-notice db-notice--bad" role="alert">
          <AlertCircle size={18} />
          <span>Actualisation impossible ({refreshError}). Les données affichées sont celles de la dernière mise à jour réussie.</span>
          <button onClick={() => setRefreshError(null)} aria-label="Fermer"><X size={15} /></button>
        </div>
      )}

      {/* ---------- Alertes de stock ---------- */}
      {hasAlerts && (
        <div className="db-alerts" role="status">
          <span className="db-alerts-bar" aria-hidden="true" />
          <div className="db-alerts-title"><AlertTriangle size={20} /> Stock à surveiller</div>
          <div className="db-alerts-chips">
            {totalRupture > 0 && (
              <span className="db-chip db-chip--bad"><b>{totalRupture}</b> produit{totalRupture > 1 ? "s" : ""} en rupture</span>
            )}
            {totalStockBas > 0 && (
              <span className="db-chip db-chip--low"><b>{totalStockBas}</b> produit{totalStockBas > 1 ? "s" : ""} en stock bas</span>
            )}
          </div>
          <button className="db-btn db-btn--dark" onClick={() => go("/alertes")}>Voir les alertes <ChevronRight size={15} /></button>
        </div>
      )}

      {/* ---------- Coûts d'achat manquants ---------- */}
      {num(kpis.produits_sans_cout) > 0 && (
        <div className="db-notice db-notice--warn">
          <AlertCircle size={20} />
          <div>
            <strong>{num(kpis.produits_sans_cout)} produit(s) sans coût d'achat</strong>
            <span>Complétez-les pour un bénéfice 100 % fiable.</span>
          </div>
          <button className="db-btn db-btn--signal" onClick={() => go("/produits?filtre=sans_cout")}>Compléter maintenant</button>
        </div>
      )} 

      {/* ---------- Registre du jour ---------- */}
      <section className="db-ledger" aria-label="Synthèse financière">
        <div className="db-ledger-cell db-ledger-main">
          <span className="db-ledger-label">Ventes du mois</span>
          <strong className="db-ledger-figure">{fmtNum(kpis.ventes_mois)}<small>FCFA</small></strong>
          <span className="db-ledger-sub">Aujourd'hui : <b>{fmtMontant(kpis.ventes_jour)}</b></span>
        </div>
        <div className="db-ledger-cell">
          <span className="db-ledger-label">Bénéfice du mois</span>
          <strong className="db-ledger-mid">{fmtNum(kpis.benefices_mois)}<small>FCFA</small></strong>
          <div className="db-gauge" role="img" aria-label={`Marge moyenne ${margePct.toFixed(1)} %`}>
            {Array.from({ length: 10 }, (_, i) => <i key={i} className={i < margeTicks ? "on" : ""} />)}
          </div>
          <span className="db-ledger-sub">Marge moyenne <b>{margePct.toFixed(1)} %</b></span>
        </div>
        <div className="db-ledger-cell">
          <span className="db-ledger-label">Bénéfice du jour</span>
          <strong className="db-ledger-mid">{fmtNum(kpis.benefices_jour)}<small>FCFA</small></strong>
          <span className="db-ledger-sub">sur les ventes d'aujourd'hui</span>
        </div>
        <button className={`db-ledger-cell db-ledger-link ${impayes > 0 ? "has-debt" : ""}`} onClick={() => go("/factures")}>
          <span className="db-ledger-label">Factures impayées</span>
          <strong className="db-ledger-mid">{impayes}<small>facture{impayes > 1 ? "s" : ""}</small></strong>
          <span className="db-ledger-sub">{fmtMontant(kpis.montant_impaye)} à encaisser <ChevronRight size={14} /></span>
        </button>
      </section>

      {/* ---------- Compteurs ---------- */}
      <div className="db-counters">
        <button className="db-counter" onClick={() => go("/produits")}>
          <span className="db-counter-icon"><Package size={22} /></span>
          <span className="db-counter-text"><small>Produits en catalogue</small><strong>{fmtNum(kpis.total_produits)}</strong></span>
          <ChevronRight size={18} className="db-counter-arrow" />
        </button>
        <button className="db-counter" onClick={() => go("/commandes-clients")}>
          <span className="db-counter-icon"><ShoppingCart size={22} /></span>
          <span className="db-counter-text"><small>Commandes en attente</small><strong>{fmtNum(kpis.commandes_en_attente)}</strong></span>
          <ChevronRight size={18} className="db-counter-arrow" />
        </button>
        <div className="db-counter is-static">
          <span className="db-counter-icon"><Users size={22} /></span>
          <span className="db-counter-text"><small>Clients</small><strong>{fmtNum(kpis.total_clients)}</strong></span>
        </div>
      </div>

      {/* ---------- Graphique principal ---------- */}
      <Panel
        title="Évolution sur 30 jours"
        className="db-panel--wide"
        badge={chartTab === "ventes" ? `Ventes : ${fmtMontant(totalVentes30)}` : `Bénéfice : ${fmtMontant(totalBenefices30)}`}
        action={
          <div className="db-tabs" role="tablist" aria-label="Type de graphique">
            <button role="tab" aria-selected={chartTab === "ventes"} className={chartTab === "ventes" ? "is-on" : ""} onClick={() => setChartTab("ventes")}>Ventes</button>
            <button role="tab" aria-selected={chartTab === "benefices"} className={chartTab === "benefices" ? "is-on" : ""} onClick={() => setChartTab("benefices")}>CA et bénéfice</button>
          </div>
        }
      >
        {chartTab === "ventes" ? (
          ventes_chart.some((d) => num(d.montant) > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={ventes_chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dbVentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f4b400" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#f4b400" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d2d8d2" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDay} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={24} axisLine={{ stroke: "#12201b" }} tickLine={false} />
                <YAxis tickFormatter={fmtCourt} tick={AXIS_TICK} width={44} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [fmtMontant(v), "Ventes"]} labelFormatter={fmtDayLong} />
                <Area type="monotone" dataKey="montant" stroke="#12201b" strokeWidth={2.5} fill="url(#dbVentes)" activeDot={{ r: 5, fill: "#f4b400", stroke: "#12201b", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyBlock icon={TrendingDown} title="Aucune vente sur les 30 derniers jours" />
          )
        ) : benefices_chart.some((d) => num(d.ca) > 0 || num(d.benefice) > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={benefices_chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dbCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#12201b" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#12201b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d2d8d2" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDay} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={24} axisLine={{ stroke: "#12201b" }} tickLine={false} />
              <YAxis tickFormatter={fmtCourt} tick={AXIS_TICK} width={44} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => [fmtMontant(v), name]} labelFormatter={fmtDayLong} />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 6 }} />
              <Area type="monotone" dataKey="ca" name="Chiffre d'affaires" stroke="#12201b" strokeWidth={2} fill="url(#dbCA)" />
              <Line type="monotone" dataKey="benefice" name="Bénéfice" stroke="#2f7d55" strokeWidth={3} dot={{ r: 2.5, fill: "#2f7d55" }} activeDot={{ r: 5, fill: "#f4b400", stroke: "#12201b", strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyBlock icon={TrendingDown} title="Aucune vente sur les 30 derniers jours" />
        )}
      </Panel>

      {/* ---------- Semaine / jour ---------- */}
      <div className="db-duo">
        <Panel title="Ventes par semaine" badge="4 dernières semaines">
          {ventes_semaine.some((d) => num(d.montant) > 0) ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={ventes_semaine} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d2d8d2" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: "#12201b" }} tickLine={false} />
                <YAxis tickFormatter={fmtCourt} tick={AXIS_TICK} width={44} axisLine={false} tickLine={false} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v) => [fmtMontant(v), "Ventes"]}
                  labelFormatter={(label, payload) => {
                    const p = payload && payload[0] && payload[0].payload;
                    return p && p.date_debut && p.date_fin ? `${label} (${fmtDayLong(p.date_debut)} → ${fmtDayLong(p.date_fin)})` : label;
                  }}
                />
                <Bar dataKey="montant" fill="#12201b" radius={[3, 3, 0, 0]} maxBarSize={54} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyBlock icon={TrendingDown} title="Aucune vente sur les 4 dernières semaines" />
          )}
        </Panel>

        <Panel title="Ventes du jour" badge="par heure">
          {ventes_jour_chart.some((h) => num(h.montant) > 0) ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={ventes_jour_chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d2d8d2" vertical={false} />
                <XAxis dataKey="label" tick={{ ...AXIS_TICK, fontSize: 10 }} interval="preserveStartEnd" minTickGap={14} axisLine={{ stroke: "#12201b" }} tickLine={false} />
                <YAxis tickFormatter={fmtCourt} tick={AXIS_TICK} width={44} axisLine={false} tickLine={false} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v, name, props) => [`${fmtMontant(v)}${props?.payload?.nb_commandes != null ? ` (${props.payload.nb_commandes} cmd)` : ""}`, "Ventes"]}
                  labelFormatter={(label) => `À ${label}`}
                />
                <Bar dataKey="montant" fill="#f4b400" stroke="#12201b" strokeWidth={1} radius={[3, 3, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyBlock icon={Clock} title="Aucune vente aujourd'hui" hint="Les ventes apparaîtront au fur et à mesure." />
          )}
        </Panel>
      </div>

      {/* ---------- Top produits ---------- */}
      <Panel title="Top 5 des produits vendus" badge="30 derniers jours" action={<SeeAll onClick={() => go("/produits")} />}>
        {top_produits.length > 0 ? (
          <ol className="db-top">
            {top_produits.map((p, i) => (
              <li key={p.id_produit ?? i} className="db-top-item">
                <span className={`db-rank db-rank--${i + 1}`}>{i + 1}</span>
                <div className="db-top-main">
                  <div className="db-top-line">
                    <strong title={p.produit_nom}>{p.produit_nom}</strong>
                    {p.marque_nom && <small>{p.marque_nom}</small>}
                  </div>
                  <div className="db-top-bar" aria-hidden="true"><i style={{ width: `${Math.max(3, (num(p.chiffre_affaires) / maxCA) * 100)}%` }} /></div>
                </div>
                <div className="db-top-qty">
                  <StockSelector
                    idProduit={`dash-top-${p.id_produit ?? i}`}
                    stockBase={p.total_vendu_base}
                    unitesVente={p.unites_vente || []}
                    uniteBase={{ nom: p.unite_nom, symbole: p.unite_symbole }}
                    variant="list"
                  />
                </div>
                <strong className="db-top-ca">{fmtMontant(p.chiffre_affaires)}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyBlock icon={Package} title="Aucune vente sur la période" />
        )}
      </Panel>

      {/* ---------- Activité récente ---------- */}
      <div className="db-triple">
        <Panel title="Derniers mouvements" action={<SeeAll onClick={() => go("/mouvements")} />}>
          {derniers_mouvements.length > 0 ? (
            <ul className="db-list">
              {derniers_mouvements.map((m, i) => {
                const cfg = MOUVEMENTS[m.type_mouvement] || { label: m.type_mouvement || "Mouvement", icon: Repeat, tone: "off" };
                const Icon = cfg.icon;
                return (
                  <li key={m.id_mouvement ?? i}>
                    <button className="db-row" onClick={() => go("/mouvements")}>
                      <span className={`db-tile db-tile--${cfg.tone}`}><Icon size={17} /></span>
                      <span className="db-row-main">
                        <strong>{m.produit_nom}</strong>
                        <span className="db-row-sub">
                          <span className="db-row-type">{cfg.label}</span>
                          <StockSelector
                            idProduit={`dash-mvt-${m.id_mouvement ?? i}`}
                            stockBase={Math.abs(num(m.quantite))}
                            unitesVente={m.unites_vente || []}
                            uniteBase={{ nom: m.unite_nom, symbole: m.unite_symbole }}
                            isRupture={false}
                            variant="list"
                          />
                          {m.type_reference && <span>• {m.type_reference}</span>}
                        </span>
                      </span>
                      <span className="db-row-date">{fmtDateHeure(m.date_mouvement)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyBlock icon={ArrowDownCircle} title="Aucun mouvement récent" />
          )}
        </Panel>

        <Panel title="Dernières factures" action={<SeeAll onClick={() => go("/factures")} />}>
          {dernieres_factures.length > 0 ? (
            <ul className="db-list">
              {dernieres_factures.map((f, i) => (
                <li key={f.id_facture ?? i}>
                  <button className="db-row" onClick={() => go("/factures")}>
                    <span className="db-tile"><FileText size={17} /></span>
                    <span className="db-row-main">
                      <strong>{f.numero_facture}</strong>
                      <span className="db-row-sub"><span>{f.nomclient || "-"}</span></span>
                    </span>
                    <span className="db-row-right">
                      <b>{fmtMontant(f.montant_total)}</b>
                      <Tag cfg={FACTURE_STATUTS[f.statut] || FACTURE_STATUTS.en_attente} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock icon={FileText} title="Aucune facture récente" />
          )}
        </Panel>

        <Panel title="Dernières commandes" action={<SeeAll onClick={() => go("/commandes-clients")} />}>
          {dernieres_commandes.length > 0 ? (
            <ul className="db-list">
              {dernieres_commandes.map((c, i) => (
                <li key={c.id_commande ?? i}>
                  <button className="db-row" onClick={() => go("/commandes-clients")}>
                    <span className="db-tile"><ShoppingCart size={17} /></span>
                    <span className="db-row-main">
                      <strong>{c.numero_commande}</strong>
                      <span className="db-row-sub"><span>{c.nomclient || "-"}{c.telephone ? ` • ${c.telephone}` : ""}</span></span>
                    </span>
                    <span className="db-row-right">
                      <b>{fmtMontant(c.montant_total)}</b>
                      <Tag cfg={COMMANDE_STATUTS[c.statut] || COMMANDE_STATUTS.en_attente} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock icon={ShoppingCart} title="Aucune commande récente" />
          )}
        </Panel>
      </div>
    </div>
  );
};

export default Dashboard;
