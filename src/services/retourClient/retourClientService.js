// services/retourClient/retourClientService.js
import API_URL from '../../config/api';
import axios from 'axios';

class RetourClientService {

    // ==================== RECHERCHE ====================

    /**
     * ✅ NOUVELLE MÉTHODE : Rechercher une commande par numéro
     * GET /api/retours-clients/search-commande?numero=CV-202609-0001
     */
    static async searchCommandeByNumero(token, numero) {
        try {
            const response = await axios.get(
                API_URL.RETOUR_CLIENT.SEARCH_COMMANDE,
                {
                    params: { numero },
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // ==================== CRUD ====================

    static async getAllRetours(token, params = {}) {
        try {
            const response = await axios.get(API_URL.RETOUR_CLIENT.GET_ALL, {
                headers: { 'Authorization': `Bearer ${token}` },
                params
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async getRetourById(token, id) {
        try {
            const response = await axios.get(API_URL.RETOUR_CLIENT.GET_BY_ID(id), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async createRetour(token, data) {
        try {
            const response = await axios.post(API_URL.RETOUR_CLIENT.CREATE, data, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async updateStatut(token, id, statut) {
        try {
            const response = await axios.patch(
                API_URL.RETOUR_CLIENT.UPDATE_STATUT(id),
                { statut },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async deleteRetour(token, id) {
        try {
            const response = await axios.delete(API_URL.RETOUR_CLIENT.DELETE(id), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // ==================== STATS & EXPORT ====================

    static async getStats(token) {
        try {
            const response = await axios.get(API_URL.RETOUR_CLIENT.GET_STATS, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    static async exportRetours(token) {
        try {
            const response = await axios.get(API_URL.RETOUR_CLIENT.EXPORT, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // ==================== GESTION DES ERREURS ====================

    static handleError(error) {
        if (error.response) {
            return new Error(error.response.data?.message || 'Erreur serveur');
        } else if (error.request) {
            return new Error('Impossible de contacter le serveur');
        } else {
            return new Error(error.message || 'Erreur inattendue');
        }
    }
}

export default RetourClientService;