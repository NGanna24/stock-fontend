// pages/Rapports/RapportStocks/RapportStocks.jsx — au style Ventes
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Download, RefreshCw, SearchX, Boxes, Package } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import RapportStockService from "../../../services/rapportStockService";
import { useUser } from "../../../context/AuthContext";
import StockSelector from "../../../components/StockSelector/StockSelector";
import { Page, PageHead, ErrorBar, Empty, Badge, Periode, Onglets, Chiffres, Carte, SearchBox, useToast, Toast, bornesPeriode, fcfa, nombre, dateFR, sansAccents, pluriel } from "../../../components/UI/Vt";
import "../RapportVentes/RapportVentes.css";
import "./RapportStocks.css";

// ---------- Graphiques d'origine (gardés tels quels : vos clients les connaissent) ----------
const formatMontant = fcfa;
const formatMontantCourt = (value) => {
    const num = parseFloat(value) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num.toFixed(0);
};
const CATEGORIE_COLORS = [
    '#995F2F', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#6366f1'
];

const ETATS = {
    rupture: { label: "Rupture", tone: "bad" },
    stock_bas: { label: "Stock bas", tone: "warn" },
    surstock: { label: "Surstock", tone: "info" },
    normal: { label: "Normal", tone: "ok" },
};
const TYPES_MVT = { entree: ["Entrée", "ok"], sortie: ["Sortie", "signal"], ajustement: ["Ajustement", "warn"], transfert: ["Transfert", "info"] };

const Qte = ({ p, valeur, id }) => (
    <StockSelector idProduit={id} stockBase={valeur} unitesVente={p.unites_vente || []}
                   uniteBase={{ nom: p.unite_nom, symbole: p.unite_symbole }} isRupture={p.etat_stock === "rupture"} variant="list" />
);


