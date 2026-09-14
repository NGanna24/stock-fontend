// services/uniteVenteService.js
import API_URL from '../config/api';
import axios from 'axios';

class UniteVenteService {
    /**
     * ============================================================
     * Récupérer les unités de vente d'un produit
     * ============================================================
     */
    static async getByProduit(token, id_produit) {
        try {
            const response = await axios.get(
                API_URL.UNITE_VENTE.GET_BY_PRODUIT(id_produit),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ GetUnitesVente error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ============================================================
     * Créer une unité de vente
     * ============================================================
     */
    static async create(token, data) {
        try {
            const response = await axios.post(
                API_URL.UNITE_VENTE.CREATE,
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
            console.error('❌ CreateUniteVente error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ============================================================
     * Mettre à jour une unité de vente
     * ============================================================
     */
    static async update(token, id, data) {
        try {
            const response = await axios.put(
                API_URL.UNITE_VENTE.UPDATE(id),
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
            console.error('❌ UpdateUniteVente error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ============================================================
     * Supprimer une unité de vente (soft delete côté backend)
     * ============================================================
     */
    static async delete(token, id) {
        try {
            const response = await axios.delete(
                API_URL.UNITE_VENTE.DELETE(id),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ DeleteUniteVente error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ============================================================
     * Gestion centralisée des erreurs axios
     * ============================================================
     */
    static handleError(error) {
        if (error.response) {
            const message = error.response.data?.message
                || error.response.statusText
                || 'Erreur serveur';
            return new Error(message);
        } else if (error.request) {
            return new Error('Impossible de contacter le serveur.');
        } else {
            return new Error(error.message || 'Erreur inattendue');
        }
    }
}

export default UniteVenteService;