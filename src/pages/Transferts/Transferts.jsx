// pages/Transferts/Transferts.jsx
//
// Vue centrale des transferts ENTREPÔT -> MON MAGASIN, tous entrepôts confondus.
//   - Propriétaire d'un entrepôt : approuve / refuse les demandes de ses membres.
//   - Membre : suit ses demandes et peut les annuler tant qu'elles sont en attente.
//   - « Nouveau transfert » : choisir un entrepôt, cocher les produits, puis le panier
//     habituel (ModalTransfertLot).
// Le registre réutilise TransfertsEntrepot (sans entrepotId = tous les entrepôts).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Plus, Warehouse, Loader, Search, X, Check, AlertTriangle, Store,
} from 'lucide-react';
import TrModal, { fmtNum } from '../../components/Transfert/TrModal';
import TransfertsEntrepot from '../../components/Transfert/TransfertsEntrepot';
import ModalTransfertLot from '../../components/Transfert/ModalTransfertLot';
import TransfertStockService from '../../services/transfertStockService';
import ProduitEntrepotService from '../../services/produitEntrepotService';
import { useUser } from '../../context/AuthContext';
import { Page, PageHead, Empty, Toast } from '../../components/UI/Vt';
import '../../components/Transfert/Transfert.css';
import './Transferts.css';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const num = (v) => Number(v || 0);
const estProprio = (ent) => ent?.role_membre === 'proprietaire';

/* ============================================================
   Modale : choisir l'entrepôt et les produits à transférer
   ============================================================ */
