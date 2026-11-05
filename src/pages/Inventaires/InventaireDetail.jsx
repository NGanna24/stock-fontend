// pages/Inventaires/InventaireDetail.jsx — comptage d'un inventaire, au style Ventes
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, PlayCircle, CheckCircle, Ban, Save, Package, CheckCheck, Loader, SearchX, AlertTriangle } from "lucide-react";
import InventaireService from "../../services/inventaireService";
import { useUser } from "../../context/AuthContext";
import StockSelector from "../../components/StockSelector/StockSelector";
import {
    Page, SearchBox, Badge, Empty, Pager, usePagination, useToast, Toast, Modal, ModalHead, Confirm,
    KV, fcfa, nombre, dateFR, sansAccents, pluriel,
} from "../../components/UI/Vt";
import { StatutInventaire, TYPES_INV } from "./Inventaires";
import "./Inventaires.css";

// Quantité en nombre entier. Attention : la base renvoie les quantités au format « 487.00 ».
// Avant, le point était retiré et « 487.00 » devenait 48 700 : après un enregistrement
// puis la validation, le stock du produit était multiplié par 100.
const parseQuantite = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : 0;
    const s = String(v).trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s));
    const n = parseInt(s.replace(/[^0-9]/g, ""), 10); // saisie : chiffres seulement
    return Number.isNaN(n) ? 0 : n;
};

const PAR_PAGE = 50;

/** Unités dans lesquelles on peut compter un produit, de la plus grande à la plus petite
 *  (ex. Carton ×12, puis Bidon ×1). L'unité de base est toujours présente. */
const unitesDeComptage = (l) => {
    const liste = (l.unites_vente || [])
        .filter((u) => u && u.nom && Number(u.quantite_base) > 1)
        .map((u) => ({ cle: `u${u.id_unite_vente}`, nom: u.nom, qb: Math.round(Number(u.quantite_base)) }));
    // une même taille ne doit apparaître qu'une fois
    const vues = new Set();
    const uniques = liste.filter((u) => (vues.has(u.qb) ? false : vues.add(u.qb)));
    uniques.sort((a, b) => b.qb - a.qb);
    return [...uniques, { cle: "base", nom: l.unite_nom || "Unité", qb: 1 }];
};

const decomposer = (total, unites) => {
    let reste = Math.max(0, Math.round(Number(total) || 0));
    const parts = {};
    unites.forEach((u) => { parts[u.cle] = String(Math.floor(reste / u.qb)); reste %= u.qb; });
    return parts;
};

/** Saisie « 5 cartons 4 bidons » : une case par unité, le total en unité de base est calculé. */
const SaisieUnites = ({ ligne, valeur, onChange, readOnly, premierRef, onSuivant }) => {
    const unites = useMemo(() => unitesDeComptage(ligne), [ligne]);
    const [parts, setParts] = useState(() => (valeur === "" || valeur === undefined ? {} : decomposer(valeur, unites)));
    const refs = useRef([]);
    const totalDe = (p) => unites.reduce((s, u) => s + (parseInt(p[u.cle], 10) || 0) * u.qb, 0);
    const vide = (p) => unites.every((u) => (p[u.cle] ?? "") === "");

    // Valeur changée de l'extérieur (rechargement, « le reste est conforme ») : on redécompose
    useEffect(() => {
        const actuel = vide(parts) ? "" : String(totalDe(parts));
        const voulu = valeur === undefined ? "" : String(valeur);
        if (actuel !== voulu) setParts(voulu === "" ? {} : decomposer(voulu, unites));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valeur, unites]);

    const changer = (cle, v) => {
        const p = { ...parts, [cle]: String(v).replace(/[^0-9]/g, "") };
        setParts(p);
        onChange(vide(p) ? "" : String(totalDe(p)));
    };

    const touche = (e, i) => {
        if ([".", ",", "-", "+", "e", "E"].includes(e.key)) { e.preventDefault(); return; }
        if (e.key === "Enter") {
            e.preventDefault();
            const suivant = refs.current[i + 1];
            if (suivant) { suivant.focus(); suivant.select(); } else onSuivant();
        }
    };

    return (
        <div className="inv-saisie">
            {unites.map((u, i) => (
                <label key={u.cle} className="inv-saisie-u" title={u.qb > 1 ? `1 ${u.nom} = ${u.qb} ${ligne.unite_nom || "unités"}` : undefined}>
                    <input ref={(el) => { refs.current[i] = el; if (i === 0) premierRef(el); }}
                           type="text" inputMode="numeric" pattern="[0-9]*" className="vt-input vt-num inv-qte inv-qte--u"
                           placeholder={readOnly ? "" : "0"} value={parts[u.cle] ?? ""} readOnly={readOnly}
                           aria-label={`${ligne.produit_nom} : nombre de ${u.nom}`}
                           onChange={(e) => changer(u.cle, e.target.value)} onKeyDown={(e) => touche(e, i)} />
                    <span>{u.nom}</span>
                </label>
            ))}
            {!vide(parts) && <span className="vt-cell-sub inv-saisie-total">= {totalDe(parts)} {ligne.unite_nom || "unités"}</span>}
        </div>
    );
};

