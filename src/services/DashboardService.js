// services/dashboardService.js
import API_URL from '../config/api';
import axios from 'axios';

class DashboardService {
    /**
     * Récupérer TOUTES les statistiques en un seul appel
     */
    static async getStats(token) {
        try {
            const response = await axios.get(API_URL.DASHBOARD.GET_STATS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetDashboardStats error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer uniquement les KPIs
     */
    static async getKPIs(token) {
        try {
            const response = await axios.get(API_URL.DASHBOARD.GET_KPIS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetKPIs error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer le graphique des ventes
     */
    static async getVentesChart(token, jours = 30) {
        try {
            const response = await axios.get(API_URL.DASHBOARD.GET_VENTES_CHART(jours), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetVentesChart error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer le top des produits
     */
    static async getTopProduits(token, limit = 5, jours = 30) {
        try {
            const response = await axios.get(API_URL.DASHBOARD.GET_TOP_PRODUITS(limit, jours), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetTopProduits error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les alertes de stock
     */
    static async getAlertes(token) {
        try {
            const response = await axios.get(API_URL.DASHBOARD.GET_ALERTES, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAlertes error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les derniers mouvements
     */
    static async getDerniersMouvements(token, limit = 5) {
        try {
            const response = await axios.get(API_URL.DASHBOARD.GET_DERNIERS_MOUVEMENTS(limit), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetDerniersMouvements error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les dernières factures
     */
    static async getDernieresFactures(token, limit = 5) {
        try {
            const response = await axios.get(API_URL.DASHBOARD.GET_DERNIERES_FACTURES(limit), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetDernieresFactures error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les dernières commandes
     */
    static async getDernieresCommandes(token, limit = 5) {
        try {
            const response = await axios.get(API_URL.DASHBOARD.GET_DERNIERES_COMMANDES(limit), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetDernieresCommandes error:', error);
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
            return new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
        } else {
            return new Error(error.message || 'Erreur inattendue');
        }
    }
}

export default DashboardService;