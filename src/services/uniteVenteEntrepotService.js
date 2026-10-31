// services/uniteVenteEntrepotService.js
import API_URL from '../config/api';
import axios from 'axios';

class UniteVenteEntrepotService {
    static _headers(token) {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    static async getByProduit(token, id_entrepot, id_produit_entrepot) {
        try {
            const response = await axios.get(
                API_URL.UNITE_VENTE_ENTREPOT.GET_BY_PRODUIT(id_entrepot, id_produit_entrepot),
                { headers: this._headers(token) }
            );
            return response.data;
        } catch (error) {
            console.error('❌ GetByProduit (unité vente entrepôt) error:', error);
            throw this.handleError(error);
        }
    }

    static async create(token, id_entrepot, id_produit_entrepot, data) {
        try {
            const response = await axios.post(
                API_URL.UNITE_VENTE_ENTREPOT.CREATE(id_entrepot, id_produit_entrepot),
                data,
                { headers: this._headers(token) }
            );
            return response.data;
        } catch (error) {
            console.error('❌ Create (unité vente entrepôt) error:', error);
            throw this.handleError(error);
        }
    }

    static async update(token, id_entrepot, id_produit_entrepot, id_unite, data) {
        try {
            const response = await axios.put(
                API_URL.UNITE_VENTE_ENTREPOT.UPDATE(id_entrepot, id_produit_entrepot, id_unite),
                data,
                { headers: this._headers(token) }
            );
            return response.data;
        } catch (error) {
            console.error('❌ Update (unité vente entrepôt) error:', error);
            throw this.handleError(error);
        }
    }

    static async delete(token, id_entrepot, id_produit_entrepot, id_unite) {
        try {
            const response = await axios.delete(
                API_URL.UNITE_VENTE_ENTREPOT.DELETE(id_entrepot, id_produit_entrepot, id_unite),
                { headers: this._headers(token) }
            );
            return response.data;
        } catch (error) {
            console.error('❌ Delete (unité vente entrepôt) error:', error);
            throw this.handleError(error);
        }
    }

    static handleError(error) {
        if (error.response) {
            return new Error(error.response.data?.message || error.response.statusText || 'Erreur serveur');
        }
        if (error.request) {
            return new Error('Impossible de contacter le serveur.');
        }
        return new Error(error.message || 'Erreur inattendue');
    }
}

export default UniteVenteEntrepotService;