// services/rapportAchatService.js
import API_URL from '../config/api';
import axios from 'axios';

class RapportAchatService {
    /**
     * Récupérer le rapport des achats
     */
    static async getRapportAchats(token, dateDebut, dateFin) {
        try {
            const response = await axios.get(
                API_URL.RAPPORT_ACHAT.GET_ACHATS(dateDebut, dateFin),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ GetRapportAchats error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter le rapport en CSV
     */
    static async exportRapportAchats(token, dateDebut, dateFin) {
        try {
            const response = await axios.get(
                API_URL.RAPPORT_ACHAT.EXPORT_ACHATS(dateDebut, dateFin),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'blob'
                }
            );
            return response;
        } catch (error) {
            console.error('❌ ExportRapportAchats error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Gestion des erreurs
     */
    static handleError(error) {
        if (error.response) {
            const message =
                error.response.data?.message ||
                error.response.statusText ||
                'Erreur serveur';
            return new Error(message);
        } else if (error.request) {
            return new Error('Impossible de contacter le serveur.');
        } else {
            return new Error(error.message || 'Erreur inattendue');
        }
    }
}

export default RapportAchatService;