// services/inventaireEntrepotService.js
import API_URL from '../config/api';
import axios from 'axios';

class InventaireEntrepotService {
    static _h(token) {
        return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
    }

    static async _call(fn) {
        try {
            return (await fn()).data;
        } catch (error) {
            console.error('❌ Inventaire entrepôt error:', error);
            throw this.handleError(error);
        }
    }

    static list(token, id_entrepot) {
        return this._call(() => axios.get(API_URL.INVENTAIRE_ENTREPOT.BASE(id_entrepot), this._h(token)));
    }
    static get(token, id_entrepot, id) {
        return this._call(() => axios.get(API_URL.INVENTAIRE_ENTREPOT.ONE(id_entrepot, id), this._h(token)));
    }
    /** data : { zone?, libelle? } — sans zone = inventaire complet */
    static creer(token, id_entrepot, data = {}) {
        return this._call(() => axios.post(API_URL.INVENTAIRE_ENTREPOT.BASE(id_entrepot), data, this._h(token)));
    }
    /** data : { quantite_base } ou { conforme: true } */
    static compter(token, id_entrepot, id, id_ligne, data) {
        return this._call(() => axios.put(API_URL.INVENTAIRE_ENTREPOT.LIGNE(id_entrepot, id, id_ligne), data, this._h(token)));
    }
    static annulerComptage(token, id_entrepot, id, id_ligne) {
        return this._call(() => axios.delete(API_URL.INVENTAIRE_ENTREPOT.LIGNE(id_entrepot, id, id_ligne), this._h(token)));
    }
    static toutConforme(token, id_entrepot, id) {
        return this._call(() => axios.post(API_URL.INVENTAIRE_ENTREPOT.TOUT_CONFORME(id_entrepot, id), {}, this._h(token)));
    }
    static valider(token, id_entrepot, id) {
        return this._call(() => axios.post(API_URL.INVENTAIRE_ENTREPOT.VALIDER(id_entrepot, id), {}, this._h(token)));
    }
    static annuler(token, id_entrepot, id) {
        return this._call(() => axios.post(API_URL.INVENTAIRE_ENTREPOT.ANNULER(id_entrepot, id), {}, this._h(token)));
    }

    static handleError(error) {
        if (error.response) return new Error(error.response.data?.message || error.response.statusText || 'Erreur serveur');
        if (error.request) return new Error('Impossible de contacter le serveur.');
        return new Error(error.message || 'Erreur inattendue');
    }
}

export default InventaireEntrepotService;