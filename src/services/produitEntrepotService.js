// services/produitEntrepotService.js
import API_URL from '../config/api';
import axios from 'axios';

class ProduitEntrepotService {
    /* ============================================================
       HELPER — construire les headers auth
       ============================================================ */
    static _headers(token) {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /* ============================================================
       LISTER tous les produits d'un entrepôt (avec unités de vente)
       ============================================================ */
    static async getAllProduits(token, id_entrepot) {
        try {
            const response = await axios.get(
                API_URL.PRODUIT_ENTREPOT.GET_ALL(id_entrepot),
                { headers: this._headers(token) }
            );
            return response.data;
        } catch (error) {
            console.error('❌ GetAllProduits (entrepôt) error:', error);
            throw this.handleError(error);
        }
    }

    /* ============================================================
       DÉTAIL d'un produit entrepôt (avec unités de vente)
       ============================================================ */
    static async getProduitById(token, id_entrepot, id_produit_entrepot) {
        try {
            const response = await axios.get(
                API_URL.PRODUIT_ENTREPOT.GET_BY_ID(id_entrepot, id_produit_entrepot),
                { headers: this._headers(token) }
            );
            return response.data;
        } catch (error) {
            console.error('❌ GetProduitById (entrepôt) error:', error);
            throw this.handleError(error);
        }
    }

    /* ============================================================
       RECHERCHER des produits entrepôt
       ============================================================ */
    static async searchProduits(token, id_entrepot, keyword) {
        try {
            const response = await axios.get(
                API_URL.PRODUIT_ENTREPOT.SEARCH(id_entrepot, keyword),
                { headers: this._headers(token) }
            );
            return response.data;
        } catch (error) {
            console.error('❌ SearchProduits (entrepôt) error:', error);
            throw this.handleError(error);
        }
    }

    /* ============================================================
       STATISTIQUES des produits entrepôt
       ============================================================ */
    static async getProduitsStats(token, id_entrepot) {
        try {
            const response = await axios.get(
                API_URL.PRODUIT_ENTREPOT.GET_STATS(id_entrepot),
                { headers: this._headers(token) }
            );
            return response.data;
        } catch (error) {
            console.error('❌ GetProduitsStats (entrepôt) error:', error);
            throw this.handleError(error);
        }
    }

    /* ============================================================
       FILTRER les produits entrepôt (critères avancés)
       ============================================================ */
    static async filterProduits(token, id_entrepot, filters) {
        try {
            const params = new URLSearchParams();
            Object.keys(filters || {}).forEach((key) => {
                if (filters[key] !== undefined && filters[key] !== '') {
                    params.append(key, filters[key]);
                }
            });
            const url = `${API_URL.PRODUIT_ENTREPOT.FILTER(id_entrepot)}?${params.toString()}`;
            const response = await axios.get(url, { headers: this._headers(token) });
            return response.data;
        } catch (error) {
            console.error('❌ FilterProduits (entrepôt) error:', error);
            throw this.handleError(error);
        }
    }

    /* ============================================================
       CRÉER un produit entrepôt (+ unités de vente)

       En cas de doublon (HTTP 409 + code DUPLICATE_PRODUIT_ENTREPOT),
       retourne :
         {
           success: false,
           isDuplicate: true,
           message: '...',
           existingId: <id_produit_entrepot>,
           existing: { id_produit_entrepot, nom }
         }
       ============================================================ */
    static async createProduit(token, id_entrepot, data) {
        try {
            const response = await axios.post(
                API_URL.PRODUIT_ENTREPOT.CREATE(id_entrepot),
                data,
                { headers: this._headers(token) }
            );
            return response.data;
        } catch (error) {
            console.error('❌ CreateProduit (entrepôt) error:', error);

            // Détection spécifique du doublon (409)
            if (
                error.response &&
                error.response.status === 409 &&
                error.response.data?.code === 'DUPLICATE_PRODUIT_ENTREPOT'
            ) {
                const data = error.response.data;
                return {
                    success: false,
                    isDuplicate: true,
                    message: data.message,
                    existingId: data.existing?.id_produit_entrepot || null,
                    existing: data.existing || null,
                };
            }

            throw this.handleError(error);
        }
    }

    /* ============================================================
       METTRE À JOUR un produit entrepôt (+ unités de vente)
       ============================================================ */
    static async updateProduit(token, id_entrepot, id_produit_entrepot, data) {
        try {
            const response = await axios.put(
                API_URL.PRODUIT_ENTREPOT.UPDATE(id_entrepot, id_produit_entrepot),
                data,
                { headers: this._headers(token) }
            );
            return response.data;
        } catch (error) {
            console.error('❌ UpdateProduit (entrepôt) error:', error);

            if (
                error.response &&
                error.response.status === 409 &&
                error.response.data?.code === 'DUPLICATE_PRODUIT_ENTREPOT'
            ) {
                const data = error.response.data;
                return {
                    success: false,
                    isDuplicate: true,
                    message: data.message,
                    existingId: data.existing?.id_produit_entrepot || null,
                    existing: data.existing || null,
                };
            }

            throw this.handleError(error);
        }
    }

    /* ============================================================
       METTRE À JOUR le stock d'un produit entrepôt
       (utilisé par ProduitFormModal étape 2, ou onglet Stock)
       ============================================================ */
    static async updateProduitStock(token, id_entrepot, id_produit_entrepot, quantite) {
        try {
            const response = await axios.patch(
                API_URL.PRODUIT_ENTREPOT.UPDATE_STOCK(id_entrepot, id_produit_entrepot),
                { quantite },
                { headers: this._headers(token) }
            );
            return response.data;
        } catch (error) {
            console.error('❌ UpdateProduitStock (entrepôt) error:', error);
            throw this.handleError(error);
        }
    }

    /* ============================================================
       SUPPRIMER un produit entrepôt (soft delete)
       ============================================================ */
    static async deleteProduit(token, id_entrepot, id_produit_entrepot) {
        try {
            const response = await axios.delete(
                API_URL.PRODUIT_ENTREPOT.DELETE(id_entrepot, id_produit_entrepot),
                { headers: this._headers(token) }
            );
            return response.data;
        } catch (error) {
            console.error('❌ DeleteProduit (entrepôt) error:', error);
            throw this.handleError(error);
        }
    }

    /* ============================================================
       IMPORTER un produit du magasin vers l'entrepôt
       (ex-partager : crée une copie indépendante)
       ============================================================ */
    static async importerProduit(token, id_entrepot, id_produit) {
        try {
            const response = await axios.post(
                API_URL.PRODUIT_ENTREPOT.IMPORTER(id_entrepot),
                { id_produit },
                { headers: this._headers(token) }
            );
            return response.data;
        } catch (error) {
            console.error('❌ ImporterProduit error:', error);

            if (
                error.response &&
                error.response.status === 409 &&
                error.response.data?.code === 'DUPLICATE_PRODUIT_ENTREPOT'
            ) {
                const data = error.response.data;
                return {
                    success: false,
                    isDuplicate: true,
                    message: data.message,
                    existingId: data.existing?.id_produit_entrepot || null,
                    existing: data.existing || null,
                };
            }

            throw this.handleError(error);
        }
    }

    /* ============================================================
       GESTION DES ERREURS (identique à ProduitService)
       ============================================================ */
    static handleError(error) {
        if (error.response) {
            const message =
                error.response.data?.message ||
                error.response.statusText ||
                'Erreur serveur';
            return new Error(message);
        } else if (error.request) {
            return new Error(
                'Impossible de contacter le serveur. Vérifiez votre connexion.'
            );
        } else {
            return new Error(error.message || 'Erreur inattendue');
        }
    }
}

export default ProduitEntrepotService;