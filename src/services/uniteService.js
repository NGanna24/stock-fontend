// services/uniteService.js
import API_URL from '../config/api';
import axios from 'axios';

class UniteService {
    /**
     * ============================================================
     * ✅ Récupérer toutes les unités (unités de BASE)
     * ============================================================
     */
    static async getAllUnites(token) {
        try {
            const response = await axios.get(API_URL.UNITE.GET_ALL, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllUnites error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ✅ Alias : getAll
     */
    static async getAll(token) {
        return this.getAllUnites(token);
    }

    /**
     * Récupérer une unité par ID
     */
    static async getUniteById(token, id) {
        try {
            const response = await axios.get(API_URL.UNITE.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetUniteById error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ✅ Alias : getById
     */
    static async getById(token, id) {
        return this.getUniteById(token, id);
    }

    /**
     * ✅ Créer une unité
     */
    static async createUnite(token, data) {
        try {
            const response = await axios.post(API_URL.UNITE.CREATE, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ CreateUnite error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ✅ Alias : create
     */
    static async create(token, data) {
        return this.createUnite(token, data);
    }

    /**
     * ✅ Mettre à jour une unité
     */
    static async updateUnite(token, id, data) {
        try {
            const response = await axios.put(API_URL.UNITE.UPDATE(id), data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ UpdateUnite error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ✅ Alias : update
     */
    static async update(token, id, data) {
        return this.updateUnite(token, id, data);
    }

    /**
     * ✅ Supprimer une unité
     */
    static async deleteUnite(token, id) {
        try {
            const response = await axios.delete(API_URL.UNITE.DELETE(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ DeleteUnite error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ✅ Alias : delete
     */
    static async delete(token, id) {
        return this.deleteUnite(token, id);
    }

    /**
     * Rechercher des unités
     */
    static async searchUnites(token, keyword) {
        try {
            const response = await axios.get(API_URL.UNITE.SEARCH(keyword), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ SearchUnites error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ✅ Alias : search
     */
    static async search(token, keyword) {
        return this.searchUnites(token, keyword);
    }

    /**
     * Exporter les unités
     */
    static async exportUnites(token) {
        try {
            const response = await axios.get(API_URL.UNITE.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ ExportUnites error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ✅ Alias : export
     */
    static async export(token) {
        return this.exportUnites(token);
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

export default UniteService;