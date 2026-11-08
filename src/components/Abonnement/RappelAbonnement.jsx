// components/Abonnement/RappelAbonnement.jsx
//
// Rappels d'abonnement pour le patron :
//   - 5 jours avant la fin, la veille et le jour même : une fenêtre, une seule fois par étape ;
//   - après la fin : la fenêtre revient à chaque ouverture de Miyo, puis toutes les X minutes
//     (X réglé par le super-admin ; 0 = seulement à l'ouverture), avec les numéros de paiement.
// Le patron peut toujours la fermer et continuer à travailler.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarClock, CalendarX2, Phone } from 'lucide-react';
import { Modal, ModalHead, fcfa } from '../UI/Vt';
import { useUser } from '../../context/AuthContext';
import { chargerAbonnement, dateAbonnement, phraseEcheance } from '../../services/abonnementService';
import MoyensPaiement from './MoyensPaiement';
import './Abonnement.css';

const TROIS_HEURES = 3 * 60 * 60 * 1000;

// Étape du rappel selon les jours restants
const etape = (j) => {
    if (j < 0) return 'expire';
    if (j === 0) return 'j0';
    if (j === 1) return 'j1';
    if (j <= 5) return 'j5';
    return null;
};

const lire = (stockage, cle) => { try { return stockage.getItem(cle); } catch { return null; } };
const ecrire = (stockage, cle, valeur = '1') => { try { stockage.setItem(cle, valeur); } catch { /* stockage indisponible */ } };

export default function RappelAbonnement() {
    const { user } = useUser();
    const [infos, setInfos] = useState(null);
    const [ouvert, setOuvert] = useState(false);
    const minuteur = useRef(null);

    const estPatron = !!user && user.type !== 'employe' && user.role === 'admin';

    const verifier = useCallback(async () => {
        if (!estPatron) return;
        try {
            const r = await chargerAbonnement();
            if (!r) return;
            const e = etape(r.abonnement.jours_restants);
            if (!e) return;

            // Avant la fin : une seule fois par étape (J-5, J-1, jour J)
            // Expiré : à chaque ouverture de Miyo (mémoire de session effacée à la fermeture),
            //          puis de nouveau quand l'intervalle réglé par le super-admin est écoulé.
            const stockage = e === 'expire' ? sessionStorage : localStorage;
            const cle = `miyo:abo-rappel:${r.abonnement.id_utilisateur}:${r.abonnement.date_fin}:${e}`;
            const dejaVu = lire(stockage, cle);
            if (dejaVu) {
                if (e !== 'expire') return;
                const intervalle = Number(r.rappel_expire_minutes) || 0;
                if (!intervalle) return;
                const reste = Number(dejaVu) + intervalle * 60000 - Date.now();
                if (reste > 0) {
                    // Pas encore le moment : on revient vérifier à l'heure prévue
                    clearTimeout(minuteur.current);
                    minuteur.current = setTimeout(() => verifierRef.current?.(), reste + 1000);
                    return;
                }
            }

            setInfos({ ...r, etape: e, cle, stockage });
            setOuvert(true);
        } catch {
            // Pas de connexion : on réessaiera plus tard
        }
    }, [estPatron]);

    const verifierRef = useRef(verifier);
    verifierRef.current = verifier;

    useEffect(() => () => clearTimeout(minuteur.current), []);

    useEffect(() => {
        verifier();
        const t = setInterval(verifier, TROIS_HEURES);
        return () => clearInterval(t);
    }, [verifier]);

    // Mise à jour immédiate après un renouvellement (ex. depuis les Paramètres)
    useEffect(() => {
        const surMaj = () => verifier();
        window.addEventListener('miyo:abonnement', surMaj);
        return () => window.removeEventListener('miyo:abonnement', surMaj);
    }, [verifier]);

    if (!ouvert || !infos) return null;

    const { abonnement: abo, moyens, contact, etape: e } = infos;
    const expire = e === 'expire';

    const fermer = () => {
        // On note l'heure de fermeture : sert à réafficher la fenêtre après l'intervalle
        ecrire(infos.stockage, infos.cle, String(Date.now()));
        setOuvert(false);
        const intervalle = Number(infos.rappel_expire_minutes) || 0;
        if (expire && intervalle) {
            clearTimeout(minuteur.current);
            minuteur.current = setTimeout(() => verifierRef.current?.(), intervalle * 60000 + 1000);
        }
    };

    return (
        <Modal onClose={fermer} size="md" labelledBy="abo-rappel-titre" className={`abo-rappel ${expire ? 'abo-rappel--expire' : ''}`}>
            <ModalHead
                id="abo-rappel-titre"
                title={expire ? 'Abonnement à renouveler' : 'Rappel d\'abonnement'}
                sub={phraseEcheance(abo)}
                onClose={fermer}
            />
            <div className="vt-modal-body">
                <div className={`abo-tete ${expire ? 'abo-tete--expire' : ''}`}>
                    <span className="abo-tete-icone" aria-hidden="true">
                        {expire ? <CalendarX2 size={22} /> : <CalendarClock size={22} />}
                    </span>
                    <div>
                        <strong>
                            {expire
                                ? `Fin le ${dateAbonnement(abo.date_fin)}`
                                : `Valable jusqu'au ${dateAbonnement(abo.date_fin)}`}
                        </strong>
                        <span>
                            {expire
                                ? 'Renouvelez pour continuer à utiliser Miyo en toute tranquillité.'
                                : 'Pensez à renouveler pour ne pas être interrompu.'}
                        </span>
                    </div>
                </div>

                <div className="abo-montant">
                    <span>Montant à payer</span>
                    <strong className="vt-num">{fcfa(abo.montant_mensuel)} <small>par mois</small></strong>
                    <span className="abo-montant-detail">
                        Pour {abo.nb_produits} produit{abo.nb_produits > 1 ? 's' : ''} enregistré{abo.nb_produits > 1 ? 's' : ''}
                    </span>
                </div>

                <h3 className="abo-sous-titre">Payez sur l'un de ces numéros</h3>
                <MoyensPaiement moyens={moyens} />

                <p className="abo-note">
                    {contact ? (
                        <>
                            <Phone size={14} aria-hidden="true" />
                            <span>
                                Après le paiement, envoyez la référence de la transaction au <strong>{contact}</strong>.
                                Votre abonnement sera prolongé dès réception.
                            </span>
                        </>
                    ) : (
                        <span>Après le paiement, votre abonnement sera prolongé dès réception.</span>
                    )}
                </p>
            </div>
            <div className="vt-modal-foot vt-modal-foot--end">
                <button type="button" className="vt-btn vt-btn--primary" onClick={fermer}>
                    {expire ? 'Continuer' : 'J\'ai compris'}
                </button>
            </div>
        </Modal>
    );
}
