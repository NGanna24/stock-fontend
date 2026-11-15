// services/superAdmin/suiviAdminService.js
// Pages de suivi de la console Super Admin (le jeton est ajouté par SuperAdminAuthContext).
import axios from 'axios';
import API_URL from '../../config/api';

const S = API_URL.ADMIN.SUIVI;
const lire = async (url, params) => (await axios.get(url, { params })).data;

const SuiviAdminService = {
    alertes: () => lire(S.ALERTES),
    nombreAlertes: () => lire(S.NOMBRE_ALERTES),
    activite: (params) => lire(S.ACTIVITE, params),
    revenus: () => lire(S.REVENUS),
    statistiques: () => lire(S.STATISTIQUES),
    rapport: (params) => lire(S.RAPPORT, params),
    apercu: () => lire(S.APERCU),
    journal: (params) => lire(S.JOURNAL, params),
    securite: () => lire(S.SECURITE),
    debloquer: async (type, id) => (await axios.post(S.DEBLOQUER(type, id))).data,
};

export const PlateformeAdminService = {
    reglages: () => lire(API_URL.ADMIN.PLATEFORME),
    enregistrer: async (donnees) => (await axios.put(API_URL.ADMIN.PLATEFORME, donnees)).data,
    profil: async (fullname) => (await axios.put(API_URL.SUPER_ADMIN_AUTH.PROFIL, { fullname })).data,
};

export default SuiviAdminService;
