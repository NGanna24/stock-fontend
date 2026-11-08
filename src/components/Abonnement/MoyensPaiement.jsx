// components/Abonnement/MoyensPaiement.jsx
// Liste numérotée des moyens de paiement de l'abonnement, avec copie du numéro.
import React, { useState } from 'react';
import { Copy, Check, Smartphone, Landmark } from 'lucide-react';
import './Abonnement.css';

const copier = async (texte) => {
    try {
        await navigator.clipboard.writeText(texte);
        return true;
    } catch {
        // Repli quand le presse-papiers n'est pas disponible
        const zone = document.createElement('textarea');
        zone.value = texte;
        zone.style.position = 'fixed';
        zone.style.opacity = '0';
        document.body.appendChild(zone);
        zone.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        zone.remove();
        return ok;
    }
};

export default function MoyensPaiement({ moyens }) {
    const [copie, setCopie] = useState(null);

    if (!moyens?.length) {
        return (
            <p className="abo-vide">
                Les numéros de paiement ne sont pas encore disponibles. Contactez NDOUBLE pour renouveler.
            </p>
        );
    }

    const surCopie = async (m) => {
        if (await copier(m.numero.replace(/\s+/g, m.code === 'banque' ? ' ' : ''))) {
            setCopie(m.code);
            setTimeout(() => setCopie((c) => (c === m.code ? null : c)), 2000);
        }
    };

    return (
        <ol className="abo-moyens">
            {moyens.map((m, i) => {
                const Icone = m.code === 'banque' ? Landmark : Smartphone;
                return (
                    <li key={m.code} className={`abo-moyen abo-moyen--${m.code}`}>
                        <span className="abo-moyen-num">{i + 1}</span>
                        <span className="abo-moyen-icone" aria-hidden="true"><Icone size={18} /></span>
                        <span className="abo-moyen-texte">
                            <strong>{m.nom}{m.banque ? ` · ${m.banque}` : ''}</strong>
                            <span className="abo-moyen-numero">{m.numero}</span>
                            {m.titulaire && <span className="abo-moyen-titulaire">Au nom de {m.titulaire}</span>}
                        </span>
                        <button
                            type="button"
                            className="vt-btn vt-btn--sm"
                            onClick={() => surCopie(m)}
                            aria-label={`Copier le numéro ${m.nom}`}
                        >
                            {copie === m.code ? <Check size={14} /> : <Copy size={14} />}
                            {copie === m.code ? 'Copié' : 'Copier'}
                        </button>
                    </li>
                );
            })}
        </ol>
    );
}
