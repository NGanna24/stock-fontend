// components/Entrepot/InventaireEntrepot.jsx
// Inventaire de l'entrepôt : liste des inventaires -> comptage (unités de vente) -> validation.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Loader, AlertCircle, RefreshCw, ClipboardCheck, Plus, ArrowLeft, Search, X, Check, CheckCheck,
    Undo2, Ban, ChevronRight, MapPin, AlertTriangle,
} from 'lucide-react';
import InventaireEntrepotService from '../../services/inventaireEntrepotService';

const STATUTS = {
    en_cours: ['En cours', 'ep2-inv-st--cours'],
    planifie: ['Planifié', 'ep2-inv-st--cours'],
    termine: ['Terminé', 'ep2-inv-st--ok'],
    annule: ['Annulé', 'ep2-inv-st--off'],
};
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('fr-FR');
const dateCourte = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const StatutTag = ({ statut }) => {
    const [lib, cls] = STATUTS[statut] || [statut, ''];
    return <span className={`ep2-inv-st ${cls}`}>{lib}</span>;
};

/** Toutes les unités utilisables pour compter : unités de vente (peu importe leur taille) + unité de base, de la plus grande à la plus petite */
function champsDe(ligne) {
    const vues = new Set();
    const liste = [];
    [...(ligne.unites || []).map((u) => ({ nom: u.nom, qb: u.quantite_base })), { nom: ligne.unite_base, qb: 1 }].forEach((u) => {
        const cle = String(u.nom).trim().toLowerCase();
        if (!vues.has(cle) && u.qb > 0) { vues.add(cle); liste.push(u); }
    });
    return liste.sort((x, y) => y.qb - x.qb);
}

/** 12 litres avec un carton de 12 => "1 Carton" (champs triés de la plus grande unité à la plus petite) */
function texteUnites(champs, quantiteBase) {
    let reste = Math.round(Math.abs(quantiteBase) * 100) / 100;
    const parts = [];
    champs.forEach((c, i) => {
        const dernier = i === champs.length - 1;
        const n = dernier ? Math.round((reste / c.qb) * 100) / 100 : Math.floor(reste / c.qb + 1e-9);
        if (n > 0) { parts.push(`${n.toLocaleString('fr-FR')} ${c.nom}`); reste = Math.round((reste - n * c.qb) * 100) / 100; }
    });
    return parts.join(' + ') || '0';
}

