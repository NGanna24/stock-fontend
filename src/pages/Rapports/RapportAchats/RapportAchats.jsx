// pages/Rapports/RapportAchats/RapportAchats.jsx — au style Ventes
import React, { useState, useEffect, useCallback } from "react";
import { Download, RefreshCw, TrendingDown, ShoppingBasket, Package } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import RapportAchatService from "../../../services/rapportAchatService";
import { useUser } from "../../../context/AuthContext";
import StockSelector from "../../../components/StockSelector/StockSelector";
import { Page, PageHead, ErrorBar, Empty, Badge, Periode, Onglets, Chiffres, Carte, useToast, Toast, bornesPeriode, fcfa, dateFR, pluriel } from "../../../components/UI/Vt";
import "../RapportVentes/RapportVentes.css";

// ---------- Graphiques d'origine (gardés tels quels : vos clients les connaissent) ----------
const formatMontant = fcfa;
const formatMontantCourt = (value) => {
    const num = parseFloat(value) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num.toFixed(0);
};
const formatDate = dateFR;
const STATUT_COLORS = {
    'recue': '#10b981',
    'partiellement_recue': '#995F2F',
    'envoyee': '#8b5cf6',
    'en_attente': '#f59e0b',
    'annulee': '#ef4444'
};
const STATUT_LABELS = {
    'recue': 'Reçue',
    'partiellement_recue': 'Partielle',
    'envoyee': 'Envoyée',
    'en_attente': 'En attente',
    'annulee': 'Annulée'
};

const STATUTS = {
    recue: { label: "Reçue", tone: "ok" },
    partiellement_recue: { label: "Reçue en partie", tone: "warn" },
    envoyee: { label: "Envoyée", tone: "info" },
    en_attente: { label: "En attente", tone: "muted" },
    annulee: { label: "Annulée", tone: "bad" },
};
const Statut = ({ s }) => <Badge tone={STATUTS[s]?.tone || "muted"}>{STATUTS[s]?.label || s}</Badge>;

