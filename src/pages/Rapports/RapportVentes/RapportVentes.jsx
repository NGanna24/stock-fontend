// pages/Rapports/RapportVentes/RapportVentes.jsx — au style Ventes
import React, { useState, useEffect, useCallback } from "react";
import { Download, RefreshCw, TrendingDown, ShoppingCart, Package } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import RapportVenteService from "../../../services/rapportVenteService";
import { useUser } from "../../../context/AuthContext";
import StockSelector from "../../../components/StockSelector/StockSelector";
import { Page, PageHead, ErrorBar, Empty, Badge, Periode, Onglets, Chiffres, Carte, useToast, Toast, bornesPeriode, fcfa, dateFR, pluriel } from "../../../components/UI/Vt";
import "./RapportVentes.css";

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

const STATUTS = {
    livree: "Livrée", expediee: "Expédiée", en_preparation: "En préparation",
    confirmee: "Confirmée", en_attente: "En attente", annulee: "Annulée",
};

const RapportVentes = () => {
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
            const res = await RapportVenteService.getRapportVentes(token, dateDebut, dateFin);
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
            const response = await RapportVenteService.exportRapportVentes(token, dateDebut, dateFin);
            const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv;charset=utf-8;" }));
            const a = document.createElement("a");
            a.href = url; a.download = `rapport_ventes_${dateDebut}_${dateFin}.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            showToast("Erreur lors de l'export", "error");
        }
    };

    const t = data?.totaux || { nombre_commandes: 0, chiffre_affaires: 0, panier_moyen: 0, commandes_livrees: 0, commandes_en_attente: 0, commandes_annulees: 0 };
    const commandes = data?.commandes || [];
    const parProduit = data?.par_produit || [];
    const parJour = data?.par_jour || [];
    const parStatut = data?.par_statut || [];
    const topClients = data?.top_clients || [];

    return (
        <Page className="rpv">
            <PageHead title="Rapport des ventes" sub={`Du ${dateFR(dateDebut)} au ${dateFR(dateFin)} · ventes annulées exclues des montants`}>
                <button type="button" className="vt-btn vt-btn--icon" onClick={loadRapport} disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
                    <RefreshCw size={16} className={loading ? "vt-spin" : ""} />
                </button>
                <button type="button" className="vt-btn" onClick={handleExport}><Download size={16} /> Exporter</button>
            </PageHead>

            <Periode debut={dateDebut} fin={dateFin} onChange={(d, f) => setPeriode([d, f])} />

            {error && !loading && <ErrorBar message={error} onRetry={loadRapport} />}

            <div className={loading && data ? "rp-maj" : undefined}>
                <Chiffres items={[
                    { label: "Chiffre d'affaires", value: fcfa(t.chiffre_affaires), note: pluriel(t.nombre_commandes, "vente"), fort: true, tone: "signal" },
                    { label: "Panier moyen", value: fcfa(t.panier_moyen), note: "Montant moyen d'une vente" },
                    { label: "Ventes livrées", value: t.commandes_livrees, note: `${t.commandes_en_attente} en attente` },
                    { label: "Ventes annulées", value: t.commandes_annulees, note: "Non comptées dans les montants", tone: t.commandes_annulees ? "bad" : undefined },
                ]} />

                <Onglets actif={onglet} onChange={setOnglet} items={[
                    { id: "resume", label: "Résumé" },
                    { id: "produits", label: "Produits", count: parProduit.length },
                    { id: "clients", label: "Meilleurs clients", count: topClients.length },
                    { id: "commandes", label: "Ventes", count: commandes.length },
                ]} />

                {loading && !data && <Carte><div className="vt-graph vt-graph-vide">Chargement du rapport…</div></Carte>}

                {data && onglet === "resume" && (
                    <>
                        <div className="vt-grille-2">
                            <Carte titre="Évolution des ventes">
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
                                            <ShoppingCart size={40} />
                                            <p>Aucune donnée</p>
                                        </div>
                                    )}
                                
</Carte>
                        </div>
                        <Carte titre="Top 5 produits">
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
                            
</Carte>
                    </>
                )}

                {data && onglet === "produits" && (
                    <div className="vt-table-wrap">
                        <table className="vt-table rpv-table">
                            <thead><tr><th>Produit</th><th>Quantité vendue</th><th className="vt-th-right rp-hide">Ventes</th><th className="vt-th-right">Chiffre d'affaires</th></tr></thead>
                            <tbody>
                                {parProduit.map((p, i) => (
                                    <tr key={p.id_produit}>
                                        <td>
                                            <div className="vt-cell-main vt-cell-main--plain">{p.produit_nom}</div>
                                            <div className="vt-cell-sub">{[p.marque_nom, p.categorie_nom].filter(Boolean).join(" · ") || " "}</div>
                                        </td>
                                        <td>
                                            <StockSelector idProduit={`rapport-vente-${p.id_produit}`} stockBase={p.total_vendu_base || p.total_vendu || 0}
                                                           unitesVente={p.unites_vente || []} uniteBase={{ nom: p.unite_nom, symbole: p.unite_symbole }} variant="list" />
                                        </td>
                                        <td className="vt-td-right vt-num rp-hide">{p.nombre_commandes}</td>
                                        <td className="vt-td-right vt-num vt-strong">{fcfa(p.chiffre_affaires)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {parProduit.length === 0 && <Empty title="Aucune vente sur la période" />}
                    </div>
                )}

                {data && onglet === "clients" && (
                    <div className="vt-table-wrap">
                        <table className="vt-table rpv-table">
                            <thead><tr><th>Client</th><th className="vt-th-right">Ventes</th><th className="vt-th-right">Chiffre d'affaires</th></tr></thead>
                            <tbody>
                                {topClients.map((c, i) => (
                                    <tr key={`${c.nomclient}-${i}`}>
                                        <td>
                                            <div className="vt-cell-main vt-cell-main--plain">{c.nomclient || "Client sans nom"}</div>
                                            <div className="vt-cell-sub">{c.telephone || " "}</div>
                                        </td>
                                        <td className="vt-td-right vt-num">{c.nombre_commandes}</td>
                                        <td className="vt-td-right vt-num vt-strong">{fcfa(c.chiffre_affaires)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {topClients.length === 0 && <Empty title="Aucun client sur la période" />}
                    </div>
                )}

                {data && onglet === "commandes" && (
                    <div className="vt-table-wrap">
                        <table className="vt-table rpv-table">
                            <thead><tr><th>Vente</th><th>Client</th><th>Statut</th><th className="vt-th-right">Montant</th><th className="rp-hide">Facture</th></tr></thead>
                            <tbody>
                                {commandes.map((c) => (
                                    <tr key={c.id_commande}>
                                        <td>
                                            <div className="vt-cell-main vt-cell-main--plain">{c.numero_commande}</div>
                                            <div className="vt-cell-sub">{c.date_formatee || dateFR(c.date_commande)}</div>
                                        </td>
                                        <td>
                                            <div>{c.nomclient || "-"}</div>
                                            <div className="vt-cell-sub">{c.telephone || " "}</div>
                                        </td>
                                        <td><Badge tone={c.statut}>{STATUTS[c.statut] || c.statut}</Badge></td>
                                        <td className="vt-td-right vt-num vt-strong">{fcfa(c.montant_total)}</td>
                                        <td className="rp-hide vt-muted">{c.numero_facture || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {commandes.length === 0 && <Empty title="Aucune vente sur la période" />}
                    </div>
                )}
            </div>

            <Toast toast={toast} onClose={closeToast} />
        </Page>
    );
};

export default RapportVentes;
