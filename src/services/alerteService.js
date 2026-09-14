// services/alerteService.js
import API_URL from '../config/api';
import axios from 'axios';

class AlerteService {
    static async getAllAlertes(token) {
        try {
            const response = await axios.get(API_URL.ALERTE.GET_ALL, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllAlertes error:', error);
            throw this.handleError(error);
        }
    }

    static async getStats(token) {
        try {
            const response = await axios.get(API_URL.ALERTE.GET_STATS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetStats alertes error:', error);
            throw this.handleError(error);
        }
    }

    static async exportAlertes(token) {
        try {
            const response = await axios.get(API_URL.ALERTE.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'blob'
            });
            return response;
        } catch (error) {
            console.error('❌ ExportAlertes error:', error);
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

export default AlerteService;