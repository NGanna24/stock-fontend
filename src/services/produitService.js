// services/produitService.js
import API_URL from '../config/api';
import axios from 'axios';

class ProduitService {
    /** 
     * Récupérer tous les produits
     */
    static async getAllProduits(token) {
        try {
            const response = await axios.get(API_URL.PRODUIT.GET_ALL, { 
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllProduits error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer un produit par son ID
     */
    static async getProduitById(token, id) {
        try {
            const response = await axios.get(API_URL.PRODUIT.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetProduitById error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les produits par catégorie
     */
    static async getProduitsByCategorie(token, idCategorie) {
        try {
            const response = await axios.get(API_URL.PRODUIT.GET_BY_CATEGORIE(idCategorie), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetProduitsByCategorie error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les produits par marque
     */
    static async getProduitsByMarque(token, idMarque) {
        try {
            const response = await axios.get(API_URL.PRODUIT.GET_BY_MARQUE(idMarque), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetProduitsByMarque error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les produits par fournisseur
     */
    static async getProduitsByFournisseur(token, idFournisseur) {
        try {
            const response = await axios.get(API_URL.PRODUIT.GET_BY_FOURNISSEUR(idFournisseur), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetProduitsByFournisseur error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les produits en rupture
     */
    static async getProduitsRupture(token) {
        try {
            const response = await axios.get(API_URL.PRODUIT.GET_RUPTURE, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetProduitsRupture error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les produits avec stock bas
     */
    static async getProduitsStockBas(token) {
        try {
            const response = await axios.get(API_URL.PRODUIT.GET_STOCK_BAS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetProduitsStockBas error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les statistiques des produits
     */
    static async getProduitsStats(token) {
        try {
            const response = await axios.get(API_URL.PRODUIT.GET_STATS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetProduitsStats error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Rechercher des produits
     */
    static async searchProduits(token, keyword) {
        try {
            const response = await axios.get(API_URL.PRODUIT.SEARCH(keyword), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ SearchProduits error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ============================================================
     * ✅ Créer un nouveau produit (Manager/Admin)
     *
     * Règle anti-doublon : nom + modèle + marque
     *
     * En cas de doublon (HTTP 409 + code DUPLICATE_PRODUIT),
     * la méthode retourne un objet enrichi :
     *   {
     *     success: false,
     *     isDuplicate: true,
     *     message: '...',
     *     existingId: 42,
     *     existing: { id, nom, marque_nom, modele_nom }
     *   }
     * ============================================================
     */
    static async createProduit(token, data) {
        try {
            const response = await axios.post(API_URL.PRODUIT.CREATE, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ CreateProduit error:', error);

            // ✅ Détection spécifique du doublon (409)
            if (
                error.response &&
                error.response.status === 409 &&
                error.response.data?.code === 'DUPLICATE_PRODUIT'
            ) {
                const data = error.response.data;
                return {
                    success: false,
                    isDuplicate: true,
                    message: data.message,
                    // Support des 2 formats (ancien / nouveau)
                    existingId: data.existing?.id || data.existing_id || null,
                    existing: data.existing || null,
                };
            }

            // Autres erreurs → comportement normal
            throw this.handleError(error);
        }
    }

    /**
     * ============================================================
     * ✅ Mettre à jour un produit (Manager/Admin)
     *
     * Règle anti-doublon : nom + modèle + marque
     * (en excluant le produit en cours d'édition)
     * ============================================================
     */
    static async updateProduit(token, id, data) {
        try {
            const response = await axios.put(API_URL.PRODUIT.UPDATE(id), data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ UpdateProduit error:', error);

            // ✅ Détection spécifique du doublon (409)
            if (
                error.response &&
                error.response.status === 409 &&
                error.response.data?.code === 'DUPLICATE_PRODUIT'
            ) {
                const data = error.response.data;
                return {
                    success: false,
                    isDuplicate: true,
                    message: data.message,
                    existingId: data.existing?.id || data.existing_id || null,
                    existing: data.existing || null,
                };
            }

            // Autres erreurs → comportement normal
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour le stock d'un produit (Manager/Admin)
     */
    static async updateProduitStock(token, id, quantite) {
        try {
            const response = await axios.patch(
                API_URL.PRODUIT.UPDATE_STOCK(id),
                { quantite },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ UpdateProduitStock error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour le statut d'un produit (Manager/Admin)
     */
    static async updateProduitStatus(token, id, statut) {
        try {
            const response = await axios.patch(
                API_URL.PRODUIT.UPDATE_STATUS(id),
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
            console.error('❌ UpdateProduitStatus error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Filtrer les produits avec des critères avancés
     */
    static async filterProduits(token, filters) {
        try {
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== '') {
                    params.append(key, filters[key]);
                }
            });
            const url = `${API_URL.PRODUIT.FILTER}?${params.toString()}`;
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ FilterProduits error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les produits par modèle
     */
    static async getProduitsByModele(token, idModele) {
        try {
            const response = await axios.get(API_URL.PRODUIT.GET_BY_MODELE(idModele), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetProduitsByModele error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les produits par statut
     */
    static async getProduitsByStatut(token, statut) {
        try {
            const response = await axios.get(API_URL.PRODUIT.GET_BY_STATUT(statut), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetProduitsByStatut error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les produits par plage de prix
     */
    static async getProduitsByPrixRange(token, prixMin, prixMax) {
        try {
            const response = await axios.get(API_URL.PRODUIT.GET_BY_PRIX_RANGE(prixMin, prixMax), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetProduitsByPrixRange error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer les produits par plage de stock
     */
    static async getProduitsByStockRange(token, stockMin, stockMax) {
        try {
            const response = await axios.get(API_URL.PRODUIT.GET_BY_STOCK_RANGE(stockMin, stockMax), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetProduitsByStockRange error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Supprimer un produit (Manager/Admin)
     */
    static async deleteProduit(token, id) {
        try {
            const response = await axios.delete(API_URL.PRODUIT.DELETE(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ DeleteProduit error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Exporter les produits en CSV
     */
    static async exportProduits(token) {
        try {
            const response = await axios.get(API_URL.PRODUIT.EXPORT, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ ExportProduits error:', error);
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

export default ProduitService;