// services/superAdmin/adminService.js
import API_URL from '../../config/api';
import axios from 'axios';

class AdminService {
    /**
     * Dashboard complet
     */
    static async getDashboard() {
        try {
            const res = await axios.get(API_URL.ADMIN.GET_DASHBOARD);
            return res.data;
        } catch (error) {
            console.error('❌ getDashboard error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Statistiques globales
     */
    static async getStats() {
        try {
            const res = await axios.get(API_URL.ADMIN.GET_STATS);
            return res.data;
        } catch (error) {
            console.error('❌ getStats error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Utilisateurs
     */
    static async getUtilisateurs(limit = 50) {
        try {
            const res = await axios.get(API_URL.ADMIN.GET_UTILISATEURS(limit));
            return res.data;
        } catch (error) {
            console.error('❌ getUtilisateurs error:', error);
            throw this.handleError(error);
        }
    }

    static async getUtilisateur(id) {
        try {
            const res = await axios.get(API_URL.ADMIN.GET_UTILISATEUR(id));
            return res.data;
        } catch (error) {
            console.error('❌ getUtilisateur error:', error);
            throw this.handleError(error);
        }
    }

    static async toggleUtilisateur(id, actif) {
        try {
            const res = await axios.patch(
                API_URL.ADMIN.TOGGLE_UTILISATEUR(id),
                { actif }
            );
            return res.data;
        } catch (error) {
            console.error('❌ toggleUtilisateur error:', error);
            throw this.handleError(error);
        }
    }

    static async getInactifs(days = 30) {
        try {
            const res = await axios.get(API_URL.ADMIN.GET_INACTIFS(days));
            return res.data;
        } catch (error) {
            console.error('❌ getInactifs error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Magasins / Carte
     */
    static async getMagasinsCarte() {
        try {
            const res = await axios.get(API_URL.ADMIN.GET_MAGASINS_CARTE);
            return res.data;
        } catch (error) {
            console.error('❌ getMagasinsCarte error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Analyses
     */
    static async getTopProduits(limit = 10) {
        try {
            const res = await axios.get(API_URL.ADMIN.GET_TOP_PRODUITS(limit));
            return res.data;
        } catch (error) {
            console.error('❌ getTopProduits error:', error);
            throw this.handleError(error);
        }
    }

    static async getActivite(limit = 20) {
        try {
            const res = await axios.get(API_URL.ADMIN.GET_ACTIVITE(limit));
            return res.data;
        } catch (error) {
            console.error('❌ getActivite error:', error);
            throw this.handleError(error);
        }
    }

    static async getGeo() {
        try {
            const res = await axios.get(API_URL.ADMIN.GET_GEO);
            return res.data;
        } catch (error) {
            console.error('❌ getGeo error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Gestion des erreurs
     */
    static handleError(error) {
        if (error.response) {
            return new Error(error.response.data?.message || error.response.statusText || 'Erreur serveur');
        } else if (error.request) {
            return new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
        }
        return new Error(error.message || 'Erreur inattendue');
    }
}

export default AdminService;