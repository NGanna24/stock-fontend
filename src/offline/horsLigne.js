// offline/horsLigne.js
//
// Mode hors ligne des ventes.
//   1. Quand internet fonctionne : on garde sur l'appareil le catalogue (produits, stock, prix,
//      unités de vente) et la fiche du magasin (pour imprimer le ticket).
//   2. Quand internet coupe : la page Ventes cherche les produits dans ce catalogue et
//      enregistre les ventes (et leurs paiements) sur l'appareil, avec un numéro provisoire.
//   3. Au retour de la connexion : les ventes sont envoyées automatiquement au serveur, qui
//      les enregistre une seule fois (même si l'envoi est coupé et recommencé).
//
// Utilisation dans un composant : const hl = useHorsLigne();  hl.enLigne, hl.enAttente…
import { useSyncExternalStore } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import {
  lireKV, ecrireKV, toutesLesVentes, lireVente, ecrireVente, supprimerVente,
} from './stockage';

const DELAI_PING_MS = 5000;
const INTERVALLE_VERIF_MS = 20000;     // test de connexion quand on est hors ligne
const INTERVALLE_SYNCHRO_MS = 60000;   // nouvel essai d'envoi quand des ventes attendent
const CATALOGUE_FRAIS_MS = 2 * 60000;  // pas de nouveau téléchargement avant 2 min
const TAILLE_LOT = 20;

// ============================================================
// ÉTAT PARTAGÉ (lu par le hook useHorsLigne)
// ============================================================
let etat = {
  enLigne: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  pret: false,              // catalogue disponible sur l'appareil
  catalogueDate: null,
  nbProduits: 0,
  enAttente: 0,             // ventes de l'utilisateur connecté à envoyer
  autresUtilisateurs: 0,    // ventes d'un autre compte, envoyées quand il se reconnectera
  rejetees: 0,
  synchro: false,
  derniereSynchro: null,
  dernierBilan: null,       // { envoyees, ruptures: [...], rejetees: [...], avertissements: [...] }
};
const abonnes = new Set();
const publier = (patch) => {
  etat = { ...etat, ...patch };
  abonnes.forEach((f) => f());
};
const abonner = (f) => { abonnes.add(f); return () => abonnes.delete(f); };
const instantane = () => etat;

export const useHorsLigne = () => useSyncExternalStore(abonner, instantane, instantane);
export const etatHorsLigne = () => etat;
export const estHorsLigne = () => !etat.enLigne;

// ============================================================
// UTILITAIRES
// ============================================================
const utilisateurCourant = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (!u || u.id == null) return null;
    return { cle: `${u.type === 'employe' ? 'employe' : 'utilisateur'}:${u.id}`, nom: u.fullname || u.nom || '' };
  } catch {
    return null;
  }
};
const jeton = () => localStorage.getItem('token');
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const arrondi = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Erreur réseau (pas de réponse du serveur), à distinguer d'un refus du serveur. */
// (les services de Miyo transforment souvent l'erreur axios en « Impossible de contacter le serveur… »)
export const estErreurReseau = (err) => {
  if (!err || err.response) return false;
  if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || err.request) return true;
  return /network error|contacter le serveur|failed to fetch/i.test(String(err.message || ''));
};