function ModalChoixProduits({ token, entrepots, entrepotInitial, onClose, onContinuer }) {
    const [idEntrepot, setIdEntrepot] = useState(String(entrepotInitial || entrepots[0]?.id_entrepot || ''));
    const [produits, setProduits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [erreur, setErreur] = useState(null);
    const [q, setQ] = useState('');
    const [choix, setChoix] = useState({}); // { [id_produit_entrepot]: true }

    useEffect(() => {
        if (!idEntrepot) return undefined;
        let annule = false;
        setLoading(true);
        setErreur(null);
        setChoix({});
        (async () => {
            try {
                const res = await ProduitEntrepotService.getAllProduits(token, idEntrepot);
                const list = res?.produits || res?.data || (Array.isArray(res) ? res : []);
                if (!annule) setProduits(list);
            } catch (err) {
                if (!annule) {
                    setProduits([]);
                    setErreur(err.message || 'Impossible de charger les produits de cet entrepôt');
                }
            } finally {
                if (!annule) setLoading(false);
            }
        })();
        return () => { annule = true; };
    }, [token, idEntrepot]);

    const enStock = useMemo(() => produits.filter((p) => num(p.quantite_stock) > 0), [produits]);
    const visibles = useMemo(() => {
        const t = norm(q.trim());
        if (!t) return enStock;
        return enStock.filter((p) =>
            norm([p.nom, p.marque_nom, p.modele_nom, p.categorie_nom, p.code_barre, p.reference]
                .filter(Boolean).join(' ')).includes(t));
    }, [enStock, q]);

    const nbChoisis = Object.keys(choix).length;
    const basculer = (id) => setChoix((prev) => {
        const n = { ...prev };
        if (n[id]) delete n[id]; else n[id] = true;
        return n;
    });
    const toutCocher = visibles.length > 0 && visibles.every((p) => choix[p.id_produit_entrepot]);
    const basculerTout = () => setChoix((prev) => {
        const n = { ...prev };
        visibles.forEach((p) => {
            if (toutCocher) delete n[p.id_produit_entrepot];
            else n[p.id_produit_entrepot] = true;
        });
        return n;
    });

    const entrepot = entrepots.find((e) => String(e.id_entrepot) === idEntrepot);

    return (
        <TrModal
            wide
            onClose={onClose}
            title="Nouveau transfert"
            subtitle="Choisissez l'entrepôt puis cochez les produits à faire venir dans votre magasin"
            footer={
                <>
                    <button className="tr-btn" onClick={onClose}>Annuler</button>
                    <button
                        className="tr-btn tr-btn--primary"
                        disabled={nbChoisis === 0}
                        onClick={() => onContinuer(entrepot, produits.filter((p) => choix[p.id_produit_entrepot]))}
                    >
                        Continuer{nbChoisis > 0 ? ` (${nbChoisis})` : ''}
                    </button>
                </>
            }
        >
            <div className="tr-field">
                <label className="tr-lbl" htmlFor="trp-ent">Entrepôt source</label>
                <select
                    id="trp-ent"
                    className="tr-input"
                    value={idEntrepot}
                    onChange={(e) => setIdEntrepot(e.target.value)}
                >
                    {entrepots.map((e) => (
                        <option key={e.id_entrepot} value={e.id_entrepot}>
                            {e.nom}{estProprio(e) ? ' (mon entrepôt)' : ''}
                        </option>
                    ))}
                </select>
                {entrepot && !estProprio(entrepot) && (
                    <span className="trp-hint">
                        Vous êtes membre : votre demande devra être approuvée par {entrepot.proprietaire_nom || 'le propriétaire'}.
                    </span>
                )}
                {entrepot && estProprio(entrepot) && (
                    <span className="trp-hint">C'est votre entrepôt : le transfert sera appliqué immédiatement.</span>
                )}
            </div>

            <div className="trx-search trp-search">
                <Search size={15} />
                <input
                    type="text"
                    placeholder="Rechercher un produit…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    autoFocus
                />
                {q && (
                    <button className="trx-clear" onClick={() => setQ('')} aria-label="Effacer la recherche">
                        <X size={14} />
                    </button>
                )}
            </div>

            {erreur && (
                <div className="tr-alert tr-alert--err" role="alert">
                    <AlertTriangle size={16} /><span>{erreur}</span>
                </div>
            )}

            {loading ? (
                <div className="trx-state"><Loader className="tr-spin" size={18} /> Chargement des produits…</div>
            ) : visibles.length === 0 ? (
                <div className="trx-state trx-state--empty">
                    <Warehouse size={28} />
                    <strong>{enStock.length === 0 ? 'Aucun produit en stock dans cet entrepôt' : 'Aucun résultat'}</strong>
                </div>
            ) : (
                <div className="trp-list" role="list">
                    <label className="trp-row trp-row--head">
                        <input type="checkbox" checked={toutCocher} onChange={basculerTout} />
                        <span>{toutCocher ? 'Tout décocher' : 'Tout cocher'} ({visibles.length})</span>
                        <span className="trp-stock">Stock</span>
                    </label>
                    {visibles.map((p) => {
                        const id = p.id_produit_entrepot;
                        return (
                            <label key={id} className={`trp-row ${choix[id] ? 'is-checked' : ''}`} role="listitem">
                                <input type="checkbox" checked={!!choix[id]} onChange={() => basculer(id)} />
                                <span className="trp-name">
                                    <strong>{p.nom}</strong>
                                    {(p.marque_nom || p.modele_nom) && (
                                        <small>{[p.marque_nom, p.modele_nom].filter(Boolean).join(' · ')}</small>
                                    )}
                                </span>
                                <span className="trp-stock">
                                    {fmtNum(p.quantite_stock)} {p.unite_symbole || p.unite_nom || ''}
                                </span>
                            </label>
                        );
                    })}
                </div>
            )}
        </TrModal>
    );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Transferts() {
    const { token: tokenCtx, entrepots: mesEntrepots = [] } = useUser();
    const token = tokenCtx || localStorage.getItem('token');
    const navigate = useNavigate();
    const { slug } = useParams();

    const [selection, setSelection] = useState('');        // '' = tous les entrepôts
    const [reloadKey, setReloadKey] = useState(0);
    const [compteurs, setCompteurs] = useState({});         // { [id_entrepot]: { count, est_proprietaire } }
    const [toast, setToast] = useState(null); // { type, message }
    const [choixOuvert, setChoixOuvert] = useState(false);
    const [panier, setPanier] = useState(null);             // { entrepot, produits }

    const toastTimer = useRef(null);
    const showToast = useCallback((type, message) => {
        setToast({ type, message });
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 4000);
    }, []);
    useEffect(() => () => window.clearTimeout(toastTimer.current), []);

    /* ---- Demandes en attente par entrepôt (badges) ---- */
    const refreshCompteurs = useCallback(async () => {
        if (!token || mesEntrepots.length === 0) return;
        const res = await Promise.all(
            mesEntrepots.map((e) => TransfertStockService.countEnAttente(token, e.id_entrepot))
        );
        const c = {};
        mesEntrepots.forEach((e, i) => { c[e.id_entrepot] = res[i]; });
        setCompteurs(c);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, mesEntrepots.map((e) => e.id_entrepot).join(',')]);

    useEffect(() => { refreshCompteurs(); }, [refreshCompteurs]);

    // Si l'entrepôt sélectionné n'existe plus (quitté / supprimé), retour à « Tous »
    useEffect(() => {
        if (selection && !mesEntrepots.some((e) => String(e.id_entrepot) === selection)) setSelection('');
    }, [mesEntrepots, selection]);

    const aApprouver = useMemo(() => mesEntrepots
        .filter((e) => compteurs[e.id_entrepot]?.est_proprietaire)
        .reduce((s, e) => s + (compteurs[e.id_entrepot]?.count || 0), 0), [mesEntrepots, compteurs]);
    const mesEnAttente = useMemo(() => mesEntrepots
        .filter((e) => compteurs[e.id_entrepot] && !compteurs[e.id_entrepot].est_proprietaire)
        .reduce((s, e) => s + (compteurs[e.id_entrepot]?.count || 0), 0), [mesEntrepots, compteurs]);

    const apresChangement = (message) => {
        if (message) showToast('success', message);
        refreshCompteurs();
    };

    /* ---- Aucun entrepôt : on explique et on renvoie vers la page Entrepôt ---- */
    if (mesEntrepots.length === 0) {
        return (
            <Page className="trp">
                <PageHead title="Transferts" sub="Faites venir du stock de vos entrepôts vers votre magasin" />
                <div className="vt-table-wrap trp-vide">
                    <Empty icon={Warehouse} title="Vous n'avez encore aucun entrepôt"
                           text="Créez un entrepôt ou rejoignez-en un avec son code d'accès pour pouvoir transférer du stock.">
                        <button type="button" className="vt-btn vt-btn--primary vt-btn--sm"
                                onClick={() => navigate(slug ? `/${slug}/entrepot` : '/entrepot')}>
                            <Warehouse size={14} /> Aller aux entrepôts
                        </button>
                    </Empty>
                </div>
            </Page>
        );
    }

    return (
        <Page className="trp">
            <PageHead title="Transferts"
                      sub={<>
                          Du stock de vos entrepôts vers votre magasin
                          {aApprouver > 0 && <> · <b className="trp-alert">{aApprouver} demande{aApprouver > 1 ? 's' : ''} à approuver</b></>}
                          {mesEnAttente > 0 && <> · {mesEnAttente} en attente d'approbation</>}
                      </>}>
                <button type="button" className="vt-btn vt-btn--primary" onClick={() => setChoixOuvert(true)}>
                    <Plus size={16} /> Nouveau transfert
                </button>
            </PageHead>

            {/* ---------- Choix de l'entrepôt ---------- */}
            <div className="trp-ents" role="tablist" aria-label="Entrepôt">
                <button
                    role="tab"
                    aria-selected={selection === ''}
                    className={`trp-ent ${selection === '' ? 'is-active' : ''}`}
                    onClick={() => setSelection('')}
                >
                    <Store size={15} /> Tous les entrepôts
                </button>
                {mesEntrepots.map((e) => {
                    const c = compteurs[e.id_entrepot];
                    const id = String(e.id_entrepot);
                    return (
                        <button
                            key={id}
                            role="tab"
                            aria-selected={selection === id}
                            className={`trp-ent ${selection === id ? 'is-active' : ''}`}
                            onClick={() => setSelection(id)}
                            title={estProprio(e) ? 'Mon entrepôt' : `Membre · propriétaire : ${e.proprietaire_nom || '-'}`}
                        >
                            <Warehouse size={15} />
                            <span className="trp-ent-name">{e.nom}</span>
                            {estProprio(e) && <Check size={13} className="trp-ent-owner" aria-label="Mon entrepôt" />}
                            {c?.count > 0 && (
                                <span className={`trp-badge ${c.est_proprietaire ? 'trp-badge--todo' : ''}`}>{c.count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ---------- Registre ---------- */}
            <TransfertsEntrepot
                key={`${selection || 'all'}-${reloadKey}`}
                token={token}
                entrepotId={selection ? Number(selection) : null}
                onError={(msg) => showToast('error', msg)}
                onChanged={apresChangement}
            />

            {/* ---------- Nouveau transfert : étape 1 ---------- */}
            {choixOuvert && (
                <ModalChoixProduits
                    token={token}
                    entrepots={mesEntrepots}
                    entrepotInitial={selection}
                    onClose={() => setChoixOuvert(false)}
                    onContinuer={(entrepot, produits) => {
                        setChoixOuvert(false);
                        setPanier({ entrepot, produits });
                    }}
                />
            )}

            {/* ---------- Nouveau transfert : étape 2 (panier existant) ---------- */}
            {panier && (
                <ModalTransfertLot
                    token={token}
                    entrepotId={panier.entrepot.id_entrepot}
                    produits={panier.produits}
                    estProprietaire={estProprio(panier.entrepot)}
                    onClose={() => setPanier(null)}
                    onRetirer={(id) => setPanier((prev) => prev && ({
                        ...prev,
                        produits: prev.produits.filter((p) => p.id_produit_entrepot !== id),
                    }))}
                    onError={(msg) => showToast('error', msg)}
                    onCreated={(res) => {
                        setPanier(null);
                        const liste = res?.data || [];
                        const applique = liste.length > 0 && liste.every((r) => r.statut === 'valide');
                        showToast('success', res?.message || (applique ? 'Transferts effectués' : 'Demandes envoyées'));
                        setReloadKey((k) => k + 1);
                        refreshCompteurs();
                    }}
                />
            )}

            <Toast toast={toast} onClose={() => setToast(null)} />
        </Page>
    );
}
