// pages/Inventaires/Inventaires.jsx — liste des inventaires, au style Ventes
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, Plus, RefreshCw, ClipboardList, Ban, PlayCircle, Trash2, Loader, Check, SearchX } from "lucide-react";
import InventaireService from "../../services/inventaireService";
import { useUser } from "../../context/AuthContext";
import {
    Page, PageHead, Overview, Stage, SearchBox, Badge, ErrorBar, Empty, SkeletonRows, Pager,
    usePagination, useToast, Toast, Modal, ModalHead, Confirm, ActionsMenu, dateFR, pluriel,
} from "../../components/UI/Vt";
import "./Inventaires.css";

export const STATUTS_INV = {
    planifie: { label: "Planifié", tone: "muted" },
    en_cours: { label: "En cours", tone: "warn" },
    termine:  { label: "Terminé", tone: "ok" },
    annule:   { label: "Annulé", tone: "bad" },
};
export const StatutInventaire = ({ statut }) => {
    const c = STATUTS_INV[statut] || STATUTS_INV.planifie;
    return <Badge tone={c.tone}>{c.label}</Badge>;
};
export const TYPES_INV = { complet: "Complet", partiel: "Partiel", tournant: "Tournant" };

const aujourdhui = () => new Date().toISOString().split("T")[0];
const formVide = () => ({ libelle: "", date_debut: aujourdhui(), type_inventaire: "complet", notes: "" });

