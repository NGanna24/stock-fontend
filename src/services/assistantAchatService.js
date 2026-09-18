// services/assistantAchatService.js
import API_URL from '../config/api';
import axios from 'axios';

class AssistantAchatService {
    /**
     * Récupérer la proposition de réapprovisionnement
     * @param {string} token
     * @param {'urgent'|'normal'|'large'} niveau
     */
    static async getProposition(token, niveau = 'normal') {
        try {
            const response = await axios.get(
                API_URL.ASSISTANT_ACHAT.GET_PROPOSITION(niveau),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ getProposition error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Créer les bons de commande
     * @param {string} token
     * @param {Object} payload - { date_commande?, notes?, groupes: [...] }
     */
    static async creerBons(token, payload) {
        try {
            const response = await axios.post(
                API_URL.ASSISTANT_ACHAT.CREER,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ creerBons error:', error);
            throw this.handleError(error);
        }
    }

    static handleError(error) {
        if (error.response) {
            const message =
                error.response.data?.message ||
                error.response.statusText ||
                'Erreur serveur';
            return new Error(message);
        } else if (error.request) {
            return new Error('Impossible de contacter le serveur.');
        }
        return new Error(error.message || 'Erreur inattendue');
    }
}

export default AssistantAchatService;