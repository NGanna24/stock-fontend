// services/transfertStockService.js
// Transferts entrepôt -> catalogue du demandeur, avec approbation du propriétaire.
import API_URL from '../config/api';
import axios from 'axios';

class TransfertStockService {
    static _headers(token) {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** → { est_proprietaire, transferts } (le propriétaire voit tout, un membre voit les siens) */
    static async list(token, id_entrepot, statut = null) {
        try {
            const r = await axios.get(API_URL.TRANSFERT.BY_ENTREPOT(id_entrepot), {
                headers: this._headers(token),
                params: statut ? { statut } : {},
            });
            return r.data;
        } catch (error) {
            console.error('❌ List transferts error:', error);
            throw this.handleError(error);
        }
    }

    /** Pour les badges : → { est_proprietaire, count } */
    static async countEnAttente(token, id_entrepot) {
        try {
            const r = await axios.get(API_URL.TRANSFERT.EN_ATTENTE_COUNT(id_entrepot), { headers: this._headers(token) });
            return { est_proprietaire: !!r.data?.est_proprietaire, count: r.data?.count || 0 };
        } catch (error) {
            console.error('❌ CountEnAttente error:', error);
            return { est_proprietaire: false, count: 0 };
        }
    }

        /** Vue centrale : tous mes transferts (tous entrepôts) */
    static async listMes(token, statut = null) {
        try {
            const r = await axios.get(API_URL.TRANSFERT.MES, {
                headers: this._headers(token),
                params: statut ? { statut } : {},
            });
            return r.data;
        } catch (error) {
            console.error('❌ List mes transferts error:', error);
            throw this.handleError(error);
        }
    }
    /** Produits de MON catalogue qui peuvent recevoir le stock → { terme, produit_source, produits } */
    static async produitsMagasin(token, id_entrepot, id_produit_entrepot, q = '') {
        try {
            const params = { id_produit_entrepot };
            if (q) params.q = q;
            const r = await axios.get(API_URL.TRANSFERT.PRODUITS_MAGASIN(id_entrepot), {
                headers: this._headers(token),
                params,
            });
            return r.data;
        } catch (error) {
            console.error('❌ ProduitsMagasin error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * data = { id_produit_entrepot, id_unite_vente?, quantite,
     *          mode: 'existant' | 'creer', id_produit_destination?, forcer?, motif?, notes? }
     */
    static async create(token, id_entrepot, data) {
        try {
            const r = await axios.post(API_URL.TRANSFERT.BY_ENTREPOT(id_entrepot), data, { headers: this._headers(token) });
            return r.data;
        } catch (error) {
            console.error('❌ Create transfert error:', error);
            throw this.handleError(error);
        }
    }

    static async createLot(token, id_entrepot, data) {
        try {
            const r = await axios.post(API_URL.TRANSFERT.LOT(id_entrepot), data, { headers: this._headers(token) });
            return r.data;
        } catch (error) {
            console.error('❌ Create lot transfert error:', error);
            throw this.handleError(error);
        }
    }

    /** Actions sur tout un panier (numero_lot) */
    static async actionLot(token, id_entrepot, numero_lot, action, body = {}) {
        try {
            const r = await axios.patch(API_URL.TRANSFERT.LOT_ACTION(id_entrepot, numero_lot, action), body, { headers: this._headers(token) });
            return r.data;
        } catch (error) {
            console.error(`❌ ${action} lot error:`, error);
            throw this.handleError(error);
        }
    }

    static async approuver(token, id_entrepot, id_transfert) {
        try {
            const r = await axios.patch(API_URL.TRANSFERT.APPROUVER(id_entrepot, id_transfert), {}, { headers: this._headers(token) });
            return r.data;
        } catch (error) {
            console.error('❌ Approuver transfert error:', error);
            throw this.handleError(error);
        }
    }

    static async refuser(token, id_entrepot, id_transfert, motif = '') {
        try {
            const r = await axios.patch(API_URL.TRANSFERT.REFUSER(id_entrepot, id_transfert), { motif }, { headers: this._headers(token) });
            return r.data;
        } catch (error) {
            console.error('❌ Refuser transfert error:', error);
            throw this.handleError(error);
        }
    }

    static async annuler(token, id_entrepot, id_transfert) {
        try {
            const r = await axios.patch(API_URL.TRANSFERT.ANNULER(id_entrepot, id_transfert), {}, { headers: this._headers(token) });
            return r.data;
        } catch (error) {
            console.error('❌ Annuler transfert error:', error);
            throw this.handleError(error);
        }
    }

    /* ---------- ERREURS (conserve le `code` renvoyé par le serveur) ---------- */
    static handleError(error) {
        let err;
        if (error.response) {
            err = new Error(error.response.data?.message || error.response.statusText || 'Erreur serveur');
            err.code = error.response.data?.code;
            err.status = error.response.status;
        } else if (error.request) {
            err = new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
        } else {
            err = new Error(error.message || 'Erreur inattendue');
        }
        return err;
    }
}

export default TransfertStockService;