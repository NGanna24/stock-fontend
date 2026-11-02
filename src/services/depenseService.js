// services/depenseService.js
// Dépenses de fonctionnement (loyer, salaires, électricité…) et leurs catégories.
import API_URL from '../config/api';
import axios from 'axios';

class DepenseService {
    static _headers(token) {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    static async _req(promise, label) {
        try {
            const r = await promise;
            return r.data;
        } catch (error) {
            console.error(`❌ ${label} error:`, error);
            throw this.handleError(error);
        }
    }

    /** filters = { dateDebut, dateFin, id_categorie, mode_paiement, search }
     *  → { success, data: { depenses, stats, periode_precedente } } */
    static list(token, filters = {}) {
        const params = {};
        Object.entries(filters).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') params[k] = v;
        });
        return this._req(axios.get(API_URL.DEPENSE.BASE, { headers: this._headers(token), params }), 'List dépenses');
    }

    static create(token, data) {
        return this._req(axios.post(API_URL.DEPENSE.BASE, data, { headers: this._headers(token) }), 'Create dépense');
    }

    static update(token, id, data) {
        return this._req(axios.put(API_URL.DEPENSE.ONE(id), data, { headers: this._headers(token) }), 'Update dépense');
    }

    static remove(token, id) {
        return this._req(axios.delete(API_URL.DEPENSE.ONE(id), { headers: this._headers(token) }), 'Delete dépense');
    }

    /** Plusieurs dépenses d'un coup (tout ou rien) : depenses = [{ libelle, montant, date_depense, ... }] */
    static createLot(token, depenses) {
        return this._req(axios.post(API_URL.DEPENSE.LOT, { depenses }, { headers: this._headers(token) }), 'Create lot dépenses');
    }

    /** Dépenses du mois précédent `mois` (AAAA-MM) → { mois_source, mois_cible, dernier_jour_cible, depenses } */
    static reprise(token, mois) {
        return this._req(axios.get(API_URL.DEPENSE.REPRISE(mois), { headers: this._headers(token) }), 'Reprise dépenses');
    }

    /* ---------- Catégories ---------- */
    static categories(token) {
        return this._req(axios.get(API_URL.DEPENSE.CATEGORIES, { headers: this._headers(token) }), 'Catégories dépenses');
    }

    static createCategorie(token, data) {
        return this._req(axios.post(API_URL.DEPENSE.CATEGORIES, data, { headers: this._headers(token) }), 'Create catégorie dépense');
    }

    /** data = { nom?, description?, actif? } */
    static updateCategorie(token, id, data) {
        return this._req(axios.put(API_URL.DEPENSE.CATEGORIE(id), data, { headers: this._headers(token) }), 'Update catégorie dépense');
    }

    static handleError(error) {
        let err;
        if (error.response) {
            err = new Error(error.response.data?.message || error.response.statusText || 'Erreur serveur');
            err.status = error.response.status;
        } else if (error.request) {
            err = new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
        } else {
            err = new Error(error.message || 'Erreur inattendue');
        }
        return err;
    }
}

export default DepenseService;
