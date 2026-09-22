// services/inventaireService.js
import API_URL from '../config/api';
import axios from 'axios';

class InventaireService {
    static async getAll(token, params = {}) {
        try {
            const response = await axios.get(API_URL.INVENTAIRE.GET_ALL, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'   // ✅ Ajouté
                },
                params
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetAllInventaires error:', error);
            throw this.handleError(error);
        }
    }

    static async getById(token, id) {
        try {
            const response = await axios.get(API_URL.INVENTAIRE.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetInventaireById error:', error);
            throw this.handleError(error);
        }
    }

    static async create(token, data) {
        try {
            const response = await axios.post(API_URL.INVENTAIRE.CREATE, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ CreateInventaire error:', error);
            throw this.handleError(error);
        }
    }

    static async demarrer(token, id) {
        try {
            const response = await axios.post(API_URL.INVENTAIRE.DEMARRER(id), {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ DemarrerInventaire error:', error);
            throw this.handleError(error);
        }
    }

    static async saisirLigne(token, id, idLigne, quantite_reelle, notes = null) {
        try {
            const response = await axios.patch(
                API_URL.INVENTAIRE.SAISIR_LIGNE(id, idLigne),
                { quantite_reelle, notes },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ SaisirLigne error:', error);
            throw this.handleError(error);
        }
    }

    static async saisirLignesEnMasse(token, id, lignes) {
        try {
            const response = await axios.patch(
                API_URL.INVENTAIRE.SAISIR_LIGNES(id),
                { lignes },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('❌ SaisirLignesEnMasse error:', error);
            throw this.handleError(error);
        }
    }

    static async valider(token, id) {
        try {
            const response = await axios.post(API_URL.INVENTAIRE.VALIDER(id), {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ ValiderInventaire error:', error);
            throw this.handleError(error);
        }
    }

    static async annuler(token, id) {
        try {
            const response = await axios.post(API_URL.INVENTAIRE.ANNULER(id), {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ AnnulerInventaire error:', error);
            throw this.handleError(error);
        }
    }

    static async delete(token, id) {
        try {
            const response = await axios.delete(API_URL.INVENTAIRE.DELETE(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ DeleteInventaire error:', error);
            throw this.handleError(error);
        }
    }

    static async getStats(token) {
        try {
            const response = await axios.get(API_URL.INVENTAIRE.GET_STATS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('❌ GetInventaireStats error:', error);
            throw this.handleError(error);
        }
    }

static handleError(error) {
    if (error.response) {
        console.error('📛 Réponse erreur:', error.response.data);  // ✅ Ajoute ce log
        const message = error.response.data?.message || error.response.statusText || 'Erreur serveur';
        return new Error(message);
    } else if (error.request) {
        return new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } else {
        return new Error(error.message || 'Erreur inattendue');
    }
}
}

export default InventaireService;