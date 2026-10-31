// services/mouvementEntrepotService.js
import API_URL from '../config/api';
import axios from 'axios';

class MouvementEntrepotService {
    static _headers(token) {
        return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    }

    /** Journal : filtres { type, q, date_debut, date_fin, id_produit_entrepot, page, limit } */
    static async list(token, id_entrepot, filtres = {}) {
        try {
            const params = {};
            Object.entries(filtres).forEach(([k, v]) => { if (v !== '' && v != null) params[k] = v; });
            const r = await axios.get(API_URL.MOUVEMENT_ENTREPOT.LIST(id_entrepot), { headers: this._headers(token), params });
            return r.data;
        } catch (error) {
            console.error('❌ Mouvements error:', error);
            throw this.handleError(error);
        }
    }

    static async synthese(token, id_entrepot, jours = 30) {
        try {
            const r = await axios.get(API_URL.MOUVEMENT_ENTREPOT.SYNTHESE(id_entrepot), { headers: this._headers(token), params: { jours } });
            return r.data;
        } catch (error) {
            console.error('❌ Synthèse entrepôt error:', error);
            throw this.handleError(error);
        }
    }

    static handleError(error) {
        if (error.response) return new Error(error.response.data?.message || error.response.statusText || 'Erreur serveur');
        if (error.request) return new Error('Impossible de contacter le serveur.');
        return new Error(error.message || 'Erreur inattendue');
    }
}

export default MouvementEntrepotService;