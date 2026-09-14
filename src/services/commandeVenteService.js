// services/commandeVenteService.js
import API_URL from '../config/api';
import axios from 'axios';
import FactureService from './factureService';

class CommandeVenteService {
    /**
     * Récupérer toutes les commandes clients
     */
    static async getAllCommandes(token, params = {}) {
        try {
            const response = await axios.get(API_URL.COMMANDE_VENTE.GET_ALL, {
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

    /**
     * Récupérer une commande par ID
     */
    static async getCommandeById(token, id) {
        try {
            const response = await axios.get(API_URL.COMMANDE_VENTE.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
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
            const response = await axios.get(API_URL.COMMANDE_VENTE.GET_BY_STATUT(statut), {
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
     * Récupérer les commandes d'un client par téléphone
     */
    static async getCommandesByTelephone(token, telephone) {
        try {
            const response = await axios.get(API_URL.COMMANDE_VENTE.GET_BY_TELEPHONE(telephone), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetCommandesByTelephone error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les statistiques
     */
    static async getStats(token) {
        try {
            const response = await axios.get(API_URL.COMMANDE_VENTE.GET_STATS, {
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
                        total_commandes: stats.total_commandes || 0,
                        en_attente: stats.en_attente || 0,
                        confirmee: stats.confirmee || 0,
                        en_preparation: stats.en_preparation || 0,
                        expediee: stats.expediee || 0,
                        livree: stats.livree || 0,
                        annulee: stats.annulee || 0,
                        total_chiffre_affaires: parseFloat(stats.total_chiffre_affaires) || 0,
                        panier_moyen: parseFloat(stats.panier_moyen) || 0
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
            const response = await axios.post(API_URL.COMMANDE_VENTE.CREATE, data, {
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
     * Mettre à jour le statut d'une commande
     */
    static async updateStatut(token, id, statut) {
        try {
            const response = await axios.patch(
                API_URL.COMMANDE_VENTE.UPDATE_STATUT(id),
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

// services/commandeVenteService.js - addPaiement CORRIGÉ

static async addPaiement(token, idCommande, data) {
    try {
        const response = await axios.post(
            API_URL.COMMANDE_VENTE.ADD_PAIEMENT(idCommande),
            data,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('❌ AddPaiement error:', error);
        throw this.handleError(error);
    }
}
 
    // services/commandeVenteService.js - AJOUTER

/**
 * Générer une facture pour une commande (via le service facture)
 */
static async genererFacturePourCommande(token, idCommande) {
    try {
        // 1. Récupérer la commande
        const commandeResponse = await this.getCommandeById(token, idCommande);
        if (!commandeResponse.success) {
            throw new Error('Commande non trouvée');
        }
        const commande = commandeResponse.data;

        // 2. Créer la facture
        const factureData = {
            id_commande: idCommande,
            date_facture: new Date().toISOString().split('T')[0],
            date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            montant_total: parseFloat(commande.montant_total),
            mode_paiement: commande.mode_paiement || 'especes',
            notes: commande.notes || null
        };

        const response = await FactureService.createFacture(token, factureData);
        return response;
    } catch (error) {
        console.error('❌ GenererFacturePourCommande error:', error);
        throw this.handleError(error);
    }
}

/**
 * Récupérer la facture d'une commande
 */
static async getFactureByCommande(token, idCommande) {
    try {
        const response = await axios.get(
            API_URL.FACTURE.GET_BY_COMMANDE(idCommande),
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('❌ GetFactureByCommande error:', error);
        throw this.handleError(error);
    }
}
    /**
     * Annuler une commande
     */
    static async annulerCommande(token, id) {
        try {
            const response = await axios.patch(
                API_URL.COMMANDE_VENTE.ANNULER(id),
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
            const response = await axios.delete(API_URL.COMMANDE_VENTE.DELETE(id), {
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
            const response = await axios.get(API_URL.COMMANDE_VENTE.EXPORT, {
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
            const message = error.response.data?.message || error.response.statusText || 'Erreur serveur';
            return new Error(message);
        } else if (error.request) {
            return new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
        } else {
            return new Error(error.message || 'Erreur inattendue');
        }
    }
}

export default CommandeVenteService;