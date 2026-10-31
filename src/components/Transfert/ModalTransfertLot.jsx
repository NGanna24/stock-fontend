// components/Transfert/ModalTransfertLot.jsx
// Panier : transférer PLUSIEURS produits d'entrepôt vers MON catalogue en une seule fois.
// Tout ou rien : si une ligne est refusée, rien n'est créé et le message nomme le produit.
// Destination automatique : produit identique déjà dans mon catalogue -> alimenté, sinon créé.
import React, { useMemo, useState } from 'react';
import { Send, Loader, AlertTriangle, Trash2 } from 'lucide-react';
import TrModal, { fmtNum, decomposerQuantite } from './TrModal';
import TransfertStockService from '../../services/transfertStockService';
import './Transfert.css';

const num = (v) => Number(v || 0);

// Unités de vente d'abord (la plus grande en premier), unité de base en dernier
const unitesDe = (p) => [
    ...(p.unites_vente || [])
        .map((u) => ({ id: String(u.id_unite_vente), nom: u.nom, base: num(u.quantite_base) || 1, principal: !!u.est_principal }))
        .sort((a, b) => b.base - a.base),
    { id: '', nom: `${p.unite_nom || 'Unité'} (base)`, base: 1, estBase: true },
];
// Unité proposée par défaut : l'unité de vente principale qui rentre dans le stock, sinon la plus grande
const uniteParDefaut = (p) => {
    const l = unitesDe(p).filter((u) => !u.estBase && u.base <= num(p.quantite_stock));
    return (l.find((u) => u.principal) || l[0] || { id: '' }).id;
};

export default function ModalTransfertLot({ token, entrepotId, produits, estProprietaire = false, onClose, onCreated, onError, onRetirer }) {
    const [lignes, setLignes] = useState(() =>
        produits.map((p) => ({ id: p.id_produit_entrepot, id_unite_vente: uniteParDefaut(p), quantite: '' }))
    );
    const [motif, setMotif] = useState('');
    const [saving, setSaving] = useState(false);
    const [erreur, setErreur] = useState(null);

    const parId = useMemo(() => new Map(produits.map((p) => [p.id_produit_entrepot, p])), [produits]);

    const maj = (id, champ, valeur) => {
        setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, [champ]: valeur } : l)));
        setErreur(null);
    };

    const retirer = (id) => {
        setLignes((ls) => ls.filter((l) => l.id !== id));
        onRetirer?.(id);
    };

    const calc = (l) => {
        const p = parId.get(l.id);
        const u = unitesDe(p).find((x) => x.id === l.id_unite_vente) || unitesDe(p)[0];
        const totalBase = num(l.quantite) * u.base;
        return { p, u, totalBase, depasse: totalBase > num(p.quantite_stock) };
    };

    const valider = async () => {
        if (lignes.length === 0) return setErreur('Le panier est vide');
        for (const l of lignes) {
            const { p, depasse } = calc(l);
            if (!(num(l.quantite) > 0)) return setErreur(`Indiquez la quantité pour « ${p.nom} »`);
            if (depasse) return setErreur(`Stock insuffisant pour « ${p.nom} » : ${decomposerQuantite(p, p.quantite_stock).texte} disponible(s)`);
        }
        setSaving(true);
        setErreur(null);
        try {
            const res = await TransfertStockService.createLot(token, entrepotId, {
                items: lignes.map((l) => ({
                    id_produit_entrepot: l.id,
                    id_unite_vente: l.id_unite_vente || null,
                    quantite: num(l.quantite),
                })),
                motif: motif.trim() || null,
            });
            onCreated?.(res);
        } catch (err) {
            setErreur(err.message || 'Erreur lors du transfert groupé');
            onError?.(err.message || 'Erreur lors du transfert groupé');
        } finally {
            setSaving(false);
        }
    };

    return (
        <TrModal
            onClose={() => !saving && onClose()}
            title="Transférer la sélection vers mon magasin"
            subtitle={`${lignes.length} produit(s) dans le panier`}
            wide
            footer={
                <>
                    <button className="tr-btn" onClick={onClose} disabled={saving}>Annuler</button>
                    <button className="tr-btn tr-btn--primary" onClick={valider} disabled={saving || lignes.length === 0}>
                        {saving ? <Loader className="tr-spin" size={15} /> : <Send size={15} />}
                        {estProprietaire ? `Transférer ${lignes.length} produit(s)` : `Envoyer ${lignes.length} demande(s)`}
                    </button>
                </>
            }
        >
            {erreur && (
                <div className="tr-alert tr-alert--err" role="alert">
                    <AlertTriangle size={16} />
                    <span>{erreur}</span>
                </div>
            )}

            <div className="tr-info">
                {estProprietaire
                    ? "Vous êtes propriétaire de l'entrepôt : les transferts sont appliqués immédiatement à votre catalogue."
                    : "Une demande par produit : le stock est ajouté à VOTRE catalogue une fois chaque demande approuvée par le propriétaire."}
                {' '}Si un produit identique existe déjà dans votre catalogue, il est alimenté ; sinon il est créé.
            </div>

            <div className="trl-list">
                <div className="trl-row trl-head">
                    <span>N°</span><span>Produit</span><span>Unité</span><span>Quantité</span><span />
                </div>
                {lignes.map((l, i) => {
                    const { p, u, totalBase, depasse } = calc(l);
                    return (
                        <div key={l.id} className={`trl-row ${depasse ? 'is-over' : ''}`}>
                            <span className="trl-n">{i + 1}</span>
                            <div className="trl-prod">
                                <b>{p.nom}</b>
                                <small>
                                    En stock : {decomposerQuantite(p, p.quantite_stock).texte}
                                    {decomposerQuantite(p, p.quantite_stock).enUnitesDeVente && ` (${fmtNum(p.quantite_stock)} ${p.unite_nom || ''})`}
                                </small>
                            </div>
                            <select
                                className="tr-input"
                                value={l.id_unite_vente}
                                onChange={(e) => maj(l.id, 'id_unite_vente', e.target.value)}
                                disabled={saving}
                                aria-label={`Unité pour ${p.nom}`}
                            >
                                {unitesDe(p).map((x) => (
                                    <option key={x.id} value={x.id}>{x.nom}{x.base > 1 ? ` (${fmtNum(x.base)})` : ''}</option>
                                ))}
                            </select>
                            <div className="trl-qte">
                                <input
                                    className="tr-input"
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="0"
                                    value={l.quantite}
                                    onChange={(e) => maj(l.id, 'quantite', e.target.value)}
                                    disabled={saving}
                                    aria-label={`Quantité pour ${p.nom}`}
                                />
                                {u.base > 1 && num(l.quantite) > 0 && (
                                    <small>= {fmtNum(totalBase)} {p.unite_nom || ''}</small>
                                )}
                            </div>
                            <button className="tr-btn trl-del" onClick={() => retirer(l.id)} disabled={saving} title="Retirer du panier" aria-label={`Retirer ${p.nom}`}>
                                <Trash2 size={15} />
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="tr-field" style={{ marginTop: 12 }}>
                <label className="tr-lbl">Motif (facultatif, commun à tous les produits)</label>
                <input className="tr-input" value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={200} disabled={saving} placeholder="Ex : réapprovisionnement du rayon" />
            </div>
        </TrModal>
    );
}