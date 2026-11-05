// pages/Mouvements/Mouvements.jsx
// Historique des mouvements de stock (enregistrés automatiquement), au style Ventes.
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Eye, RefreshCw, ClipboardList, Download, SearchX } from "lucide-react";

import MouvementStockService from "../../services/mouvementStockService";
import { useUser } from "../../context/AuthContext";
import StockSelector from "../../components/StockSelector/StockSelector";
import {
    Page, PageHead, Overview, Stage, SearchBox, Badge, ErrorBar, Empty, SkeletonRows, Pager,
    usePagination, useToast, Toast, Modal, ModalHead, KV, nombre, pluriel,
} from "../../components/UI/Vt";
import "./Mouvements.css";

// ============================================================
// CONSTANTES
// ============================================================
const TYPES = {
    entree:     { label: "Entrée",     tone: "ok" },
    sortie:     { label: "Sortie",     tone: "signal" },
    ajustement: { label: "Ajustement", tone: "warn" },
    transfert:  { label: "Transfert",  tone: "info" },
};

const REFERENCE_LABELS = {
    reception:            "Réception",
    vente:                "Vente",
    vente_annulee:        "Vente annulée",
    ajustement:           "Ajustement",
    inventaire:           "Inventaire",
    manuel:               "Saisie manuelle",
    stock_initial:        "Stock initial",
    transfert:            "Transfert",
    retour_client:        "Retour client",
    retour_client_annule: "Retour client annulé",
    retour_fournisseur:   "Retour fournisseur",
    annulation_retour_fournisseur:  "Retour fournisseur annulé",
    suppression_retour_fournisseur: "Retour fournisseur supprimé",
    perte:                "Perte / casse",
};

const PAR_PAGE = 15;

// ============================================================
// HELPERS
// ============================================================
/** Décompose une quantité de base en unités de vente (27 → 2 Cartons + 7 Bidons). */
const decomposer = (quantite, unitesVente, uniteBase) => {
    const stock = parseFloat(quantite) || 0;
    if (stock <= 0) return [];
    const toutes = [
        { nom: uniteBase?.nom || "Unité", quantite_base: 1 },
        ...(unitesVente || []).filter((u) => u && u.nom)
            .map((u) => ({ nom: u.nom, quantite_base: parseFloat(u.quantite_base) || 1 })),
    ].sort((a, b) => b.quantite_base - a.quantite_base);
    let reste = stock;
    const parts = [];
    for (const u of toutes) {
        const qb = u.quantite_base || 1;
        const qte = Math.floor(reste / qb);
        if (qte > 0) { parts.push({ nom: u.nom, qte }); reste -= qte * qb; }
    }
    if (reste > 0.0001) parts.push({ nom: uniteBase?.nom || "Unité", qte: nombre(reste, 3) });
    return parts;
};

const libelleReference = (m) => {
    if (!m?.type_reference) return "-";
    const label = REFERENCE_LABELS[m.type_reference]
        || m.type_reference.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
    return m.id_reference ? `${label} n° ${m.id_reference}` : label;
};

const dateMouvement = (m) => m.date_mouvement_formatee
    || (m.date_mouvement ? new Date(m.date_mouvement).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "-");

const TypeBadge = ({ type }) => {
    const t = TYPES[type] || { label: type || "-", tone: "muted" };
    return <Badge tone={t.tone}>{t.label}</Badge>;
};

const Decomposition = ({ quantite, m }) => {
    const parts = decomposer(quantite, m.unites_vente, { nom: m.unite_nom, symbole: m.unite_symbole });
    if (parts.length === 0) return <span className="vt-muted vt-num">0</span>;
    return (
        <span className="mv-decomp vt-num">
            {parts.map((p, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span className="vt-muted"> + </span>}
                    <span>{p.qte} <small>{p.nom}</small></span>
                </React.Fragment>
            ))}
        </span>
    );
};

