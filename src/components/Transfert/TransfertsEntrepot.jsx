// components/Transfert/TransfertsEntrepot.jsx
// Registre des transferts d'un entrepôt : recherche, filtres, tri, pagination.
//   - Propriétaire : voit toutes les demandes, les approuve ou les refuse.
//   - Membre       : voit les siennes, peut annuler tant qu'elles sont en attente.
// Les demandes sont chargées une fois (500 max) puis filtrées côté navigateur.
//
// Sans `entrepotId` (page /transferts) : vue centrale, tous mes entrepôts confondus.
// Chaque ligne porte alors son propre `est_proprietaire` et `id_entrepot_source`.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, FileText, Inbox,
    Loader, RefreshCw, Search, X, XCircle, AlertTriangle,
} from 'lucide-react';
import TrModal, {
    StatutBadge, fmtNum, fmtDate, libelleQuantite, libelleEquivalent,
} from './TrModal';
import BonTransfert from './BonTransfert';
import TransfertStockService from '../../services/transfertStockService';
import './Transfert.css';

const PAR_PAGE = 10;

const ONGLETS = [
    ['', 'Toutes'],
    ['en_attente', 'En attente'],
    ['valide', 'Approuvées'],
    ['refuse', 'Refusées'],
    ['annule', 'Annulées'],
];

/**
 * Regroupe les lignes d'un même panier (numero_lot) en UNE entrée : un seul numéro, un seul bon,
 * des actions (approuver / refuser / annuler) qui s'appliquent à tout le panier.
 */
