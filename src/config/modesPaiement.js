// config/modesPaiement.js
// ============================================================
// MODES DE PAIEMENT — même liste que le serveur (utils/modesPaiement.js).
// Le patron choisit dans Paramètres ceux que sa boutique accepte ;
// useModesPaiement() renvoie seulement ceux-là, dans l'ordre choisi.
// Seules les espèces vont dans le tiroir-caisse.
// ============================================================
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Coins, CreditCard, Building, FileText, Smartphone, MoreHorizontal } from 'lucide-react';
import API_URL from './api';

export const CATALOGUE_MODES = [
  { value: 'especes', label: 'Espèces', Icon: Coins, c: '#C2410C' },
  { value: 'wave', label: 'Wave', Icon: Smartphone, c: '#1D9BF0' },
  { value: 'orange_money', label: 'Orange Money', court: 'Orange', Icon: Smartphone, c: '#EA580C' },
  { value: 'mtn_momo', label: 'MTN MoMo', court: 'MTN', Icon: Smartphone, c: '#CA8A04' },
  { value: 'moov_money', label: 'Moov Money', court: 'Moov', Icon: Smartphone, c: '#1E40AF' },
  { value: 'carte', label: 'Carte bancaire', court: 'Carte', Icon: CreditCard, c: '#2563EB' },
  { value: 'virement', label: 'Virement', Icon: Building, c: '#7C3AED' },
  { value: 'cheque', label: 'Chèque', Icon: FileText, c: '#B45309' },
];

// Anciens codes : plus proposés, mais lisibles dans l'historique
const ANCIENS = [
  { value: 'mobile_money', label: 'Mobile money', court: 'Mobile', Icon: Smartphone, c: '#64748B' },
  { value: 'autre', label: 'Autre', Icon: MoreHorizontal, c: '#64748B' },
];

const TOUS = [...CATALOGUE_MODES, ...ANCIENS];
export const MODES_PAR_DEFAUT = ['especes', 'wave', 'orange_money', 'mtn_momo', 'moov_money'];

export const infoMode = (v) =>
  TOUS.find((m) => m.value === v) || { value: v, label: v || '-', Icon: MoreHorizontal, c: '#64748B' };
export const libelleMode = (v) => (v ? infoMode(v).label : '-');

// ---------- Modes de la boutique (gardés en mémoire pour toute la session) ----------
let actifs = null;
let enCours = null;
const abonnes = new Set();
const prevenir = () => abonnes.forEach((fn) => fn(actifs));

function versListe(codes) {
  return (codes || MODES_PAR_DEFAUT).map(infoMode).filter((m) => CATALOGUE_MODES.some((c) => c.value === m.value));
}

let jetonCharge = null; // un autre compte connecté sur ce poste : on recharge

export async function chargerModesPaiement(forcer = false) {
  const token = localStorage.getItem('token');
  if (token !== jetonCharge) { actifs = null; enCours = null; jetonCharge = token; }
  if (actifs && !forcer) return actifs;
  if (enCours && !forcer) return enCours;
  enCours = axios
    .get(API_URL.MODES_PAIEMENT, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => versListe(r.data?.actifs))
    .catch(() => actifs || versListe(MODES_PAR_DEFAUT))
    .then((liste) => {
      actifs = liste;
      enCours = null;
      prevenir();
      return liste;
    });
  return enCours;
}

// Après l'enregistrement dans Paramètres
export function definirModesPaiement(codes) {
  actifs = versListe(codes);
  prevenir();
}

export function useModesPaiement() {
  const [liste, setListe] = useState(actifs || versListe(MODES_PAR_DEFAUT));
  useEffect(() => {
    abonnes.add(setListe);
    chargerModesPaiement().then(setListe);
    return () => abonnes.delete(setListe);
  }, []);
  return liste;
}

// Si le mode choisi n'est pas accepté par la boutique (ex. espèces décochées),
// on passe au premier mode accepté. actif=false : on ne touche à rien (modification d'une fiche existante).
export function useModeValide(modes, valeur, changer, actif = true) {
  useEffect(() => {
    if (!actif || !modes.length) return;
    if (!modes.some((m) => m.value === valeur)) changer(modes[0].value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modes, valeur, actif]);
}