const Inventaires = () => {
    const { isAuthenticated, user } = useUser();
    const { slug } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    const [inventaires, setInventaires] = useState([]);
    const [loading, setLoading] = useState(!!token);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [recherche, setRecherche] = useState("");
    const [filterStatut, setFilterStatut] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterDateDebut, setFilterDateDebut] = useState("");
    const [filterDateFin, setFilterDateFin] = useState("");
    const [stats, setStats] = useState(null);
    const [toast, showToast, closeToast] = useToast();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState(formVide);
    const [formError, setFormError] = useState(null);
    const [creating, setCreating] = useState(false);

    const [confirmation, setConfirmation] = useState(null); // { type: 'demarrer'|'annuler'|'supprimer', inv }
    const [agissant, setAgissant] = useState(false);

    const canManage = !!user && ["admin", "manager", "gestionnaire"].includes(user.role);

    const pause = useRef(null);
    useEffect(() => {
        clearTimeout(pause.current);
        pause.current = setTimeout(() => setRecherche(searchTerm.trim()), 350);
        return () => clearTimeout(pause.current);
    }, [searchTerm]);

    const params = useMemo(() => {
        const p = {};
        if (recherche) p.search = recherche;
        if (filterType) p.type_inventaire = filterType;
        if (filterDateDebut) p.date_debut = filterDateDebut;
        if (filterDateFin) p.date_fin = filterDateFin;
        return p;
    }, [recherche, filterType, filterDateDebut, filterDateFin]);

    const loadInventaires = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await InventaireService.getAll(token, params);
            if (res.success) setInventaires(res.data || []);
            else setError(res.message || "Erreur de chargement");
        } catch (e) {
            setError(e.message || "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    }, [token, params]);

    const loadStats = useCallback(async () => {
        try {
            const res = await InventaireService.getStats(token);
            if (res.success) setStats(res.data);
        } catch (e) {
            console.error("Stats error:", e);
        }
    }, [token]);

    useEffect(() => { if (isAuthenticated && token) loadInventaires(); }, [isAuthenticated, token, loadInventaires]);
    useEffect(() => { if (isAuthenticated && token) loadStats(); }, [isAuthenticated, token, loadStats]);

    const ouvrir = (inv) => {
        const id = inv.id_inventaire || inv.id;
        if (id) navigate(`/${slug}/inventaires/${id}`);
    };

    const handleCreate = async () => {
        if (!formData.libelle.trim()) { setFormError("Donnez un nom à l'inventaire"); return; }
        setCreating(true);
        setFormError(null);
        try {
            const res = await InventaireService.create(token, { ...formData, libelle: formData.libelle.trim() });
            if (res.success && res.data?.id_inventaire) {
                setShowCreateModal(false);
                setFormData(formVide());
                navigate(`/${slug}/inventaires/${res.data.id_inventaire}`);
            } else {
                setFormError(res.message || "Erreur lors de la création");
            }
        } catch (e) {
            setFormError(e.message || "Erreur lors de la création");
        } finally {
            setCreating(false);
        }
    };

    const confirmer = async () => {
        const { type, inv } = confirmation;
        setAgissant(true);
        try {
            if (type === "demarrer") {
                const res = await InventaireService.demarrer(token, inv.id_inventaire);
                if (!res.success) throw new Error(res.message || "Impossible de démarrer");
                setConfirmation(null);
                navigate(`/${slug}/inventaires/${inv.id_inventaire}`);
                return;
            }
            if (type === "annuler") {
                await InventaireService.annuler(token, inv.id_inventaire);
                showToast(`Inventaire ${inv.reference} annulé`, "success");
            } else {
                await InventaireService.delete(token, inv.id_inventaire);
                showToast(`Inventaire ${inv.reference} supprimé`, "success");
            }
            setConfirmation(null);
            loadInventaires();
            loadStats();
        } catch (e) {
            showToast(e.message || "Erreur", "error");
        } finally {
            setAgissant(false);
        }
    };

    const filtres = useMemo(
        () => (filterStatut ? inventaires.filter((i) => i.statut === filterStatut) : inventaires),
        [inventaires, filterStatut]
    );
    const { page, nbPages, setPage, numeros, visibles } = usePagination(filtres, 10, [params, filterStatut]);

    const filtresActifs = !!(filterStatut || filterType || filterDateDebut || filterDateFin || searchTerm);
    const reinitialiser = () => {
        setFilterStatut(""); setFilterType(""); setFilterDateDebut(""); setFilterDateFin(""); setSearchTerm("");
    };

    const s = stats || {};
    const ETAPES = [
        { value: "", label: "Tous", count: s.total },
        { value: "planifie", label: "Planifiés", count: s.planifie, tone: "muted" },
        { value: "en_cours", label: "En cours", count: s.en_cours, tone: "warn" },
        { value: "termine", label: "Terminés", count: s.termine, tone: "ok" },
        { value: "annule", label: "Annulés", count: s.annule, tone: "bad", apart: true },
    ];

    const actionsDe = (inv) => {
        const planifie = inv.statut === "planifie";
        const enCours = inv.statut === "en_cours";
        return [
            { label: enCours && canManage ? "Continuer le comptage" : "Ouvrir", icon: enCours ? ClipboardList : Eye, onClick: () => ouvrir(inv) },
            { label: "Démarrer le comptage", icon: PlayCircle, hidden: !canManage || !planifie,
              onClick: () => setConfirmation({ type: "demarrer", inv }) },
            { label: "Annuler l'inventaire", icon: Ban, danger: true, hidden: !canManage || !(planifie || enCours),
              onClick: () => setConfirmation({ type: "annuler", inv }) },
            { label: "Supprimer", icon: Trash2, danger: true, hidden: !canManage || !(planifie || inv.statut === "annule"),
              onClick: () => setConfirmation({ type: "supprimer", inv }) },
        ];
    };

    const TEXTES = {
        demarrer: { titre: "Démarrer le comptage ?", bouton: "Démarrer", danger: false,
            corps: (inv) => <p>La liste des produits à compter de <strong>{inv.libelle}</strong> sera créée à partir du stock actuel. Vous pourrez ensuite saisir les quantités comptées.</p> },
        annuler: { titre: "Annuler cet inventaire ?", bouton: "Annuler l'inventaire", danger: true,
            corps: (inv) => <p>L'inventaire <strong>{inv.reference}</strong> sera annulé. Le stock ne change pas.</p> },
        supprimer: { titre: "Supprimer cet inventaire ?", bouton: "Supprimer", danger: true,
            corps: (inv) => <><p>L'inventaire <strong>{inv.reference}</strong> sera supprimé.</p><p className="vt-danger-warn">Cette action est irréversible.</p></> },
    };

    return (
        <Page className="inv">
            <PageHead title="Inventaires" sub="Comptez vos produits et corrigez le stock quand il ne correspond pas à la réalité">
                <button type="button" className="vt-btn vt-btn--icon" onClick={() => { loadInventaires(); loadStats(); }}
                        disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
                    <RefreshCw size={16} className={loading ? "vt-spin" : ""} />
                </button>
                {canManage && (
                    <button type="button" className="vt-btn vt-btn--primary"
                            onClick={() => { setFormData(formVide()); setFormError(null); setShowCreateModal(true); }}>
                        <Plus size={16} /> Nouvel inventaire
                    </button>
                )}
            </PageHead>

            <Overview label="En cours" value={pluriel(s.en_cours ?? 0, "inventaire")}
                      note={s.aujourdhui ? `${pluriel(s.aujourdhui, "inventaire")} commencé${s.aujourdhui > 1 ? "s" : ""} aujourd'hui` : "Aucun inventaire commencé aujourd'hui"}>
                {ETAPES.map((e) => (
                    <Stage key={e.value || "tous"} count={e.count ?? "–"} label={e.label} tone={e.tone || "all"} apart={e.apart}
                           pressed={filterStatut === e.value}
                           onClick={() => setFilterStatut(filterStatut === e.value ? "" : e.value)} />
                ))}
            </Overview>

            <div className="vt-toolbar inv-toolbar">
                <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Référence ou nom de l'inventaire"
                           label="Rechercher un inventaire" />
                <select className="vt-input inv-type" value={filterType} onChange={(e) => setFilterType(e.target.value)}
                        aria-label="Filtrer par type">
                    <option value="">Tous les types</option>
                    {Object.entries(TYPES_INV).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <div className="inv-dates">
                    <label className="vt-muted" htmlFor="inv-du">Du</label>
                    <input id="inv-du" type="date" className="vt-input" value={filterDateDebut}
                           max={filterDateFin || undefined} onChange={(e) => setFilterDateDebut(e.target.value)} />
                    <label className="vt-muted" htmlFor="inv-au">au</label>
                    <input id="inv-au" type="date" className="vt-input" value={filterDateFin}
                           min={filterDateDebut || undefined} onChange={(e) => setFilterDateFin(e.target.value)} />
                </div>
                {filtresActifs && <button type="button" className="vt-btn vt-btn--sm" onClick={reinitialiser}>Effacer les filtres</button>}
                <span className="vt-count">{pluriel(filtres.length, "inventaire")}</span>
            </div>

            {error && !loading && <ErrorBar message={error} onRetry={loadInventaires} />}

            <div className="vt-table-wrap" aria-busy={loading || undefined}>
                {loading && inventaires.length > 0 && <div className="vt-busybar" />}
                <table className="vt-table inv-table">
                    <thead>
                        <tr>
                            <th>Inventaire</th>
                            <th className="inv-hide">Type</th>
                            <th className="vt-th-right">Produits</th>
                            <th className="vt-th-right">Écarts</th>
                            <th>Statut</th>
                            <th className="vt-th-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody style={numeros}>
                        {loading && inventaires.length === 0
                            ? <SkeletonRows cols={6} widths={[70, 40, 30, 30, 45, 30]} />
                            : visibles.map((inv) => (
                                <tr key={inv.id_inventaire}>
                                    <td>
                                        <button type="button" className="vt-link vt-cell-main" onClick={() => ouvrir(inv)}>{inv.libelle}</button>
                                        <div className="vt-cell-sub">{inv.reference} · {dateFR(inv.date_debut)}</div>
                                    </td>
                                    <td className="inv-hide">{TYPES_INV[inv.type_inventaire] || inv.type_inventaire}</td>
                                    <td className="vt-td-right vt-num">{inv.nb_lignes || 0}</td>
                                    <td className="vt-td-right">
                                        {inv.nb_ecarts > 0
                                            ? <span className="vt-tag" data-s="warn">{inv.nb_ecarts}</span>
                                            : <span className="vt-muted vt-num">0</span>}
                                    </td>
                                    <td><StatutInventaire statut={inv.statut} /></td>
                                    <td className="vt-td-right">
                                        <div className="vt-actions">
                                            {canManage && inv.statut === "planifie" ? (
                                                <button type="button" className="vt-btn vt-btn--sm" onClick={() => setConfirmation({ type: "demarrer", inv })}>
                                                    <PlayCircle size={14} /> Démarrer
                                                </button>
                                            ) : canManage && inv.statut === "en_cours" ? (
                                                <button type="button" className="vt-btn vt-btn--sm" onClick={() => ouvrir(inv)}>
                                                    <ClipboardList size={14} /> Compter
                                                </button>
                                            ) : (
                                                <button type="button" className="vt-iconbtn vt-iconbtn--sm" onClick={() => ouvrir(inv)}
                                                        aria-label={`Ouvrir ${inv.libelle}`} title="Ouvrir"><Eye size={15} /></button>
                                            )}
                                            <ActionsMenu label={`Autres actions pour ${inv.reference}`} items={actionsDe(inv)} width={220} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
                {!loading && visibles.length === 0 && (
                    filtresActifs
                        ? <Empty icon={SearchX} title="Aucun inventaire ne correspond" text="Modifiez la recherche ou les filtres.">
                              <button type="button" className="vt-btn vt-btn--sm" onClick={reinitialiser}>Effacer les filtres</button>
                          </Empty>
                        : <Empty icon={ClipboardList} title="Aucun inventaire"
                                 text="Faites un inventaire de temps en temps : vous comptez les produits, Miyo corrige le stock et garde la trace des écarts.">
                              {canManage && (
                                  <button type="button" className="vt-btn vt-btn--primary vt-btn--sm" onClick={() => setShowCreateModal(true)}>
                                      <Plus size={14} /> Nouvel inventaire
                                  </button>
                              )}
                          </Empty>
                )}
            </div>

            <Pager page={page} nbPages={nbPages} total={filtres.length} unite="inventaire" onChange={setPage} />

            {showCreateModal && (
                <Modal size="md" busy={creating} labelledBy="inv-new-title" dismissable={!creating} onClose={() => setShowCreateModal(false)}>
                    <ModalHead id="inv-new-title" title="Nouvel inventaire" sub="Vous démarrerez le comptage juste après"
                               onClose={() => setShowCreateModal(false)} disabled={creating} />
                    <form className="vt-modal-body" onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
                        {formError && <ErrorBar message={formError} />}
                        <div className="vt-stack">
                            <div className="vt-field">
                                <label htmlFor="inv-lib">Nom de l'inventaire</label>
                                <input id="inv-lib" type="text" className="vt-input" autoFocus maxLength={150}
                                       placeholder="Ex. Inventaire de fin de mois"
                                       value={formData.libelle} onChange={(e) => { setFormError(null); setFormData({ ...formData, libelle: e.target.value }); }} />
                            </div>
                            <div className="vt-grid-2">
                                <div className="vt-field">
                                    <label htmlFor="inv-date">Date</label>
                                    <input id="inv-date" type="date" className="vt-input" value={formData.date_debut}
                                           onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })} />
                                </div>
                                <div className="vt-field">
                                    <label htmlFor="inv-typ">Type</label>
                                    <select id="inv-typ" className="vt-input" value={formData.type_inventaire}
                                            onChange={(e) => setFormData({ ...formData, type_inventaire: e.target.value })}>
                                        <option value="complet">Complet : tous les produits</option>
                                        <option value="partiel">Partiel : une partie du stock</option>
                                        <option value="tournant">Tournant : un échantillon</option>
                                    </select>
                                </div>
                            </div>
                            <div className="vt-field">
                                <label htmlFor="inv-notes">Note (facultatif)</label>
                                <textarea id="inv-notes" className="vt-input" rows="2" placeholder="Ex. rayon boissons uniquement"
                                          value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
                    </form>
                    <div className="vt-modal-foot vt-modal-foot--end">
                        <button type="button" className="vt-btn" onClick={() => setShowCreateModal(false)} disabled={creating}>Fermer</button>
                        <button type="button" className="vt-btn vt-btn--primary" onClick={handleCreate} disabled={creating}>
                            {creating ? <Loader size={16} className="vt-spin" /> : <Check size={16} />}
                            {creating ? "Création" : "Créer l'inventaire"}
                        </button>
                    </div>
                </Modal>
            )}

            {confirmation && (() => {
                const t = TEXTES[confirmation.type];
                return (
                    <Confirm title={t.titre} danger={t.danger} busy={agissant} confirmLabel={agissant ? "Un instant" : t.bouton}
                             cancelLabel="Retour" icon={confirmation.type === "demarrer" ? PlayCircle : undefined}
                             onConfirm={confirmer} onClose={() => !agissant && setConfirmation(null)}>
                        {t.corps(confirmation.inv)}
                    </Confirm>
                );
            })()}

            <Toast toast={toast} onClose={closeToast} />
        </Page>
    );
};

export default Inventaires;
