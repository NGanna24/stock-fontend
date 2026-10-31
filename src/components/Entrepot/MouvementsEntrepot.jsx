// components/Entrepot/MouvementsEntrepot.jsx
// Journal des mouvements d'un entrepôt : toutes les entrées et sorties, quantités en unités de vente.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Search, X, RefreshCw, Loader, AlertCircle, ChevronLeft, ChevronRight, ArrowDownCircle, ArrowUpCircle,
    Send, SlidersHorizontal, ClipboardCheck, Box,
} from 'lucide-react';
import MouvementEntrepotService from '../../services/mouvementEntrepotService';

const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('fr-FR');
const fmtDate = (v) => new Date(v).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtJour = (v) => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

const ICONES = { entree: ArrowDownCircle, sortie: ArrowUpCircle, transfert_sortie: Send, perte: ArrowUpCircle, ajustement: SlidersHorizontal, inventaire: ClipboardCheck };

const FILTRES = [
    ['', 'Tous'], ['entrees', 'Entrées'], ['sorties', 'Sorties'], ['transfert_sortie', 'Transferts'], ['ajustement', 'Ajustements'],
];

/** Quantité signée, en gros chiffres, en unités de vente */
export function Variation({ m }) {
    const signe = m.sens === 'entree' ? '+' : m.sens === 'sortie' ? '−' : '';
    return (
        <span className={`ep2-var ep2-var--${m.sens}`}>
            <b>{signe}{m.variation.texte}</b>
        </span>
    );
}

export function TypeTag({ m }) {
    const Ic = ICONES[m.type] || Box;
    return <span className={`ep2-mvt ep2-mvt--${m.sens}`}><Ic size={13} /> {m.type_libelle}</span>;
}

/** Ligne résumée (aperçu) */
export function MouvementLigneCompacte({ m, n }) {
    return (
        <li className="ep2-recent">
            <span className="ep2-num">{n}</span>
            <div className="ep2-recent-main">
                <div><b>{m.produit.nom}</b> <TypeTag m={m} /></div>
                <div className="ep2-psub">{fmtJour(m.date)}{m.notes ? ` · ${m.notes}` : ''}</div>
            </div>
            <Variation m={m} />
        </li>
    );
}

