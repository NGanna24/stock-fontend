// services/rapportVenteService.js
import API_URL from '../config/api';
import axios from 'axios';

class RapportVenteService {
    /**
     * Récupérer le rapport des ventes
     */
    static async getRapportVentes(token, dateDebut, dateFin) {
        try {
            const response = await axios.get(
                API_URL.RAPPORT_VENTE.GET_VENTES(dateDebut, dateFin),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ GetRapportVentes error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter le rapport en CSV
     */
    static async exportRapportVentes(token, dateDebut, dateFin) {
        try {
            const response = await axios.get(
                API_URL.RAPPORT_VENTE.EXPORT_VENTES(dateDebut, dateFin),
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
            console.error('❌ ExportRapportVentes error:', error);
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

export default RapportVenteService;