function LigneComptage({ n, ligne, editable, busy, onCompter, onConforme, onAnnuler }) {
    const champs = useMemo(() => champsDe(ligne), [ligne]);
    // lignes de saisie libres : [{ nom: 'Carton', val: '2' }, { nom: 'Bidon', val: '2' }]
    const [saisie, setSaisie] = useState(null);
    const unitePar = champs.find((c) => c.qb > 1) || champs[0];
    const lignesSaisie = saisie || [{ nom: unitePar.nom, val: '' }];
    const touche = lignesSaisie.some((x) => x.val !== '');

    const qbDe = (nom) => (champs.find((c) => c.nom === nom) || { qb: 1 }).qb;
    const total = lignesSaisie.reduce((sum, x) => sum + (parseFloat(x.val) || 0) * qbDe(x.nom), 0);
    const ecartSaisie = Math.round((total - ligne.theorique) * 100) / 100;

    const maj = (i, patch) => setSaisie(lignesSaisie.map((x, k) => (k === i ? { ...x, ...patch } : x)));
    const ajouterUnite = () => {
        const prises = new Set(lignesSaisie.map((x) => x.nom));
        const libre = champs.find((c) => !prises.has(c.nom));
        if (libre) setSaisie([...lignesSaisie, { nom: libre.nom, val: '' }]);
    };
    const retirer = (i) => setSaisie(lignesSaisie.length === 1 ? null : lignesSaisie.filter((_, k) => k !== i));

    const enregistrer = () => {
        if (!touche || busy) return;
        onCompter(ligne, Math.round(total * 100) / 100);
        setSaisie(null);
    };

    const classeEcart = ligne.ecart > 0 ? 'ep2-var--entree' : ligne.ecart < 0 ? 'ep2-var--sortie' : '';

    return (
        <tr className={ligne.compte ? 'is-counted' : ''}>
            <td className="ep2-idx">{n}</td>
            <td>
                <div className="ep2-pname">{ligne.produit}</div>
                <div className="ep2-psub">
                    {[ligne.marque, ligne.modele].filter(Boolean).join(' · ')}
                    {ligne.emplacement && <span className="ep2-inv-loc"><MapPin size={11} /> {ligne.emplacement}</span>}
                </div>
            </td>
            <td className="ep2-inv-attendu">
                <b>{ligne.theorique_texte}</b>
            </td>
            <td>
                {editable ? (
                    <div className="ep2-inv-saisie">
                        <div className="ep2-inv-ctrls">
                        {lignesSaisie.map((x, i) => (
                            <div key={i} className="ep2-inv-champ">
                                <input type="number" inputMode="decimal" min="0" step="any"
                                       value={x.val} placeholder="0"
                                       aria-label={`${ligne.produit} — quantité en ${x.nom}`}
                                       onChange={(e) => maj(i, { val: e.target.value })}
                                       onKeyDown={(e) => { if (e.key === 'Enter') enregistrer(); }} />
                                <select value={x.nom} aria-label="Unité de comptage" onChange={(e) => maj(i, { nom: e.target.value })}>
                                    {champs.map((c) => (
                                        <option key={c.nom} value={c.nom}
                                                disabled={c.nom !== x.nom && lignesSaisie.some((y) => y.nom === c.nom)}>
                                            {c.nom}{c.qb !== 1 ? ` (${c.qb.toLocaleString('fr-FR')} ${ligne.unite_base})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {lignesSaisie.length > 1 && (
                                    <button type="button" className="ep2-inv-x" onClick={() => retirer(i)} aria-label="Retirer cette unité"><X size={13} /></button>
                                )}
                            </div>
                        ))}
                        {champs.length > 1 && lignesSaisie.length < champs.length && (
                            <button type="button" className="ep2-inv-plus" onClick={ajouterUnite} title="Compter aussi dans une autre unité (ex : 2 cartons + 2 bidons)">
                                <Plus size={13} /> unité
                            </button>
                        )}
                        </div>
                        {touche && (
                            <div className="ep2-inv-live-box">
                                <span>Total compté : <b>{texteUnites(champs, total)}</b></span>
                                <span className={`ep2-inv-badge ${ecartSaisie === 0 ? 'is-ok' : ecartSaisie > 0 ? 'is-plus' : 'is-moins'}`}>
                                    {ecartSaisie === 0 ? 'Conforme' : `Écart ${ecartSaisie > 0 ? '+' : '−'}${texteUnites(champs, ecartSaisie)}`}
                                </span>
                            </div>
                        )}
                    </div>
                ) : ligne.compte ? (
                    <b>{ligne.reelle_texte}</b>
                ) : (
                    <span className="ep2-muted">Non compté</span>
                )}
                {editable && ligne.compte && !touche && (
                    <div className="ep2-inv-fait"><Check size={12} /> Compté : <b>{ligne.reelle_texte}</b></div>
                )}
            </td>
            <td className="r">
                {ligne.compte
                    ? (ligne.ecart === 0
                        ? <span className="ep2-inv-ok"><Check size={13} /> Conforme</span>
                        : <span className={`ep2-var ${classeEcart}`}><b>{ligne.ecart > 0 ? '+' : '−'}{ligne.ecart_texte}</b></span>)
                    : <span className="ep2-muted">—</span>}
                {ligne.compte && ligne.stock_a_change && (
                    <div className="ep2-inv-warn" title="Le stock a bougé depuis le début de l'inventaire (vente, transfert…). Le comptage fera foi à la validation.">
                        <AlertTriangle size={11} /> stock modifié depuis
                    </div>
                )}
            </td>
            {editable && (
                <td className="r">
                    <div className="ep2-inv-actions">
                        {touche ? (
                            <button className="ep2-btn ep2-btn--primary ep2-btn--sm" onClick={enregistrer} disabled={busy}>
                                <Check size={14} /> Enregistrer
                            </button>
                        ) : (
                            <>
                                {!ligne.compte && (
                                    <button className="ep2-btn ep2-btn--sm" onClick={() => onConforme(ligne)} disabled={busy}
                                            title="La quantité comptée correspond à l'attendu">
                                        <Check size={14} /> Conforme
                                    </button>
                                )}
                                {ligne.compte && (
                                    <button className="ep2-icon-btn ep2-icon-btn--sm" onClick={() => onAnnuler(ligne)} disabled={busy}
                                            aria-label="Remettre à compter" title="Remettre à compter">
                                        <Undo2 size={14} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </td>
            )}
        </tr>
    );
}

function Detail({ token, entrepotId, id, onBack, onError, onChanged }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erreur, setErreur] = useState('');
    const [filtre, setFiltre] = useState('tous'); // tous | restants | ecarts
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null); // 'valider' | 'annuler'
    const onErrorRef = useRef(onError);
    useEffect(() => { onErrorRef.current = onError; });

    const charger = useCallback(async (silencieux = false) => {
        if (!silencieux) setLoading(true);
        setErreur('');
        try {
            const r = await InventaireEntrepotService.get(token, entrepotId, id);
            setData(r);
        } catch (e) {
            setErreur(e.message);
            onErrorRef.current?.(e.message);
        } finally {
            setLoading(false);
        }
    }, [token, entrepotId, id]);

    useEffect(() => { charger(); }, [charger]);

    const agir = async (fn, apres) => {
        setBusy(true);
        try {
            const r = await fn();
            await charger(true);
            apres?.(r);
        } catch (e) {
            onErrorRef.current?.(e.message);
        } finally {
            setBusy(false);
        }
    };

    if (loading && !data) return <div className="ep2-state"><Loader className="ep-spin" size={24} /> Chargement de l'inventaire…</div>;
    if (erreur && !data) {
        return (
            <div className="ep2-state">
                <AlertCircle size={36} /><strong>Chargement impossible</strong><span>{erreur}</span>
                <button className="ep2-btn" onClick={() => charger()}><RefreshCw size={15} /> Réessayer</button>
            </div>
        );
    }
    if (!data) return null;

    const { inventaire: inv, lignes, totaux } = data;
    const ouvert = inv.statut === 'en_cours';
    const editable = ouvert && data.est_proprietaire;
    const pct = totaux.total ? Math.round((totaux.comptes / totaux.total) * 100) : 0;

    const terme = q.trim().toLowerCase();
    const visibles = lignes.filter((l) => {
        if (filtre === 'restants' && l.compte) return false;
        if (filtre === 'ecarts' && !(l.compte && l.ecart !== 0)) return false;
        if (terme && !`${l.produit} ${l.marque || ''} ${l.modele || ''} ${l.emplacement || ''}`.toLowerCase().includes(terme)) return false;
        return true;
    });

    const FILTRES = [['tous', `Tous (${totaux.total})`], ['restants', `À compter (${totaux.restants})`], ['ecarts', `Écarts (${totaux.ecarts})`]];

    return (
        <div className="ep2-inv">
            <div className="ep2-inv-bar">
                <button className="ep2-btn ep2-btn--sm" onClick={onBack}><ArrowLeft size={14} /> Inventaires</button>
                <div className="ep2-inv-titre">
                    <h2>{inv.libelle}</h2>
                    <span>{inv.reference} · {dateCourte(inv.date_debut)} <StatutTag statut={inv.statut} /></span>
                </div>
                {editable && (
                    <div className="ep2-inv-bar-actions">
                        <button className="ep2-btn" disabled={busy || totaux.restants === 0}
                                onClick={() => agir(() => InventaireEntrepotService.toutConforme(token, entrepotId, id))}
                                title="Marque comme conformes tous les produits pas encore comptés">
                            <CheckCheck size={15} /> Tout le reste est conforme
                        </button>
                        <button className="ep2-btn ep2-btn--primary" disabled={busy || totaux.comptes === 0} onClick={() => setConfirm('valider')}>
                            <ClipboardCheck size={15} /> Terminer l'inventaire
                        </button>
                        <button className="ep2-btn" disabled={busy} onClick={() => setConfirm('annuler')}><Ban size={15} /> Annuler</button>
                    </div>
                )}
            </div>

            <div className="ep2-inv-resume">
                <div className="ep2-inv-prog">
                    <div className="ep2-inv-prog-top"><b>{totaux.comptes}</b> / {totaux.total} produits comptés <span>{pct} %</span></div>
                    <div className="ep2-inv-track"><i style={{ width: `${pct}%` }} /></div>
                </div>
                <div className="ep2-inv-chiffre"><span>Écarts</span><b>{totaux.ecarts}</b></div>
                <div className="ep2-inv-chiffre ep2-inv-chiffre--sor"><span>Manquant</span><b>{fmt(totaux.valeur_manque)} <small>FCFA</small></b></div>
                <div className="ep2-inv-chiffre ep2-inv-chiffre--ent"><span>En trop</span><b>{fmt(totaux.valeur_surplus)} <small>FCFA</small></b></div>
            </div>

            {confirm && (
                <div className={`ep2-inv-confirm ${confirm === 'annuler' ? 'is-danger' : ''}`} role="alertdialog">
                    {confirm === 'valider' ? (
                        <>
                            <div>
                                <strong>Terminer l'inventaire ?</strong>
                                <p>
                                    {totaux.ecarts > 0
                                        ? `Le stock de ${totaux.ecarts} produit(s) sera corrigé selon votre comptage et chaque correction apparaîtra dans les mouvements.`
                                        : 'Aucun écart : le stock reste inchangé.'}
                                    {totaux.restants > 0 && ` ${totaux.restants} produit(s) non comptés ne seront pas modifiés.`}
                                </p>
                            </div>
                            <div className="ep2-inv-confirm-btns">
                                <button className="ep2-btn" onClick={() => setConfirm(null)} disabled={busy}>Continuer le comptage</button>
                                <button className="ep2-btn ep2-btn--primary" disabled={busy}
                                        onClick={() => agir(() => InventaireEntrepotService.valider(token, entrepotId, id),
                                            (r) => { setConfirm(null); onChanged?.(r.message, true); })}>
                                    {busy ? <Loader size={14} className="ep-spin" /> : <ClipboardCheck size={14} />} Terminer et corriger le stock
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <strong>Annuler cet inventaire ?</strong>
                                <p>Le comptage déjà saisi sera conservé dans l'historique mais le stock ne sera pas modifié.</p>
                            </div>
                            <div className="ep2-inv-confirm-btns">
                                <button className="ep2-btn" onClick={() => setConfirm(null)} disabled={busy}>Non, continuer</button>
                                <button className="ep2-btn ep2-btn--dark" disabled={busy}
                                        onClick={() => agir(() => InventaireEntrepotService.annuler(token, entrepotId, id),
                                            (r) => { setConfirm(null); onChanged?.(r.message, false); })}>
                                    Annuler l'inventaire
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            <div className="ep2-toolbar">
                <div className="ep2-search">
                    <Search size={16} />
                    <input type="text" placeholder="Rechercher un produit ou un emplacement…" value={q} onChange={(e) => setQ(e.target.value)} />
                    {q && <button onClick={() => setQ('')} aria-label="Effacer la recherche"><X size={14} /></button>}
                </div>
                <div className="ep2-seg" role="group" aria-label="Filtrer les lignes">
                    {FILTRES.map(([cle, lib]) => (
                        <button key={cle} className={filtre === cle ? 'is-on' : ''} onClick={() => setFiltre(cle)}>{lib}</button>
                    ))}
                </div>
            </div>

            {visibles.length === 0 ? (
                <div className="ep2-state">
                    <ClipboardCheck size={40} />
                    <strong>{filtre === 'restants' ? 'Tout est compté' : filtre === 'ecarts' ? 'Aucun écart' : 'Aucun produit trouvé'}</strong>
                    <span>{filtre === 'restants' ? "Vous pouvez terminer l'inventaire." : 'Modifiez la recherche ou le filtre.'}</span>
                </div>
            ) : (
                <div className="ep2-wrap">
                    <table className="ep2-table ep2-table--inv">
                        <thead>
                            <tr>
                                <th className="ep2-idx">N°</th>
                                <th>Produit</th>
                                <th>Attendu</th>
                                <th>{editable ? 'Compté' : 'Compté'}</th>
                                <th className="r">Écart</th>
                                {editable && <th className="r">Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((l, i) => (
                                <LigneComptage
                                    key={l.id} n={i + 1} ligne={l} editable={editable} busy={busy}
                                    onCompter={(ligne, qte) => agir(() => InventaireEntrepotService.compter(token, entrepotId, id, ligne.id, { quantite_base: qte }))}
                                    onConforme={(ligne) => agir(() => InventaireEntrepotService.compter(token, entrepotId, id, ligne.id, { conforme: true }))}
                                    onAnnuler={(ligne) => agir(() => InventaireEntrepotService.annulerComptage(token, entrepotId, id, ligne.id))}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function InventaireEntrepot({ token, entrepotId, onError, onChanged }) {
    const [liste, setListe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erreur, setErreur] = useState('');
    const [ouvertId, setOuvertId] = useState(null);
    const [zone, setZone] = useState('');
    const [creation, setCreation] = useState(false);
    const onErrorRef = useRef(onError);
    useEffect(() => { onErrorRef.current = onError; });

    const charger = useCallback(async () => {
        setLoading(true);
        setErreur('');
        try {
            setListe(await InventaireEntrepotService.list(token, entrepotId));
        } catch (e) {
            setErreur(e.message);
            onErrorRef.current?.(e.message);
        } finally {
            setLoading(false);
        }
    }, [token, entrepotId]);

    useEffect(() => { charger(); }, [charger]);

    const demarrer = async () => {
        setCreation(true);
        try {
            const r = await InventaireEntrepotService.creer(token, entrepotId, zone ? { zone } : {});
            await charger();
            setOuvertId(r.id);
        } catch (e) {
            onErrorRef.current?.(e.message);
        } finally {
            setCreation(false);
        }
    };

    if (ouvertId) {
        return (
            <Detail
                token={token} entrepotId={entrepotId} id={ouvertId}
                onBack={() => { setOuvertId(null); charger(); }}
                onError={onError}
                onChanged={(msg, stockModifie) => { onChanged?.(msg, stockModifie); setOuvertId(null); charger(); }}
            />
        );
    }

    if (loading && !liste) return <div className="ep2-state"><Loader className="ep-spin" size={24} /> Chargement des inventaires…</div>;
    if (erreur && !liste) {
        return (
            <div className="ep2-state">
                <AlertCircle size={36} /><strong>Chargement impossible</strong><span>{erreur}</span>
                <button className="ep2-btn" onClick={charger}><RefreshCw size={15} /> Réessayer</button>
            </div>
        );
    }

    const { inventaires = [], zones = [], est_proprietaire } = liste || {};
    const enCours = inventaires.find((i) => i.statut === 'en_cours' || i.statut === 'planifie');

    return (
        <div className="ep2-inv">
            {est_proprietaire && (
                enCours ? (
                    <div className="ep2-inv-demarrer is-actif">
                        <div>
                            <strong>Un inventaire est en cours</strong>
                            <p>{enCours.libelle} — {enCours.comptes}/{enCours.total} produits comptés.</p>
                        </div>
                        <button className="ep2-btn ep2-btn--primary" onClick={() => setOuvertId(enCours.id)}>
                            Reprendre le comptage <ChevronRight size={15} />
                        </button>
                    </div>
                ) : (
                    <div className="ep2-inv-demarrer">
                        <div>
                            <strong>Faire un inventaire</strong>
                            <p>Le stock actuel est figé comme point de départ. Vous comptez, puis le stock est corrigé et chaque écart est enregistré.</p>
                        </div>
                        <div className="ep2-inv-demarrer-form">
                            {zones.length > 0 && (
                                <label className="ep2-inv-zone">
                                    <span>Portée</span>
                                    <select value={zone} onChange={(e) => setZone(e.target.value)}>
                                        <option value="">Tout l'entrepôt</option>
                                        {zones.map((z) => <option key={z.zone} value={z.zone}>{z.zone} ({z.produits})</option>)}
                                    </select>
                                </label>
                            )}
                            <button className="ep2-btn ep2-btn--primary" onClick={demarrer} disabled={creation}>
                                {creation ? <Loader size={15} className="ep-spin" /> : <Plus size={15} />} Démarrer l'inventaire
                            </button>
                        </div>
                    </div>
                )
            )}

            {inventaires.length === 0 ? (
                <div className="ep2-state">
                    <ClipboardCheck size={40} />
                    <strong>Aucun inventaire pour le moment</strong>
                    <span>{est_proprietaire
                        ? 'Démarrez un inventaire pour vérifier que le stock affiché correspond à ce qui est réellement rangé.'
                        : "Seul le propriétaire de l'entrepôt peut lancer un inventaire."}</span>
                </div>
            ) : (
                <div className="ep2-wrap">
                    <table className="ep2-table ep2-table--invliste">
                        <thead>
                            <tr>
                                <th className="ep2-idx">N°</th>
                                <th>Inventaire</th>
                                <th>Date</th>
                                <th>Avancement</th>
                                <th>Écarts</th>
                                <th>Statut</th>
                                <th className="r" />
                            </tr>
                        </thead>
                        <tbody>
                            {inventaires.map((i, k) => (
                                <tr key={i.id} className="ep2-inv-row" onClick={() => setOuvertId(i.id)}>
                                    <td className="ep2-idx">{k + 1}</td>
                                    <td>
                                        <div className="ep2-pname">{i.libelle}</div>
                                        <div className="ep2-psub">{i.reference}{i.auteur ? ` · ${i.auteur}` : ''}</div>
                                    </td>
                                    <td>{dateCourte(i.date_validation || i.date_debut)}</td>
                                    <td>{i.comptes} / {i.total}</td>
                                    <td>{i.statut === 'annule' ? <span className="ep2-muted">—</span> : <b>{i.ecarts}</b>}</td>
                                    <td><StatutTag statut={i.statut} /></td>
                                    <td className="r"><ChevronRight size={16} className="ep2-inv-go" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}