// components/Session/VerrouSession.jsx
//
// Verrouillage de l'écran après quelques minutes sans activité (DELAI_VERROU_MIN).
//   - le travail en cours reste en place derrière (panier, formulaire…) ;
//   - on déverrouille avec son code ; sans internet, le code est vérifié sur l'appareil ;
//   - 5 codes faux → déconnexion complète ;
//   - « Changer d'utilisateur » ferme la session (les ventes hors ligne restent gardées).
// Monté une seule fois dans DashboardLayout.
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Lock, Loader, LogOut, AlertTriangle } from 'lucide-react';
import API_URL from '../../config/api';
import { useUser } from '../../context/AuthContext';
import {
  delaiVerrouMin, installerSession, noterActivite, estVerrouille, verrouiller, deverrouiller,
  inactifDepuisTrop, terminerSession, remplacerJeton, verifierCodeLocal, memoriserEmpreinte,
} from '../../securite/session';
import './VerrouSession.css';

const EVENEMENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel', 'scroll'];
const ROLES = { admin: 'Administrateur', manager: 'Manager', caissier: 'Caissier', magasinier: 'Magasinier' };

export default function VerrouSession() {
  const { user } = useUser();
  const [verrou, setVerrou] = useState(() => estVerrouille() || inactifDepuisTrop());
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const champ = useRef(null);

  // Démarrage + suivi de l'activité
  useEffect(() => {
    installerSession();
    if (estVerrouille() || inactifDepuisTrop()) { verrouiller(); setVerrou(true); } else noterActivite();

    let derniere = 0;
    const surActivite = () => {
      if (estVerrouille()) return;
      const t = Date.now();
      if (t - derniere > 10000) { derniere = t; noterActivite(); }
    };
    EVENEMENTS.forEach((e) => window.addEventListener(e, surActivite, { passive: true }));

    const minuterie = setInterval(() => {
      if (!estVerrouille() && inactifDepuisTrop()) { verrouiller(); setVerrou(true); }
    }, 15000);

    // Synchronisation entre onglets
    const surStockage = (e) => {
      if (e.key === 'miyo:verrou') setVerrou(e.newValue === '1');
      if (e.key === 'token' && !e.newValue) window.location.assign('/login');
    };
    window.addEventListener('storage', surStockage);

    return () => {
      EVENEMENTS.forEach((e) => window.removeEventListener(e, surActivite));
      clearInterval(minuterie);
      window.removeEventListener('storage', surStockage);
    };
  }, []);

  useEffect(() => {
    if (verrou) {
      setCode('');
      setErreur(null);
      setTimeout(() => champ.current?.focus(), 50);
    }
  }, [verrou]);

  const ouvrir = () => { deverrouiller(); setVerrou(false); setCode(''); setErreur(null); };

  const valider = async (e) => {
    e?.preventDefault();
    if (envoi || !code) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await axios.post(API_URL.AUTH.VERIFIER_CODE, { password: code }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, timeout: 10000,
      });
      if (r.data?.token) remplacerJeton(r.data.token);
      memoriserEmpreinte(code);
      ouvrir();
    } catch (err) {
      const rep = err.response;
      if (!rep) {
        // Pas d'internet : vérification sur l'appareil
        const local = verifierCodeLocal(code);
        if (local === true) { ouvrir(); return; }
        if (local === null) {
          setErreur('Pas de connexion internet et code non enregistré sur cet appareil : reconnectez-vous quand internet reviendra.');
        } else if (local >= 5) {
          terminerSession('5 codes incorrects : reconnectez-vous.');
        } else {
          setErreur(`Code incorrect (encore ${5 - local} essai${5 - local > 1 ? 's' : ''})`);
        }
      } else if (rep.status === 429) {
        terminerSession(rep.data?.message || 'Compte bloqué après trop de codes incorrects.');
      } else if (rep.status === 401) {
        terminerSession(rep.data?.message || 'Session expirée : reconnectez-vous.');
      } else {
        setErreur(rep.data?.message || 'Code incorrect');
      }
      setCode('');
      setTimeout(() => champ.current?.focus(), 30);
    } finally {
      setEnvoi(false);
    }
  };

  if (!verrou) return null;

  return (
    <div className="vs-fond" role="dialog" aria-modal="true" aria-labelledby="vs-titre">
      <form className="vs-carte" onSubmit={valider}>
        <div className="vs-icone"><Lock size={26} /></div>
        <h2 id="vs-titre">Écran verrouillé</h2>
        <p className="vs-qui">
          <strong>{user?.fullname || 'Utilisateur'}</strong>
          {user?.role && <span>{ROLES[user.role] || user.role}</span>}
        </p>
        <p className="vs-aide">Verrouillé après {delaiVerrouMin()} minutes sans activité. Votre travail en cours est conservé.</p>
        <input
          ref={champ}
          className="vs-code"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={8}
          placeholder="Votre code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
          aria-label="Votre code"
          disabled={envoi}
        />
        {erreur && <p className="vs-erreur" role="alert"><AlertTriangle size={14} /> {erreur}</p>}
        <button type="submit" className="vs-btn" disabled={envoi || !code}>
          {envoi ? <Loader size={16} className="vs-spin" /> : null} Déverrouiller
        </button>
        <button type="button" className="vs-lien" onClick={() => terminerSession(null)} disabled={envoi}>
          <LogOut size={14} /> Changer d'utilisateur
        </button>
      </form>
    </div>
  );
}
