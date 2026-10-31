// services/entrepotService.js
import API_URL from '../config/api';
import axios from 'axios';

class EntrepotService {
    static headers(token) {
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Liste des entrepôts de l'utilisateur connecté.
     * (nom historique : getMesEntrepots — exposé aussi via l'alias getAll)
     */
    static async getMesEntrepots(token) {
        try {
            const r = await axios.get(API_URL.ENTREPOT.GET_ALL, { headers: this.headers(token) });
            return r.data;
        } catch (error) {
            console.error('❌ GetMesEntrepots error:', error);
            throw this.handleError(error);
        }
    }

    /** Alias utilisé par la page Entrepot */
    static async getAll(token) {
        return this.getMesEntrepots(token);
    }

    static async create(token, data) {
        try {
            const r = await axios.post(API_URL.ENTREPOT.CREATE, data, { headers: this.headers(token) });
            return r.data;
        } catch (error) {
            console.error('❌ CreateEntrepot error:', error);
            throw this.handleError(error);
        }
    }

    static handleError(error) {
        if (error.response) {
            return new Error(
                error.response.data?.message ||
                error.response.statusText ||
                'Erreur serveur'
            );
        }
        if (error.request) return new Error('Impossible de contacter le serveur.');
        return new Error(error.message || 'Erreur inattendue');
    }
}

export default EntrepotService;