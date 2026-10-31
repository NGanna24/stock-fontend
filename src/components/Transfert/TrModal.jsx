// components/Transfert/TrModal.jsx
// Briques communes aux écrans de transfert (autonomes : n'ont pas besoin d'Entrepot.css)
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Transfert.css';

export const STATUTS = {
    en_attente: 'En attente',
    valide: 'Approuvé',
    refuse: 'Refusé',
    annule: 'Annulé',
};

export const fmtNum = (v) =>
    Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/**
 * Quantité (en unité de base) exprimée en unités de vente, de la plus grande à la plus petite :
 * 254 pièces avec carton de 12 et palette de 120 => "2 Palette + 1 Carton + 2 piece".
 */
export const decomposerQuantite = (produit, quantiteBase) => {
    const nomBase = produit.unite_nom || 'Unité';
    const unites = [...(produit.unites_vente || [])]
        .filter((u) => Number(u.quantite_base) > 1)
        .sort((a, b) => Number(b.quantite_base) - Number(a.quantite_base));
    let reste = Math.round(Number(quantiteBase || 0) * 100) / 100;
    const parts = [];
    for (const u of unites) {
        const qb = Number(u.quantite_base);
        const n = Math.floor(reste / qb + 1e-9);
        if (n > 0) {
            parts.push(`${fmtNum(n)} ${u.nom}`);
            reste = Math.round((reste - n * qb) * 100) / 100;
        }
    }
    if (reste > 0 || parts.length === 0) parts.push(`${fmtNum(reste)} ${nomBase}`);
    return { texte: parts.join(' + '), enUnitesDeVente: unites.length > 0 };
};

export const fmtDate = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Nom d'unité lisible : « Unité » (ancien défaut) est remplacé par l'unité de base réelle du produit */
export const libelleUnite = (t) => {
    const n = String(t.nom_unite_vente || '').trim();
    return !n || n.toLowerCase() === 'unité' || n.toLowerCase() === 'unite'
        ? (t.unite_nom || 'Unité')
        : n;
};

/** « 1 Carton », « 24 Litre » — sans équivalent collé */
export const libelleQuantite = (t) => `${fmtNum(t.quantite_saisie)} ${libelleUnite(t)}`;

/** Équivalent en unité de base, seulement s'il apporte une information : « soit 12 bidons » */
export const libelleEquivalent = (t) =>
    t.quantite_base > 1 ? `soit ${fmtNum(t.quantite)} ${t.unite_nom || ''}`.trim() : '';

export function StatutBadge({ statut }) {
    return <span className={`tr-badge tr-badge--${statut}`}>{STATUTS[statut] || statut}</span>;
}

export default function TrModal({ title, subtitle, onClose, children, footer, wide = false }) {
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return createPortal(
        <div className="tr-overlay" onMouseDown={onClose}>
            <div className={`tr-modal ${wide ? 'tr-modal--wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
                <header className="tr-head">
                    <div>
                        <h3>{title}</h3>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                    <button className="tr-close" onClick={onClose} aria-label="Fermer">
                        <X size={18} />
                    </button>
                </header>
                <div className="tr-body">{children}</div>
                {footer && <footer className="tr-foot">{footer}</footer>}
            </div>
        </div>,
        document.body
    );
}