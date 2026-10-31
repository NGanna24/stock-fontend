// components/Entrepot/ApercuEntrepot.jsx
// Aperçu de l'entrepôt : valeur du stock, entrées / sorties, alertes, activité, équipe.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Loader, AlertCircle, RefreshCw, ArrowDownCircle, ArrowUpCircle, Banknote, AlertTriangle,
    XCircle, Send, ShoppingCart, Users, Crown, Layers, TrendingUp, ChevronRight,
} from 'lucide-react';
import MouvementEntrepotService from '../../services/mouvementEntrepotService';
import { MouvementLigneCompacte } from './MouvementsEntrepot';

const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('fr-FR');

/** Histogramme 14 jours : entrées au-dessus de l'axe, sorties en dessous (en valeur d'achat) */
function Activite({ serie }) {
    const max = Math.max(1, ...serie.map((j) => Math.max(j.entrees, j.sorties)));
    const W = 560, H = 150, mid = H / 2, bw = W / serie.length;
    const vide = serie.every((j) => j.entrees === 0 && j.sorties === 0);
    return (
        <div className="ep2-activite">
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Entrées et sorties des 14 derniers jours" preserveAspectRatio="none">
                <line x1="0" x2={W} y1={mid} y2={mid} className="ep2-axe" />
                {serie.map((j, i) => {
                    const he = (j.entrees / max) * (mid - 8);
                    const hs = (j.sorties / max) * (mid - 8);
                    const x = i * bw + bw * 0.18, w = bw * 0.64;
                    const d = new Date(j.jour);
                    const lib = `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} — entrées ${fmt(j.entrees)} · sorties ${fmt(j.sorties)} FCFA`;
                    return (
                        <g key={j.jour}>
                            <title>{lib}</title>
                            <rect x={x} y={mid - he} width={w} height={Math.max(he, j.entrees ? 2 : 0)} rx="2" className="ep2-barre-in" />
                            <rect x={x} y={mid} width={w} height={Math.max(hs, j.sorties ? 2 : 0)} rx="2" className="ep2-barre-out" />
                        </g>
                    );
                })}
            </svg>
            <div className="ep2-activite-legende">
                <span><i className="in" /> Entrées</span>
                <span><i className="out" /> Sorties</span>
                <span className="ep2-muted">14 derniers jours, en valeur d'achat</span>
            </div>
            {vide && <div className="ep2-activite-vide">Aucun mouvement sur cette période.</div>}
        </div>
    );
}

