// services/superAdmin/magasinAdminService.js
import axios from 'axios';
import API_URL from '../../config/api';

class MagasinAdminService {
    // ============================================================
    // LISTE PAGINÉE + FILTRES
    // ============================================================
    static async getListe(params = {}) {
        const res = await axios.get(API_URL.ADMIN.MAGASINS.LISTE(params));
        return res.data;
    }

    // ============================================================
    // CARTE — tous les magasins géolocalisés
    // ============================================================
    static async getCarte(limit = 1000) {
        const res = await axios.get(API_URL.ADMIN.MAGASINS.CARTE(limit));
        return res.data;
    }

    // ============================================================
    // STATS GLOBALES MAGASINS
    // ============================================================
    static async getStats() {
        const res = await axios.get(API_URL.ADMIN.MAGASINS.STATS);
        return res.data;
    }

    // ============================================================
    // FILTRES — pays + villes
    // ============================================================
    static async getFiltres(pays = null) {
        const res = await axios.get(API_URL.ADMIN.MAGASINS.FILTRES(pays));
        return res.data;
    }

    // ============================================================
    // DÉTAIL D'UN MAGASIN
    // ============================================================
    static async getDetail(id) {
        const res = await axios.get(API_URL.ADMIN.MAGASINS.DETAIL(id));
        return res.data;
    }

    // ============================================================
    // ACTIVER / DÉSACTIVER
    // ============================================================
    static async toggleActif(id, actif) {
        const res = await axios.patch(API_URL.ADMIN.MAGASINS.TOGGLE(id), { actif });
        return res.data;
    }

    // ============================================================
    // METTRE À JOUR LA GÉOLOCALISATION
    // ============================================================
    static async updateGeolocalisation(id, { latitude, longitude, position_source }) {
        const res = await axios.patch(API_URL.ADMIN.MAGASINS.UPDATE_GEO(id), {
            latitude,
            longitude,
            position_source,
        });
        return res.data;
    }
}

export default MagasinAdminService;