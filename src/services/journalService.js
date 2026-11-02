// services/journalService.js — journal d'activité (« qui a fait quoi »), lecture seule, admin
import API_URL from '../config/api';
import axios from 'axios';

const nettoyer = (filtres = {}) => {
    const params = {};
    Object.entries(filtres).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) params[k] = v; });
    return params;
};

class JournalService {
    static _headers(token) {
        return { Authorization: `Bearer ${token}` };
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

    /** filtres = { dateDebut, dateFin, acteur:'employe:3', module, action, search, page, limit } */
    static lister(token, filtres) {
        return this._req(axios.get(API_URL.JOURNAL.LISTE, { headers: this._headers(token), params: nettoyer(filtres) }), 'Journal');
    }

    static facettes(token, filtres) {
        return this._req(axios.get(API_URL.JOURNAL.FACETTES, { headers: this._headers(token), params: nettoyer(filtres) }), 'Journal facettes');
    }

    static exporter(token, filtres) {
        return this._req(axios.get(API_URL.JOURNAL.EXPORT, { headers: this._headers(token), params: nettoyer(filtres) }), 'Journal export');
    }

    static detail(token, id) {
        return this._req(axios.get(API_URL.JOURNAL.ONE(id), { headers: this._headers(token) }), 'Journal détail');
    }

    static handleError(error) {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 401) return new Error('Session expirée. Veuillez vous reconnecter.');
            if (status === 403) return new Error(data?.message || 'Accès réservé à l\'administrateur.');
            return new Error(data?.message || `Erreur ${status}`);
        }
        if (error.request) return new Error('Impossible de contacter le serveur.');
        return new Error(error.message || 'Erreur inconnue');
    }
}

export default JournalService;
