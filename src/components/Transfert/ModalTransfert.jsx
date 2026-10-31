// components/Transfert/ModalTransfert.jsx
// Transfert d'UN produit : entrepôt -> mon magasin.
// Le système décide seul de la destination (produit identique déjà au magasin -> on l'alimente,
// sinon il est créé). L'utilisateur ne choisit que l'UNITÉ DE VENTE et la QUANTITÉ.
import React, { useEffect, useMemo, useState } from 'react';
import { Send, Loader, AlertTriangle, Minus, Plus, ArrowRight, PackagePlus, PackageCheck } from 'lucide-react';
import TrModal, { fmtNum, decomposerQuantite } from './TrModal';
import TransfertStockService from '../../services/transfertStockService';
import './Transfert.css';

const num = (v) => Number(v || 0);

export default function ModalTransfert({ token, entrepotId, produit, estProprietaire = false, onClose, onCreated, onError }) {
    const [saving, setSaving] = useState(false);
    const [erreur, setErreur] = useState(null);
    const [motif, setMotif] = useState('');
    const [auto, setAuto] = useState(undefined); // undefined = chargement, null = inconnu

    /* ---- Unités : les UNITÉS DE VENTE d'abord (la plus grande en premier), l'unité de base en dernier ---- */
    const unites = useMemo(() => {
        const vente = (produit.unites_vente || [])
            .map((u) => ({ id: String(u.id_unite_vente), nom: u.nom, base: num(u.quantite_base) || 1, principal: !!u.est_principal }))
            .sort((a, b) => b.base - a.base);
        return [...vente, { id: '', nom: produit.unite_nom || 'Unité', base: 1, estBase: true }];
    }, [produit]);

    const stock = num(produit.quantite_stock);
    const uniteDefaut = useMemo(() => {
        const principale = unites.find((u) => u.principal && !u.estBase && u.base <= stock);
        return (principale || unites.find((u) => !u.estBase && u.base <= stock) || unites[unites.length - 1]).id;
    }, [unites, stock]);

    const [idUnite, setIdUnite] = useState(uniteDefaut);
    const [quantite, setQuantite] = useState(1);

    const unite = unites.find((u) => u.id === idUnite) || unites[unites.length - 1];
    const maxQte = Math.max(0, Math.floor((stock + 1e-9) / unite.base));
    const totalBase = num(quantite) * unite.base;
    const insuffisant = totalBase > stock + 1e-9;
    const symbole = produit.unite_symbole || produit.unite_nom || '';

    const changerUnite = (u) => {
        const base = num(quantite) * unite.base;
        setIdUnite(u.id);
        setQuantite(Math.max(1, Math.min(Math.floor(stock / u.base), Math.round(base / u.base) || 1)));
        setErreur(null);
    };
    const setQte = (v) => {
        setQuantite(v === '' ? '' : Math.max(0, Math.min(maxQte, Number(v))));
        setErreur(null);
    };

    /* ---- Aperçu de la décision automatique (lecture seule) ---- */
    useEffect(() => {
        let vivant = true;
        TransfertStockService.produitsMagasin(token, entrepotId, produit.id_produit_entrepot)
            .then((res) => { if (vivant) setAuto(res.auto || null); })
            .catch(() => { if (vivant) setAuto(null); });
        return () => { vivant = false; };
    }, [token, entrepotId, produit.id_produit_entrepot]);

    const handleSubmit = async () => {
        setErreur(null);
        if (!(num(quantite) > 0)) return setErreur('Indiquez une quantité');
        if (insuffisant) return setErreur(`Stock insuffisant : ${decomposerQuantite(produit, stock).texte} disponible(s)`);

        setSaving(true);
        try {
            const res = await TransfertStockService.create(token, entrepotId, {
                id_produit_entrepot: produit.id_produit_entrepot,
                id_unite_vente: idUnite || null,
                quantite: num(quantite),
                motif: motif.trim() || null,
            });
            onCreated?.(res);
        } catch (err) {
            setErreur(err.message || 'Erreur lors du transfert');
            onError?.(err.message || 'Erreur lors du transfert');
        } finally {
            setSaving(false);
        }
    };

    const stockTexte = decomposerQuantite(produit, stock);

    return (
        <TrModal
            onClose={() => !saving && onClose()}
            title="Transférer vers mon magasin"
            subtitle={produit.nom}
            footer={
                <>
                    <button className="tr-btn" onClick={onClose} disabled={saving}>Annuler</button>
                    <button className="tr-btn tr-btn--primary" onClick={handleSubmit}
                            disabled={saving || stock <= 0 || !(num(quantite) > 0) || insuffisant}>
                        {saving ? <Loader className="tr-spin" size={15} /> : <Send size={15} />}
                        {estProprietaire ? 'Transférer' : 'Envoyer la demande'}
                    </button>
                </>
            }
        >
            {erreur && (
                <div className="tr-alert tr-alert--err" role="alert">
                    <AlertTriangle size={16} /><span>{erreur}</span>
                </div>
            )}

            <div className="tr-stockbox">
                <span className="tr-stockbox-lbl">Disponible à l'entrepôt</span>
                <strong>{stockTexte.texte}</strong>
                {stockTexte.enUnitesDeVente && <small>soit {fmtNum(stock)} {symbole}</small>}
            </div>

            <div className="tr-field">
                <label className="tr-lbl">Unité de vente</label>
                <div className="tr-unit-chips" role="radiogroup" aria-label="Unité de vente">
                    {unites.map((u) => {
                        const indispo = u.base > stock;
                        return (
                            <button key={u.id || 'base'} type="button" role="radio" aria-checked={u.id === idUnite}
                                    className={`tr-unit-chip ${u.id === idUnite ? 'is-on' : ''}`}
                                    disabled={saving || indispo} onClick={() => changerUnite(u)}
                                    title={indispo ? 'Stock insuffisant pour cette unité' : undefined}>
                                <b>{u.nom}</b>
                                <small>{u.estBase ? 'unité de base' : `×${fmtNum(u.base)}`}</small>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="tr-field">
                <label className="tr-lbl">Quantité</label>
                <div className="tr-stepper">
                    <button type="button" onClick={() => setQte(Math.max(1, num(quantite) - 1))}
                            disabled={saving || num(quantite) <= 1} aria-label="Moins"><Minus size={16} /></button>
                    <input type="number" min="1" max={maxQte} step="1" value={quantite}
                           onChange={(e) => setQte(e.target.value)} disabled={saving} aria-label="Quantité" />
                    <button type="button" onClick={() => setQte(num(quantite) + 1)}
                            disabled={saving || num(quantite) >= maxQte} aria-label="Plus"><Plus size={16} /></button>
                    <span className="tr-stepper-unit">{unite.nom}</span>
                    <button type="button" className="tr-linkbtn" onClick={() => setQte(maxQte)} disabled={saving || maxQte < 1}>
                        Tout ({maxQte})
                    </button>
                </div>
                {num(quantite) > 0 && unite.base > 1 && (
                    <div className="tr-hint">= {fmtNum(totalBase)} {symbole}</div>
                )}
            </div>

            {/* Décision automatique */}
            <div className="tr-auto">
                {auto === undefined ? (
                    <span><Loader className="tr-spin" size={14} /> Vérification de votre catalogue…</span>
                ) : auto?.mode === 'existant' ? (
                    <>
                        <PackageCheck size={18} />
                        <span>
                            Ajouté à votre produit <b>{auto.produit?.nom}</b>
                            {auto.produit && <> (stock actuel : {fmtNum(auto.produit.quantite_stock)} {auto.produit.unite_symbole || auto.produit.unite_nom || ''})</>}
                            {auto.unite_differente && <><br /><small>Unité de base différente chez vous ({auto.produit?.unite_nom}) : la quantité s'ajoute telle quelle.</small></>}
                        </span>
                    </>
                ) : (
                    <>
                        <PackagePlus size={18} />
                        <span><b>{produit.nom}</b> sera créé dans votre catalogue, avec ses prix et ses unités de vente.</span>
                    </>
                )}
            </div>

            <div className="tr-field">
                <input className="tr-input" type="text" value={motif} onChange={(e) => setMotif(e.target.value)}
                       placeholder="Motif (facultatif)" maxLength={200} disabled={saving} aria-label="Motif" />
            </div>

            {!estProprietaire && (
                <div className="tr-note"><ArrowRight size={13} /> Le propriétaire de l'entrepôt doit approuver la demande.</div>
            )}
        </TrModal>
    );
}