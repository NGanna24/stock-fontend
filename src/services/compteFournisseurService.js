// services/compteFournisseurService.js — comptes fournisseurs (carnet de compte, hors stock)
import axios from 'axios';
import API_URL from '../config/api';

const entetes = () => {
  const token = localStorage.getItem('token');
  return { headers: token ? { Authorization: `Bearer ${token}` } : {} };
};

const appel = async (promesse, defaut) => {
  try {
    const r = await promesse;
    return r.data;
  } catch (e) {
    throw new Error(e?.response?.data?.message || defaut);
  }
};

// Les opérations avec justificatif partent en multipart (photo ou PDF)
const formulaire = (donnees) => {
  if (!donnees.justificatif) {
    const { justificatif, ...reste } = donnees;
    return reste;
  }
  const fd = new FormData();
  Object.entries(donnees).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    fd.append(k, v);
  });
  return fd;
};

const U = () => API_URL.COMPTES_FOURNISSEURS;

const CompteFournisseurService = {
  tableau: () => appel(axios.get(U().LISTE, entetes()), 'Impossible de charger les comptes'),
  creer: (d) => appel(axios.post(U().LISTE, d, entetes()), 'Impossible de créer le compte'),
  detail: (id) => appel(axios.get(U().UN(id), entetes()), 'Impossible de charger le compte'),
  modifier: (id, d) => appel(axios.put(U().UN(id), d, entetes()), 'Impossible de modifier le compte'),
  operations: (id, filtres) => appel(axios.get(U().OPERATIONS(id), { ...entetes(), params: filtres }), "Impossible de charger l'historique"),
  achat: (id, d) => appel(axios.post(U().ACHATS(id), formulaire(d), entetes()), "Impossible d'enregistrer l'achat"),
  versement: (id, d) => appel(axios.post(U().VERSEMENTS(id), formulaire(d), entetes()), "Impossible d'enregistrer le versement"),
  bonus: (id, d) => appel(axios.post(U().BONUS(id), formulaire(d), entetes()), "Impossible d'enregistrer le bonus"),
  utiliserBonus: (id, d) => appel(axios.post(U().UTILISER_BONUS(id), d, entetes()), "Impossible d'utiliser le bonus"),
  ajustement: (id, d) => appel(axios.post(U().AJUSTEMENTS(id), formulaire(d), entetes()), "Impossible d'enregistrer l'ajustement"),
  plafond: (id, d) => appel(axios.post(U().PLAFOND(id), d, entetes()), 'Impossible de modifier le plafond'),
  annuler: (idOp, motif) => appel(axios.post(U().ANNULER(idOp), { motif }, entetes()), "Impossible d'annuler"),
  annulerVersement: (idPaiement, motif) => appel(axios.post(U().ANNULER_VERSEMENT(idPaiement), { motif }, entetes()), "Impossible d'annuler le versement"),
  commandes: (id) => appel(axios.get(U().COMMANDES(id), entetes()), 'Impossible de charger les commandes'),
  rapprochements: (id) => appel(axios.get(U().RAPPROCHEMENTS(id), entetes()), 'Impossible de charger les rapprochements'),
  rapprocher: (id, d) => appel(axios.post(U().RAPPROCHEMENTS(id), d, entetes()), "Impossible d'enregistrer le rapprochement"),
  resoudre: (idR, note) => appel(axios.put(U().RESOUDRE(idR), { note }, entetes()), "Impossible de régler l'écart"),
  // Le justificatif n'est pas public : on le récupère avec la connexion puis on l'affiche
  justificatif: async (source, id) => {
    try {
      const url = source === 'versement' ? U().JUSTIFICATIF_VERSEMENT(id) : U().JUSTIFICATIF(id);
      const r = await axios.get(url, { ...entetes(), responseType: 'blob' });
      return URL.createObjectURL(r.data);
    } catch {
      throw new Error('Justificatif introuvable');
    }
  },
};

export default CompteFournisseurService;
