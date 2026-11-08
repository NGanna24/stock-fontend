// services/superAdmin/abonnementAdminService.js
import axios from 'axios';
import API_URL from '../../config/api';

const A = API_URL.ADMIN.ABONNEMENTS;

class AbonnementAdminService {
    static async liste() {
        return (await axios.get(A.LISTE)).data;
    }
    static async detail(id) {
        return (await axios.get(A.DETAIL(id))).data;
    }
    static async prolonger(id, donnees) {
        return (await axios.post(A.PROLONGER(id), donnees)).data;
    }
    static async annulerPaiement(id, idAbonnement) {
        return (await axios.delete(A.PAIEMENT(id, idAbonnement))).data;
    }
    static async reglages() {
        return (await axios.get(A.REGLAGES)).data;
    }
    static async enregistrerReglages(donnees) {
        return (await axios.put(A.REGLAGES, donnees)).data;
    }
}

export default AbonnementAdminService;