const RapportStocks = () => {
    const { isAuthenticated } = useUser();
    const token = localStorage.getItem("token");
    const [[dateDebut, dateFin], setPeriode] = useState(() => bornesPeriode("mois"));
    const [loading, setLoading] = useState(!!token);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [onglet, setOnglet] = useState("resume");
    const [recherche, setRecherche] = useState("");
    const [filtreEtat, setFiltreEtat] = useState("");
    const [toast, showToast, closeToast] = useToast();

    const loadRapport = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await RapportStockService.getRapportStocks(token, dateDebut, dateFin);
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
            const response = await RapportStockService.exportRapportStocks(token, dateDebut, dateFin);
            const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv;charset=utf-8;" }));
            const a = document.createElement("a");
            a.href = url; a.download = `rapport_stocks_${dateFin}.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            showToast("Erreur lors de l'export", "error");
        }
    };

    const t = data?.totaux || { nombre_produits: 0, quantite_totale: 0, valeur_achat: 0, valeur_vente: 0, total_rupture: 0, total_stock_bas: 0, total_surstock: 0 };
    const produits = useMemo(() => data?.produits || [], [data]);
    const parCategorie = data?.par_categorie || [];
    const parMarque = data?.par_marque || [];
    const alertes = data?.alertes || { rupture: [], stock_bas: [], surstock: [] };
    const listeAlertes = [...(alertes.rupture || []), ...(alertes.stock_bas || []), ...(alertes.surstock || [])];
    const topValeur = data?.top_valeur || [];
    const mouvements = data?.mouvements || [];

    const produitsFiltres = useMemo(() => {
        const q = sansAccents(recherche.trim());
        return produits.filter((p) => (!filtreEtat || (p.etat_stock || "normal") === filtreEtat)
            && (!q || sansAccents([p.produit_nom, p.categorie_nom, p.marque_nom].filter(Boolean).join(" ")).includes(q)));
    }, [produits, recherche, filtreEtat]);

    const margePotentielle = (Number(t.valeur_vente) || 0) - (Number(t.valeur_achat) || 0);

    return (
        <Page className="rps">
            <PageHead title="Rapport des stocks" sub="Ce que vous avez en stock aujourd'hui, ce que ça vaut, et les mouvements de la période">
                <button type="button" className="vt-btn vt-btn--icon" onClick={loadRapport} disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
                    <RefreshCw size={16} className={loading ? "vt-spin" : ""} />
                </button>
                <button type="button" className="vt-btn" onClick={handleExport}><Download size={16} /> Exporter</button>
            </PageHead>

            {error && !loading && <ErrorBar message={error} onRetry={loadRapport} />}

            <div className={loading && data ? "rp-maj" : undefined}>
                <Chiffres items={[
                    { label: "Valeur du stock (prix d'achat)", value: fcfa(t.valeur_achat), note: `${pluriel(t.nombre_produits, "produit")} · ${nombre(t.quantite_totale, 0)} unités`, fort: true, tone: "signal" },
                    { label: "Valeur à la vente", value: fcfa(t.valeur_vente), note: margePotentielle > 0 ? `Marge possible : ${fcfa(margePotentielle)}` : "Si tout le stock est vendu" },
                    { label: "À commander", value: (Number(t.total_rupture) || 0) + (Number(t.total_stock_bas) || 0), note: `${t.total_rupture} en rupture · ${t.total_stock_bas} en stock bas`, tone: t.total_rupture ? "bad" : t.total_stock_bas ? "warn" : undefined },
                    { label: "En surstock", value: t.total_surstock || 0, note: "Au-dessus du stock maximum", tone: t.total_surstock ? "info" : undefined },
                ]} />

                <Onglets actif={onglet} onChange={setOnglet} items={[
                    { id: "resume", label: "Résumé" },
                    { id: "produits", label: "Produits", count: produits.length },
                    { id: "alertes", label: "À surveiller", count: listeAlertes.length },
                    { id: "mouvements", label: "Mouvements", count: mouvements.length },
                ]} />

                {loading && !data && <Carte><div className="vt-graph vt-graph-vide">Chargement du rapport…</div></Carte>}

                {data && onglet === "resume" && (
                    <>
                        <div className="vt-grille-2">
                            <Carte titre="Valeur du stock par catégorie">
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
                                
</Carte>
                            <Carte titre="Top 8 produits (valeur immobilisée)">
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
                                
</Carte>
                        </div>
                        <Carte titre="Valeur du stock par marque">
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
                                                fill="#995F2F"
                                                radius={[6, 6, 0, 0]}
                                                maxBarSize={50}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                
</Carte>
                    </>
                )}

                {data && onglet === "produits" && (
                    <>
                        <div className="vt-toolbar">
                            <SearchBox value={recherche} onChange={setRecherche} placeholder="Produit, catégorie ou marque" />
                            <select className="vt-input rps-etat" value={filtreEtat} onChange={(e) => setFiltreEtat(e.target.value)} aria-label="Filtrer par état">
                                <option value="">Tous les états</option>
                                {Object.entries(ETATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                            <span className="vt-count">{pluriel(produitsFiltres.length, "produit")}</span>
                        </div>
                        <div className="vt-table-wrap">
                            <table className="vt-table rps-table">
                                <thead><tr><th>Produit</th><th>En stock</th><th className="rp-hide">Min. / max.</th><th className="vt-th-right rp-hide">Prix d'achat</th><th className="vt-th-right">Valeur</th><th>État</th></tr></thead>
                                <tbody>
                                    {produitsFiltres.map((p) => {
                                        const e = ETATS[p.etat_stock] || ETATS.normal;
                                        return (
                                            <tr key={p.id_produit}>
                                                <td>
                                                    <div className="vt-cell-main vt-cell-main--plain">{p.produit_nom}</div>
                                                    <div className="vt-cell-sub">{[p.categorie_nom, p.marque_nom].filter(Boolean).join(" · ") || " "}</div>
                                                </td>
                                                <td><Qte p={p} valeur={p.quantite_stock} id={`rapport-${p.id_produit}`} /></td>
                                                <td className="rp-hide vt-muted vt-num">{nombre(p.quantite_minimale, 0)} / {nombre(p.quantite_maximale, 0)}</td>
                                                <td className="vt-td-right vt-num rp-hide">{fcfa(p.prix_achat)}</td>
                                                <td className="vt-td-right vt-num vt-strong">{fcfa(p.valeur_stock ?? (Number(p.quantite_stock) || 0) * (Number(p.prix_achat) || 0))}</td>
                                                <td><Badge tone={e.tone}>{e.label}</Badge></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {produitsFiltres.length === 0 && <Empty icon={SearchX} title="Aucun produit ne correspond" />}
                        </div>
                    </>
                )}

                {data && onglet === "alertes" && (
                    <div className="vt-table-wrap">
                        <table className="vt-table rps-table">
                            <thead><tr><th>Produit</th><th>Alerte</th><th>En stock</th><th>Seuil</th></tr></thead>
                            <tbody>
                                {listeAlertes.map((p) => {
                                    const type = alertes.rupture?.includes(p) ? "rupture" : alertes.stock_bas?.includes(p) ? "stock_bas" : "surstock";
                                    return (
                                        <tr key={`${type}-${p.id_produit}`}>
                                            <td><div className="vt-cell-main vt-cell-main--plain">{p.produit_nom}</div></td>
                                            <td><Badge tone={ETATS[type].tone}>{ETATS[type].label}</Badge></td>
                                            <td><Qte p={{ ...p, etat_stock: type }} valeur={p.quantite_stock} id={`rapport-al-${type}-${p.id_produit}`} /></td>
                                            <td className="vt-muted vt-num">{type === "surstock" ? `max. ${nombre(p.quantite_maximale, 0)}` : `min. ${nombre(p.quantite_minimale, 0)}`}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {listeAlertes.length === 0 && <Empty title="Aucun produit à surveiller" text="Tous les produits sont entre leur minimum et leur maximum." />}
                    </div>
                )}

                {data && onglet === "mouvements" && (
                    <>
                        <Periode debut={dateDebut} fin={dateFin} onChange={(d, f) => setPeriode([d, f])} />
                        <div className="vt-table-wrap">
                            <table className="vt-table rps-table">
                                <thead><tr><th>Produit</th><th>Type</th><th>Quantité</th><th className="rp-hide">Avant → après</th></tr></thead>
                                <tbody>
                                    {mouvements.map((m) => {
                                        const [lib, tone] = TYPES_MVT[m.type_mouvement] || [m.type_mouvement, "muted"];
                                        return (
                                            <tr key={m.id_mouvement}>
                                                <td>
                                                    <div className="vt-cell-main vt-cell-main--plain">{m.produit_nom}</div>
                                                    <div className="vt-cell-sub">{m.date_formatee || dateFR(m.date_mouvement)}</div>
                                                </td>
                                                <td><Badge tone={tone}>{lib}</Badge></td>
                                                <td><Qte p={m} valeur={Math.abs(m.quantite)} id={`rapport-mvt-${m.id_mouvement}`} /></td>
                                                <td className="rp-hide vt-muted vt-num">{nombre(m.ancienne_quantite, 0)} → {nombre(m.nouvelle_quantite, 0)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {mouvements.length === 0 && <Empty title="Aucun mouvement sur la période" />}
                        </div>
                    </>
                )}
            </div>

            <Toast toast={toast} onClose={closeToast} />
        </Page>
    );
};

export default RapportStocks;
