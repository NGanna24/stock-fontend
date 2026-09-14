// services/commandeAchatService.js
import API_URL from '../config/api';
import axios from 'axios';

class CommandeAchatService {
    /**
     * Récupérer toutes les commandes d'achat
     */
    static async getAllCommandes(token, params = {}) {
        try {
            const response = await axios.get(API_URL.COMMANDE_ACHAT.GET_ALL, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllCommandes error:', error);
            throw this.handleError(error);
        }
    }

// services/commandeAchatService.js

/**
 * Récupérer une commande par ID
 */
static async getCommandeById(token, id) {
    try {
        const response = await axios.get(API_URL.COMMANDE_ACHAT.GET_BY_ID(id), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('📦 Réponse getCommandeById:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ GetCommandeById error:', error);
        throw this.handleError(error);
    }
}

    /**
     * Récupérer les commandes par statut
     */
    static async getCommandesByStatut(token, statut) {
        try {
            const response = await axios.get(API_URL.COMMANDE_ACHAT.GET_BY_STATUT(statut), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetCommandesByStatut error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les commandes d'un fournisseur
     */
    static async getCommandesByFournisseur(token, idFournisseur) {
        try {
            const response = await axios.get(API_URL.COMMANDE_ACHAT.GET_BY_FOURNISSEUR(idFournisseur), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetCommandesByFournisseur error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les commandes du mois
     */
    static async getCurrentMonthCommandes(token) {
        try {
            const response = await axios.get(API_URL.COMMANDE_ACHAT.GET_CURRENT_MONTH, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetCurrentMonthCommandes error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les statistiques
     */
    static async getStats(token) {
        try {
            const response = await axios.get(API_URL.COMMANDE_ACHAT.GET_STATS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // ✅ S'assurer que les données retournées ont le bon format
            if (response.data && response.data.success && response.data.data) {
                const stats = response.data.data;
                return {
                    ...response.data,
                    data: {
                        total: stats.total || 0,
                        en_attente: stats.en_attente || 0,
                        envoyee: stats.envoyee || 0,
                        partiellement_recue: stats.partiellement_recue || 0,
                        recue: stats.recue || 0,
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
     * Créer une nouvelle commande
     */
    static async createCommande(token, data) {
        try {
            const response = await axios.post(API_URL.COMMANDE_ACHAT.CREATE, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ CreateCommande error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Ajouter des produits à une commande existante
     */
    static async addLignes(token, id, lignes) {
        try {
            const response = await axios.post(
                API_URL.COMMANDE_ACHAT.ADD_LIGNES(id),
                { lignes },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ AddLignes error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour une commande
     */
    static async updateCommande(token, id, data) {
        try {
            const response = await axios.put(API_URL.COMMANDE_ACHAT.UPDATE(id), data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ UpdateCommande error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour le statut d'une commande
     */
    static async updateStatut(token, id, statut) {
        try {
            const response = await axios.patch(
                API_URL.COMMANDE_ACHAT.UPDATE_STATUT(id),
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
     * Annuler une commande
     */
    static async annulerCommande(token, id) {
        try {
            const response = await axios.patch(
                API_URL.COMMANDE_ACHAT.ANNULER(id),
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
            console.error('❌ AnnulerCommande error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Supprimer une commande
     */
    static async deleteCommande(token, id) {
        try {
            const response = await axios.delete(API_URL.COMMANDE_ACHAT.DELETE(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ DeleteCommande error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter les commandes
     */
    static async exportCommandes(token) {
        try {
            const response = await axios.get(API_URL.COMMANDE_ACHAT.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ ExportCommandes error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Gestion des erreurs
     */
    static handleError(error) {
        if (error.response) {
            // Le serveur a répondu avec un code d'erreur
            const message = error.response.data?.message || error.response.statusText || 'Erreur serveur';
            return new Error(message);
        } else if (error.request) {
            // La requête a été faite mais pas de réponse
            return new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
        } else {
            // Une erreur s'est produite lors de la configuration de la requête
            return new Error(error.message || 'Erreur inattendue');
        }
    }
}

export default CommandeAchatService;