// ============================================================
// DÉTAIL
// ============================================================
const DetailModal = ({ m, onClose }) => (
    <Modal size="md" labelledBy="mv-det-title" onClose={onClose}>
        <ModalHead id="mv-det-title" title="Mouvement de stock" sub={dateMouvement(m)} onClose={onClose}>
            <TypeBadge type={m.type_mouvement} />
        </ModalHead>
        <div className="vt-modal-body">
            <KV items={[
                ["Produit", `${m.produit_nom || "-"}${m.marque_nom ? ` (${m.marque_nom})` : ""}`],
                ["Quantité", (
                    <StockSelector idProduit={`mvt-modal-qte-${m.id_mouvement}`} stockBase={m.quantite}
                                   unitesVente={m.unites_vente || []} uniteBase={{ nom: m.unite_nom, symbole: m.unite_symbole }}
                                   isRupture={false} variant="details" />
                )],
                ["Stock avant", <Decomposition quantite={m.ancienne_quantite} m={m} />],
                ["Stock après", <Decomposition quantite={m.nouvelle_quantite} m={m} />],
                ["Origine", libelleReference(m)],
                ["Fait par", m.utilisateur_nom || "-"],
                ["Note", m.notes || "-"],
            ]} />
        </div>
        <div className="vt-modal-foot vt-modal-foot--end">
            <button type="button" className="vt-btn" onClick={onClose}>Fermer</button>
        </div>
    </Modal>
);

