// services/paiementService.js
import API_URL from '../config/api';
import axios from 'axios';

class PaiementService {
    /**
     * Récupérer tous les paiements
     */
    static async getAllPaiements(token, params = {}) {
        try {
            const response = await axios.get(API_URL.PAIEMENT.GET_ALL, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllPaiements error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer un paiement par ID
     */
    static async getPaiementById(token, id) {
        try {
            const response = await axios.get(API_URL.PAIEMENT.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetPaiementById error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les paiements d'une facture
     */
    static async getPaiementsByFacture(token, idFacture) {
        try {
            const response = await axios.get(API_URL.PAIEMENT.GET_BY_FACTURE(idFacture), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetPaiementsByFacture error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les paiements d'une commande
     */
    static async getPaiementsByCommande(token, idCommande) {
        try {
            const response = await axios.get(API_URL.PAIEMENT.GET_BY_COMMANDE(idCommande), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetPaiementsByCommande error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Créer un nouveau paiement
     */
    static async createPaiement(token, data) {
        try {
            const response = await axios.post(API_URL.PAIEMENT.CREATE, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ CreatePaiement error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les statistiques des paiements
     */
    static async getStats(token) {
        try {
            const response = await axios.get(API_URL.PAIEMENT.GET_STATS, {
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
                        total_paiements: stats.total_paiements || 0,
                        total_montant: parseFloat(stats.total_montant) || 0,
                        especes: parseFloat(stats.especes) || 0,
                        carte: parseFloat(stats.carte) || 0,
                        virement: parseFloat(stats.virement) || 0,
                        cheque: parseFloat(stats.cheque) || 0,
                        autre: parseFloat(stats.autre) || 0,
                        paiements_aujourdhui: stats.paiements_aujourdhui || 0,
                        montant_aujourdhui: parseFloat(stats.montant_aujourdhui) || 0
                    }
                };
            }
            return response.data;
        } catch (error) {
            console.error('❌ GetStats error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter les paiements
     */
    static async exportPaiements(token) {
        try {
            const response = await axios.get(API_URL.PAIEMENT.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ ExportPaiements error:', error);
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

export default PaiementService;