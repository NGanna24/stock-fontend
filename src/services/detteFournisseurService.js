// services/detteFournisseurService.js — dettes et paiements fournisseurs
import API_URL from '../config/api';
import axios from 'axios';

class DetteFournisseurService {
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

    /** → { fournisseurs: [...], totaux } */
    static liste(token) {
        return this._req(axios.get(API_URL.DETTE_FOURNISSEUR.LISTE, { headers: this._headers(token) }), 'Dettes fournisseurs');
    }

    /** → { fournisseur, commandes, paiements, commandes_sans_reception } */
    static detail(token, id_fournisseur) {
        return this._req(axios.get(API_URL.DETTE_FOURNISSEUR.FOURNISSEUR(id_fournisseur), { headers: this._headers(token) }), 'Détail dette fournisseur');
    }

    /** data = { id_fournisseur, id_commande_achat?, montant, date_paiement?, mode_paiement?, reference?, note? } */
    static payer(token, data) {
        return this._req(axios.post(API_URL.DETTE_FOURNISSEUR.PAIEMENTS, data, { headers: this._headers(token) }), 'Paiement fournisseur');
    }

    static supprimerPaiement(token, id) {
        return this._req(axios.delete(API_URL.DETTE_FOURNISSEUR.PAIEMENT(id), { headers: this._headers(token) }), 'Suppression paiement fournisseur');
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

export default DetteFournisseurService;
