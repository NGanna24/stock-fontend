// services/beneficeService.js
import API_URL from '../config/api';
import axios from 'axios';

class BeneficeService {
    static async getBenefices(token, dateDebut, dateFin) {
        try {
            const response = await axios.get(
                API_URL.BENEFICE.GET_BENEFICES(dateDebut, dateFin),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ GetBenefices error:', error);
            throw this.handleError(error);
        }
    }

    static async exportBenefices(token, dateDebut, dateFin) {
        try {
            const response = await axios.get(
                API_URL.BENEFICE.EXPORT_BENEFICES(dateDebut, dateFin),
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
            console.error('❌ ExportBenefices error:', error);
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

export default BeneficeService;