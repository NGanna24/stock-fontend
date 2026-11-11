// config/documents.js
// ============================================================
// CACHETS, SIGNATURE ET MODÈLE DE FACTURE
// Réglés dans Paramètres, utilisés par tous les documents (PDF).
// Les images arrivent en « data URL » : elles s'affichent aussi hors connexion
// une fois chargées.
// ============================================================
import { useEffect, useState } from 'react';
import axios from 'axios';
import API_URL from './api';

export const TYPES_DOCUMENTS = [
  { cle: 'facture', label: 'Facture (A4)', selonPaiement: true },
  { cle: 'ticket', label: 'Ticket de caisse', selonPaiement: true },
  { cle: 'bon_commande', label: 'Bon de commande fournisseur' },
  { cle: 'bon_transfert', label: 'Bon de transfert' },
  { cle: 'retour_fournisseur', label: 'Retour fournisseur' },
  { cle: 'retour_client', label: 'Retour client' },
  { cle: 'releve_client', label: 'Relevé de compte client' },
  { cle: 'rapport_caisse', label: 'Rapport de caisse' },
];

export const MODELES_FACTURE = [
  { cle: 'classique', label: 'Classique', description: 'La facture actuelle : en-tête avec logo, tableau détaillé.' },
  { cle: 'moderne', label: 'Moderne', description: 'Grand bandeau de titre, totaux mis en avant.' },
  { cle: 'epure', label: 'Épuré', description: 'Très sobre, beaucoup de blanc, lignes fines.' },
  { cle: 'compact', label: 'Compact', description: 'Serré pour tenir beaucoup de lignes sur une page.' },
];

const VIDE = { cachets: [], signature: null, regles: {}, modele_facture: 'classique' };
const CLE_LOCALE = 'miyo:reglages-documents';

let reglages = null;
let jetonCharge = null;
let enCours = null;
const abonnes = new Set();
const prevenir = () => abonnes.forEach((fn) => fn(reglages || VIDE));

// Choix ponctuel fait dans l'aperçu avant impression (par type de document)
const ponctuel = {};

const lireLocal = () => {
  try { return JSON.parse(localStorage.getItem(CLE_LOCALE) || 'null'); } catch { return null; }
};
const ecrireLocal = (v) => {
  try { localStorage.setItem(CLE_LOCALE, JSON.stringify(v)); } catch { /* stockage plein : on garde en mémoire */ }
};

export function definirReglagesDocuments(v) {
  reglages = { ...VIDE, ...v };
  ecrireLocal(reglages);
  prevenir();
}

export async function chargerReglagesDocuments(forcer = false) {
  const token = localStorage.getItem('token');
  if (token !== jetonCharge) { reglages = null; enCours = null; jetonCharge = token; }
  if (reglages && !forcer) return reglages;
  if (enCours && !forcer) return enCours;
  enCours = axios.get(API_URL.DOCUMENTS_REGLAGES.TOUT, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => {
      const { cachets, signature, regles, modele_facture } = r.data || {};
      definirReglagesDocuments({ cachets: cachets || [], signature: signature || null, regles: regles || {}, modele_facture: modele_facture || 'classique' });
      return reglages;
    })
    .catch(() => {
      // Hors connexion : dernière version connue
      if (!reglages) reglages = { ...VIDE, ...(lireLocal() || {}) };
      return reglages;
    })
    .finally(() => { enCours = null; });
  return enCours;
}

export function useReglagesDocuments() {
  const [v, setV] = useState(reglages || VIDE);
  useEffect(() => {
    abonnes.add(setV);
    chargerReglagesDocuments().then(setV);
    return () => { abonnes.delete(setV); };
  }, []);
  return v;
}

/** Valeur actuelle (synchrone, pour les PDF) */
export const reglagesDocuments = () => reglages || { ...VIDE, ...(lireLocal() || {}) };

/** Modèle de facture choisi par le magasin */
export const modeleFacture = () => reglagesDocuments().modele_facture || 'classique';

/** Choix ponctuel pour la prochaine impression : undefined = règle, 'aucun', ou id de cachet */
export function definirCachetPonctuel(type, choix) {
  if (choix === undefined || choix === '' || choix === 'regle') delete ponctuel[type];
  else ponctuel[type] = choix;
}
export const cachetPonctuel = (type) => ponctuel[type];

/** État de paiement d'une facture : 'payee' | 'partielle' | 'non_payee' */
export function etatPaiement(total, paye) {
  const t = Number(total) || 0;
  const p = Number(paye) || 0;
  if (t > 0 && p >= t - 0.5) return 'payee';
  if (p > 0) return 'partielle';
  return 'non_payee';
}

/**
 * Cachet et signature à poser sur un document.
 * @param {string} type      clé de TYPES_DOCUMENTS
 * @param {object} contexte  { paiement: 'payee'|'partielle'|'non_payee' } pour les factures
 * @returns {{ cachet: {nom, image}|null, signature: string|null }}
 */
export function cachetPour(type, contexte = {}) {
  const r = reglagesDocuments();
  const regle = r.regles?.[type] || {};
  const trouver = (id) => r.cachets.find((c) => Number(c.id_cachet) === Number(id) && c.image) || null;
  let cachet = null;
  const choix = ponctuel[type];
  if (choix === 'aucun') cachet = null;
  else if (choix !== undefined) cachet = trouver(choix);
  else if (TYPES_DOCUMENTS.find((t) => t.cle === type)?.selonPaiement) cachet = trouver(regle[contexte.paiement || 'non_payee']);
  else cachet = trouver(regle.cachet);
  return { cachet, signature: regle.signature && r.signature ? r.signature : null };
}
