// services/factureService.js
import API_URL from '../config/api';
import axios from 'axios';

class FactureService {
    /**
     * Récupérer toutes les factures
     */
    static async getAllFactures(token, params = {}) {
        try {
            const response = await axios.get(API_URL.FACTURE.GET_ALL, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllFactures error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer une facture par ID
     */
    static async getFactureById(token, id) {
        try {
            const response = await axios.get(API_URL.FACTURE.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetFactureById error:', error);
            throw this.handleError(error);
        }
    } 

    /**
     * Récupérer les factures par statut
     */
    static async getFacturesByStatut(token, statut) {
        try {
            const response = await axios.get(API_URL.FACTURE.GET_BY_STATUT(statut), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetFacturesByStatut error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les factures d'un client
     */
    static async getFacturesByClient(token, idClient) {
        try {
            const response = await axios.get(API_URL.FACTURE.GET_BY_CLIENT(idClient), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetFacturesByClient error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les factures d'une commande
     */
    static async getFacturesByCommande(token, idCommande) {
        try {
            const response = await axios.get(API_URL.FACTURE.GET_BY_COMMANDE(idCommande), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetFacturesByCommande error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les statistiques
     */
    static async getStats(token) {
        try {
            const response = await axios.get(API_URL.FACTURE.GET_STATS, {
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
                        total_factures: stats.total_factures || 0,
                        total_montant: parseFloat(stats.total_montant) || 0,
                        en_attente: stats.en_attente || 0,
                        payee: stats.payee || 0,
                        partiellement_payee: stats.partiellement_payee || 0,
                        en_retard: stats.en_retard || 0,
                        annulee: stats.annulee || 0,
                        montant_impaye: parseFloat(stats.montant_impaye) || 0,
                        montant_moyen: parseFloat(stats.montant_moyen) || 0
                    }
                };
            }
            return response.data;
        } catch (error) {
            console.error('❌ GetStats error:', error);
            throw this.handleError(error);
        }
    }

// services/factureService.js
static async createFacture(token, data) {
    try {
        const response = await axios.post(API_URL.FACTURE.CREATE, data, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📥 Réponse brute createFacture:', response.data);
        
        // ✅ Retourner un format standardisé
        return {
            success: true,
            data: response.data,
            message: 'Facture créée avec succès'
        };
    } catch (error) {
        console.error('❌ CreateFacture error:', error);
        throw this.handleError(error);
    }
}

    /**
     * Mettre à jour le statut d'une facture
     */
    static async updateStatut(token, id, statut) {
        try {
            const response = await axios.patch(
                API_URL.FACTURE.UPDATE_STATUT(id),
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
     * Mettre à jour la date d'échéance
     */
    static async updateEcheance(token, id, date_echeance) {
        try {
            const response = await axios.patch(
                API_URL.FACTURE.UPDATE_ECHEANCE(id),
                { date_echeance },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ UpdateEcheance error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Supprimer une facture
     */
    static async deleteFacture(token, id) {
        try {
            const response = await axios.delete(API_URL.FACTURE.DELETE(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ DeleteFacture error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter les factures
     */
    static async exportFactures(token, params = {}) {
        try {
            const response = await axios.get(API_URL.FACTURE.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params
            });
            return response.data;
        } catch (error) {
            console.error('❌ ExportFactures error:', error);
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

export default FactureService;