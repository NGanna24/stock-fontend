// services/superAdmin/utilisateurAdminService.js
import axios from 'axios';
import API_URL from '../../config/api';

class UtilisateurAdminService {
    static async getListe(params = {}) {
        const res = await axios.get(API_URL.ADMIN.UTILISATEURS_ADMIN.LISTE(params));
        return res.data;
    }

    static async getStats() {
        const res = await axios.get(API_URL.ADMIN.UTILISATEURS_ADMIN.STATS);
        return res.data;
    }

    static async getInactifs(days = 30) {
        const res = await axios.get(API_URL.ADMIN.UTILISATEURS_ADMIN.INACTIFS(days));
        return res.data;
    }

    static async getDetail(id) {
        const res = await axios.get(API_URL.ADMIN.UTILISATEURS_ADMIN.DETAIL(id));
        return res.data;
    }

    static async toggleActif(id, actif) {
        const res = await axios.patch(API_URL.ADMIN.UTILISATEURS_ADMIN.TOGGLE(id), { actif });
        return res.data;
    }
}

export default UtilisateurAdminService;