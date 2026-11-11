// components/Transfert/BonTransfert.jsx
// Bon de transfert : le chauffeur le présente au gérant de l'entrepôt, qui remet la marchandise puis signe.
// Disponible une fois la demande approuvée. « Imprimer » ouvre l'aperçu (PDF) puis imprime.
import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import TrModal, { fmtDate, libelleQuantite, libelleEquivalent } from './TrModal';
import BonTransfertPDF from './BonTransfertPDF';
import ApercuImpression from '../Impression/ApercuImpression';
import './Transfert.css';

export default function BonTransfert({ transfert, onClose, onError }) {
    const t = transfert;
    const lignes = t.lignes && t.lignes.length > 0 ? t.lignes : [t];

    const [apercu, setApercu] = useState(false);

    const imprimer = () => {
        if (t.statut !== 'valide') return onError?.("Le bon n'est disponible qu'une fois la demande approuvée");
        setApercu(true);
    };

    const genererPdf = () => pdf(<BonTransfertPDF transfert={t} />).toBlob();

    return (
        <>
        <TrModal
            onClose={onClose}
            title="Bon de transfert"
            subtitle={t.numero_transfert}
            footer={
                <>
                    <button className="tr-btn" onClick={onClose}>Fermer</button>
                    <button className="tr-btn tr-btn--primary" onClick={imprimer}>
                        <Printer size={15} /> Imprimer
                    </button>
                </>
            }
        >
            <div className="tr-info">À remettre au chauffeur : il le présente au gérant de l'entrepôt, qui sort la marchandise.</div>
            <div className="tr-card-meta" style={{ gap: 6 }}>
                <span>Entrepôt : <b>{t.entrepot_nom}</b></span>
                <span>Magasin destinataire : <b>{t.magasin_nom || t.demandeur_nom}</b></span>
                {lignes.map((l, i) => (
                    <span key={l.id_transfert || i}>
                        {lignes.length > 1 ? `${i + 1}. ` : 'Produit : '}<b>{l.produit_nom}</b> — <b>{libelleQuantite(l)}</b>
                        {l.quantite_base > 1 && <> ({libelleEquivalent(l)})</>}
                    </span>
                ))}
                <span>Approuvé le {fmtDate(t.date_validation)}{t.approbateur_nom ? ` par ${t.approbateur_nom}` : ''}</span>
            </div>
        </TrModal>
        {apercu && (
            <ApercuImpression
                titre="Bon de transfert"
                sousTitre={t.numero_transfert}
                typeDocument="bon_transfert"
                getBlob={genererPdf}
                fileName={`Bon_${t.numero_transfert || 'transfert'}.pdf`}
                onClose={() => setApercu(false)}
                onError={onError}
            />
        )}
        </>
    );
}