const nouvelIdLocal = () => {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch { /* ancien navigateur */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
};

/** Code court de l'appareil (dans le numéro provisoire : HL-K7Q2-0004) */
const codeAppareil = () => {
  let c = localStorage.getItem('miyo:hl:appareil');
  if (!c) {
    const lettres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    c = Array.from({ length: 4 }, () => lettres[Math.floor(Math.random() * lettres.length)]).join('');
    localStorage.setItem('miyo:hl:appareil', c);
  }
  return c;
};
const numeroProvisoire = () => {
  const n = (parseInt(localStorage.getItem('miyo:hl:compteur') || '0', 10) || 0) + 1;
  localStorage.setItem('miyo:hl:compteur', String(n));
  return `HL-${codeAppareil()}-${String(n).padStart(4, '0')}`;
};

// ============================================================
// CONNEXION
// ============================================================
let verifEnCours = null;

/** Le serveur est-il joignable ? (n'importe quelle réponse HTTP suffit) */
export function verifierConnexion() {
  if (verifEnCours) return verifEnCours;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    marquerHorsLigne();
    return Promise.resolve(false);
  }
  verifEnCours = (async () => {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const minuterie = setTimeout(() => ctrl?.abort(), DELAI_PING_MS);
    try {
      await fetch(`${API_URL.HORS_LIGNE.PING}?t=${Date.now()}`, { mode: 'no-cors', cache: 'no-store', signal: ctrl?.signal });
      marquerEnLigne();
      return true;
    } catch {
      marquerHorsLigne();
      return false;
    } finally {
      clearTimeout(minuterie);
      verifEnCours = null;
    }
  })();
  return verifEnCours;
}

function marquerHorsLigne() {
  if (etat.enLigne) publier({ enLigne: false });
}

function marquerEnLigne() {
  if (!etat.enLigne) {
    publier({ enLigne: true });
    // Retour de la connexion : on envoie tout de suite ce qui attend
    synchroniser().catch(() => {});
  }
}

// ============================================================
// CATALOGUE (produits + magasin)
// ============================================================
let catalogueMemoire = null; // { cle, produits, genere_le }

const cleCatalogue = () => `catalogue:${utilisateurCourant()?.cle || 'anonyme'}`;
const cleMagasin = () => `magasin:${utilisateurCourant()?.cle || 'anonyme'}`;

async function chargerCatalogue() {
  const cle = cleCatalogue();
  if (catalogueMemoire && catalogueMemoire.cle === cle) return catalogueMemoire;
  const c = await lireKV(cle);
  catalogueMemoire = c ? { ...c, cle } : { cle, produits: [], genere_le: null };
  publier({ pret: catalogueMemoire.produits.length > 0, catalogueDate: catalogueMemoire.genere_le, nbProduits: catalogueMemoire.produits.length });
  return catalogueMemoire;
}

