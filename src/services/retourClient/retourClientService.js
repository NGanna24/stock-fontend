// services/retourClientService.js
import API_URL from '../../config/api';
import axios from 'axios';

class RetourClientService {
    /**
     * ============================================================
     * Rechercher une commande pour faire un retour
     * ============================================================
     */
    static async searchCommande(token, q, jours = 90) {
        try {
            const response = await axios.get(
                API_URL.RETOUR_CLIENT.SEARCH_COMMANDE(q, jours),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ SearchCommande retour error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ============================================================
     * Récupérer tous les retours (avec filtres)
     * ============================================================
     */
    static async getAll(token, params = {}) {
        try {
            const response = await axios.get(API_URL.RETOUR_CLIENT.GET_ALL, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAll retours error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ============================================================
     * Récupérer un retour par ID
     * ============================================================
     */
    static async getById(token, id) {
        try {
            const response = await axios.get(
                API_URL.RETOUR_CLIENT.GET_BY_ID(id),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ GetById retour error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ============================================================
     * Créer un retour
     * ============================================================
     */
    static async create(token, data) {
        try {
            const response = await axios.post(
                API_URL.RETOUR_CLIENT.CREATE,
                data,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ Create retour error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ============================================================
     * Annuler un retour
     * ============================================================
     */
    static async annuler(token, id) {
        try {
            const response = await axios.patch(
                API_URL.RETOUR_CLIENT.ANNULER(id),
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ Annuler retour error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ============================================================
     * Statistiques
     * ============================================================
     */
    static async getStats(token) {
        try {
            const response = await axios.get(
                API_URL.RETOUR_CLIENT.GET_STATS,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ GetStats retours error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ============================================================
     * Gestion centralisée des erreurs
     * ============================================================
     */
    static handleError(error) {
        if (error.response) {
            const message = error.response.data?.message
                || error.response.statusText
                || 'Erreur serveur';
            return new Error(message);
        } else if (error.request) {
            return new Error('Impossible de contacter le serveur.');
        } else {
            return new Error(error.message || 'Erreur inattendue');
        }
    }
}

export default RetourClientService;