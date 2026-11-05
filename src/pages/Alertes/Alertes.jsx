// pages/Alertes/Alertes.jsx — produits en rupture, en stock bas ou en surstock, au style Ventes
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AlertCircle, Download, RefreshCw, CheckCircle, Phone, Mail, Truck, SearchX } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import AlerteService from "../../services/alerteService";
import { useUser } from "../../context/AuthContext";
import StockSelector from "../../components/StockSelector/StockSelector";
import { Page, PageHead, Overview, Stage, SearchBox, Badge, ErrorBar, Empty, SkeletonRows, Pager, usePagination, useToast, Toast, fcfa, sansAccents, pluriel, Carte } from "../../components/UI/Vt";
import "./Alertes.css";


const TYPES = {
    rupture:   { label: "Rupture", tone: "bad" },
    stock_bas: { label: "Stock bas", tone: "warn" },
    surstock:  { label: "Surstock", tone: "info" },
};

const Qte = ({ a, valeur, id }) => (
    <StockSelector idProduit={id} stockBase={valeur} unitesVente={a.unites_vente || []}
                   uniteBase={{ nom: a.unite_nom, symbole: a.unite_symbole }}
                   isRupture={a.type_alerte === "rupture" && id.startsWith("al-st")} variant="list" />
);

const Alertes = () => {
    const { isAuthenticated } = useUser();
    const token = localStorage.getItem("token");

    const [loading, setLoading] = useState(!!token);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [onglet, setOnglet] = useState("toutes"); // toutes | rupture | stock_bas | surstock | fournisseurs
    const [searchTerm, setSearchTerm] = useState("");
    const [toast, showToast, closeToast] = useToast();

    const loadAlertes = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await AlerteService.getAllAlertes(token);
            if (res.success) setData(res.data);
            else setError(res.message || "Erreur lors du chargement");
        } catch (e) {
            setError(e.message || "Erreur lors du chargement");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { if (isAuthenticated && token) loadAlertes(); }, [isAuthenticated, token, loadAlertes]);

    const handleExport = async () => {
        try {
            const response = await AlerteService.exportAlertes(token);
            const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `alertes_stock_${new Date().toISOString().split("T")[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            showToast("Erreur lors de l'export", "error");
        }
    };

    const stats = data?.stats || { total_alertes: 0, total_rupture: 0, total_stock_bas: 0, total_surstock: 0, valeur_reapprovisionnement: 0 };
    const alertes = useMemo(() => data?.alertes || [], [data]);
    const parCategorie = data?.par_categorie || [];
    const parFournisseur = data?.par_fournisseur || [];
    const pieData = [
        { name: 'Rupture', value: stats.total_rupture, color: '#ef4444' },
        { name: 'Stock bas', value: stats.total_stock_bas, color: '#f59e0b' },
        { name: 'Surstock', value: stats.total_surstock, color: '#8b5cf6' }
    ].filter(d => d.value > 0);

    const filtrees = useMemo(() => {
        const q = sansAccents(searchTerm.trim());
        return alertes.filter((a) => {
            if (["rupture", "stock_bas", "surstock"].includes(onglet) && a.type_alerte !== onglet) return false;
            if (q && !sansAccents([a.produit_nom, a.categorie_nom, a.marque_nom, a.fournisseur_nom].filter(Boolean).join(" ")).includes(q)) return false;
            return true;
        });
    }, [alertes, onglet, searchTerm]);

    const { page, nbPages, setPage, numeros, visibles } = usePagination(filtrees, 20, [onglet, searchTerm]);

    const ETAPES = [
        { value: "toutes", label: "Toutes les alertes", count: alertes.length, tone: "all" },
        { value: "rupture", label: "Ruptures", count: stats.total_rupture, tone: "bad" },
        { value: "stock_bas", label: "Stock bas", count: stats.total_stock_bas, tone: "warn" },
        { value: "surstock", label: "Surstock", count: stats.total_surstock, tone: "info" },
        { value: "fournisseurs", label: "Par fournisseur", count: parFournisseur.length, tone: "muted", apart: true },
    ];

    return (
        <Page className="al">
            <PageHead title="Alertes de stock" sub="Les produits à commander avant d'en manquer, et ceux que vous avez en trop">
                <button type="button" className="vt-btn vt-btn--icon" onClick={loadAlertes} disabled={loading}
                        aria-label="Rafraîchir" title="Rafraîchir">
                    <RefreshCw size={16} className={loading ? "vt-spin" : ""} />
                </button>
                <button type="button" className="vt-btn" onClick={handleExport}>
                    <Download size={16} /> Exporter
                </button>
            </PageHead>

            <Overview label="À commander" value={fcfa(stats.valeur_reapprovisionnement)}
                      note={stats.total_rupture + stats.total_stock_bas > 0
                          ? `Coût estimé pour ${pluriel(stats.total_rupture + stats.total_stock_bas, "produit")} en rupture ou en stock bas`
                          : "Aucun produit à commander"}>
                {ETAPES.map((e) => (
                    <Stage key={e.value} count={e.count} label={e.label} tone={e.tone} apart={e.apart}
                           pressed={onglet === e.value}
                           onClick={() => setOnglet(onglet === e.value ? "toutes" : e.value)} />
                ))}
            </Overview>

            {stats.total_rupture > 0 && onglet !== "rupture" && (
                <div className="vt-banner" data-s="bad">
                    <AlertCircle size={16} />
                    <span>
                        <strong>{pluriel(stats.total_rupture, "produit")} en rupture :</strong> ils ne peuvent plus être vendus.{" "}
                        <button type="button" className="vt-link" onClick={() => setOnglet("rupture")}>Voir les ruptures</button>
                    </span>
                </div>
            )}

            {error && !loading && <ErrorBar message={error} onRetry={loadAlertes} />}

            {onglet === "fournisseurs" ? (
                <div className="al-fournisseurs">
                    {parFournisseur.length === 0 && !loading ? (
                        <div className="vt-table-wrap"><Empty icon={CheckCircle} title="Aucune commande à prévoir" text="Aucun fournisseur n'a de produit en rupture ou en stock bas." /></div>
                    ) : parFournisseur.map((f) => (
                        <article key={f.id_fournisseur || "aucun"} className="vt-card al-four">
                            <div className="al-four-head">
                                <div className="al-four-nom">
                                    <Truck size={18} />
                                    <div>
                                        <h2>{f.fournisseur_nom || "Sans fournisseur"}</h2>
                                        <div className="vt-cell-sub al-contacts">
                                            {f.fournisseur_telephone && <a href={`tel:${f.fournisseur_telephone}`}><Phone size={12} /> {f.fournisseur_telephone}</a>}
                                            {f.fournisseur_email && <a href={`mailto:${f.fournisseur_email}`}><Mail size={12} /> {f.fournisseur_email}</a>}
                                        </div>
                                    </div>
                                </div>
                                <div className="al-four-total">
                                    <span className="vt-label">À commander</span>
                                    <strong className="vt-num">{fcfa(f.valeur_a_commander)}</strong>
                                </div>
                            </div>
                            <div className="al-four-tags">
                                <span className="vt-tag" data-s="muted">{pluriel(f.nombre_alertes, "alerte")}</span>
                                {f.ruptures > 0 && <span className="vt-tag" data-s="bad">{pluriel(f.ruptures, "rupture")}</span>}
                                {f.stocks_bas > 0 && <span className="vt-tag" data-s="warn">{f.stocks_bas} en stock bas</span>}
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <>
                    {onglet === "toutes" && (parCategorie.length > 0 || pieData.length > 0) && (
                        <div className="vt-grille-2">
                            <Carte titre="Répartition par type">
                                        {pieData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={280}>
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={100}
                                                        paddingAngle={2}
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="empty-chart">
                                                <CheckCircle size={40} />
                                                <p>Aucune alerte</p>
                                            </div>
                                        )}
                                    
</Carte>
                            <Carte titre="Alertes par catégorie">
                                        {parCategorie.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={280}>
                                                <BarChart data={parCategorie.slice(0, 8)}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                    <XAxis
                                                        dataKey="categorie_nom"
                                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                                    />
                                                    <YAxis
                                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                                        width={30}
                                                    />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="ruptures" name="Ruptures" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
                                                    <Bar dataKey="stocks_bas" name="Stock bas" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="empty-chart">
                                                <CheckCircle size={40} />
                                                <p>Aucune alerte par catégorie</p>
                                            </div>
                                        )}
                                    
</Carte>
                        </div>
                    )}

                    <div className="vt-toolbar">
                        <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Produit, catégorie, marque ou fournisseur"
                                   label="Rechercher une alerte" />
                        <span className="vt-count">{pluriel(filtrees.length, "produit")}</span>
                    </div>

                    <div className="vt-table-wrap" aria-busy={loading || undefined}>
                        {loading && data && <div className="vt-busybar" />}
                        <table className="vt-table al-table">
                            <thead>
                                <tr>
                                    <th>Produit</th>
                                    <th>Alerte</th>
                                    <th>En stock</th>
                                    <th className="al-hide">Seuil min.</th>
                                    <th>À commander</th>
                                    <th className="vt-th-right al-hide-sm">Coût estimé</th>
                                    <th className="al-hide">Fournisseur</th>
                                </tr>
                            </thead>
                            <tbody style={numeros}>
                                {loading && !data
                                    ? <SkeletonRows cols={7} widths={[65, 40, 40, 40, 40, 45, 55]} />
                                    : visibles.map((a) => {
                                        const t = TYPES[a.type_alerte] || TYPES.stock_bas;
                                        const aCommander = a.type_alerte === "rupture" || a.type_alerte === "stock_bas";
                                        return (
                                            <tr key={a.id_produit}>
                                                <td>
                                                    <div className="vt-cell-main vt-cell-main--plain">{a.produit_nom}</div>
                                                    <div className="vt-cell-sub">{[a.categorie_nom, a.marque_nom].filter(Boolean).join(" · ") || " "}</div>
                                                </td>
                                                <td><Badge tone={t.tone}>{t.label}</Badge></td>
                                                <td><Qte a={a} valeur={a.quantite_stock} id={`al-st-${a.id_produit}`} /></td>
                                                <td className="al-hide">
                                                    {a.type_alerte === "surstock" && a.quantite_maximale > 0
                                                        ? <span className="al-max">max. <Qte a={a} valeur={a.quantite_maximale} id={`al-max-${a.id_produit}`} /></span>
                                                        : <Qte a={a} valeur={a.quantite_minimale} id={`al-min-${a.id_produit}`} />}
                                                </td>
                                                <td>{aCommander ? <Qte a={a} valeur={a.quantite_a_commander} id={`al-cmd-${a.id_produit}`} /> : <span className="vt-muted">-</span>}</td>
                                                <td className="vt-td-right vt-num al-hide-sm">{aCommander ? fcfa(a.valeur_manque) : <span className="vt-muted">-</span>}</td>
                                                <td className="al-hide">
                                                    {a.fournisseur_nom ? (
                                                        <>
                                                            <div>{a.fournisseur_nom}</div>
                                                            {a.fournisseur_telephone && <a className="vt-cell-sub al-tel" href={`tel:${a.fournisseur_telephone}`}>{a.fournisseur_telephone}</a>}
                                                        </>
                                                    ) : <span className="vt-muted">-</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                        {!loading && visibles.length === 0 && (
                            searchTerm
                                ? <Empty icon={SearchX} title="Aucun produit ne correspond" text="Modifiez la recherche." />
                                : <Empty icon={CheckCircle} title="Aucune alerte" text="Tous vos produits sont entre leur seuil minimum et maximum." />
                        )}
                    </div>

                    <Pager page={page} nbPages={nbPages} total={filtrees.length} unite="produit" onChange={setPage} />
                </>
            )}

            <Toast toast={toast} onClose={closeToast} />
        </Page>
    );
};

export default Alertes;
