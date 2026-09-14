// services/rapportStockService.js
import API_URL from '../config/api';
import axios from 'axios';

class RapportStockService {
    static async getRapportStocks(token, dateDebut, dateFin) {
        try {
            const response = await axios.get(
                API_URL.RAPPORT_STOCK.GET_STOCKS(dateDebut, dateFin),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ GetRapportStocks error:', error);
            throw this.handleError(error);
        }
    }

    static async exportRapportStocks(token, dateDebut, dateFin) {
        try {
            const response = await axios.get(
                API_URL.RAPPORT_STOCK.EXPORT_STOCKS(dateDebut, dateFin),
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
            console.error('❌ ExportRapportStocks error:', error);
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
        } else {
            return new Error(error.message || 'Erreur inattendue');
        }
    }
}

export default RapportStockService;