// pages/BeneficesMarges/BeneficesMarges.jsx — au style Ventes
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, RefreshCw, AlertTriangle, Minus, Equal, SearchX, TrendingDown, Package, Target } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, ComposedChart, Area } from "recharts";
import BeneficeService from "../../services/beneficeService";
import { useUser } from "../../context/AuthContext";
import StockSelector from "../../components/StockSelector/StockSelector";
import { Page, PageHead, ErrorBar, Empty, Periode, Onglets, Chiffres, Carte, SearchBox, useToast, Toast, bornesPeriode, fcfa, dateFR, sansAccents, pluriel } from "../../components/UI/Vt";
import "../Rapports/RapportVentes/RapportVentes.css";
import "./BeneficesMarges.css";

// ---------- Graphiques d'origine (gardés tels quels : vos clients les connaissent) ----------
const formatMontant = fcfa;
const formatMontantCourt = (value) => {
    const num = parseFloat(value) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num.toFixed(0);
};
const formatDate = dateFR;
const CATEGORIE_COLORS = [
    '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#995F2F',
    '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#6366f1'
];

const pct = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? "-" : `${Number(v).toFixed(1).replace(".", ",")} %`);

/** Bénéfice d'une ligne : exact, ou estimé (≈) quand des prix d'achat manquent */
const Benefice = ({ row }) => {
    const exact = row?.benefice_disponible !== false && row?.benefice !== null && row?.benefice !== undefined;
    const v = exact ? row.benefice : (row?.benefice_estime ?? row?.benefice);
    return (
        <span className={`vt-num bm-ben ${Number(v) < 0 ? "vt-bad" : "vt-good"}`}
              title={exact ? undefined : `${row?.nb_lignes_sans_prix || 0} ligne(s) sans prix d'achat : estimation`}>
            {exact ? "" : "≈ "}{fcfa(v)}
        </span>
    );
};

const Marge = ({ v }) => {
    if (v === null || v === undefined) return <span className="vt-muted">-</span>;
    const n = Number(v);
    return <span className="vt-tag" data-s={n >= 30 ? "ok" : n >= 15 ? "warn" : "bad"}>{pct(n)}</span>;
};