export default function ApercuEntrepot({ token, entrepotId, onGo, onError }) {
    const [data, setData] = useState(null);
    const [jours, setJours] = useState(30);
    const [loading, setLoading] = useState(true);
    const [erreur, setErreur] = useState(null);
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    const charger = useCallback(async () => {
        setLoading(true);
        setErreur(null);
        try {
            const res = await MouvementEntrepotService.synthese(token, entrepotId, jours);
            setData(res.data);
        } catch (e) {
            setErreur(e.message);
            onErrorRef.current?.(e.message);
        } finally {
            setLoading(false);
        }
    }, [token, entrepotId, jours]);

    useEffect(() => { charger(); }, [charger]);

    if (loading && !data) return <div className="ep2-state"><Loader className="ep-spin" size={24} /> Chargement de l'aperçu…</div>;
    if (erreur && !data) {
        return (
            <div className="ep2-state">
                <AlertCircle size={36} /><strong>Chargement impossible</strong><span>{erreur}</span>
                <button className="ep2-btn" onClick={charger}><RefreshCw size={15} /> Réessayer</button>
            </div>
        );
    }
    if (!data) return null;

    const { stock, periode, serie, top_sorties, membres, derniers_mouvements, entrepot } = data;
    const solde = periode.valeur_entrees - periode.valeur_sorties;
    const alertes = [
        { cle: 'rup', n: stock.nb_ruptures, lib: 'en rupture', icone: XCircle, ton: 'out', go: () => onGo('produits', 'out') },
        { cle: 'bas', n: stock.nb_stock_bas, lib: 'en stock bas', icone: AlertTriangle, ton: 'low', go: () => onGo('produits', 'low') },
        { cle: 'tr', n: data.transferts_en_attente, lib: 'transfert(s) à traiter', icone: Send, ton: 'low', go: () => onGo('transferts') },
        { cle: 'cmd', n: data.commandes_en_cours.nb, lib: 'commande(s) en cours', icone: ShoppingCart, ton: 'info', go: null, sous: data.commandes_en_cours.montant > 0 ? `${fmt(data.commandes_en_cours.montant)} FCFA` : null },
        { cle: 'nr', n: stock.nb_non_ranges, lib: 'produit(s) non rangé(s)', icone: Layers, ton: 'info', go: () => onGo('plan') },
    ];

    return (
        <div className={`ep2-apercu ${loading ? 'is-loading' : ''}`}>
            <div className="ep2-apercu-bar">
                <div className="ep2-seg" role="group" aria-label="Période">
                    {[[7, '7 jours'], [30, '30 jours'], [90, '90 jours']].map(([j, l]) => (
                        <button key={j} className={jours === j ? 'is-on' : ''} onClick={() => setJours(j)}>{l}</button>
                    ))}
                </div>
                <button className="ep2-icon-btn" onClick={charger} disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
                    <RefreshCw size={16} className={loading ? 'ep-spin' : ''} />
                </button>
            </div>

            <div className="ep2-cards">
                <section className="ep2-card">
                    <h3><Banknote size={16} /> Valeur du stock</h3>
                    <div className="ep2-big">{fmt(stock.valeur_achat)} <small>FCFA</small></div>
                    <div className="ep2-card-sub">au prix d'achat · {stock.nb_produits} référence(s)</div>
                    <dl className="ep2-kv">
                        <div><dt>Valeur de vente</dt><dd>{fmt(stock.valeur_vente)} FCFA</dd></div>
                        <div><dt>Marge potentielle</dt><dd>{fmt(stock.marge_potentielle)} FCFA</dd></div>
                    </dl>
                </section>

                <section className="ep2-card ep2-card--in">
                    <h3><ArrowDownCircle size={16} /> Entrées · {jours} jours</h3>
                    <div className="ep2-big">{periode.nb_entrees} <small>opération(s)</small></div>
                    <div className="ep2-card-sub">{fmt(periode.valeur_entrees)} FCFA reçus</div>
                    <button className="ep2-linkbtn" onClick={() => onGo('mouvements', 'entrees')}>Voir les entrées <ChevronRight size={14} /></button>
                </section>

                <section className="ep2-card ep2-card--out">
                    <h3><ArrowUpCircle size={16} /> Sorties · {jours} jours</h3>
                    <div className="ep2-big">{periode.nb_sorties} <small>opération(s)</small></div>
                    <div className="ep2-card-sub">{fmt(periode.valeur_sorties)} FCFA sortis</div>
                    <button className="ep2-linkbtn" onClick={() => onGo('mouvements', 'sorties')}>Voir les sorties <ChevronRight size={14} /></button>
                </section>

                <section className="ep2-card">
                    <h3><TrendingUp size={16} /> Solde · {jours} jours</h3>
                    <div className={`ep2-big ${solde < 0 ? 'neg' : 'pos'}`}>{solde > 0 ? '+' : ''}{fmt(solde)} <small>FCFA</small></div>
                    <div className="ep2-card-sub">entrées moins sorties, en valeur d'achat</div>
                </section>
            </div>

            <section className="ep2-panel">
                <h3>À surveiller</h3>
                <ul className="ep2-alertes">
                    {alertes.map((a) => {
                        const Ic = a.icone;
                        const corps = (
                            <>
                                <Ic size={18} />
                                <b>{a.n}</b>
                                <span>{a.lib}{a.sous ? ` · ${a.sous}` : ''}</span>
                                {a.go && <ChevronRight size={16} className="ep2-alerte-go" />}
                            </>
                        );
                        return (
                            <li key={a.cle}>
                                {a.go && a.n > 0
                                    ? <button className={`ep2-alerte ep2-alerte--${a.ton}`} onClick={a.go}>{corps}</button>
                                    : <div className={`ep2-alerte ${a.n > 0 ? `ep2-alerte--${a.ton}` : 'is-calme'}`}>{corps}</div>}
                            </li>
                        );
                    })}
                </ul>
            </section>

            <div className="ep2-duo">
                <section className="ep2-panel">
                    <h3>Activité des 14 derniers jours</h3>
                    <Activite serie={serie} />
                </section>

                <section className="ep2-panel">
                    <h3>Produits les plus sortis · {jours} jours</h3>
                    {top_sorties.length === 0 ? (
                        <p className="ep2-muted">Aucune sortie sur cette période.</p>
                    ) : (
                        <table className="ep2-mini">
                            <thead><tr><th className="ep2-num">N°</th><th>Produit</th><th className="r">Quantité sortie</th></tr></thead>
                            <tbody>
                                {top_sorties.map((t, i) => (
                                    <tr key={t.id}>
                                        <td className="ep2-num">{i + 1}</td>
                                        <td><b>{t.nom}</b>{t.marque && <div className="ep2-psub">{t.marque}</div>}</td>
                                        <td className="r"><b>{t.quantite.texte}</b></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </div>

            <div className="ep2-duo">
                <section className="ep2-panel">
                    <div className="ep2-panel-head">
                        <h3>Derniers mouvements</h3>
                        <button className="ep2-linkbtn" onClick={() => onGo('mouvements')}>Tout voir <ChevronRight size={14} /></button>
                    </div>
                    {derniers_mouvements.length === 0 ? (
                        <p className="ep2-muted">Aucun mouvement pour le moment. Les réceptions, transferts et retours apparaîtront ici.</p>
                    ) : (
                        <ol className="ep2-recents">
                            {derniers_mouvements.map((m, i) => <MouvementLigneCompacte key={m.id} m={m} n={i + 1} />)}
                        </ol>
                    )}
                </section>

                <section className="ep2-panel">
                    <h3><Users size={16} /> Équipe et informations</h3>
                    <dl className="ep2-kv ep2-kv--bloc">
                        <div><dt>Propriétaire</dt><dd>{entrepot.proprietaire || '—'}</dd></div>
                        <div><dt>Ville</dt><dd>{entrepot.ville || '—'}</dd></div>
                        <div><dt>Créé le</dt><dd>{entrepot.cree_le ? new Date(entrepot.cree_le).toLocaleDateString('fr-FR') : '—'}</dd></div>
                        <div><dt>Emplacements</dt><dd>{stock.nb_emplacements}</dd></div>
                    </dl>
                    <ol className="ep2-membres">
                        {membres.map((m, i) => (
                            <li key={m.id_utilisateur}>
                                <span className="ep2-num">{i + 1}</span>
                                <span>{m.fullname}</span>
                                {m.role_membre === 'proprietaire'
                                    ? <span className="ep2-role ep2-role--owner"><Crown size={12} /> Propriétaire</span>
                                    : <span className="ep2-role">Membre</span>}
                            </li>
                        ))}
                    </ol>
                </section>
            </div>
        </div>
    );
}