// services/clientService.js
import API_URL from '../config/api';
import axios from 'axios';

class ClientService {
    /**
     * Récupérer tous les clients (avec filtres)
     */
    static async getAll(token, params = {}) {
        try {
            const res = await axios.get(API_URL.CLIENT.GET_ALL, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params
            });
            return res.data;
        } catch (error) {
            console.error('❌ GetAllClients error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer un client par téléphone (fiche complète)
     */
    static async getByTelephone(token, telephone) {
        try {
            const res = await axios.get(API_URL.CLIENT.GET_BY_TELEPHONE(telephone), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        } catch (error) {
            console.error('❌ GetClientByTelephone error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Statistiques globales des clients
     */
    static async getStats(token) {
        try {
            const res = await axios.get(API_URL.CLIENT.GET_STATS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        } catch (error) {
            console.error('❌ GetClientsStats error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Top clients
     */
    static async getTop(token, limit = 10) {
        try {
            const res = await axios.get(API_URL.CLIENT.GET_TOP(limit), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        } catch (error) {
            console.error('❌ GetTopClients error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Recherche de clients
     */
    static async search(token, keyword, limit = 10) {
        try {
            const res = await axios.get(API_URL.CLIENT.SEARCH(keyword), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params: { limit }
            });
            return res.data;
        } catch (error) {
            console.error('❌ SearchClients error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Export CSV
     */
    static async export(token, params = {}) {
        try {
            const res = await axios.get(API_URL.CLIENT.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params,
                responseType: 'blob'
            });

            const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 5000);

            return { success: true };
        } catch (error) {
            console.error('❌ ExportClients error:', error);
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

export default ClientService;