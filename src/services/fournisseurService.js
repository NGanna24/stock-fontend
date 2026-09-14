// services/fournisseurService.js
import API_URL from '../config/api';
import axios from 'axios';

class FournisseurService {
    /**
     * Récupérer tous les fournisseurs
     */
    static async getAllFournisseurs(token) {
        try {
            const response = await axios.get(API_URL.FOURNISSEUR.GET_ALL, { 
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllFournisseurs error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer un fournisseur par ID
     */
    static async getFournisseurById(token, id) {
        try {
            const response = await axios.get(API_URL.FOURNISSEUR.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetFournisseurById error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les fournisseurs actifs
     */
    static async getActiveFournisseurs(token) {
        try {
            const response = await axios.get(API_URL.FOURNISSEUR.GET_ACTIVE, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetActiveFournisseurs error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les statistiques des fournisseurs
     */
    static async getFournisseursStats(token) {
        try {
            const response = await axios.get(API_URL.FOURNISSEUR.GET_STATS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetFournisseursStats error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Rechercher des fournisseurs
     */
    static async searchFournisseurs(token, keyword) {
        try {
            const response = await axios.get(API_URL.FOURNISSEUR.SEARCH(keyword), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ SearchFournisseurs error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les fournisseurs par pays
     */
    static async getFournisseursByCountry(token, pays) {
        try {
            const response = await axios.get(API_URL.FOURNISSEUR.GET_BY_COUNTRY(pays), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetFournisseursByCountry error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les fournisseurs par ville
     */
    static async getFournisseursByCity(token, ville) {
        try {
            const response = await axios.get(API_URL.FOURNISSEUR.GET_BY_CITY(ville), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetFournisseursByCity error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les pays distincts
     */
    static async getCountries(token) {
        try {
            const response = await axios.get(API_URL.FOURNISSEUR.GET_COUNTRIES, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetCountries error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les villes distinctes
     */
    static async getCities(token) {
        try {
            const response = await axios.get(API_URL.FOURNISSEUR.GET_CITIES, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetCities error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Créer un nouveau fournisseur (Manager/Admin)
     */
    static async createFournisseur(token, data) {
        try {
            const response = await axios.post(API_URL.FOURNISSEUR.CREATE, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ CreateFournisseur error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour un fournisseur (Manager/Admin)
     */
    static async updateFournisseur(token, id, data) {
        try {
            const response = await axios.put(API_URL.FOURNISSEUR.UPDATE(id), data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ UpdateFournisseur error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Activer un fournisseur (Manager/Admin)
     */
    static async activateFournisseur(token, id) {
        try {
            const response = await axios.patch(
                API_URL.FOURNISSEUR.ACTIVATE(id),
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ ActivateFournisseur error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Désactiver un fournisseur (Manager/Admin)
     */
    static async deactivateFournisseur(token, id) {
        try {
            const response = await axios.patch(
                API_URL.FOURNISSEUR.DEACTIVATE(id),
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ DeactivateFournisseur error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Supprimer un fournisseur (Manager/Admin)
     */
    static async deleteFournisseur(token, id) {
        try {
            const response = await axios.delete(API_URL.FOURNISSEUR.DELETE(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ DeleteFournisseur error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter les fournisseurs
     */
    static async exportFournisseurs(token) {
        try {
            const response = await axios.get(API_URL.FOURNISSEUR.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ ExportFournisseurs error:', error);
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

export default FournisseurService;