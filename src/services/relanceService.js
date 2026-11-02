// services/relanceService.js — relances clients (impayés)
import API_URL from '../config/api';
import axios from 'axios';

class RelanceService {
    static _headers(token) {
        return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
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

    /** → { clients, totaux, magasin } */
    static liste(token) {
        return this._req(axios.get(API_URL.RELANCE.LISTE, { headers: this._headers(token) }), 'Relances');
    }

    /** → { telephone, nomclient, factures, total_du, relances, magasin } */
    static client(token, telephone) {
        return this._req(axios.get(API_URL.RELANCE.CLIENT, { headers: this._headers(token), params: { telephone } }), 'Relance client');
    }

    /** data = { telephone, canal: 'whatsapp'|'sms'|'appel'|'autre', message?, note? } */
    static enregistrer(token, data) {
        return this._req(axios.post(API_URL.RELANCE.LISTE, data, { headers: this._headers(token) }), 'Enregistrer relance');
    }

    static handleError(error) {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 401) return new Error('Session expirée. Veuillez vous reconnecter.');
            return new Error(data?.message || `Erreur ${status}`);
        }
        if (error.request) return new Error('Impossible de contacter le serveur.');
        return new Error(error.message || 'Erreur inconnue');
    }
}

export default RelanceService;