const RapportAchats = () => {
    const { isAuthenticated } = useUser();
    const token = localStorage.getItem("token");
    const [[dateDebut, dateFin], setPeriode] = useState(() => bornesPeriode("mois"));
    const [loading, setLoading] = useState(!!token);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [onglet, setOnglet] = useState("resume");
    const [toast, showToast, closeToast] = useToast();

    const loadRapport = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await RapportAchatService.getRapportAchats(token, dateDebut, dateFin);
            if (res.success) setData(res.data);
            else setError(res.message || "Erreur lors du chargement");
        } catch (e) {
            setError(e.message || "Erreur lors du chargement");
        } finally {
            setLoading(false);
        }
    }, [token, dateDebut, dateFin]);

    useEffect(() => { if (isAuthenticated && token) loadRapport(); }, [isAuthenticated, token, loadRapport]);

    const handleExport = async () => {
        try {
            const response = await RapportAchatService.exportRapportAchats(token, dateDebut, dateFin);
            const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv;charset=utf-8;" }));
            const a = document.createElement("a");
            a.href = url; a.download = `rapport_achats_${dateDebut}_${dateFin}.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            showToast("Erreur lors de l'export", "error");
        }
    };

    const t = data?.totaux || { nombre_commandes: 0, montant_total: 0, panier_moyen: 0, commandes_recues: 0, commandes_en_attente: 0, commandes_annulees: 0 };
    const commandes = data?.commandes || [];
    const parProduit = data?.par_produit || [];
    const parJour = data?.par_jour || [];
    const parStatut = data?.par_statut || [];
    const topFournisseurs = data?.top_fournisseurs || [];

    return (
        <Page className="rpv">
            <PageHead title="Rapport des achats" sub={`Du ${dateFR(dateDebut)} au ${dateFR(dateFin)} · commandes annulées exclues des montants`}>
                <button type="button" className="vt-btn vt-btn--icon" onClick={loadRapport} disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
                    <RefreshCw size={16} className={loading ? "vt-spin" : ""} />
                </button>
                <button type="button" className="vt-btn" onClick={handleExport}><Download size={16} /> Exporter</button>
            </PageHead>

            <Periode debut={dateDebut} fin={dateFin} onChange={(d, f) => setPeriode([d, f])} />

            {error && !loading && <ErrorBar message={error} onRetry={loadRapport} />}

            <div className={loading && data ? "rp-maj" : undefined}>
                <Chiffres items={[
                    { label: "Total des achats", value: fcfa(t.montant_total), note: pluriel(t.nombre_commandes, "commande"), fort: true, tone: "signal" },
                    { label: "Commande moyenne", value: fcfa(t.panier_moyen), note: "Montant moyen d'une commande" },
                    { label: "Commandes reçues", value: t.commandes_recues, note: `${t.commandes_en_attente} en attente` },
                    { label: "Commandes annulées", value: t.commandes_annulees, note: "Non comptées dans les montants", tone: t.commandes_annulees ? "bad" : undefined },
                ]} />

                <Onglets actif={onglet} onChange={setOnglet} items={[
                    { id: "resume", label: "Résumé" },
                    { id: "produits", label: "Produits", count: parProduit.length },
                    { id: "fournisseurs", label: "Fournisseurs", count: topFournisseurs.length },
                    { id: "commandes", label: "Commandes", count: commandes.length },
                ]} />

                {loading && !data && <Carte><div className="vt-graph vt-graph-vide">Chargement du rapport…</div></Carte>}

                {data && onglet === "resume" && (
                    <>
                        <div className="vt-grille-2">
                            <Carte titre="Évolution des achats">
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
                                                    formatter={(v) => [formatMontant(v), 'Montant']}
                                                    labelFormatter={(d) => formatDate(d)}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="montant_total"
                                                    stroke="#dc2626"
                                                    strokeWidth={2}
                                                    dot={{ fill: '#dc2626', r: 4 }}
                                                    activeDot={{ r: 6 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="empty-chart">
                                            <TrendingDown size={40} />
                                            <p>Aucun achat sur la période</p>
                                        </div>
                                    )}
                                
</Carte>
                            <Carte titre="Répartition par statut">
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
                                            <ShoppingBasket size={40} />
                                            <p>Aucune donnée</p>
                                        </div>
                                    )}
                                
</Carte>
                        </div>
                        <Carte titre="Top 5 produits achetés">
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
                                            <Tooltip formatter={(v) => [formatMontant(v), 'Montant']} />
                                            <Bar
                                                dataKey="montant_total"
                                                fill="#dc2626"
                                                radius={[0, 6, 6, 0]}
                                                maxBarSize={30}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="empty-chart">
                                        <Package size={40} />
                                        <p>Aucun achat</p>
                                    </div>
                                )}
                            
</Carte>
                    </>
                )}

                {data && onglet === "produits" && (
                    <div className="vt-table-wrap">
                        <table className="vt-table rpv-table">
                            <thead><tr><th>Produit</th><th>Quantité achetée</th><th className="vt-th-right rp-hide">Commandes</th><th className="vt-th-right">Montant</th></tr></thead>
                            <tbody>
                                {parProduit.map((p, i) => (
                                    <tr key={p.id_produit}>
                                        <td>
                                            <div className="vt-cell-main vt-cell-main--plain">{p.produit_nom}</div>
                                            <div className="vt-cell-sub">{[p.marque_nom, p.categorie_nom].filter(Boolean).join(" · ") || " "}</div>
                                        </td>
                                        <td>
                                            <StockSelector idProduit={`rapport-achat-${p.id_produit}`} stockBase={p.total_achete_base || p.total_achete || 0}
                                                           unitesVente={p.unites_vente || []} uniteBase={{ nom: p.unite_nom, symbole: p.unite_symbole }} variant="list" />
                                        </td>
                                        <td className="vt-td-right vt-num rp-hide">{p.nombre_commandes}</td>
                                        <td className="vt-td-right vt-num vt-strong">{fcfa(p.montant_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {parProduit.length === 0 && <Empty title="Aucun achat sur la période" />}
                    </div>
                )}

                {data && onglet === "fournisseurs" && (
                    <div className="vt-table-wrap">
                        <table className="vt-table rpv-table">
                            <thead><tr><th>Fournisseur</th><th className="vt-th-right">Commandes</th><th className="vt-th-right">Montant</th></tr></thead>
                            <tbody>
                                {topFournisseurs.map((f, i) => (
                                    <tr key={f.id_fournisseur || i}>
                                        <td>
                                            <div className="vt-cell-main vt-cell-main--plain">{f.fournisseur_nom || "Sans fournisseur"}</div>
                                            <div className="vt-cell-sub">{[f.telephone, f.ville].filter(Boolean).join(" · ") || " "}</div>
                                        </td>
                                        <td className="vt-td-right vt-num">{f.nombre_commandes}</td>
                                        <td className="vt-td-right vt-num vt-strong">{fcfa(f.montant_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {topFournisseurs.length === 0 && <Empty title="Aucun fournisseur sur la période" />}
                    </div>
                )}

                {data && onglet === "commandes" && (
                    <div className="vt-table-wrap">
                        <table className="vt-table rpv-table">
                            <thead><tr><th>Commande</th><th>Fournisseur</th><th>Statut</th><th className="vt-th-right">Montant</th><th className="rp-hide">Réception</th></tr></thead>
                            <tbody>
                                {commandes.map((c) => (
                                    <tr key={c.id_commande_achat}>
                                        <td>
                                            <div className="vt-cell-main vt-cell-main--plain">{c.numero_commande}</div>
                                            <div className="vt-cell-sub">{c.date_formatee || dateFR(c.date_commande)}</div>
                                        </td>
                                        <td>
                                            <div>{c.fournisseur_nom || "-"}</div>
                                            <div className="vt-cell-sub">{c.fournisseur_ville || " "}</div>
                                        </td>
                                        <td><Statut s={c.statut} /></td>
                                        <td className="vt-td-right vt-num vt-strong">{fcfa(c.montant_total)}</td>
                                        <td className="rp-hide vt-muted">{c.numero_reception || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {commandes.length === 0 && <Empty title="Aucune commande sur la période" />}
                    </div>
                )}
            </div>

            <Toast toast={toast} onClose={closeToast} />
        </Page>
    );
};

export default RapportAchats;