const InventaireDetail = () => {
    const { id, slug } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const token = localStorage.getItem("token");

    const [inventaire, setInventaire] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filtre, setFiltre] = useState("tous"); // tous | a_compter | ecarts

    const [saisies, setSaisies] = useState({});
    const [modifie, setModifie] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showValidModal, setShowValidModal] = useState(false);
    const [validating, setValidating] = useState(false);
    const [confirmation, setConfirmation] = useState(null); // 'demarrer' | 'annuler' | 'conforme'
    const [agissant, setAgissant] = useState(false);
    const [toast, showToast, closeToast] = useToast();

    const inputRefs = useRef({});
    const canManage = !!user && ["admin", "manager", "gestionnaire"].includes(user.role);
    const idValide = id && id !== "undefined" && id !== "null";

    const loadInventaire = useCallback(async () => {
        if (!idValide) { setError("Identifiant d'inventaire manquant"); setLoading(false); return; }
        setLoading(true);
        setError(null);
        try {
            const res = await InventaireService.getById(token, id);
            if (res.success) {
                setInventaire(res.data);
                const initial = {};
                // seules les lignes déjà comptées sont préremplies : les autres restent vides
                (res.data.lignes || []).forEach((l) => { if (l.date_scannage) initial[l.id_ligne] = String(parseQuantite(l.quantite_reelle)); });
                setSaisies(initial);
                setModifie(false);
            } else {
                setError(res.message || "Inventaire introuvable");
            }
        } catch (e) {
            setError(e.message || "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    }, [token, id, idValide]);

    useEffect(() => { loadInventaire(); }, [loadInventaire]);

    // Prévenir avant de quitter la page avec des quantités non enregistrées
    useEffect(() => {
        if (!modifie) return undefined;
        const avant = (e) => { e.preventDefault(); e.returnValue = ""; };
        window.addEventListener("beforeunload", avant);
        return () => window.removeEventListener("beforeunload", avant);
    }, [modifie]);

    // ============================================================
    // SAISIE
    // ============================================================
    const handleSaisieChange = (idLigne, value) => {
        setSaisies((prev) => ({ ...prev, [idLigne]: String(value).replace(/[^0-9]/g, "") }));
        setModifie(true);
    };

    const allerAuSuivant = (index, liste) => {
        const suivant = liste[index + 1];
        const input = suivant && inputRefs.current[suivant.id_ligne];
        if (input) { input.focus(); input.select(); }
    };

    const handleKeyDown = (e, index, liste) => {
        if ([".", ",", "-", "+", "e", "E"].includes(e.key)) { e.preventDefault(); return; }
        if (e.key === "Enter") { e.preventDefault(); allerAuSuivant(index, liste); }
    };

    const enregistrer = async () => {
        const lignes = Object.entries(saisies)
            .filter(([, qte]) => qte !== "" && qte !== null && qte !== undefined)
            .map(([idLigne, qte]) => ({ id_ligne: parseInt(idLigne, 10), quantite_reelle: parseQuantite(qte) }));
        const res = await InventaireService.saisirLignesEnMasse(token, id, lignes);
        if (!res.success) throw new Error(res.message || "Erreur lors de l'enregistrement");
        return res.data?.count ?? lignes.length;
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const n = await enregistrer();
            await loadInventaire();
            showToast(`${pluriel(n, "quantité")} enregistrée${n > 1 ? "s" : ""}`, "success");
        } catch (e) {
            showToast(e.message || "Erreur lors de l'enregistrement", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleValider = async () => {
        setValidating(true);
        try {
            await enregistrer();
            const res = await InventaireService.valider(token, id);
            if (!res.success) throw new Error(res.message || "Validation impossible");
            setShowValidModal(false);
            const n = res.data?.nb_ajustements || 0;
            showToast(n > 0 ? `Inventaire validé : ${pluriel(n, "produit")} corrigé${n > 1 ? "s" : ""} dans le stock` : "Inventaire validé : aucun écart, le stock était juste", "success");
            loadInventaire();
        } catch (e) {
            showToast(e.message || "Erreur lors de la validation", "error");
        } finally {
            setValidating(false);
        }
    };

    const confirmer = async () => {
        if (confirmation === "conforme") {
            const nouvelles = { ...saisies };
            (inventaire.lignes || []).forEach((l) => {
                if (nouvelles[l.id_ligne] === undefined || nouvelles[l.id_ligne] === "") nouvelles[l.id_ligne] = String(parseQuantite(l.quantite_theorique));
            });
            setSaisies(nouvelles);
            setModifie(true);
            setConfirmation(null);
            showToast("Les produits non comptés ont reçu la quantité attendue. Pensez à enregistrer.", "info");
            return;
        }
        setAgissant(true);
        try {
            if (confirmation === "demarrer") await InventaireService.demarrer(token, id);
            else await InventaireService.annuler(token, id);
            setConfirmation(null);
            showToast(confirmation === "demarrer" ? "Comptage démarré" : "Inventaire annulé", "success");
            loadInventaire();
        } catch (e) {
            showToast(e.message || "Erreur", "error");
        } finally {
            setAgissant(false);
        }
    };

    // ============================================================
    // CALCULS
    // ============================================================
    const lignes = useMemo(() => inventaire?.lignes || [], [inventaire]);

    const calcul = useCallback((l) => {
        const theorique = parseQuantite(l.quantite_theorique);
        const compte = saisies[l.id_ligne] !== undefined && saisies[l.id_ligne] !== "";
        const reelle = compte ? parseQuantite(saisies[l.id_ligne]) : theorique;
        return { theorique, compte, reelle, ecart: reelle - theorique, prix: parseFloat(l.prix_achat) || 0 };
    }, [saisies]);

    const stats = useMemo(() => {
        let nbComptes = 0, nbEcarts = 0, manquant = 0, surplus = 0;
        lignes.forEach((l) => {
            const c = calcul(l);
            if (c.compte) nbComptes++;
            if (c.ecart !== 0) {
                nbEcarts++;
                if (c.ecart < 0) manquant += -c.ecart * c.prix; else surplus += c.ecart * c.prix;
            }
        });
        return {
            nbLignes: lignes.length, nbComptes, nbEcarts, manquant, surplus,
            pourcentage: lignes.length ? Math.round((nbComptes / lignes.length) * 100) : 0,
        };
    }, [lignes, calcul]);

    const filtered = useMemo(() => {
        const q = sansAccents(searchTerm.trim());
        return lignes.filter((l) => {
            const c = calcul(l);
            if (filtre === "ecarts" && c.ecart === 0) return false;
            if (filtre === "a_compter" && c.compte) return false;
            if (q && !sansAccents(`${l.produit_nom} ${l.marque_nom || ""}`).includes(q)) return false;
            return true;
        });
    }, [lignes, calcul, filtre, searchTerm]);

    const { page, nbPages, setPage, numeros, visibles } = usePagination(filtered, PAR_PAGE, [filtre, searchTerm]);

    const retour = () => {
        if (modifie && !window.confirm("Des quantités ne sont pas enregistrées. Quitter quand même ?")) return;
        navigate(`/${slug}/inventaires`);
    };

    // ============================================================
    // RENDU
    // ============================================================
    if (loading && !inventaire) {
        return (
            <Page className="inv">
                <div className="inv-chargement"><Loader size={18} className="vt-spin" /> Chargement de l'inventaire…</div>
            </Page>
        );
    }
    if (error && !inventaire) {
        return (
            <Page className="inv">
                <Empty icon={AlertTriangle} title="Inventaire introuvable" text={error}>
                    <button type="button" className="vt-btn vt-btn--sm" onClick={() => navigate(`/${slug}/inventaires`)}>
                        <ArrowLeft size={14} /> Retour aux inventaires
                    </button>
                </Empty>
            </Page>
        );
    }
    if (!inventaire) return null;

    const isEnCours = inventaire.statut === "en_cours";
    const isPlanifie = inventaire.statut === "planifie";
    const nonComptes = stats.nbLignes - stats.nbComptes;

    return (
        <Page className="inv inv-detail">
            <header className="vt-head">
                <div className="inv-titre">
                    <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={retour} aria-label="Retour aux inventaires" title="Retour">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="vt-title">{inventaire.libelle}</h1>
                        <p className="vt-sub">
                            {inventaire.reference} · {TYPES_INV[inventaire.type_inventaire] || inventaire.type_inventaire} · {dateFR(inventaire.date_debut)}
                            {" "}<StatutInventaire statut={inventaire.statut} />
                        </p>
                    </div>
                </div>
                <div className="vt-head-actions">
                    {isPlanifie && canManage && (
                        <button type="button" className="vt-btn vt-btn--primary" onClick={() => setConfirmation("demarrer")}>
                            <PlayCircle size={16} /> Démarrer le comptage
                        </button>
                    )}
                    {isEnCours && canManage && (
                        <>
                            <button type="button" className="vt-btn vt-btn--danger-ghost" onClick={() => setConfirmation("annuler")} disabled={saving}>
                                <Ban size={16} /> Annuler
                            </button>
                            <button type="button" className="vt-btn" onClick={handleSaveAll} disabled={saving || !modifie}>
                                {saving ? <Loader size={16} className="vt-spin" /> : <Save size={16} />}
                                {saving ? "Enregistrement" : "Enregistrer"}
                            </button>
                            <button type="button" className="vt-btn vt-btn--primary" onClick={() => setShowValidModal(true)} disabled={saving}>
                                <CheckCircle size={16} /> Valider l'inventaire
                            </button>
                        </>
                    )}
                </div>
            </header>

            <section className="vt-overview inv-synthese" aria-label="Avancement">
                <div className="vt-ca">
                    <span className="vt-label">Comptés</span>
                    <strong className="vt-ca-value vt-num">{stats.nbComptes} / {stats.nbLignes}</strong>
                    <span className="inv-progress" aria-hidden="true"><i style={{ width: `${stats.pourcentage}%` }} /></span>
                    <span className="vt-ca-note">{stats.pourcentage} % du stock compté</span>
                </div>
                <div className="vt-rail" role="group" aria-label="Filtrer les produits">
                    <button type="button" className="vt-stage" data-s="all" aria-pressed={filtre === "tous"} onClick={() => setFiltre("tous")}>
                        <span className="vt-stage-count vt-num">{stats.nbLignes}</span><span className="vt-stage-label">Tous les produits</span>
                    </button>
                    <button type="button" className="vt-stage" data-s="muted" aria-pressed={filtre === "a_compter"} onClick={() => setFiltre(filtre === "a_compter" ? "tous" : "a_compter")}>
                        <span className="vt-stage-count vt-num">{nonComptes}</span><span className="vt-stage-label">À compter</span>
                    </button>
                    <button type="button" className="vt-stage" data-s="warn" aria-pressed={filtre === "ecarts"} onClick={() => setFiltre(filtre === "ecarts" ? "tous" : "ecarts")}>
                        <span className="vt-stage-count vt-num">{stats.nbEcarts}</span><span className="vt-stage-label">Écarts</span>
                    </button>
                    <div className="vt-stage inv-valeurs" aria-label="Valeur des écarts">
                        <span className="vt-stage-count vt-num inv-manque">{stats.manquant > 0 ? `−${fcfa(stats.manquant)}` : fcfa(0)}</span>
                        <span className="vt-stage-label">Manquant{stats.surplus > 0 ? ` · surplus +${fcfa(stats.surplus)}` : ""}</span>
                    </div>
                </div>
            </section>

            <div className="vt-toolbar">
                <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Produit ou marque" label="Rechercher un produit" />
                {isEnCours && canManage && nonComptes > 0 && (
                    <button type="button" className="vt-btn vt-btn--sm" onClick={() => setConfirmation("conforme")}>
                        <CheckCheck size={14} /> Le reste est conforme
                    </button>
                )}
                {modifie && <span className="vt-tag" data-s="warn">Non enregistré</span>}
                <span className="vt-count">{pluriel(filtered.length, "produit")}</span>
            </div>

            {isEnCours && (
                <p className="vt-hint inv-aide">Tapez la quantité comptée (en cartons, bidons… quand le produit en a) puis <strong>Entrée</strong> pour passer à la case suivante. Les produits laissés vides gardent leur stock actuel.</p>
            )}

            <div className="vt-table-wrap" aria-busy={loading || undefined}>
                {(loading || saving) && <div className="vt-busybar" />}
                <table className="vt-table inv-lignes">
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th>Attendu</th>
                            <th className="vt-th-right">Compté</th>
                            <th className="vt-th-right">Écart</th>
                            <th className="vt-th-right inv-hide">Valeur</th>
                        </tr>
                    </thead>
                    <tbody style={numeros}>
                        {visibles.map((l, index) => {
                            const c = calcul(l);
                            const valeur = Math.abs(c.ecart) * c.prix;
                            return (
                                <tr key={l.id_ligne} className={c.ecart !== 0 ? "inv-ligne-ecart" : undefined}>
                                    <td>
                                        <div className="vt-cell-main vt-cell-main--plain">{l.produit_nom}</div>
                                        <div className="vt-cell-sub">{[l.marque_nom, c.compte ? null : "pas encore compté"].filter(Boolean).join(" · ") || " "}</div>
                                    </td>
                                    <td>
                                        <StockSelector idProduit={`inv-th-${l.id_ligne}`} stockBase={c.theorique}
                                                       unitesVente={l.unites_vente || []}
                                                       uniteBase={{ nom: l.unite_nom, symbole: l.unite_symbole }} variant="list" />
                                    </td>
                                    <td className="vt-td-right">
                                        {unitesDeComptage(l).length > 1 ? (
                                            <SaisieUnites ligne={l} valeur={saisies[l.id_ligne]} readOnly={!isEnCours || !canManage}
                                                          premierRef={(el) => { inputRefs.current[l.id_ligne] = el; }}
                                                          onChange={(v) => handleSaisieChange(l.id_ligne, v)}
                                                          onSuivant={() => allerAuSuivant(index, visibles)} />
                                        ) : (
                                            <input ref={(el) => { inputRefs.current[l.id_ligne] = el; }} type="text" inputMode="numeric"
                                                   pattern="[0-9]*" className="vt-input vt-num inv-qte" placeholder={isEnCours ? "–" : ""}
                                                   aria-label={`Quantité comptée de ${l.produit_nom}`}
                                                   value={saisies[l.id_ligne] ?? ""} readOnly={!isEnCours || !canManage}
                                                   onChange={(e) => handleSaisieChange(l.id_ligne, e.target.value)}
                                                   onKeyDown={(e) => handleKeyDown(e, index, visibles)} />
                                        )}
                                    </td>
                                    <td className="vt-td-right">
                                        {c.ecart === 0
                                            ? <span className="vt-muted vt-num">0</span>
                                            : <Badge tone={c.ecart < 0 ? "bad" : "info"}>{c.ecart > 0 ? "+" : "−"}{nombre(Math.abs(c.ecart), 0)}</Badge>}
                                    </td>
                                    <td className="vt-td-right vt-num inv-hide">
                                        {c.ecart !== 0 && c.prix > 0
                                            ? <span className={c.ecart < 0 ? "vt-bad" : undefined}>{c.ecart < 0 ? "−" : "+"}{fcfa(valeur)}</span>
                                            : <span className="vt-muted">-</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {visibles.length === 0 && (
                    lignes.length === 0
                        ? <Empty icon={Package} title={isPlanifie ? "Comptage pas encore démarré" : "Aucun produit dans cet inventaire"}
                                 text={isPlanifie ? "Démarrez le comptage : la liste des produits sera créée à partir du stock actuel." : undefined} />
                        : <Empty icon={SearchX} title="Aucun produit ne correspond" text="Modifiez la recherche ou le filtre." />
                )}
            </div>

            <Pager page={page} nbPages={nbPages} total={filtered.length} unite="produit" onChange={setPage} />

            {showValidModal && (
                <Modal size="sm" busy={validating} labelledBy="inv-val-title" dismissable={!validating} onClose={() => setShowValidModal(false)}>
                    <ModalHead id="inv-val-title" title="Valider l'inventaire ?" onClose={() => setShowValidModal(false)} disabled={validating} />
                    <div className="vt-modal-body">
                        <KV items={[
                            ["Produits comptés", `${stats.nbComptes} / ${stats.nbLignes}`],
                            ["Écarts", stats.nbEcarts],
                            stats.manquant > 0 ? ["Valeur manquante", `−${fcfa(stats.manquant)}`] : null,
                            stats.surplus > 0 ? ["Valeur en surplus", `+${fcfa(stats.surplus)}`] : null,
                        ]} />
                        <div className="vt-danger-note inv-val-note">
                            <AlertTriangle size={20} />
                            <div>
                                <p>Le stock de chaque produit compté sera remplacé par la quantité comptée, et les écarts seront notés dans les mouvements de stock.</p>
                                {nonComptes > 0 && <p>{pluriel(nonComptes, "produit")} non compté{nonComptes > 1 ? "s" : ""} garde{nonComptes > 1 ? "nt" : ""} son stock actuel.</p>}
                                <p className="vt-danger-warn">Cette action est irréversible.</p>
                            </div>
                        </div>
                    </div>
                    <div className="vt-modal-foot vt-modal-foot--end">
                        <button type="button" className="vt-btn" onClick={() => setShowValidModal(false)} disabled={validating}>Retour</button>
                        <button type="button" className="vt-btn vt-btn--primary" onClick={handleValider} disabled={validating}>
                            {validating ? <Loader size={16} className="vt-spin" /> : <CheckCircle size={16} />}
                            {validating ? "Validation" : "Valider et corriger le stock"}
                        </button>
                    </div>
                </Modal>
            )}

            {confirmation && (
                <Confirm
                    title={{ demarrer: "Démarrer le comptage ?", annuler: "Annuler cet inventaire ?", conforme: "Le reste est conforme ?" }[confirmation]}
                    danger={confirmation === "annuler"} busy={agissant}
                    icon={confirmation === "annuler" ? undefined : confirmation === "demarrer" ? PlayCircle : CheckCheck}
                    confirmLabel={{ demarrer: "Démarrer", annuler: "Annuler l'inventaire", conforme: "Oui, tout est conforme" }[confirmation]}
                    cancelLabel="Retour" onConfirm={confirmer} onClose={() => !agissant && setConfirmation(null)}>
                    {confirmation === "demarrer" && <p>La liste des produits à compter sera créée à partir du stock actuel.</p>}
                    {confirmation === "annuler" && <p>L'inventaire <strong>{inventaire.reference}</strong> sera annulé. Les quantités comptées sont abandonnées et le stock ne change pas.</p>}
                    {confirmation === "conforme" && <p>{nonComptes > 1 ? `Les ${nonComptes} produits pas encore comptés recevront` : "Le produit pas encore compté recevra"} la quantité attendue. Les quantités déjà saisies ne changent pas.</p>}
                </Confirm>
            )}

            <Toast toast={toast} onClose={closeToast} />
        </Page>
    );
};

export default InventaireDetail;
