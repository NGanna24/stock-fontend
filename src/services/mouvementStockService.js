// services/mouvementStockService.js
import API_URL from '../config/api';
import axios from 'axios';

class MouvementStockService {
    /**
     * Récupérer tous les mouvements (avec filtres)
     */
    static async getAll(token, params = {}) {
        try {
            const response = await axios.get(API_URL.MOUVEMENT_STOCK.GET_ALL, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllMouvements error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer un mouvement par ID
     */
    static async getById(token, id) {
        try {
            const response = await axios.get(API_URL.MOUVEMENT_STOCK.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetMouvementById error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les mouvements d'un produit
     */
    static async getByProduit(token, idProduit) {
        try {
            const response = await axios.get(
                API_URL.MOUVEMENT_STOCK.GET_BY_PRODUIT(idProduit),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ GetMouvementsByProduit error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les mouvements par type
     */
    static async getByType(token, type) {
        try {
            const response = await axios.get(
                API_URL.MOUVEMENT_STOCK.GET_BY_TYPE(type),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ GetMouvementsByType error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les derniers mouvements (dashboard)
     */
    static async getDerniers(token, limit = 10) {
        try {
            const response = await axios.get(API_URL.MOUVEMENT_STOCK.GET_DERNIERS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params: { limit }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetDerniersMouvements error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les statistiques
     */
    static async getStats(token) {
        try {
            const response = await axios.get(API_URL.MOUVEMENT_STOCK.GET_STATS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.success && response.data.data) {
                const stats = response.data.data;
                return {
                    ...response.data,
                    data: {
                        total: parseInt(stats.total) || 0,
                        total_entrees: parseInt(stats.total_entrees) || 0,
                        total_sorties: parseInt(stats.total_sorties) || 0,
                        total_ajustements: parseInt(stats.total_ajustements) || 0,
                        total_transferts: parseInt(stats.total_transferts) || 0,
                        qte_entrees: parseFloat(stats.qte_entrees) || 0,
                        qte_sorties: parseFloat(stats.qte_sorties) || 0,
                        aujourdhui: parseInt(stats.aujourdhui) || 0
                    }
                };
            }
            return response.data;
        } catch (error) {
            console.error('❌ GetMouvementsStats error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter les mouvements en CSV
     */
    static async export(token, params = {}) {
        try {
            const response = await axios.get(API_URL.MOUVEMENT_STOCK.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params,
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `mouvements_stock_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 5000);

            return { success: true };
        } catch (error) {
            console.error('❌ ExportMouvements error:', error);
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

export default MouvementStockService;