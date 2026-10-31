// pages/Transferts/TransfertsARecevoir.jsx
// Côté MAGASIN : transferts envoyés par un entrepôt, à valider ou refuser.
import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Loader, PackageCheck, RefreshCw, XCircle, AlertTriangle, Search } from 'lucide-react';
import TrModal, { StatutBadge, fmtNum, fmtDate } from '../../components/Transfert/TrModal';
import TransfertStockService from '../../services/transfertStockService';
import { useUser } from '../../context/AuthContext';
import '../../components/Transfert/Transfert.css';

const FILTRES = [
    ['en_attente', 'À recevoir'],
    ['valide', 'Reçus'],
    ['refuse', 'Refusés'],
    ['annule', 'Annulés'],
    ['', 'Tous'],
];

/* ============================================================
   Modale : valider la réception
   ============================================================ */
function ModalValider({ token, transfert, onClose, onDone, onError }) {
    const [mode, setMode] = useState('existant');
    const [q, setQ] = useState('');
    const [produits, setProduits] = useState([]);
    const [selected, setSelected] = useState(null);
    const [searching, setSearching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alerte, setAlerte] = useState(null);     // { message, code }
    const [premiereRecherche, setPremiereRecherche] = useState(true);

    // Recherche dans le catalogue du magasin (avec petite attente à la frappe)
    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await TransfertStockService.produitsMagasin(token, transfert.id_transfert, q.trim());
                if (cancelled) return;
                setProduits(res.produits || []);
                // Rien de correspondant au premier chargement : on propose la création
                if (premiereRecherche && (res.produits || []).length === 0) setMode('creer');
                setPremiereRecherche(false);
            } catch (err) {
                if (!cancelled) onError?.(err.message || 'Impossible de charger vos produits');
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, q ? 300 : 0);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

    const valider = async (forcer = false) => {
        if (mode === 'existant' && !selected) return onError?.('Sélectionnez le produit qui reçoit le stock');
        setSaving(true);
        setAlerte(null);
        try {
            const res = await TransfertStockService.valider(token, transfert.id_transfert, {
                mode,
                id_produit_destination: mode === 'existant' ? selected : null,
                forcer,
            });
            onDone?.(res.message);
        } catch (err) {
            if (err.code === 'UNITE_DIFFERENTE') {
                setAlerte({ message: err.message, code: err.code });
            } else if (err.code === 'DUPLICATE_PRODUIT') {
                setAlerte({ message: err.message, code: err.code });
                setMode('existant');
                setQ(transfert.produit_nom);
            } else {
                onError?.(err.message || 'Erreur lors de la validation');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <TrModal
            wide
            onClose={() => !saving && onClose()}
            title="Recevoir ce transfert"
            subtitle={`${fmtNum(transfert.quantite_saisie)} ${transfert.nom_unite_vente} de « ${transfert.produit_nom} »`}
            footer={
                <>
                    <button className="tr-btn" onClick={onClose} disabled={saving}>Annuler</button>
                    {alerte?.code === 'UNITE_DIFFERENTE' ? (
                        <button className="tr-btn tr-btn--primary" onClick={() => valider(true)} disabled={saving}>
                            {saving ? <Loader className="tr-spin" size={15} /> : <CheckCircle size={15} />} Valider quand même
                        </button>
                    ) : (
                        <button className="tr-btn tr-btn--primary" onClick={() => valider(false)} disabled={saving}>
                            {saving ? <Loader className="tr-spin" size={15} /> : <CheckCircle size={15} />} Valider la réception
                        </button>
                    )}
                </>
            }
        >
            <div className="tr-info">
                Quantité reçue : <b>&nbsp;{fmtNum(transfert.quantite)} {transfert.unite_symbole || transfert.unite_nom || ''}</b>
                &nbsp;(unité de base), envoyée par {transfert.entrepot_nom}.
            </div>

            {alerte && (
                <div className="tr-alert" role="alert">
                    <AlertTriangle size={16} />
                    <span>{alerte.message}</span>
                </div>
            )}

            <div className="tr-options">
                <label className={`tr-radio-card ${mode === 'existant' ? 'is-selected' : ''}`}>
                    <input type="radio" name="mode" checked={mode === 'existant'} onChange={() => setMode('existant')} />
                    <div>
                        <strong>Ajouter à un produit existant</strong>
                        <span>Le stock s'ajoute à un produit déjà présent dans votre catalogue.</span>
                    </div>
                </label>
                <label className={`tr-radio-card ${mode === 'creer' ? 'is-selected' : ''}`}>
                    <input type="radio" name="mode" checked={mode === 'creer'} onChange={() => setMode('creer')} />
                    <div>
                        <strong>Créer le produit dans mon catalogue</strong>
                        <span>Copie du nom, de la marque, du modèle, de la catégorie, de l'unité et des unités de vente.</span>
                    </div>
                </label>
            </div>

            {mode === 'existant' && (
                <>
                    <div className="tr-field">
                        <label className="tr-lbl">Rechercher dans mes produits</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                            <input className="tr-input" style={{ paddingLeft: 32 }} value={q}
                                   onChange={(e) => setQ(e.target.value)} placeholder="Nom du produit…" disabled={saving} />
                        </div>
                    </div>

                    {searching ? (
                        <div className="tr-loading" style={{ padding: 16 }}><Loader className="tr-spin" size={18} /></div>
                    ) : produits.length === 0 ? (
                        <div className="tr-empty" style={{ padding: 20 }}>
                            <p style={{ margin: 0 }}>Aucun produit trouvé. Essayez un autre nom, ou créez-le.</p>
                        </div>
                    ) : (
                        <div className="tr-products">
                            {produits.map((p) => (
                                <label key={p.id_produit}
                                       className={`tr-radio-card ${selected === p.id_produit ? 'is-selected' : ''}`}>
                                    <input type="radio" name="produit" checked={selected === p.id_produit}
                                           onChange={() => setSelected(p.id_produit)} />
                                    <div>
                                        <strong>{p.nom}</strong>
                                        <span>
                                            {[p.marque_nom, p.modele_nom].filter(Boolean).join(' — ')}
                                            {(p.marque_nom || p.modele_nom) ? ' · ' : ''}
                                            Stock : {fmtNum(p.quantite_stock)} {p.unite_symbole || p.unite_nom || ''}
                                        </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </>
            )}
        </TrModal>
    );
}

/* ============================================================
   Modale : refuser
   ============================================================ */
function ModalRefuser({ token, transfert, onClose, onDone, onError }) {
    const [motif, setMotif] = useState('');
    const [saving, setSaving] = useState(false);

    const refuser = async () => {
        setSaving(true);
        try {
            const res = await TransfertStockService.refuser(token, transfert.id_transfert, motif.trim());
            onDone?.(res.message);
        } catch (err) {
            onError?.(err.message || 'Erreur lors du refus');
        } finally {
            setSaving(false);
        }
    };

    return (
        <TrModal
            onClose={() => !saving && onClose()}
            title="Refuser ce transfert ?"
            subtitle={`« ${transfert.produit_nom} » retournera dans le stock de l'entrepôt.`}
            footer={
                <>
                    <button className="tr-btn" onClick={onClose} disabled={saving}>Retour</button>
                    <button className="tr-btn tr-btn--danger" onClick={refuser} disabled={saving}>
                        {saving ? <Loader className="tr-spin" size={15} /> : <XCircle size={15} />} Refuser
                    </button>
                </>
            }
        >
            <div className="tr-field">
                <label className="tr-lbl">Motif (facultatif)</label>
                <textarea className="tr-input" rows="3" value={motif} onChange={(e) => setMotif(e.target.value)}
                          placeholder="Ex : marchandise endommagée, quantité incorrecte…" maxLength={255} disabled={saving} />
            </div>
        </TrModal>
    );
}

/* ============================================================
   Page
   ============================================================ */
export default function TransfertsARecevoir() {
    const { token } = useUser();
    const [transferts, setTransferts] = useState([]);
    const [statut, setStatut] = useState('en_attente');
    const [loading, setLoading] = useState(true);
    const [toValidate, setToValidate] = useState(null);
    const [toRefuse, setToRefuse] = useState(null);
    const [message, setMessage] = useState(null);   // { type: 'ok' | 'err', text }

    const notify = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await TransfertStockService.listARecevoir(token, statut || null);
            setTransferts(res.transferts || []);
        } catch (err) {
            notify('err', err.message || 'Impossible de charger les transferts');
        } finally {
            setLoading(false);
        }
    }, [token, statut]);

    useEffect(() => { load(); }, [load]);

    const termine = (text) => {
        setToValidate(null);
        setToRefuse(null);
        notify('ok', text);
        load();
    };

    return (
        <div className="tr-page">
            <div className="tr-page-head">
                <div>
                    <h1>Transferts reçus</h1>
                    <p>Marchandises envoyées par un entrepôt vers votre magasin.</p>
                </div>
                <button className="tr-btn tr-btn--sm" onClick={load} disabled={loading} title="Rafraîchir">
                    <RefreshCw size={14} className={loading ? 'tr-spin' : ''} />
                </button>
            </div>

            {message && (
                <div className={message.type === 'ok' ? 'tr-info' : 'tr-alert tr-alert--err'}>{message.text}</div>
            )}

            <div className="tr-chips">
                {FILTRES.map(([key, label]) => (
                    <button key={key || 'all'} className={`tr-chip ${statut === key ? 'is-active' : ''}`}
                            onClick={() => setStatut(key)}>
                        {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="tr-loading"><Loader className="tr-spin" size={20} /> Chargement…</div>
            ) : transferts.length === 0 ? (
                <div className="tr-empty">
                    <PackageCheck size={32} />
                    <p>{statut === 'en_attente' ? 'Aucun transfert à recevoir.' : 'Aucun transfert.'}</p>
                </div>
            ) : (
                <div className="tr-list">
                    {transferts.map((t) => (
                        <article key={t.id_transfert} className="tr-card">
                            <div className="tr-card-top">
                                <div>
                                    <h3>{t.produit_nom}</h3>
                                    <small>
                                        {[t.marque_nom, t.modele_nom].filter(Boolean).join(' — ')}
                                        {(t.marque_nom || t.modele_nom) ? ' · ' : ''}
                                        {t.numero_transfert}
                                    </small>
                                </div>
                                <StatutBadge statut={t.statut} />
                            </div>

                            <div className="tr-card-qty">
                                {fmtNum(t.quantite_saisie)} {t.nom_unite_vente}
                                {t.quantite_base > 1 && (
                                    <small>= {fmtNum(t.quantite)} {t.unite_symbole || t.unite_nom || ''}</small>
                                )}
                            </div>

                            <div className="tr-card-meta">
                                <span>De : <b>{t.entrepot_nom}</b> · {fmtDate(t.date_creation)}</span>
                                {t.motif && <span>Motif : {t.motif}</span>}
                                {t.statut === 'valide' && t.produit_destination_nom && (
                                    <span>Ajouté à : {t.produit_destination_nom} ({fmtDate(t.date_validation)})</span>
                                )}
                                {t.statut === 'refuse' && <span>Refusé{t.motif_refus ? ` : ${t.motif_refus}` : ''}</span>}
                            </div>

                            {t.statut === 'en_attente' && (
                                <div className="tr-card-foot">
                                    <button className="tr-btn tr-btn--sm" onClick={() => setToRefuse(t)}>
                                        <XCircle size={14} /> Refuser
                                    </button>
                                    <button className="tr-btn tr-btn--primary tr-btn--sm" onClick={() => setToValidate(t)}>
                                        <CheckCircle size={14} /> Recevoir
                                    </button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {toValidate && (
                <ModalValider
                    token={token}
                    transfert={toValidate}
                    onClose={() => setToValidate(null)}
                    onDone={termine}
                    onError={(m) => notify('err', m)}
                />
            )}
            {toRefuse && (
                <ModalRefuser
                    token={token}
                    transfert={toRefuse}
                    onClose={() => setToRefuse(null)}
                    onDone={termine}
                    onError={(m) => notify('err', m)}
                />
            )}
        </div>
    );
}
