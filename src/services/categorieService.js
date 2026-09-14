// services/categorieService.js
import API_URL from '../config/api';
import axios from 'axios';

class CategorieService {
    /**
     * Récupérer toutes les catégories
     */
    static async getAllCategories(token) {
        try {
            const response = await axios.get(API_URL.CATEGORIE.GET_ALL, { 
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }); 
            return response.data;
        } catch (error) {
            console.error('❌ GetAllCategories error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les statistiques des catégories
     */
    static async getCategoriesStats(token) {
        try {
            const response = await axios.get(API_URL.CATEGORIE.GET_STATS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetCategoriesStats error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Rechercher des catégories
     */
    static async searchCategories(token, keyword) {
        try {
            const response = await axios.get(API_URL.CATEGORIE.SEARCH(keyword), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ SearchCategories error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Créer une nouvelle catégorie (Manager/Admin)
     */
    static async createCategory(token, data) {
        console.log("Les data",data)
        try {
            const response = await axios.post(API_URL.CATEGORIE.CREATE, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ CreateCategory error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour une catégorie (Manager/Admin)
     */
    static async updateCategory(token, id, data) {
        try {
            const response = await axios.put(API_URL.CATEGORIE.UPDATE(id), data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ UpdateCategory error:', error);
            throw this.handleError(error);
        }
    }

// services/categorieService.js
static async updateCategoryStatus(token, id, status) {
    try {
        const response = await axios.patch(
            API_URL.CATEGORIE.UPDATE_STATUS(id),
            { statut: status },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('❌ UpdateCategoryStatus error:', error);
        throw this.handleError(error);
    }
}

    /**
     * Supprimer une catégorie (Manager/Admin)
     */
    static async deleteCategory(token, id) {
        try {
            const response = await axios.delete(API_URL.CATEGORIE.DELETE(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ DeleteCategory error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter les catégories en CSV
     */
    static async exportCategories(token) {
        try {
            const response = await axios.get(API_URL.CATEGORIE.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ ExportCategories error:', error);
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

export default CategorieService;