// services/recetteService.js
import API_URL from '../config/api';
import axios from 'axios';

class RecetteService {
    /**
     * Récupérer toutes les recettes avec filtres
     */
    static async getAllRecettes(token, filters = {}) {
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== '') {
                    params.append(key, filters[key]);
                }
            });

            const url = `${API_URL.RECETTE.GET_ALL}?${params.toString()}`;
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllRecettes error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les statistiques
     */
    static async getStats(token, filters = {}) {
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== '') {
                    params.append(key, filters[key]);
                }
            });

            const url = `${API_URL.RECETTE.GET_STATS}?${params.toString()}`;
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetStats recettes error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les factures impayées
     */
    static async getFacturesImpayees(token) {
        try {
            const response = await axios.get(API_URL.RECETTE.GET_FACTURES_IMPAYEES, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetFacturesImpayees error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Créer une recette (paiement)
     */
    static async createRecette(token, data) {
        try {
            const response = await axios.post(
                API_URL.RECETTE.CREATE,
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
            console.error('❌ CreateRecette error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Supprimer une recette
     */
    static async deleteRecette(token, id) {
        try {
            const response = await axios.delete(
                API_URL.RECETTE.DELETE(id),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ DeleteRecette error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter en CSV
     */
    static async exportRecettes(token, filters = {}) {
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== '') {
                    params.append(key, filters[key]);
                }
            });

            const url = `${API_URL.RECETTE.EXPORT}?${params.toString()}`;
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'blob'
            });
            return response;
        } catch (error) {
            console.error('❌ ExportRecettes error:', error);
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

export default RecetteService;