const BeneficesMarges = () => {
    const { isAuthenticated } = useUser();
    const { slug = "" } = useParams();
    const token = localStorage.getItem("token");
    const [[dateDebut, dateFin], setPeriode] = useState(() => bornesPeriode("mois"));
    const [loading, setLoading] = useState(!!token);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [onglet, setOnglet] = useState("resume");
    const [recherche, setRecherche] = useState("");
    const [toast, showToast, closeToast] = useToast();

    const loadBenefices = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await BeneficeService.getBenefices(token, dateDebut, dateFin);
            if (res.success) setData(res.data);
            else setError(res.message || "Erreur lors du chargement");
        } catch (e) {
            setError(e.message || "Erreur lors du chargement");
        } finally {
            setLoading(false);
        }
    }, [token, dateDebut, dateFin]);

    useEffect(() => { if (isAuthenticated && token) loadBenefices(); }, [isAuthenticated, token, loadBenefices]);

    const handleExport = async () => {
        try {
            const response = await BeneficeService.exportBenefices(token, dateDebut, dateFin);
            const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv;charset=utf-8;" }));
            const a = document.createElement("a");
            a.href = url; a.download = `benefices_${dateDebut}_${dateFin}.csv`; a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            showToast("Erreur lors de l'export", "error");
        }
    };

    const t = data?.totaux || {
        nombre_commandes: 0, chiffre_affaires: 0, cout_achat: 0, benefice_brut: null, benefice_estime: 0,
        benefice_disponible: true, quantite_vendue: 0, marge_brute_pct: null, taux_marge: null,
        nb_lignes_sans_prix: 0, nb_lignes_total: 0, taux_couverture: 100,
    };
    const net = data?.resultat_net || null;
    const parProduit = useMemo(() => data?.par_produit || [], [data]);
    const parCategorie = data?.par_categorie || [];
    const parJour = data?.par_jour || [];
    const topProduits = data?.top_produits || [];
    const topClients = data?.top_clients || [];
    const rentables = data?.produits_rentables || [];
    const incomplet = !t.benefice_disponible;
    const aDesBeneficesIncomplets = incomplet;
    const beneficeBrut = incomplet ? t.benefice_estime : t.benefice_brut;

    const produitsFiltres = useMemo(() => {
        const q = sansAccents(recherche.trim());
        if (!q) return parProduit;
        return parProduit.filter((p) => sansAccents([p.produit_nom, p.categorie_nom, p.marque_nom].filter(Boolean).join(" ")).includes(q));
    }, [parProduit, recherche]);

    const qte = (row, id) => (
        <StockSelector idProduit={id} stockBase={row.quantite_vendue_base || row.quantite_vendue || 0}
                       unitesVente={row.unites_vente || []} uniteBase={{ nom: row.unite_nom, symbole: row.unite_symbole }} variant="list" />
    );

    return (
        <Page className="bm">
            <PageHead title="Bénéfices et marges" sub={`Du ${dateFR(dateDebut)} au ${dateFR(dateFin)} · ce que vos ventes vous rapportent vraiment`}>
                <button type="button" className="vt-btn vt-btn--icon" onClick={loadBenefices} disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
                    <RefreshCw size={16} className={loading ? "vt-spin" : ""} />
                </button>
                <button type="button" className="vt-btn" onClick={handleExport}><Download size={16} /> Exporter</button>
            </PageHead>

            <Periode debut={dateDebut} fin={dateFin} onChange={(d, f) => setPeriode([d, f])} />

            {error && !loading && <ErrorBar message={error} onRetry={loadBenefices} />}

            {incomplet && (
                <div className="vt-banner" data-s="warn">
                    <AlertTriangle size={16} />
                    <span>
                        <strong>Bénéfice estimé :</strong> {pluriel(t.nb_lignes_sans_prix, "ligne")} de vente sur {t.nb_lignes_total} n'ont pas de prix d'achat
                        ({t.taux_couverture} % des lignes couvertes). Complétez le prix d'achat de ces produits pour un chiffre exact.
                    </span>
                </div>
            )}

            <div className={loading && data ? "rp-maj" : undefined}>
                <Chiffres items={[
                    { label: "Chiffre d'affaires", value: fcfa(t.chiffre_affaires), note: pluriel(t.nombre_commandes, "vente") },
                    { label: "Coût d'achat des produits vendus", value: fcfa(t.cout_achat), note: `${t.quantite_vendue} unités vendues${incomplet ? " (partiel)" : ""}` },
                    { label: `Bénéfice brut${incomplet ? " (estimé)" : ""}`, value: `${incomplet ? "≈ " : ""}${fcfa(beneficeBrut)}`, note: Number(beneficeBrut) < 0 ? "Vous vendez à perte" : "Ventes moins coût d'achat", fort: true, tone: Number(beneficeBrut) < 0 ? "bad" : "ok" },
                    { label: "Marge brute", value: pct(t.marge_brute_pct), note: t.taux_marge !== null && t.taux_marge !== undefined ? `Sur le prix de vente · soit ${pct(t.taux_marge)} du prix d'achat` : "Sur le prix de vente" },
                ]} />

                {net && (
                    <section className="vt-card bm-net" aria-label="Résultat net de la période">
                        <div className="bm-net-calc">
                            <div className="bm-net-terme">
                                <span className="vt-label">Bénéfice brut{net.estimation ? " (estimé)" : ""}</span>
                                <strong className="vt-num">{fcfa(net.benefice_brut)}</strong>
                            </div>
                            <Minus size={18} className="bm-net-op" aria-label="moins" />
                            <div className="bm-net-terme">
                                <span className="vt-label">Dépenses de la période</span>
                                <strong className="vt-num vt-bad">{fcfa(net.depenses)}</strong>
                                <span className="vt-cell-sub">
                                    {net.nombre_depenses > 0 ? pluriel(net.nombre_depenses, "dépense") : "Aucune dépense saisie"}
                                    {" · "}<Link className="vt-link" to={`/${slug}/depenses`}>{net.nombre_depenses > 0 ? "Voir le détail" : "Saisir les dépenses"}</Link>
                                </span>
                            </div>
                            <Equal size={18} className="bm-net-op" aria-label="égale" />
                            <div className="bm-net-terme bm-net-res" data-s={net.benefice_net < 0 ? "bad" : "ok"}>
                                <span className="vt-label">Bénéfice net</span>
                                <strong className="vt-num">{fcfa(net.benefice_net)}</strong>
                                <span className="vt-cell-sub">
                                    {net.marge_nette_pct !== null && net.marge_nette_pct !== undefined ? `Marge nette : ${pct(net.marge_nette_pct)}` : net.benefice_net < 0 ? "Perte sur la période" : " "}
                                </span>
                            </div>
                        </div>
                        {net.depenses_par_categorie?.length > 0 && (
                            <div className="bm-net-cats">
                                {net.depenses_par_categorie.slice(0, 6).map((c) => (
                                    <span key={c.categorie_nom} className="vt-tag" data-s="muted">{c.categorie_nom} · {fcfa(c.total)}</span>
                                ))}
                                {net.depenses_par_categorie.length > 6 && <span className="vt-muted">+{net.depenses_par_categorie.length - 6} autres</span>}
                            </div>
                        )}
                    </section>
                )}

                <Onglets actif={onglet} onChange={setOnglet} items={[
                    { id: "resume", label: "Résumé" },
                    { id: "produits", label: "Produits", count: parProduit.length },
                    { id: "categories", label: "Catégories", count: parCategorie.length },
                    { id: "rentables", label: "Les plus rentables", count: rentables.length },
                    { id: "clients", label: "Meilleurs clients", count: topClients.length },
                ]} />

                {loading && !data && <Carte><div className="vt-graph vt-graph-vide">Chargement…</div></Carte>}

                {data && onglet === "resume" && (
                    <>
                        <Carte titre="Évolution du chiffre d'affaires et des bénéfices" className="bm-bloc"
                               actions={incomplet ? <span className="vt-tag" data-s="warn"><AlertTriangle size={12} /> Données partielles</span> : null}>
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
                            
</Carte>
                        <div className="vt-grille-2">
                            <Carte titre="Bénéfices par catégorie">
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
                                
</Carte>
                            <Carte titre="Top 5 produits par bénéfice">
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
                                
</Carte>
                        </div>
                    </>
                )}

                {data && onglet === "produits" && (
                    <>
                        <div className="vt-toolbar">
                            <SearchBox value={recherche} onChange={setRecherche} placeholder="Produit, catégorie ou marque" />
                            <span className="vt-count">{pluriel(produitsFiltres.length, "produit")}</span>
                        </div>
                        <div className="vt-table-wrap">
                            <table className="vt-table bm-table">
                                <thead><tr><th>Produit</th><th>Vendu</th><th className="vt-th-right rp-hide">Achat / vente</th><th className="vt-th-right">Marge</th><th className="vt-th-right rp-hide">Chiffre d'affaires</th><th className="vt-th-right">Bénéfice</th></tr></thead>
                                <tbody>
                                    {produitsFiltres.map((p) => (
                                        <tr key={p.id_produit}>
                                            <td>
                                                <div className="vt-cell-main vt-cell-main--plain">{p.produit_nom}</div>
                                                <div className="vt-cell-sub">{[p.categorie_nom, p.marque_nom].filter(Boolean).join(" · ") || " "}</div>
                                            </td>
                                            <td>{qte(p, `benefice-${p.id_produit}`)}</td>
                                            <td className="vt-td-right rp-hide">
                                                <div className="vt-num">{fcfa(p.prix_vente)}</div>
                                                <div className="vt-cell-sub vt-num">achat {p.prix_achat ? fcfa(p.prix_achat) : "inconnu"}</div>
                                            </td>
                                            <td className="vt-td-right"><Marge v={p.marge_unitaire_pct} /></td>
                                            <td className="vt-td-right vt-num rp-hide">{fcfa(p.chiffre_affaires)}</td>
                                            <td className="vt-td-right"><Benefice row={p} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {produitsFiltres.length === 0 && <Empty icon={SearchX} title={recherche ? "Aucun produit ne correspond" : "Aucune vente sur la période"} />}
                        </div>
                    </>
                )}

                {data && onglet === "categories" && parCategorie.length > 0 && (
                    <Carte titre="Bénéfices par catégorie" className="bm-bloc">
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
                                    
                    </Carte>
                )}
                {data && onglet === "categories" && (
                    <div className="vt-table-wrap">
                        <table className="vt-table bm-table">
                            <thead><tr><th>Catégorie</th><th>Vendu</th><th className="vt-th-right rp-hide">Chiffre d'affaires</th><th className="vt-th-right rp-hide">Coût d'achat</th><th className="vt-th-right">Marge</th><th className="vt-th-right">Bénéfice</th></tr></thead>
                            <tbody>
                                {parCategorie.map((c, i) => (
                                    <tr key={c.categorie_nom || i}>
                                        <td>
                                            <div className="vt-cell-main vt-cell-main--plain">{c.categorie_nom || "Sans catégorie"}</div>
                                            <div className="vt-cell-sub">{pluriel(c.nombre_produits || 0, "produit")}</div>
                                        </td>
                                        <td>{qte(c, `benefice-cat-${i}`)}</td>
                                        <td className="vt-td-right vt-num rp-hide">{fcfa(c.chiffre_affaires)}</td>
                                        <td className="vt-td-right vt-num rp-hide">{fcfa(c.cout_achat)}</td>
                                        <td className="vt-td-right"><Marge v={c.marge_pct} /></td>
                                        <td className="vt-td-right"><Benefice row={c} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {parCategorie.length === 0 && <Empty title="Aucune vente sur la période" />}
                    </div>
                )}

                {data && onglet === "rentables" && (
                    <div className="vt-table-wrap">
                        <table className="vt-table bm-table">
                            <thead><tr><th>Produit</th><th className="vt-th-right rp-hide">Achat / vente</th><th className="vt-th-right">Marge</th><th>Vendu</th><th className="vt-th-right">Bénéfice</th></tr></thead>
                            <tbody>
                                {rentables.map((p, i) => (
                                    <tr key={p.id_produit}>
                                        <td>
                                            <div className="vt-cell-main vt-cell-main--plain">{p.produit_nom}</div>
                                            <div className="vt-cell-sub">{p.marque_nom || " "}</div>
                                        </td>
                                        <td className="vt-td-right rp-hide">
                                            <div className="vt-num">{fcfa(p.prix_vente)}</div>
                                            <div className="vt-cell-sub vt-num">achat {fcfa(p.prix_achat)}</div>
                                        </td>
                                        <td className="vt-td-right"><Marge v={p.marge_pct} /></td>
                                        <td>{qte(p, `benefice-rent-${p.id_produit}`)}</td>
                                        <td className="vt-td-right"><span className="vt-num vt-good bm-ben">{fcfa(p.benefice_total)}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {rentables.length === 0 && <Empty title="Aucune vente sur la période" />}
                    </div>
                )}

                {data && onglet === "clients" && (
                    <div className="vt-table-wrap">
                        <table className="vt-table bm-table">
                            <thead><tr><th>Client</th><th className="vt-th-right rp-hide">Ventes</th><th className="vt-th-right">Chiffre d'affaires</th><th className="vt-th-right">Bénéfice</th></tr></thead>
                            <tbody>
                                {topClients.map((c, i) => (
                                    <tr key={`${c.nomclient}-${i}`}>
                                        <td>
                                            <div className="vt-cell-main vt-cell-main--plain">{c.nomclient || "Client sans nom"}</div>
                                            <div className="vt-cell-sub">{c.telephone || " "}</div>
                                        </td>
                                        <td className="vt-td-right vt-num rp-hide">{c.nombre_commandes}</td>
                                        <td className="vt-td-right vt-num">{fcfa(c.chiffre_affaires)}</td>
                                        <td className="vt-td-right"><Benefice row={c} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {topClients.length === 0 && <Empty title="Aucun client sur la période" />}
                    </div>
                )}
            </div>

            <Toast toast={toast} onClose={closeToast} />
        </Page>
    );
};

export default BeneficesMarges;
