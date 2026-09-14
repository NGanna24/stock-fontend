// services/modeleService.js
import API_URL from '../config/api';
import axios from 'axios';

class ModeleService {
    /**
     * Récupérer tous les modèles
     */
    static async getAllModeles(token) {
        try {
            const response = await axios.get(API_URL.MODELE.GET_ALL, { 
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllModeles error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer un modèle par son ID
     */
    static async getModeleById(token, id) {
        try {
            const response = await axios.get(API_URL.MODELE.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetModeleById error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les statistiques des modèles
     */
    static async getModelesStats(token) {
        try {
            const response = await axios.get(API_URL.MODELE.GET_STATS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetModelesStats error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Rechercher des modèles
     */
    static async searchModeles(token, keyword) {
        try {
            const response = await axios.get(API_URL.MODELE.SEARCH(keyword), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ SearchModeles error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Créer un nouveau modèle (Manager/Admin)
     */
    static async createModele(token, data) {
        console.log("Les data", data);
        try {
            const response = await axios.post(API_URL.MODELE.CREATE, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ CreateModele error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour un modèle (Manager/Admin)
     */
    static async updateModele(token, id, data) {
        try {
            const response = await axios.put(API_URL.MODELE.UPDATE(id), data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ UpdateModele error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour le statut d'un modèle (Manager/Admin)
     */
    static async updateModeleStatus(token, id, status) {
        try {
            const response = await axios.patch(
                API_URL.MODELE.UPDATE_STATUS(id),
                { actif: status },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ UpdateModeleStatus error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Supprimer un modèle (Manager/Admin)
     */
    static async deleteModele(token, id) {
        try {
            const response = await axios.delete(API_URL.MODELE.DELETE(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ DeleteModele error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter les modèles en CSV
     */
    static async exportModeles(token) {
        try {
            const response = await axios.get(API_URL.MODELE.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ ExportModeles error:', error);
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

export default ModeleService;