// ============================================================
// PAGE
// ============================================================
const Mouvements = () => {
    const { isAuthenticated } = useUser();
    const token = localStorage.getItem("token");

    const [mouvements, setMouvements] = useState([]);
    const [loading, setLoading] = useState(!!token);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [recherche, setRecherche] = useState(""); // valeur envoyée au serveur (après une courte pause)
    const [filterType, setFilterType] = useState("");
    const [filterDateDebut, setFilterDateDebut] = useState("");
    const [filterDateFin, setFilterDateFin] = useState("");
    const [selected, setSelected] = useState(null);
    const [toast, showToast, closeToast] = useToast();

    const [stats, setStats] = useState(null);

    // La recherche part au serveur 350 ms après la dernière frappe
    const pause = useRef(null);
    useEffect(() => {
        clearTimeout(pause.current);
        pause.current = setTimeout(() => setRecherche(searchTerm.trim()), 350);
        return () => clearTimeout(pause.current);
    }, [searchTerm]);

    const params = useMemo(() => {
        const p = {};
        if (recherche) p.search = recherche;
        if (filterType) p.type_mouvement = filterType;
        if (filterDateDebut) p.date_debut = filterDateDebut;
        if (filterDateFin) p.date_fin = filterDateFin;
        return p;
    }, [recherche, filterType, filterDateDebut, filterDateFin]);

    const loadMouvements = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await MouvementStockService.getAll(token, params);
            if (response.success) setMouvements(response.data || []);
            else setError(response.message || "Erreur de chargement");
        } catch (err) {
            setError(err.message || "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    }, [token, params]);

    const loadStats = useCallback(async () => {
        try {
            const response = await MouvementStockService.getStats(token);
            if (response.success) setStats(response.data);
        } catch (err) {
            console.error("❌ LoadStats error:", err);
        }
    }, [token]);

    useEffect(() => { if (isAuthenticated && token) loadMouvements(); }, [isAuthenticated, token, loadMouvements]);
    useEffect(() => { if (isAuthenticated && token) loadStats(); }, [isAuthenticated, token, loadStats]);

    const handleExport = async () => {
        try {
            await MouvementStockService.export(token, params);
        } catch (err) {
            showToast(`Erreur lors de l'export : ${err.message}`, "error");
        }
    };

    const filtresActifs = !!(filterType || filterDateDebut || filterDateFin || searchTerm);
    const reinitialiser = () => {
        setFilterType(""); setFilterDateDebut(""); setFilterDateFin(""); setSearchTerm("");
    };

    const { page, nbPages, setPage, numeros, visibles } = usePagination(mouvements, PAR_PAGE, [params]);

    const s = stats || {};
    const ETAPES = [
        { value: "", label: "Tous", count: s.total },
        { value: "entree", label: "Entrées", count: s.total_entrees, tone: "ok" },
        { value: "sortie", label: "Sorties", count: s.total_sorties, tone: "signal" },
        { value: "ajustement", label: "Ajustements", count: s.total_ajustements, tone: "warn" },
        { value: "transfert", label: "Transferts", count: s.total_transferts, tone: "info" },
    ];

    return (
        <Page className="mv">
            <PageHead title="Mouvements de stock"
                      sub="Chaque entrée et sortie de marchandise, enregistrée automatiquement (ventes, réceptions, retours, inventaires)">
                <button type="button" className="vt-btn vt-btn--icon" onClick={() => { loadMouvements(); loadStats(); }}
                        disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
                    <RefreshCw size={16} className={loading ? "vt-spin" : ""} />
                </button>
                <button type="button" className="vt-btn" onClick={handleExport}>
                    <Download size={16} /> Exporter
                </button>
            </PageHead>

            <Overview label="Aujourd'hui" value={pluriel(s.aujourdhui ?? 0, "mouvement")}
                      note={stats ? `${nombre(s.qte_entrees, 0)} unités entrées · ${nombre(s.qte_sorties, 0)} sorties au total` : " "}>
                {ETAPES.map((e) => (
                    <Stage key={e.value || "tous"} count={e.count ?? "–"} label={e.label} tone={e.tone || "all"}
                           pressed={filterType === e.value}
                           onClick={() => setFilterType(filterType === e.value ? "" : e.value)} />
                ))}
            </Overview>

            <div className="vt-toolbar mv-toolbar">
                <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Produit, note ou utilisateur"
                           label="Rechercher un mouvement" />
                <div className="mv-dates">
                    <label className="vt-muted" htmlFor="mv-du">Du</label>
                    <input id="mv-du" type="date" className="vt-input" value={filterDateDebut}
                           max={filterDateFin || undefined} onChange={(e) => setFilterDateDebut(e.target.value)} />
                    <label className="vt-muted" htmlFor="mv-au">au</label>
                    <input id="mv-au" type="date" className="vt-input" value={filterDateFin}
                           min={filterDateDebut || undefined} onChange={(e) => setFilterDateFin(e.target.value)} />
                </div>
                {filtresActifs && <button type="button" className="vt-btn vt-btn--sm" onClick={reinitialiser}>Effacer les filtres</button>}
                <span className="vt-count">{pluriel(mouvements.length, "mouvement")}</span>
            </div>

            {error && !loading && <ErrorBar message={error} onRetry={loadMouvements} />}

            <div className="vt-table-wrap" aria-busy={loading || undefined}>
                {loading && mouvements.length > 0 && <div className="vt-busybar" />}
                <table className="vt-table mv-table">
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th>Type</th>
                            <th>Quantité</th>
                            <th className="mv-hide">Stock avant → après</th>
                            <th className="mv-hide-sm">Origine</th>
                            <th className="vt-th-right" aria-label="Détail" />
                        </tr>
                    </thead>
                    <tbody style={numeros}>
                        {loading && mouvements.length === 0
                            ? <SkeletonRows cols={6} widths={[65, 40, 45, 60, 50, 20]} />
                            : visibles.map((m) => (
                                <tr key={m.id_mouvement}>
                                    <td>
                                        <button type="button" className="vt-link vt-cell-main" onClick={() => setSelected(m)}>
                                            {m.produit_nom || "-"}
                                        </button>
                                        <div className="vt-cell-sub">{dateMouvement(m)}{m.utilisateur_nom ? ` · ${m.utilisateur_nom}` : ""}</div>
                                    </td>
                                    <td><TypeBadge type={m.type_mouvement} /></td>
                                    <td>
                                        <StockSelector idProduit={`mvt-qte-${m.id_mouvement}`} stockBase={m.quantite}
                                                       unitesVente={m.unites_vente || []}
                                                       uniteBase={{ nom: m.unite_nom, symbole: m.unite_symbole }}
                                                       isRupture={false} variant="list" />
                                    </td>
                                    <td className="mv-hide">
                                        <span className="mv-avant-apres">
                                            <Decomposition quantite={m.ancienne_quantite} m={m} />
                                            <span className="vt-muted" aria-hidden="true">→</span>
                                            <Decomposition quantite={m.nouvelle_quantite} m={m} />
                                        </span>
                                    </td>
                                    <td className="mv-hide-sm">{libelleReference(m)}</td>
                                    <td className="vt-td-right">
                                        <button type="button" className="vt-iconbtn vt-iconbtn--sm" onClick={() => setSelected(m)}
                                                aria-label={`Détail du mouvement de ${m.produit_nom || "ce produit"}`} title="Voir le détail">
                                            <Eye size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
                {!loading && visibles.length === 0 && (
                    filtresActifs
                        ? <Empty icon={SearchX} title="Aucun mouvement ne correspond" text="Modifiez la recherche, le type ou les dates.">
                              <button type="button" className="vt-btn vt-btn--sm" onClick={reinitialiser}>Effacer les filtres</button>
                          </Empty>
                        : <Empty icon={ClipboardList} title="Aucun mouvement pour l'instant"
                                 text="Les ventes, réceptions, retours et inventaires apparaîtront ici automatiquement." />
                )}
            </div>

            <Pager page={page} nbPages={nbPages} total={mouvements.length} unite="mouvement" onChange={setPage} />

            {selected && <DetailModal m={selected} onClose={() => setSelected(null)} />}
            <Toast toast={toast} onClose={closeToast} />
        </Page>
    );
};

export default Mouvements;
