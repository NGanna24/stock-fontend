// services/magasinService.js
import API_URL from '../config/api';
import axios from 'axios';

class MagasinService {
    /**
     * Récupérer le magasin du patron connecté
     */
    static async getMonMagasin(token) {
        try {
            const res = await axios.get(API_URL.MAGASIN.GET_MON_MAGASIN, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        } catch (error) {
            console.error('❌ GetMonMagasin error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour le magasin
     */
    static async updateMonMagasin(token, data) {
        try {
            const res = await axios.put(API_URL.MAGASIN.UPDATE_MON_MAGASIN, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        } catch (error) {
            console.error('❌ UpdateMonMagasin error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer un magasin par ID
     */
    static async getById(token, id) {
        try {
            const res = await axios.get(API_URL.MAGASIN.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        } catch (error) {
            console.error('❌ GetMagasinById error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Gestion des erreurs
     */
    static handleError(error) {
        if (error.response) {
            const message =
                error.response.data?.message ||
                error.response.statusText ||
                'Erreur serveur';
            return new Error(message);
        } else if (error.request) {
            return new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
        } else {
            return new Error(error.message || 'Erreur inattendue');
        }
    }

    /**
 * Uploader le logo du magasin
 */
static async uploadLogo(token, file) {
    try {
        const formData = new FormData();
        formData.append('logo', file);

        const res = await axios.post(API_URL.MAGASIN.UPLOAD_LOGO, formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });
        return res.data;
    } catch (error) {
        console.error('❌ UploadLogo error:', error);
        throw this.handleError(error);
    }
}

/**
 * Supprimer le logo
 */
static async deleteLogo(token) {
    try {
        const res = await axios.delete(API_URL.MAGASIN.DELETE_LOGO, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return res.data;
    } catch (error) {
        console.error('❌ DeleteLogo error:', error);
        throw this.handleError(error);
    }
}
}

export default MagasinService;