// components/Parametres/ModeleFacture.jsx
// Paramètres > Modèle de facture (patron) : 4 modèles aux couleurs Miyo,
// aperçu sur une facture d'exemple, et choix pour tout le magasin.
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { pdf } from '@react-pdf/renderer';
import { Eye, Check, Loader } from 'lucide-react';
import API_URL from '../../config/api';
import { MODELES_FACTURE, definirReglagesDocuments, useReglagesDocuments } from '../../config/documents';
import MagasinService from '../../services/magasinService';
import FacturePDF from '../Facture/FacturePDF';
import ApercuImpression from '../Impression/ApercuImpression';
import './ModeleFacture.css';

// Facture d'exemple (avec vos informations de magasin)
const exemple = (magasin) => ({
  numero_facture: 'FV-EXEMPLE-0001',
  date_facture: new Date().toISOString(),
  date_echeance: new Date(Date.now() + 30 * 86400000).toISOString(),
  nomclient: 'Client exemple',
  telephone: '07 00 00 00 00',
  montant_total: 187500,
  statut: 'partiellement_payee',
  mode_paiement: 'wave',
  numero_commande: 'CV-EXEMPLE-0001',
  lignes: [
    { produit_nom: 'Huile moteur 4T 1L', quantite: 6, prix_vente: 5500 },
    { produit_nom: 'Plaquettes de frein avant', marque_nom: 'Yuzin', quantite: 4, prix_vente: 12000 },
    { produit_nom: 'Chaîne de transmission 428', quantite: 2, prix_vente: 25000 },
    { produit_nom: 'Bougie NGK', quantite: 10, prix_vente: 4000, remise: 5 },
    { produit_nom: 'Pneu arrière 3.00-18', quantite: 1, prix_vente: 22000 },
  ],
  paiements: [{ montant: 100000 }],
  magasin: magasin || { nom_commercial: 'Mon magasin' },
});

// Petite maquette dessinée en CSS (pas d'image à charger)
function Miniature({ cle }) {
  return (
    <div className={`mf-mini mf-mini--${cle}`} aria-hidden="true">
      <div className="mf-mini-tete"><span className="mf-mini-logo" /><span className="mf-mini-titre" /></div>
      <div className="mf-mini-infos"><span /><span /></div>
      <div className="mf-mini-table">{[0, 1, 2, 3].map((i) => <span key={i} />)}</div>
      <div className="mf-mini-total"><span /></div>
    </div>
  );
}

export default function ModeleFacture({ afficher }) {
  const reglages = useReglagesDocuments();
  const [choix, setChoix] = useState(reglages.modele_facture || 'classique');
  const [magasin, setMagasin] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => { setChoix(reglages.modele_facture || 'classique'); }, [reglages.modele_facture]);
  useEffect(() => {
    MagasinService.getMonMagasin(localStorage.getItem('token'))
      .then((r) => r?.success && setMagasin(r.magasin || r.data))
      .catch(() => {});
  }, []);

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      const r = await axios.put(API_URL.DOCUMENTS_REGLAGES.TOUT, { modele_facture: choix },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      definirReglagesDocuments({ cachets: r.data.cachets, signature: r.data.signature, regles: r.data.regles, modele_facture: r.data.modele_facture });
      afficher(`Modèle « ${MODELES_FACTURE.find((m) => m.cle === choix)?.label} » utilisé pour toutes les factures`, 'success');
    } catch (e) {
      afficher(e?.response?.data?.message || "Impossible d'enregistrer le modèle", 'error');
    } finally { setEnvoi(false); }
  };

  const actuel = reglages.modele_facture || 'classique';

  return (
    <div className="mf">
      <ol className="mf-grille" role="radiogroup" aria-label="Modèle de facture">
        {MODELES_FACTURE.map((m, i) => (
          <li key={m.cle} className={`mf-carte ${choix === m.cle ? 'is-choisi' : ''}`}>
            <button type="button" role="radio" aria-checked={choix === m.cle} className="mf-choisir" onClick={() => setChoix(m.cle)}>
              <Miniature cle={m.cle} />
              <span className="mf-nom"><span className="mf-num">{i + 1}</span> {m.label}
                {actuel === m.cle && <span className="mf-actuel">Utilisé</span>}</span>
              <span className="mf-desc">{m.description}</span>
            </button>
            <button type="button" className="vt-btn vt-btn--sm mf-voir" onClick={() => setApercu(m.cle)}>
              <Eye size={14} /> Aperçu
            </button>
          </li>
        ))}
      </ol>
      <div className="pr-actions">
        <button type="button" className="vt-btn vt-btn--primary" onClick={enregistrer} disabled={envoi || choix === actuel}>
          {envoi ? <Loader size={15} className="vt-spin" /> : <Check size={15} />} Utiliser ce modèle
        </button>
      </div>

      {apercu && (
        <ApercuImpression
          titre={`Modèle ${MODELES_FACTURE.find((m) => m.cle === apercu)?.label}`}
          sousTitre="Facture d'exemple avec les informations de votre magasin"
          typeDocument="facture"
          getBlob={() => pdf(React.createElement(FacturePDF, { data: exemple(magasin), modele: apercu })).toBlob()}
          fileName={`Modele_facture_${apercu}.pdf`}
          onClose={() => setApercu(null)}
        />
      )}
    </div>
  );
}
