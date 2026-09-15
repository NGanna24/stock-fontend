// services/employeService.js
import API_URL from '../config/api';
import axios from 'axios';

class EmployeService {
    /**
     * Récupérer tous les employés du patron connecté
     */
    static async getAll(token) {
        try {
            const res = await axios.get(API_URL.EMPLOYE.GET_ALL, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        } catch (error) {
            console.error('❌ GetAllEmployes error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupérer un employé par ID
     */
    static async getById(token, id) {
        try {
            const res = await axios.get(API_URL.EMPLOYE.GET_BY_ID(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        } catch (error) {
            console.error('❌ GetEmployeById error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Créer un employé
     */
    static async create(token, data) {
        try {
            const res = await axios.post(API_URL.EMPLOYE.CREATE, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        } catch (error) {
            console.error('❌ CreateEmploye error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Mettre à jour un employé
     */
    static async update(token, id, data) {
        try {
            const res = await axios.put(API_URL.EMPLOYE.UPDATE(id), data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        } catch (error) {
            console.error('❌ UpdateEmploye error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Activer / désactiver un employé
     */
    static async toggleActivation(token, id, actif) {
        try {
            const res = await axios.patch(API_URL.EMPLOYE.TOGGLE(id), { actif }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        } catch (error) {
            console.error('❌ ToggleEmploye error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Supprimer un employé
     */
    static async delete(token, id) {
        try {
            const res = await axios.delete(API_URL.EMPLOYE.DELETE(id), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        } catch (error) {
            console.error('❌ DeleteEmploye error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Statistiques des employés
     */
    static async getStats(token) {
        try {
            const res = await axios.get(API_URL.EMPLOYE.GET_STATS, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        } catch (error) {
            console.error('❌ GetStatsEmployes error:', error);
            throw this.handleError(error);
        }
    }

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
}

export default EmployeService;