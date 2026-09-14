// services/retourFournisseurService.js
import API_URL from '../../config/api';
import axios from 'axios';

class RetourFournisseurService {
    /**
     * Récupérer tous les retours
     */
    static async getAllRetours(token, params = {}) {
        try {
            const response = await axios.get(API_URL.RETOUR_FOURNISSEUR.GET_ALL, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllRetours error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer un retour par ID
     */
    static async getRetourById(token, id) {
        try {
            const response = await axios.get(API_URL.RETOUR_FOURNISSEUR.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetRetourById error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les retours par statut
     */
    static async getRetoursByStatut(token, statut) {
        try {
            const response = await axios.get(API_URL.RETOUR_FOURNISSEUR.GET_BY_STATUT(statut), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetRetoursByStatut error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les retours d'un fournisseur
     */
    static async getRetoursByFournisseur(token, idFournisseur) {
        try {
            const response = await axios.get(API_URL.RETOUR_FOURNISSEUR.GET_BY_FOURNISSEUR(idFournisseur), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetRetoursByFournisseur error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les statistiques
     */
    static async getStats(token) {
        try {
            const response = await axios.get(API_URL.RETOUR_FOURNISSEUR.GET_STATS, {
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
                        envoye: stats.envoye || 0,
                        recu_par_fournisseur: stats.recu_par_fournisseur || 0,
                        traite: stats.traite || 0,
                        annule: stats.annule || 0,
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
     * Créer un nouveau retour
     */
    static async createRetour(token, data) {
        try {
            const response = await axios.post(API_URL.RETOUR_FOURNISSEUR.CREATE, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ CreateRetour error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour le statut d'un retour
     */
    static async updateStatut(token, id, statut) {
        try {
            const response = await axios.patch(
                API_URL.RETOUR_FOURNISSEUR.UPDATE_STATUT(id),
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
     * Annuler un retour
     */
    static async annulerRetour(token, id) {
        try {
            const response = await axios.patch(
                API_URL.RETOUR_FOURNISSEUR.ANNULER(id),
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
            console.error('❌ AnnulerRetour error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Supprimer un retour
     */
    static async deleteRetour(token, id) {
        try {
            const response = await axios.delete(API_URL.RETOUR_FOURNISSEUR.DELETE(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ DeleteRetour error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter les retours
     */
    static async exportRetours(token) {
        try {
            const response = await axios.get(API_URL.RETOUR_FOURNISSEUR.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ ExportRetours error:', error);
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

export default RetourFournisseurService;