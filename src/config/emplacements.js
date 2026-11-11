// config/emplacements.js
// ============================================================
// EMPLACEMENTS DE LA BOUTIQUE : emplacement > rayon > étagère
// Utilisé par la page Emplacements et par la fiche produit.
// ============================================================
import axios from 'axios';
import API_URL from './api';

const entetes = () => {
  const token = localStorage.getItem('token');
  return { headers: token ? { Authorization: `Bearer ${token}` } : {} };
};

const messageErreur = (e, defaut) => e?.response?.data?.message || defaut;

export const NIVEAUX = [
  { cle: 'emplacement', titre: 'Emplacements', un: 'emplacement', nouveau: 'Nouvel emplacement', exemple: 'Ex : Boutique, Réserve', exempleEntrepot: 'Ex : Zone A, Quai' },
  { cle: 'rayon', titre: 'Rayons', un: 'rayon', nouveau: 'Nouveau rayon', exemple: 'Ex : Rayon A', exempleEntrepot: 'Ex : Allée 1' },
  { cle: 'etagere', titre: 'Étagères', un: 'étagère', nouveau: 'Nouvelle étagère', exemple: 'Ex : Étagère 1', exempleEntrepot: 'Ex : Niveau 2' },
];

// idEntrepot vide = emplacements de la boutique ; sinon ceux de cet entrepôt
export async function listerEmplacements(idEntrepot = null) {
  const r = await axios.get(API_URL.EMPLACEMENTS.LISTE, { ...entetes(), params: idEntrepot ? { entrepot: idEntrepot } : {} });
  return r.data?.emplacements || [];
}

export async function creerEmplacement({ niveau, nom, id_parent, id_entrepot = null }) {
  try {
    const r = await axios.post(API_URL.EMPLACEMENTS.LISTE, { niveau, nom, id_parent: id_parent || null, id_entrepot }, entetes());
    return r.data.emplacement;
  } catch (e) { throw new Error(messageErreur(e, "Impossible d'ajouter")); }
}

export async function renommerEmplacement(id, nom) {
  try {
    const r = await axios.put(API_URL.EMPLACEMENTS.UN(id), { nom }, entetes());
    return r.data.emplacement;
  } catch (e) { throw new Error(messageErreur(e, 'Impossible de renommer')); }
}

export async function supprimerEmplacement(id) {
  try {
    await axios.delete(API_URL.EMPLACEMENTS.UN(id), entetes());
  } catch (e) { throw new Error(messageErreur(e, 'Impossible de supprimer')); }
}

export const enfantsDe = (liste, idParent, niveau) =>
  liste.filter((e) => e.niveau === niveau && (idParent ? e.id_parent === idParent : !e.id_parent));

// À partir du niveau le plus précis choisi, retrouve { emplacement, rayon, etagere } (ids)
export function cheminDe(liste, id) {
  const res = { emplacement: '', rayon: '', etagere: '' };
  let n = liste.find((e) => e.id_emplacement === Number(id));
  let garde = 0;
  while (n && garde++ < 4) {
    res[n.niveau] = n.id_emplacement;
    n = n.id_parent ? liste.find((e) => e.id_emplacement === n.id_parent) : null;
  }
  return res;
}