export default function MouvementsEntrepot({ token, entrepotId, typeInitial = '', onError }) {
    const [filtres, setFiltres] = useState({ type: typeInitial, q: '', date_debut: '', date_fin: '' });
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erreur, setErreur] = useState(null);
    const reqId = useRef(0);
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    const charger = useCallback(async () => {
        const courant = ++reqId.current;
        setLoading(true);
        setErreur(null);
        try {
            const res = await MouvementEntrepotService.list(token, entrepotId, { ...filtres, page, limit: 25 });
            if (courant === reqId.current) setData(res);
        } catch (e) {
            if (courant === reqId.current) { setErreur(e.message); onErrorRef.current?.(e.message); }
        } finally {
            if (courant === reqId.current) setLoading(false);
        }
    }, [token, entrepotId, filtres, page]);

    // Recherche : petit délai pendant la frappe
    useEffect(() => {
        const t = setTimeout(charger, filtres.q ? 300 : 0);
        return () => clearTimeout(t);
    }, [charger, filtres.q]);

    const maj = (patch) => { setFiltres((f) => ({ ...f, ...patch })); setPage(1); };
    const mouvements = data?.mouvements || [];
    const pag = data?.pagination;
    const tot = data?.totaux;
    const decalage = pag ? (pag.page - 1) * pag.limit : 0;
    const filtresActifs = filtres.type || filtres.q || filtres.date_debut || filtres.date_fin;

    return (
        <div className="ep2-mouvements">
            {tot && (
                <div className="ep2-totaux">
                    <div className="ep2-total ep2-total--in">
                        <ArrowDownCircle size={18} />
                        <div><b>{tot.nb_entrees}</b> entrée(s)<small>{fmt(tot.valeur_entrees)} FCFA</small></div>
                    </div>
                    <div className="ep2-total ep2-total--out">
                        <ArrowUpCircle size={18} />
                        <div><b>{tot.nb_sorties}</b> sortie(s)<small>{fmt(tot.valeur_sorties)} FCFA</small></div>
                    </div>
                </div>
            )}

            <div className="ep2-toolbar">
                <div className="ep2-search">
                    <Search size={16} />
                    <input type="text" placeholder="Rechercher un produit, une référence, un motif…" value={filtres.q}
                           onChange={(e) => maj({ q: e.target.value })} />
                    {filtres.q && <button onClick={() => maj({ q: '' })} aria-label="Effacer la recherche"><X size={14} /></button>}
                </div>
                <div className="ep2-seg" role="group" aria-label="Type de mouvement">
                    {FILTRES.map(([cle, lib]) => (
                        <button key={cle || 'tous'} className={filtres.type === cle ? 'is-on' : ''} onClick={() => maj({ type: cle })}>{lib}</button>
                    ))}
                </div>
                <label className="ep2-date">Du <input type="date" value={filtres.date_debut} max={filtres.date_fin || undefined}
                                                       onChange={(e) => maj({ date_debut: e.target.value })} /></label>
                <label className="ep2-date">au <input type="date" value={filtres.date_fin} min={filtres.date_debut || undefined}
                                                       onChange={(e) => maj({ date_fin: e.target.value })} /></label>
                <button className="ep2-icon-btn" onClick={charger} disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
                    <RefreshCw size={16} className={loading ? 'ep-spin' : ''} />
                </button>
            </div>

            {erreur && !data ? (
                <div className="ep2-state">
                    <AlertCircle size={36} /><strong>Chargement impossible</strong><span>{erreur}</span>
                    <button className="ep2-btn" onClick={charger}><RefreshCw size={15} /> Réessayer</button>
                </div>
            ) : loading && !data ? (
                <div className="ep2-state"><Loader className="ep-spin" size={24} /> Chargement des mouvements…</div>
            ) : mouvements.length === 0 ? (
                <div className="ep2-state">
                    <Box size={40} />
                    <strong>{filtresActifs ? 'Aucun mouvement trouvé' : 'Aucun mouvement pour le moment'}</strong>
                    <span>{filtresActifs
                        ? 'Modifiez votre recherche, le type ou les dates.'
                        : 'Les réceptions, transferts, retours et corrections de stock apparaîtront ici.'}</span>
                    {filtresActifs && (
                        <button className="ep2-btn" onClick={() => { setFiltres({ type: '', q: '', date_debut: '', date_fin: '' }); setPage(1); }}>
                            Réinitialiser les filtres
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className={`ep2-wrap ${loading ? 'is-loading' : ''}`}>
                        <table className="ep2-table ep2-table--mvt">
                            <thead>
                                <tr>
                                    <th className="ep2-num">N°</th>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Produit</th>
                                    <th>Quantité</th>
                                    <th>Stock après</th>
                                    <th>Détail</th>
                                    <th>Par</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mouvements.map((m, i) => (
                                    <tr key={m.id}>
                                        <td className="ep2-num">{decalage + i + 1}</td>
                                        <td className="ep2-nowrap">{fmtDate(m.date)}</td>
                                        <td><TypeTag m={m} /></td>
                                        <td>
                                            <div className="ep2-pname">{m.produit.nom}</div>
                                            <div className="ep2-psub">{[m.produit.marque, m.produit.modele].filter(Boolean).join(' · ') || '—'}</div>
                                        </td>
                                        <td>
                                            <Variation m={m} />
                                            {m.saisie && <div className="ep2-psub">saisi : {m.saisie}</div>}
                                        </td>
                                        <td>
                                            <b>{m.apres.texte}</b>
                                            <div className="ep2-psub">avant : {m.avant.texte}</div>
                                        </td>
                                        <td className="ep2-detail">
                                            {m.notes || '—'}
                                            {m.lot && <div className="ep2-psub">Lot {m.lot}</div>}
                                        </td>
                                        <td className="ep2-psub ep2-nowrap">{m.auteur || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="ep2-pager">
                        <span>{decalage + 1}–{Math.min(decalage + pag.limit, pag.total)} sur {pag.total}</span>
                        {pag.pages > 1 && (
                            <div className="ep2-pager-nav">
                                <button className="ep2-icon-btn" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Page précédente"><ChevronLeft size={16} /></button>
                                <span>Page {pag.page} / {pag.pages}</span>
                                <button className="ep2-icon-btn" onClick={() => setPage(page + 1)} disabled={page >= pag.pages} aria-label="Page suivante"><ChevronRight size={16} /></button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}