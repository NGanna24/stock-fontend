// services/receptionService.js
import API_URL from '../config/api';
import axios from 'axios';

class ReceptionService {
    /**
     * Récupérer toutes les réceptions
     */
    static async getAllReceptions(token, params = {}) {
        try {
            const response = await axios.get(API_URL.RECEPTION.GET_ALL, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                params
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllReceptions error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer une réception par ID
     */
    static async getReceptionById(token, id) {
        try {
            const response = await axios.get(API_URL.RECEPTION.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetReceptionById error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les réceptions par statut
     */
    static async getReceptionsByStatut(token, statut) {
        try {
            const response = await axios.get(API_URL.RECEPTION.GET_BY_STATUT(statut), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetReceptionsByStatut error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les réceptions d'une commande
     */
    static async getReceptionsByCommande(token, idCommande) {
        try {
            const response = await axios.get(API_URL.RECEPTION.GET_BY_COMMANDE(idCommande), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetReceptionsByCommande error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les statistiques
     */
    static async getStats(token) {
        try {
            const response = await axios.get(API_URL.RECEPTION.GET_STATS, {
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
                        total: stats.total || 0,
                        en_attente: stats.en_attente || 0,
                        partielle: stats.partielle || 0,
                        complete: stats.complete || 0,
                        annulee: stats.annulee || 0,
                        total_montant: parseFloat(stats.total_montant) || 0,
                        moyenne_montant: parseFloat(stats.moyenne_montant) || 0
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
     * Créer une nouvelle réception
     */
    static async createReception(token, data) {
        try {
            const response = await axios.post(API_URL.RECEPTION.CREATE, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ CreateReception error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour le statut d'une réception
     */
    static async updateStatut(token, id, statut) {
        try {
            const response = await axios.patch(
                API_URL.RECEPTION.UPDATE_STATUT(id),
                { statut },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ UpdateStatut error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Supprimer une réception
     */
    static async deleteReception(token, id) {
        try {
            const response = await axios.delete(API_URL.RECEPTION.DELETE(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ DeleteReception error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter les réceptions
     */
    static async exportReceptions(token) {
        try {
            const response = await axios.get(API_URL.RECEPTION.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ ExportReceptions error:', error);
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

export default ReceptionService;