function regrouper(transferts) {
    const lots = new Map();
    const entrees = [];
    for (const t of transferts) {
        if (!t.numero_lot) { entrees.push(t); continue; }
        if (!lots.has(t.numero_lot)) {
            const e = {
                ...t,
                isLot: true,
                lignes: [],
                numero_transfert: t.numero_lot,
                id_transfert: t.id_transfert,
            };
            lots.set(t.numero_lot, e);
            entrees.push(e);
        }
        const e = lots.get(t.numero_lot);
        e.lignes.push(t);
        e.id_transfert = Math.min(e.id_transfert, t.id_transfert);
    }
    lots.forEach((e) => {
        e.lignes.sort((a, b) => a.id_transfert - b.id_transfert);
        e.nb_produits = e.lignes.length;
    });
    return entrees;
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const jour = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

export default function TransfertsEntrepot({ token, entrepotId = null, onError, onChanged, onLoaded }) {
    // Un vrai numéro d'entrepôt -> registre de cet entrepôt ; sinon (null, undefined, '') -> tous mes entrepôts.
    const idEntrepot = Number(entrepotId);
    const vueGlobale = !(Number.isInteger(idEntrepot) && idEntrepot > 0);
    const [brut, setBrut] = useState([]);
    const tous = useMemo(() => regrouper(brut), [brut]);
    const [estProprietaire, setEstProprietaire] = useState(false);
    const [loading, setLoading] = useState(true);

    // Recherche / filtres / tri / page
    const [recherche, setRecherche] = useState('');
    const [statut, setStatut] = useState('');
    const [demandeur, setDemandeur] = useState('');
    const [du, setDu] = useState('');
    const [au, setAu] = useState('');
    const [recentDabord, setRecentDabord] = useState(true);
    const [page, setPage] = useState(1);

    // Actions
    const [action, setAction] = useState(null); // { type: 'approuver'|'refuser'|'annuler', t }
    const [motifRefus, setMotifRefus] = useState('');
    const [busy, setBusy] = useState(false);
    const [erreurAction, setErreurAction] = useState(null);
    const [bon, setBon] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = vueGlobale
                ? await TransfertStockService.listMes(token, null)
                : await TransfertStockService.list(token, idEntrepot, null);
            setBrut(res.transferts || []);
            setEstProprietaire(vueGlobale
                ? (res.transferts || []).some((t) => t.est_proprietaire)
                : !!res.est_proprietaire);
            onLoaded?.(res);
        } catch (err) {
            onError?.(err.message || 'Impossible de charger les transferts');
        } finally {
            setLoading(false);
        }
    }, [token, entrepotId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { load(); }, [load]);

    // En vue centrale, les droits et l'entrepôt viennent de chaque ligne
    const proprio = (t) => (vueGlobale ? !!t.est_proprietaire : estProprietaire);
    const idEnt = (t) => (vueGlobale ? t.id_entrepot_source : idEntrepot);

    /* ---- Compteurs par statut (sur l'ensemble, hors filtre de statut) ---- */
    const compteurs = useMemo(() => {
        const c = { '': tous.length, en_attente: 0, valide: 0, refuse: 0, annule: 0 };
        tous.forEach((t) => { if (c[t.statut] !== undefined) c[t.statut] += 1; });
        return c;
    }, [tous]);

    const demandeurs = useMemo(() => {
        const m = new Map();
        tous.forEach((t) => m.set(String(t.id_utilisateur_destination), t.magasin_nom || t.demandeur_nom));
        return [...m.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
    }, [tous]);

    /* ---- Filtrage + tri ---- */
    const filtres = useMemo(() => {
        const q = norm(recherche.trim());
        const liste = tous.filter((t) => {
            if (statut && t.statut !== statut) return false;
            if (demandeur && String(t.id_utilisateur_destination) !== demandeur) return false;
            const d = jour(t.date_creation);
            if (du && d < du) return false;
            if (au && d > au) return false;
            if (!q) return true;
            return norm([
                t.numero_transfert, t.produit_nom, t.marque_nom, t.modele_nom,
                t.magasin_nom, t.demandeur_nom, t.motif, t.produit_destination_nom, t.entrepot_nom,
                ...(t.lignes || []).map((l) => `${l.produit_nom} ${l.marque_nom || ''} ${l.numero_transfert}`),
            ].filter(Boolean).join(' ')).includes(q);
        });
        liste.sort((a, b) => {
            const diff = new Date(a.date_creation) - new Date(b.date_creation) || a.id_transfert - b.id_transfert;
            return recentDabord ? -diff : diff;
        });
        return liste;
    }, [tous, recherche, statut, demandeur, du, au, recentDabord]);

    useEffect(() => { setPage(1); }, [recherche, statut, demandeur, du, au, recentDabord]);

    const nbPages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
    const pageCourante = Math.min(page, nbPages);
    const visibles = filtres.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);
    const filtresActifs = !!(recherche || demandeur || du || au);

    const reinitialiser = () => {
        setRecherche(''); setDemandeur(''); setDu(''); setAu(''); setStatut('');
    };

    /* ---- Actions ---- */
    const fermer = () => {
        if (busy) return;
        setAction(null);
        setMotifRefus('');
        setErreurAction(null);
    };

    const confirmer = async () => {
        if (!action) return;
        const { type, t } = action;
        setBusy(true);
        setErreurAction(null);
        try {
            if (t.isLot) {
                // Panier : l'action s'applique à tout le lot (tout ou rien)
                await TransfertStockService.actionLot(token, idEnt(t), t.numero_lot, type,
                    type === 'refuser' ? { motif: motifRefus.trim() } : {});
            } else {
                if (type === 'approuver') await TransfertStockService.approuver(token, idEnt(t), t.id_transfert);
                if (type === 'refuser') await TransfertStockService.refuser(token, idEnt(t), t.id_transfert, motifRefus.trim());
                if (type === 'annuler') await TransfertStockService.annuler(token, idEnt(t), t.id_transfert);
            }

            setAction(null);
            setMotifRefus('');
            await load();
            onChanged?.({
                approuver: 'Demande approuvée : les stocks ont été mis à jour',
                refuser: 'Demande refusée',
                annuler: 'Demande annulée',
            }[type], type);
        } catch (err) {
            // l'erreur reste dans la fenêtre : le propriétaire peut alors refuser la demande
            setErreurAction(err.message || "Erreur lors de l'opération");
        } finally {
            setBusy(false);
        }
    };

    const titres = {
        approuver: 'Approuver cette demande ?',
        refuser: 'Refuser cette demande ?',
        annuler: 'Annuler cette demande ?',
    };

    return (
        <section className="trx">
            {/* ---- Onglets de statut avec compteurs ---- */}
            <div className="trx-tabs" role="tablist">
                {ONGLETS.map(([key, label]) => (
                    <button
                        key={key || 'all'}
                        role="tab"
                        aria-selected={statut === key}
                        className={`trx-tab ${statut === key ? 'is-active' : ''} ${key === 'en_attente' && compteurs.en_attente > 0 ? 'is-alert' : ''}`}
                        onClick={() => setStatut(key)}
                    >
                        {label}
                        <span className="trx-count">{compteurs[key]}</span>
                    </button>
                ))}
            </div>

            {/* ---- Barre d'outils ---- */}
            <div className="trx-toolbar">
                <div className="trx-search">
                    <Search size={15} />
                    <input
                        type="text"
                        placeholder="Rechercher : n° de transfert, produit, magasin, motif…"
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                    />
                    {recherche && (
                        <button className="trx-clear" onClick={() => setRecherche('')} aria-label="Effacer la recherche">
                            <X size={14} />
                        </button>
                    )}
                </div>

                {estProprietaire && demandeurs.length > 1 && (
                    <select className="trx-select" value={demandeur} onChange={(e) => setDemandeur(e.target.value)}
                            aria-label="Filtrer par magasin demandeur">
                        <option value="">Tous les magasins</option>
                        {demandeurs.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
                    </select>
                )}

                <label className="trx-date">
                    <span>Du</span>
                    <input type="date" value={du} max={au || undefined} onChange={(e) => setDu(e.target.value)} />
                </label>
                <label className="trx-date">
                    <span>Au</span>
                    <input type="date" value={au} min={du || undefined} onChange={(e) => setAu(e.target.value)} />
                </label>

                {(filtresActifs || statut) && (
                    <button className="trx-link" onClick={reinitialiser}>Réinitialiser</button>
                )}
                <button className="trx-icon-btn" onClick={load} disabled={loading} title="Rafraîchir" aria-label="Rafraîchir">
                    <RefreshCw size={15} className={loading ? 'tr-spin' : ''} />
                </button>
            </div>

            {!estProprietaire && !loading && !vueGlobale && (
                <div className="trx-note">
                    Vous voyez vos propres demandes. Le propriétaire de l'entrepôt les approuve.
                </div>
            )}

            {/* ---- Tableau ---- */}
            {loading ? (
                <div className="trx-state"><Loader className="tr-spin" size={20} /> Chargement des transferts…</div>
            ) : filtres.length === 0 ? (
                <div className="trx-state trx-state--empty">
                    <Inbox size={36} />
                    <strong>{tous.length === 0 ? 'Aucun transfert pour le moment' : 'Aucun résultat'}</strong>
                    <span>
                        {tous.length === 0
                            ? (vueGlobale
                                ? "Cliquez sur « Nouveau transfert » pour faire venir du stock d'un entrepôt vers votre magasin."
                                : "Utilisez l'icône d'envoi d'un produit pour demander un transfert vers votre magasin.")
                            : 'Modifiez la recherche ou les filtres.'}
                    </span>
                    {tous.length > 0 && <button className="trx-btn" onClick={reinitialiser}>Réinitialiser les filtres</button>}
                </div>
            ) : (
                <>
                    <div className="trx-wrap">
                        <table className="trx-table">
                            <thead>
                                <tr>
                                    <th className="trx-idx">N°</th>
                                    <th>N° transfert</th>
                                    <th>
                                        <button className="trx-sort" onClick={() => setRecentDabord((v) => !v)}
                                                title="Inverser le tri par date">
                                            Date {recentDabord ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
                                        </button>
                                    </th>
                                    {vueGlobale && <th>Entrepôt</th>}
                                    <th>Produit</th>
                                    <th className="is-right">Quantité</th>
                                    <th>Magasin demandeur</th>
                                    <th>Statut</th>
                                    <th className="is-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibles.map((t, i) => (
                                    <tr key={t.id_transfert} className={t.statut === 'en_attente' ? 'is-pending' : ''}>
                                        <td className="trx-idx">{i + 1}</td>
                                        <td><span className="trx-num">{t.numero_transfert}</span></td>
                                        <td className="trx-nowrap">{fmtDate(t.date_creation)}</td>
                                        {vueGlobale && (
                                            <td>
                                                <div className="trx-main">{t.entrepot_nom}</div>
                                                <div className="trx-sub">{t.est_proprietaire ? 'Mon entrepôt' : 'Membre'}</div>
                                            </td>
                                        )}
                                        <td>
                                            {t.isLot ? (
                                                <>
                                                    <div className="trx-main">{t.nb_produits} produits <span className="trx-tag">Panier</span></div>
                                                    <div className="trx-sub" title={t.lignes.map((l) => l.produit_nom).join(', ')}>
                                                        {t.lignes.slice(0, 3).map((l) => l.produit_nom).join(', ')}
                                                        {t.lignes.length > 3 && `… +${t.lignes.length - 3}`}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="trx-main">{t.produit_nom}</div>
                                                    <div className="trx-sub">
                                                        {[t.marque_nom, t.modele_nom].filter(Boolean).join(' · ')}
                                                        {t.mode_destination === 'creer' && (
                                                            <span className="trx-tag">Nouveau produit</span>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </td>
                                        <td className="is-right">
                                            {t.isLot ? (
                                                <div className="trx-main">{t.nb_produits} ligne(s)</div>
                                            ) : (
                                                <>
                                                    <div className="trx-main">{libelleQuantite(t)}</div>
                                                    {libelleEquivalent(t) && <div className="trx-sub">{libelleEquivalent(t)}</div>}
                                                </>
                                            )}
                                        </td>
                                        <td>
                                            <div className="trx-main">{t.magasin_nom || t.demandeur_nom}</div>
                                            {t.magasin_nom && t.demandeur_nom && <div className="trx-sub">{t.demandeur_nom}</div>}
                                        </td>
                                        <td>
                                            <StatutBadge statut={t.statut} />
                                            {t.statut === 'refuse' && t.motif_refus && (
                                                <div className="trx-sub" title={t.motif_refus}>{t.motif_refus}</div>
                                            )}
                                            {t.statut === 'en_attente' && proprio(t) && !t.isLot && (
                                                <div className="trx-sub">Stock : {fmtNum(t.stock_entrepot)} {t.unite_nom || ''}</div>
                                            )}
                                        </td>
                                        <td className="is-right">
                                            <div className="trx-actions">
                                                {t.statut === 'valide' && (
                                                    <button className="trx-btn trx-btn--sm" onClick={() => setBon(t)}>
                                                        <FileText size={14} /> Bon
                                                    </button>
                                                )}
                                                {t.statut === 'en_attente' && proprio(t) && (
                                                    <>
                                                        <button className="trx-btn trx-btn--sm trx-btn--ok"
                                                                onClick={() => setAction({ type: 'approuver', t })}>
                                                            <Check size={14} /> Approuver
                                                        </button>
                                                        <button className="trx-btn trx-btn--sm trx-btn--ko"
                                                                onClick={() => setAction({ type: 'refuser', t })}>
                                                            <X size={14} /> Refuser
                                                        </button>
                                                    </>
                                                )}
                                                {t.statut === 'en_attente' && !proprio(t) && (
                                                    <button className="trx-btn trx-btn--sm"
                                                            onClick={() => setAction({ type: 'annuler', t })}>
                                                        <XCircle size={14} /> Annuler
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="trx-pager">
                        <span>
                            {(pageCourante - 1) * PAR_PAGE + 1}–{Math.min(pageCourante * PAR_PAGE, filtres.length)} sur {filtres.length}
                            {filtres.length !== tous.length && ` (${tous.length} au total)`}
                        </span>
                        {nbPages > 1 && (
                            <div className="trx-pager-nav">
                                <button className="trx-icon-btn" onClick={() => setPage(pageCourante - 1)}
                                        disabled={pageCourante <= 1} aria-label="Page précédente">
                                    <ChevronLeft size={16} />
                                </button>
                                <span>Page {pageCourante} / {nbPages}</span>
                                <button className="trx-icon-btn" onClick={() => setPage(pageCourante + 1)}
                                        disabled={pageCourante >= nbPages} aria-label="Page suivante">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {bon && <BonTransfert transfert={bon} onClose={() => setBon(null)} onError={onError} />}

            {action && (
                <TrModal
                    onClose={fermer}
                    title={titres[action.type]}
                    subtitle={action.t.numero_transfert}
                    footer={
                        <>
                            <button className="tr-btn" onClick={fermer} disabled={busy}>
                                {action.type === 'annuler' ? 'Non' : 'Retour'}
                            </button>
                            <button
                                className={`tr-btn ${action.type === 'approuver' ? 'tr-btn--primary' : 'tr-btn--danger'}`}
                                onClick={confirmer}
                                disabled={busy}
                            >
                                {busy && <Loader className="tr-spin" size={14} />}
                                {action.type === 'approuver' ? 'Oui, approuver'
                                    : action.type === 'refuser' ? 'Oui, refuser' : 'Oui, annuler'}
                            </button>
                        </>
                    }
                >
                    {erreurAction && (
                        <div className="tr-alert tr-alert--err" role="alert">
                            <AlertTriangle size={16} />
                            <span>{erreurAction}</span>
                        </div>
                    )}

                    <p style={{ margin: 0 }}>
                        {action.t.isLot ? (
                            <><b>{action.t.nb_produits} produits</b> ({action.t.lignes.map((l) => `${libelleQuantite(l)} de ${l.produit_nom}`).join(', ')})</>
                        ) : (
                            <><b>{libelleQuantite(action.t)}</b> de « {action.t.produit_nom} »</>
                        )}
                        {action.type === 'approuver' && (
                            <> sortiront du stock de l'entrepôt et seront ajoutés au catalogue de <b>{action.t.magasin_nom || action.t.demandeur_nom}</b>.</>
                        )}
                        {action.type !== 'approuver' && <> ne seront pas transférés. Aucun stock ne bouge.</>}
                    </p>

                    {action.type === 'refuser' && (
                        <div className="tr-field" style={{ marginTop: 12 }}>
                            <label className="tr-lbl">Motif du refus (facultatif)</label>
                            <input className="tr-input" type="text" value={motifRefus}
                                   onChange={(e) => setMotifRefus(e.target.value)} maxLength={255} disabled={busy} />
                        </div>
                    )}
                </TrModal>
            )}
        </section>
    );
}