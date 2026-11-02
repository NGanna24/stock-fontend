// services/caisseService.js — caisse journalière (ouverture, suivi, clôture, historique)
import API_URL from '../config/api';
import axios from 'axios';

class CaisseService {
    static _headers(token) {
        return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
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

    /** → { session | null, mouvements?, derniere_cloture } */
    static courante(token) {
        return this._req(axios.get(API_URL.CAISSE.COURANTE, { headers: this._headers(token) }), 'Caisse courante');
    }

    static ouvrir(token, fond_initial, note = '') {
        return this._req(axios.post(API_URL.CAISSE.OUVRIR, { fond_initial, note }, { headers: this._headers(token) }), 'Ouvrir caisse');
    }

    /** data = { montant_compte, detail_comptage?, note? } → { session, mouvements } */
    static cloturer(token, id_session, data) {
        return this._req(axios.post(API_URL.CAISSE.CLOTURER(id_session), data, { headers: this._headers(token) }), 'Clôturer caisse');
    }

    static historique(token, filtres = {}) {
        const params = {};
        Object.entries(filtres).forEach(([k, v]) => { if (v) params[k] = v; });
        return this._req(axios.get(API_URL.CAISSE.HISTORIQUE, { headers: this._headers(token), params }), 'Historique caisse');
    }

    static detail(token, id_session) {
        return this._req(axios.get(API_URL.CAISSE.ONE(id_session), { headers: this._headers(token) }), 'Détail caisse');
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

export default CaisseService;
