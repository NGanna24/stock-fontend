// services/marqueService.js
import API_URL from '../config/api';
import axios from 'axios';

class MarqueService {
    /**
     * Récupérer toutes les marques
     */
    static async getAllMarques(token) {
        try {
            const response = await axios.get(API_URL.MARQUE.GET_ALL, { 
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllMarques error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les marques actives uniquement
     */
    static async getActiveMarques(token) {
        try {
            const response = await axios.get(API_URL.MARQUE.GET_ACTIVE, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetActiveMarques error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer une marque par son ID
     */
    static async getMarqueById(token, id) {
        try {
            const response = await axios.get(API_URL.MARQUE.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetMarqueById error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les statistiques des marques
     */
    static async getMarquesStats(token) {
        try {
            const response = await axios.get(API_URL.MARQUE.GET_STATS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetMarquesStats error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Rechercher des marques
     */
    static async searchMarques(token, keyword) {
        try {
            const response = await axios.get(API_URL.MARQUE.SEARCH(keyword), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ SearchMarques error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Créer une nouvelle marque (Manager/Admin)
     */
    static async createMarque(token, data) {
        console.log("Les data", data);
        try {
            const response = await axios.post(API_URL.MARQUE.CREATE, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ CreateMarque error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour une marque (Manager/Admin)
     */
    static async updateMarque(token, id, data) {
        try {
            const response = await axios.put(API_URL.MARQUE.UPDATE(id), data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ UpdateMarque error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour le statut d'une marque (Manager/Admin)
     */
    static async updateMarqueStatus(token, id, actif) {
        try {
            const response = await axios.patch(
                API_URL.MARQUE.UPDATE_STATUS(id),
                { actif: actif },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ UpdateMarqueStatus error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Supprimer une marque (Manager/Admin)
     */
    static async deleteMarque(token, id) {
        try {
            const response = await axios.delete(API_URL.MARQUE.DELETE(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ DeleteMarque error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter les marques en CSV
     */
    static async exportMarques(token) {
        try {
            const response = await axios.get(API_URL.MARQUE.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ ExportMarques error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Gestion des erreurs
     */
    static handleError(error) {
        if (error.response) {
            const message = error.response.data?.message || error.response.statusText || 'Erreur serveur';
            return new Error(message);
        } else if (error.request) {
            return new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
        } else {
            return new Error(error.message || 'Erreur inattendue');
        }
    }
}

export default MarqueService;