/** Image distante → data URL (pour imprimer le logo sans internet). Échec silencieux. */
async function enDataUrl(url) {
  try {
    const r = await fetch(url, { cache: 'force-cache' });
    if (!r.ok) return null;
    const blob = await r.blob();
    if (blob.size > 400 * 1024) return null;
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Télécharge le catalogue (et la fiche du magasin) pour pouvoir vendre hors ligne.
 * Sans effet si le dernier téléchargement a moins de 2 minutes (sauf force = true).
 */
export async function preparer({ force = false, magasin = null } = {}) {
  const token = jeton();
  if (!token || !utilisateurCourant()) return false;
  const actuel = await chargerCatalogue();
  if (!force && actuel.genere_le && Date.now() - new Date(actuel.recu_le || actuel.genere_le).getTime() < CATALOGUE_FRAIS_MS) {
    if (magasin) await memoriserMagasin(magasin);
    return true;
  }
  try {
    const res = await axios.get(API_URL.HORS_LIGNE.CATALOGUE, { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 });
    const data = res.data?.data;
    if (!data?.produits) return false;
    const c = { produits: data.produits, genere_le: data.genere_le, recu_le: new Date().toISOString() };
    await ecrireKV(cleCatalogue(), c);
    catalogueMemoire = { ...c, cle: cleCatalogue() };
    publier({ pret: c.produits.length > 0, catalogueDate: c.genere_le, nbProduits: c.produits.length });
    if (magasin) await memoriserMagasin(magasin);
    return true;
  } catch (err) {
    if (estErreurReseau(err)) marquerHorsLigne();
    return false;
  }
}

/** Garde la fiche du magasin (logo converti en image locale) pour les tickets hors ligne. */
export async function memoriserMagasin(magasin) {
  if (!magasin) return;
  const precedent = await lireKV(cleMagasin());
  let logo = precedent?.logo_url_source === magasin.logo_url ? precedent.logo_hors_ligne : null;
  if (magasin.logo_url && !logo) {
    const base = API_URL.HORS_LIGNE.CATALOGUE.replace(/\/api\/.*$/, '');
    const url = magasin.logo_url.startsWith('http') ? magasin.logo_url : `${base}${magasin.logo_url}`;
    logo = await enDataUrl(url);
  }
  await ecrireKV(cleMagasin(), { ...magasin, logo_url_source: magasin.logo_url || null, logo_hors_ligne: logo });
}

/** Fiche du magasin utilisable sans internet (logo en image locale, ou sans logo). */
export async function magasinHorsLigne() {
  const m = await lireKV(cleMagasin());
  if (!m) return null;
  const reste = { ...m };
  delete reste.logo_url_source;
  delete reste.logo_hors_ligne;
  return { ...reste, logo_url: m.logo_hors_ligne || null };
}

// ============================================================
// STOCK ET RECHERCHE SANS INTERNET
// ============================================================
/** Quantités (en unité de base) déjà vendues hors ligne et pas encore envoyées, par produit. */
async function quantitesEnAttente() {
  const map = new Map();
  (await toutesLesVentes()).forEach((v) => {
    if (v.statut === 'envoyee') return;
    v.lignes.forEach((l) => map.set(l.id_produit, (map.get(l.id_produit) || 0) + (Number(l.quantite_totale_base) || 0)));
  });
  return map;
}

/** Produits correspondant au texte (nom ou modèle), avec le stock restant sur cet appareil. */
export async function rechercherProduits(texte, { avecRupture = false } = {}) {
  const { produits } = await chargerCatalogue();
  const q = norm(texte).trim();
  if (q.length < 2) return [];
  const mots = q.split(/\s+/);
  const reserve = await quantitesEnAttente();
  return produits
    .filter((p) => {
      const cible = norm(`${p.nom} ${p.modele_nom || ''} ${p.marque_nom || ''}`);
      return mots.every((m) => cible.includes(m));
    })
    .map((p) => ({ ...p, quantite_stock: arrondi(p.quantite_stock - (reserve.get(p.id_produit) || 0)), _horsLigne: true }))
    .filter((p) => avecRupture || p.quantite_stock > 0)
    .slice(0, 50);
}

export async function unitesVente(idProduit) {
  const { produits } = await chargerCatalogue();
  return produits.find((p) => p.id_produit === idProduit)?.unites_vente || [];
}

export async function stockRestant(idProduit) {
  const { produits } = await chargerCatalogue();
  const p = produits.find((x) => x.id_produit === idProduit);
  if (!p) return 0;
  const reserve = await quantitesEnAttente();
  return arrondi(p.quantite_stock - (reserve.get(idProduit) || 0));
}

// ============================================================
// VENTES HORS LIGNE
// ============================================================
async function recompter() {
  const moi = utilisateurCourant()?.cle;
  const ventes = await toutesLesVentes();
  publier({
    enAttente: ventes.filter((v) => v.proprietaire === moi && v.statut !== 'rejetee').length,
    rejetees: ventes.filter((v) => v.proprietaire === moi && v.statut === 'rejetee').length,
    autresUtilisateurs: ventes.filter((v) => v.proprietaire !== moi).length,
  });
}

/**
 * Enregistre une vente sur l'appareil.
 * data = { nomclient, telephone, mode_paiement, lignes: [{ id_produit, produit_nom, id_unite_vente,
 *          nom_unite_vente, quantite_base, quantite, quantite_totale_base, prix_vente }] }
 */
export async function creerVente(data) {
  const u = utilisateurCourant();
  if (!u) throw new Error('Session introuvable : reconnectez-vous une fois avec internet.');
  const vente = {
    id_local: nouvelIdLocal(),
    numero_provisoire: numeroProvisoire(),
    date_vente: new Date().toISOString(),
    proprietaire: u.cle,
    vendeur_nom: u.nom,
    nomclient: data.nomclient || null,
    telephone: data.telephone || null,
    mode_paiement: data.mode_paiement || 'especes',
    lignes: data.lignes.map((l) => ({
      id_produit: l.id_produit,
      produit_nom: l.produit_nom,
      modele_nom: l.modele_nom || '',
      id_unite_vente: l.id_unite_vente || null,
      nom_unite_vente: l.nom_unite_vente || 'Unité',
      quantite_base: Number(l.quantite_base) || 1,
      quantite: Number(l.quantite),
      quantite_totale_base: Number(l.quantite_totale_base) || Number(l.quantite) * (Number(l.quantite_base) || 1),
      prix_vente: Number(l.prix_vente),
      remise: 0,
    })),
    paiements: [],
    statut: 'en_attente',
    message: null,
  };
  vente.montant_total = arrondi(vente.lignes.reduce((s, l) => s + l.quantite * l.prix_vente, 0));
  await ecrireVente(vente);
  await recompter();
  return vente;
}

/** Ajoute un paiement à une vente hors ligne pas encore envoyée. */
export async function ajouterPaiement(idLocal, { montant, mode_paiement = 'especes' }) {
  const v = await lireVente(idLocal);
  if (!v) throw new Error('Vente introuvable sur cet appareil (déjà envoyée ?)');
  const paye = v.paiements.reduce((s, p) => s + p.montant, 0);
  const m = arrondi(montant);
  if (!(m > 0) || m > v.montant_total - paye + 0.001) throw new Error('Montant invalide');
  v.paiements.push({ montant: m, mode_paiement, date: new Date().toISOString() });
  await ecrireVente(v);
  return v;
}

export async function ventesLocales() {
  const moi = utilisateurCourant()?.cle;
  return (await toutesLesVentes()).map((v) => ({ ...v, estAMoi: v.proprietaire === moi }));
}

/** Supprime une vente refusée par le serveur (après vérification par l'utilisateur). */
export async function abandonnerVente(idLocal) {
  const v = await lireVente(idLocal);
  if (!v || v.statut !== 'rejetee') throw new Error('Seule une vente refusée peut être supprimée');
  await supprimerVente(idLocal);
  await recompter();
}

/** Renvoie une vente refusée (après correction côté serveur, ex. produit recréé). */
export async function reessayerVente(idLocal) {
  const v = await lireVente(idLocal);
  if (!v) return;
  v.statut = 'en_attente';
  v.message = null;
  await ecrireVente(v);
  await recompter();
  return synchroniser();
}

// ============================================================
// SYNCHRONISATION
// ============================================================
let synchroEnCours = null;

/**
 * Envoie les ventes en attente de l'utilisateur connecté.
 * → { envoyees, ruptures, rejetees, avertissements } ou null si rien à faire / pas de connexion.
 */
export function synchroniser() {
  if (synchroEnCours) return synchroEnCours;
  synchroEnCours = (async () => {
    const token = jeton();
    const moi = utilisateurCourant()?.cle;
    if (!token || !moi) return null;
    const aEnvoyer = (await toutesLesVentes()).filter((v) => v.proprietaire === moi && v.statut === 'en_attente');
    if (!aEnvoyer.length) { await recompter(); return null; }

    publier({ synchro: true });
    const bilan = { envoyees: [], ruptures: [], rejetees: [], avertissements: [] };
    try {
      for (let i = 0; i < aEnvoyer.length; i += TAILLE_LOT) {
        const lot = aEnvoyer.slice(i, i + TAILLE_LOT);
        let res;
        try {
          res = await axios.post(API_URL.HORS_LIGNE.VENTES, {
            ventes: lot.map((v) => ({
              id_local: v.id_local,
              numero_provisoire: v.numero_provisoire,
              date_vente: v.date_vente,
              nomclient: v.nomclient,
              telephone: v.telephone,
              mode_paiement: v.mode_paiement,
              lignes: v.lignes,
              paiements: v.paiements,
            })),
          }, { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 });
        } catch (err) {
          if (estErreurReseau(err)) { marquerHorsLigne(); break; }
          // Session expirée, droits… : on garde les ventes, nouvel essai plus tard
          bilan.avertissements.push(err.response?.data?.message || err.message);
          break;
        }
        marquerEnLigne();
        for (const r of res.data?.data?.resultats || []) {
          const v = lot.find((x) => x.id_local === r.id_local);
          if (!v) continue;
          if (r.statut === 'synchronisee' || r.statut === 'deja_recue') {
            await supprimerVente(v.id_local);
            bilan.envoyees.push({ numero_provisoire: v.numero_provisoire, numero_commande: r.numero_commande, numero_facture: r.numero_facture, nomclient: v.nomclient, montant_total: v.montant_total });
            (r.ruptures || []).forEach((x) => bilan.ruptures.push({ ...x, numero_commande: r.numero_commande }));
            (r.avertissements || []).forEach((a) => bilan.avertissements.push(`${r.numero_commande} : ${a}`));
          } else if (r.statut === 'rejetee') {
            await ecrireVente({ ...v, statut: 'rejetee', message: r.message });
            bilan.rejetees.push({ numero_provisoire: v.numero_provisoire, message: r.message });
          }
          // 'en_cours' / 'erreur' : on la garde, elle repartira au prochain essai
        }
      }
    } finally {
      await recompter();
      const aRetenir = bilan.envoyees.length || bilan.rejetees.length || bilan.avertissements.length;
      publier({
        synchro: false,
        ...(aRetenir ? { derniereSynchro: new Date().toISOString(), dernierBilan: bilan } : {}),
      });
      if (bilan.envoyees.length) {
        await historiser(bilan);
        // Le stock a changé : on recharge le catalogue
        preparer({ force: true }).catch(() => {});
        window.dispatchEvent(new CustomEvent('miyo:ventes-synchronisees', { detail: bilan }));
      }
    }
    return bilan;
  })().finally(() => { synchroEnCours = null; });
  return synchroEnCours;
}

async function historiser(bilan) {
  const cle = `historique:${utilisateurCourant()?.cle || 'anonyme'}`;
  const avant = (await lireKV(cle)) || [];
  const quand = new Date().toISOString();
  const lignes = bilan.envoyees.map((e) => ({
    ...e,
    envoye_le: quand,
    ruptures: bilan.ruptures.filter((r) => r.numero_commande === e.numero_commande),
  }));
  await ecrireKV(cle, [...lignes, ...avant].slice(0, 50));
}

export async function historiqueEnvois() {
  return (await lireKV(`historique:${utilisateurCourant()?.cle || 'anonyme'}`)) || [];
}

export const oublierBilan = () => publier({ dernierBilan: null });

/** À appeler après une connexion / un changement de compte : recharge catalogue et compteurs. */
export async function actualiser() {
  catalogueMemoire = null;
  await chargerCatalogue();
  await recompter();
}

// ============================================================
// DÉMARRAGE (une seule fois, depuis le tableau de bord)
// ============================================================
let demarre = false;

export function demarrerHorsLigne() {
  if (demarre) return;
  demarre = true;

  window.addEventListener('online', () => verifierConnexion());
  window.addEventListener('offline', marquerHorsLigne);

  // Toute requête de l'application nous renseigne sur l'état de la connexion
  axios.interceptors.response.use(
    (reponse) => { marquerEnLigne(); return reponse; },
    (err) => {
      if (axios.isCancel?.(err)) return Promise.reject(err);
      if (err?.response) marquerEnLigne();
      else if (estErreurReseau(err)) verifierConnexion();
      return Promise.reject(err);
    }
  );

  setInterval(() => {
    if (!etat.enLigne) verifierConnexion();
  }, INTERVALLE_VERIF_MS);
  setInterval(() => {
    if (etat.enLigne && etat.enAttente > 0 && !etat.synchro) synchroniser().catch(() => {});
  }, INTERVALLE_SYNCHRO_MS);

  chargerCatalogue().then(recompter).then(() => verifierConnexion()).then((ok) => {
    if (ok) {
      synchroniser().catch(() => {});
      preparer().catch(() => {});
    }
  });
}
