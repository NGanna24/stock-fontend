// services/clientService.js — fiches clients
import API_URL from '../config/api';
import axios from 'axios';

const nettoyer = (p = {}) => {
    const o = {};
    Object.entries(p).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) o[k] = v; });
    return o;
};

class ClientService {
    static _h(token) {
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

    /** params : search, type, statut ('dette'|'depasse'|'inactifs'|'nouveaux'), tri, inclureInactifs */
    static getAll(token, params = {}) {
        return this._req(axios.get(API_URL.CLIENT.GET_ALL, { headers: this._h(token), params: nettoyer(params) }), 'Clients');
    }

    static getStats(token) {
        return this._req(axios.get(API_URL.CLIENT.GET_STATS, { headers: this._h(token) }), 'Stats clients');
    }

    static getTop(token, limit = 10) {
        return this._req(axios.get(API_URL.CLIENT.GET_TOP(limit), { headers: this._h(token) }), 'Top clients');
    }

    /** Recherche rapide (vente) → [{ id_client, nom, telephone, du, plafond_credit, depasse_plafond, … }] */
    static search(token, q, limit = 10) {
        return this._req(axios.get(API_URL.CLIENT.SEARCH(q), { headers: this._h(token), params: { limit } }), 'Recherche clients');
    }

    /** Fiche complète par id ou téléphone → { data: { …client, commandes, fiche: { client, ventes, produits, relances } } } */
    static getByTelephone(token, cle) {
        return this._req(axios.get(API_URL.CLIENT.GET_BY_TELEPHONE(cle), { headers: this._h(token) }), 'Fiche client');
    }

    static getFiche(token, cle) {
        return this.getByTelephone(token, cle);
    }

    static create(token, data) {
        return this._req(axios.post(API_URL.CLIENT.CREATE, data, { headers: this._h(token) }), 'Créer client');
    }

    static update(token, id, data) {
        return this._req(axios.put(API_URL.CLIENT.ONE(id), data, { headers: this._h(token) }), 'Modifier client');
    }

    static setActif(token, id, actif) {
        return this._req(axios.patch(API_URL.CLIENT.ACTIF(id), { actif }, { headers: this._h(token) }), 'Statut client');
    }

    static fusionner(token, idCible, idSource) {
        return this._req(axios.post(API_URL.CLIENT.FUSIONNER(idCible), { id_source: idSource }, { headers: this._h(token) }), 'Fusion clients');
    }

    static releve(token, id, params = {}) {
        return this._req(axios.get(API_URL.CLIENT.RELEVE(id), { headers: this._h(token), params: nettoyer(params) }), 'Relevé client');
    }

    /** Export CSV (téléchargement direct) */
    static async export(token, params = {}) {
        try {
            const res = await axios.get(API_URL.CLIENT.EXPORT, { headers: this._h(token), params: nettoyer(params), responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `clients_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            return { success: true };
        } catch (error) {
            console.error('❌ Export clients error:', error);
            throw this.handleError(error);
        }
    }

    static handleError(error) {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 401) return new Error('Session expirée. Veuillez vous reconnecter.');
            const e = new Error(data?.message || `Erreur ${status}`);
            if (data?.id_client_existant) e.id_client_existant = data.id_client_existant;
            return e;
        }
        if (error.request) return new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
        return new Error(error.message || 'Erreur inattendue');
    }
}

export default ClientService;
