// config/api.js
// const BASE_URL = "http://192.168.187.1:8080";
const BASE_URL = "https://miyo.n-double.com";

export const API_URL = {

        // ==================== URLS DASHBOARD ====================
    DASHBOARD: {
        GET_STATS: `${BASE_URL}/api/dashboard/stats`,
        GET_KPIS: `${BASE_URL}/api/dashboard/kpis`,
        GET_VENTES_CHART: (jours = 30) => `${BASE_URL}/api/dashboard/ventes-chart?jours=${jours}`,
        GET_TOP_PRODUITS: (limit = 5, jours = 30) => `${BASE_URL}/api/dashboard/top-produits?limit=${limit}&jours=${jours}`,
        GET_ALERTES: `${BASE_URL}/api/dashboard/alertes`,
        GET_DERNIERS_MOUVEMENTS: (limit = 5) => `${BASE_URL}/api/dashboard/derniers-mouvements?limit=${limit}`,
        GET_DERNIERES_FACTURES: (limit = 5) => `${BASE_URL}/api/dashboard/dernieres-factures?limit=${limit}`,
        GET_DERNIERES_COMMANDES: (limit = 5) => `${BASE_URL}/api/dashboard/dernieres-commandes?limit=${limit}`,
    },
    // ==================== URLS AUTH ====================
    AUTH: {
        REGISTER: `${BASE_URL}/api/utilisateur/register`,   
        LOGIN: `${BASE_URL}/api/utilisateur/login`,         
        PROFILE: `${BASE_URL}/api/utilisateur/profile`,     
        PROFILE_BY_SLUG: (slug) => `${BASE_URL}/api/utilisateur/profile/${slug}`,
        LOGOUT: `${BASE_URL}/api/utilisateur/logout`,      
        CHANGE_PASSWORD: `${BASE_URL}/api/utilisateur/change-password`, 
    },
    // ==================== URLS MAGASIN ====================
MAGASIN: {
    GET_MON_MAGASIN:    `${BASE_URL}/api/magasin/mon-magasin`,
    UPDATE_MON_MAGASIN: `${BASE_URL}/api/magasin/mon-magasin`,
    GET_BY_ID: (id) =>  `${BASE_URL}/api/magasin/${id}`,
    UPLOAD_LOGO:        `${BASE_URL}/api/magasin/upload-logo`,  
    DELETE_LOGO:        `${BASE_URL}/api/magasin/logo`,         
},

// ==================== URLS EMPLOYÉS ====================
EMPLOYE: {
    GET_ALL:    `${BASE_URL}/api/employes`,
    GET_STATS:  `${BASE_URL}/api/employes/stats`,
    GET_BY_ID:  (id) => `${BASE_URL}/api/employes/${id}`,
    CREATE:     `${BASE_URL}/api/employes`,
    UPDATE:     (id) => `${BASE_URL}/api/employes/${id}`,
    TOGGLE:     (id) => `${BASE_URL}/api/employes/${id}/actif`,
    DELETE:     (id) => `${BASE_URL}/api/employes/${id}`,
    ROLES:      `${BASE_URL}/api/utilisateur/roles`, 
},
    
    // ==================== URLS CATÉGORIES ====================
    CATEGORIE: {
        // Routes publiques (authentification requise)
        CREATE: `${BASE_URL}/api/categories`,
        GET_ALL: `${BASE_URL}/api/categories`,
        GET_MAIN: `${BASE_URL}/api/categories/main`,
        GET_TREE: `${BASE_URL}/api/categories/tree`,
        GET_STATS: `${BASE_URL}/api/categories/stats`,
        EXPORT: `${BASE_URL}/api/categories/export`,
        SEARCH: (keyword) => `${BASE_URL}/api/categories/search?keyword=${encodeURIComponent(keyword)}`,
        
        // Routes pour une catégorie spécifique
        UPDATE_STATUS: (id) => `${BASE_URL}/api/categories/${id}/status`,
        GET_BY_ID: (id) => `${BASE_URL}/api/categories/${id}`,
        GET_BY_SLUG: (slug) => `${BASE_URL}/api/categories/slug/${slug}`,
        GET_SUB_CATEGORIES: (id) => `${BASE_URL}/api/categories/${id}/subcategories`,
        
        // Routes protégées (Manager/Admin uniquement)
        CREATE: `${BASE_URL}/api/categories`,
        UPDATE: (id) => `${BASE_URL}/api/categories/${id}`,
        DELETE: (id) => `${BASE_URL}/api/categories/${id}`,
        REORDER: `${BASE_URL}/api/categories/reorder`,
    },

    // ==================== URLS PRODUITS ====================
    PRODUIT: {
        // Routes publiques (authentification requise)
        GET_ALL: `${BASE_URL}/api/produits`,
        GET_BY_ID: (id) => `${BASE_URL}/api/produits/${id}`,
        GET_BY_REFERENCE: (reference) => `${BASE_URL}/api/produits/reference/${reference}`,
        GET_BY_CATEGORIE: (id) => `${BASE_URL}/api/produits/categorie/${id}`,
        GET_BY_MARQUE: (id) => `${BASE_URL}/api/produits/marque/${id}`,
        GET_BY_FOURNISSEUR: (id) => `${BASE_URL}/api/produits/fournisseur/${id}`, // ✅ NOUVEAU
        GET_RUPTURE: `${BASE_URL}/api/produits/rupture`,
        GET_STOCK_BAS: `${BASE_URL}/api/produits/stock-bas`,
        SEARCH: (keyword) => `${BASE_URL}/api/produits/search?keyword=${encodeURIComponent(keyword)}`,
        GET_STATS: `${BASE_URL}/api/produits/stats`,
        EXPORT: `${BASE_URL}/api/produits/export`,
        
        // Routes protégées (Manager/Admin uniquement)
        CREATE: `${BASE_URL}/api/produits`,
        UPDATE: (id) => `${BASE_URL}/api/produits/${id}`,
        UPDATE_STOCK: (id) => `${BASE_URL}/api/produits/${id}/stock`,
        UPDATE_STATUS: (id) => `${BASE_URL}/api/produits/${id}/status`,
        DELETE: (id) => `${BASE_URL}/api/produits/${id}`, 

        FILTER: `${BASE_URL}/api/produits/filter`,
        GET_BY_MODELE: (id) => `${BASE_URL}/api/produits/modele/${id}`,
        GET_BY_STATUT: (statut) => `${BASE_URL}/api/produits/statut/${statut}`,
        GET_BY_PRIX_RANGE: (min, max) => `${BASE_URL}/api/produits/prix/${min}/${max}`,
        GET_BY_STOCK_RANGE: (min, max) => `${BASE_URL}/api/produits/stock/${min}/${max}`,

            // ✅ Nouvelles routes
    GET_BY_MODELE: (modele) => `${BASE_URL}/api/produits/modele/${encodeURIComponent(modele)}`,
    GET_BY_MODELE_ID: (id) => `${BASE_URL}/api/produits/modele-id/${id}`,
    SEARCH_ADVANCED: `${BASE_URL}/api/produits/search`,
    },
    // ==================== URLS MODELES ====================
    MODELE: {
        // Routes publiques (authentification requise)
        GET_ALL: `${BASE_URL}/api/modeles`, 
        GET_BY_ID: (id) => `${BASE_URL}/api/modeles/${id}`,
        SEARCH: (keyword) => `${BASE_URL}/api/modeles/search?keyword=${encodeURIComponent(keyword)}`,
        GET_STATS: `${BASE_URL}/api/modeles/stats`,
        EXPORT: `${BASE_URL}/api/modeles/export`,
         
        // Routes protégées (Manager/Admin uniquement)
        CREATE: `${BASE_URL}/api/modeles`,
        UPDATE: (id) => `${BASE_URL}/api/modeles/${id}`,
        DELETE: (id) => `${BASE_URL}/api/modeles/${id}`,
    },

        // ==================== URLS MARQUES ====================
    MARQUE: {
        // Routes publiques (authentification requise)
        GET_ALL: `${BASE_URL}/api/marques`,
        GET_ACTIVE: `${BASE_URL}/api/marques/active`,
        GET_BY_ID: (id) => `${BASE_URL}/api/marques/${id}`,
        GET_BY_NOM: (nom) => `${BASE_URL}/api/marques/nom/${nom}`,
        SEARCH: (keyword) => `${BASE_URL}/api/marques/search?keyword=${encodeURIComponent(keyword)}`,
        GET_STATS: `${BASE_URL}/api/marques/stats`,
        EXPORT: `${BASE_URL}/api/marques/export`,
        
        // Routes protégées (Manager/Admin uniquement)
        CREATE: `${BASE_URL}/api/marques`,
        UPDATE: (id) => `${BASE_URL}/api/marques/${id}`,
        UPDATE_STATUS: (id) => `${BASE_URL}/api/marques/${id}/status`,
        DELETE: (id) => `${BASE_URL}/api/marques/${id}`,
    },
     // ==================== URLS UNITÉS ====================
    UNITE: {
        // Routes publiques (authentification requise)
        GET_ALL: `${BASE_URL}/api/unites`,
        GET_BY_ID: (id) => `${BASE_URL}/api/unites/${id}`,
        GET_BY_NOM: (nom) => `${BASE_URL}/api/unites/nom/${nom}`,
        SEARCH: (keyword) => `${BASE_URL}/api/unites/search?keyword=${encodeURIComponent(keyword)}`,
        GET_STATS: `${BASE_URL}/api/unites/stats`,
        EXPORT: `${BASE_URL}/api/unites/export`,
        
        // Routes protégées (Manager/Admin uniquement)
        CREATE: `${BASE_URL}/api/unites`,
        UPDATE: (id) => `${BASE_URL}/api/unites/${id}`,
        DELETE: (id) => `${BASE_URL}/api/unites/${id}`,
    },

    // ==================== URLS UNITÉS DE VENTE ====================
UNITE_VENTE: {
    // Récupérer les unités de vente d'un produit
    GET_BY_PRODUIT: (id_produit) => `${BASE_URL}/api/produits/${id_produit}/unites-vente`,

    // CRUD
    CREATE: `${BASE_URL}/api/unites-vente`,
    UPDATE: (id) => `${BASE_URL}/api/unites-vente/${id}`,
    DELETE: (id) => `${BASE_URL}/api/unites-vente/${id}`,
},
// ==================== URLS ALERTES ====================
ALERTE: {
    GET_ALL: `${BASE_URL}/api/alertes`,
    GET_STATS: `${BASE_URL}/api/alertes/stats`,
    GET_RUPTURES: `${BASE_URL}/api/alertes/ruptures`,
    GET_STOCK_BAS: `${BASE_URL}/api/alertes/stock-bas`,
    EXPORT: `${BASE_URL}/api/alertes/export`,
},
// ==================== URLS RAPPORTS BÉNÉFICES ====================
BENEFICE: {
    GET_BENEFICES: (dateDebut, dateFin) =>
        `${BASE_URL}/api/rapports/benefices?dateDebut=${dateDebut}&dateFin=${dateFin}`,
    EXPORT_BENEFICES: (dateDebut, dateFin) =>
        `${BASE_URL}/api/rapports/benefices/export?dateDebut=${dateDebut}&dateFin=${dateFin}`,
},

// ==================== URLS RAPPORTS STOCKS ====================
RAPPORT_STOCK: {
    GET_STOCKS: (dateDebut, dateFin) =>
        `${BASE_URL}/api/rapports/stocks?dateDebut=${dateDebut}&dateFin=${dateFin}`,
    EXPORT_STOCKS: (dateDebut, dateFin) =>
        `${BASE_URL}/api/rapports/stocks/export?dateDebut=${dateDebut}&dateFin=${dateFin}`,
},
// ==================== URLS RECETTES ====================
RECETTE: {
    GET_ALL: `${BASE_URL}/api/recettes`,
    GET_STATS: `${BASE_URL}/api/recettes/stats`,
    GET_FACTURES_IMPAYEES: `${BASE_URL}/api/recettes/factures-impayees`,
    EXPORT: `${BASE_URL}/api/recettes/export`,
    CREATE: `${BASE_URL}/api/recettes`,
    DELETE: (id) => `${BASE_URL}/api/recettes/${id}`,
},
// ==================== URLS RETOURS CLIENTS ====================
RETOUR_CLIENT: {
    GET_ALL: `${BASE_URL}/api/retours-clients`,
    GET_BY_ID: (id) => `${BASE_URL}/api/retours-clients/${id}`,
    GET_STATS: `${BASE_URL}/api/retours-clients/stats`,
    EXPORT: `${BASE_URL}/api/retours-clients/export`,
    CREATE: `${BASE_URL}/api/retours-clients`,
    UPDATE_STATUT: (id) => `${BASE_URL}/api/retours-clients/${id}/statut`,
    DELETE: (id) => `${BASE_URL}/api/retours-clients/${id}`,
    
    // ✅ NOUVELLE ROUTE
    SEARCH_COMMANDE: `${BASE_URL}/api/retours-clients/search-commande`,
},
// ==================== URLS FOURNISSEURS ====================
    FOURNISSEUR: {
        // Routes principales (GET)
        GET_ALL: `${BASE_URL}/api/fournisseurs`,
        GET_BY_ID: (id) => `${BASE_URL}/api/fournisseurs/${id}`,
        GET_ACTIVE: `${BASE_URL}/api/fournisseurs/active`,
        GET_STATS: `${BASE_URL}/api/fournisseurs/stats`,
        SEARCH: (keyword) => `${BASE_URL}/api/fournisseurs/search?keyword=${encodeURIComponent(keyword)}`,
        EXPORT: `${BASE_URL}/api/fournisseurs/export`,
        
        // Routes par pays/ville
        GET_BY_COUNTRY: (pays) => `${BASE_URL}/api/fournisseurs/country/${encodeURIComponent(pays)}`,
        GET_BY_CITY: (ville) => `${BASE_URL}/api/fournisseurs/city/${encodeURIComponent(ville)}`,
        
        // Routes de référence
        GET_COUNTRIES: `${BASE_URL}/api/fournisseurs/countries`,
        GET_CITIES: `${BASE_URL}/api/fournisseurs/cities`,
        
        // Routes CRUD (POST, PUT, DELETE, PATCH)
        CREATE: `${BASE_URL}/api/fournisseurs`,
        UPDATE: (id) => `${BASE_URL}/api/fournisseurs/${id}`,
        DELETE: (id) => `${BASE_URL}/api/fournisseurs/${id}`,
        ACTIVATE: (id) => `${BASE_URL}/api/fournisseurs/${id}/activate`,
        DEACTIVATE: (id) => `${BASE_URL}/api/fournisseurs/${id}/deactivate`,
    },

    // ==================== URLS COMMANDES D'ACHAT ====================
COMMANDE_ACHAT: {
    // Routes principales (GET)
    GET_ALL: `${BASE_URL}/api/commandes-achat`,
    GET_BY_ID: (id) => `${BASE_URL}/api/commandes-achat/${id}`,
    GET_BY_STATUT: (statut) => `${BASE_URL}/api/commandes-achat/statut/${statut}`,
    GET_BY_FOURNISSEUR: (id) => `${BASE_URL}/api/commandes-achat/fournisseur/${id}`,
    GET_CURRENT_MONTH: `${BASE_URL}/api/commandes-achat/mois`,
    GET_STATS: `${BASE_URL}/api/commandes-achat/stats`,
    EXPORT: `${BASE_URL}/api/commandes-achat/export`,
    
    // Routes CRUD
    CREATE: `${BASE_URL}/api/commandes-achat`,
    UPDATE: (id) => `${BASE_URL}/api/commandes-achat/${id}`,
    DELETE: (id) => `${BASE_URL}/api/commandes-achat/${id}`,
    
    // Routes d'action
    ADD_LIGNES: (id) => `${BASE_URL}/api/commandes-achat/${id}/lignes`,
    UPDATE_STATUT: (id) => `${BASE_URL}/api/commandes-achat/${id}/statut`,
    ANNULER: (id) => `${BASE_URL}/api/commandes-achat/${id}/annuler`,
},

// ==================== URLS RÉCEPTIONS ====================
RECEPTION: {
    GET_ALL: `${BASE_URL}/api/receptions`,
    GET_BY_ID: (id) => `${BASE_URL}/api/receptions/${id}`,
    GET_BY_STATUT: (statut) => `${BASE_URL}/api/receptions/statut/${statut}`,
    GET_BY_COMMANDE: (id) => `${BASE_URL}/api/receptions/commande/${id}`,
    GET_STATS: `${BASE_URL}/api/receptions/stats`,
    EXPORT: `${BASE_URL}/api/receptions/export`,
    CREATE: `${BASE_URL}/api/receptions`,
    UPDATE_STATUT: (id) => `${BASE_URL}/api/receptions/${id}/statut`,
    DELETE: (id) => `${BASE_URL}/api/receptions/${id}`,
},

// ==================== URLS RETOURS FOURNISSEURS ====================
RETOUR_FOURNISSEUR: {
    GET_ALL: `${BASE_URL}/api/retours-fournisseurs`,
    GET_BY_ID: (id) => `${BASE_URL}/api/retours-fournisseurs/${id}`,
    GET_BY_STATUT: (statut) => `${BASE_URL}/api/retours-fournisseurs/statut/${statut}`,
    GET_BY_FOURNISSEUR: (id) => `${BASE_URL}/api/retours-fournisseurs/fournisseur/${id}`,
    GET_STATS: `${BASE_URL}/api/retours-fournisseurs/stats`,
    EXPORT: `${BASE_URL}/api/retours-fournisseurs/export`,
    CREATE: `${BASE_URL}/api/retours-fournisseurs`,
    UPDATE_STATUT: (id) => `${BASE_URL}/api/retours-fournisseurs/${id}/statut`,
    ANNULER: (id) => `${BASE_URL}/api/retours-fournisseurs/${id}/annuler`,
    DELETE: (id) => `${BASE_URL}/api/retours-fournisseurs/${id}`,
},
    // ==================== URLS CLIENTS ====================
    // ==================== URLS CLIENTS ====================
    CLIENT: {
        GET_ALL: `${BASE_URL}/api/clients`,
        GET_BY_TELEPHONE: (tel) => `${BASE_URL}/api/clients/${encodeURIComponent(tel)}`,
        GET_STATS: `${BASE_URL}/api/clients/stats`,
        GET_TOP: (limit = 10) => `${BASE_URL}/api/clients/top?limit=${limit}`,
        SEARCH: (keyword) => `${BASE_URL}/api/clients/search?keyword=${encodeURIComponent(keyword)}`,
        EXPORT: `${BASE_URL}/api/clients/export`,
    },
// ==================== URLS RAPPORTS VENTES ====================
RAPPORT_VENTE: {
    GET_VENTES: (dateDebut, dateFin) =>
        `${BASE_URL}/api/rapports/ventes?dateDebut=${dateDebut}&dateFin=${dateFin}`,
    EXPORT_VENTES: (dateDebut, dateFin) =>
        `${BASE_URL}/api/rapports/ventes/export?dateDebut=${dateDebut}&dateFin=${dateFin}`,
},

// ==================== URLS RAPPORTS ACHATS ====================
RAPPORT_ACHAT: {
    GET_ACHATS: (dateDebut, dateFin) =>
        `${BASE_URL}/api/rapports/achats?dateDebut=${dateDebut}&dateFin=${dateFin}`,
    EXPORT_ACHATS: (dateDebut, dateFin) =>
        `${BASE_URL}/api/rapports/achats/export?dateDebut=${dateDebut}&dateFin=${dateFin}`,
},


COMMANDE_VENTE: {
    GET_ALL: `${BASE_URL}/api/commandes-vente`,
    GET_BY_ID: (id) => `${BASE_URL}/api/commandes-vente/${id}`,
    GET_BY_STATUT: (statut) => `${BASE_URL}/api/commandes-vente/statut/${statut}`,
    GET_BY_TELEPHONE: (telephone) => `${BASE_URL}/api/commandes-vente/telephone/${encodeURIComponent(telephone)}`,
    GET_STATS: `${BASE_URL}/api/commandes-vente/stats`,
    EXPORT: `${BASE_URL}/api/commandes-vente/export`,
    CREATE: `${BASE_URL}/api/commandes-vente`,
    UPDATE_STATUT: (id) => `${BASE_URL}/api/commandes-vente/${id}/statut`,
    ANNULER: (id) => `${BASE_URL}/api/commandes-vente/${id}/annuler`,
    ADD_PAIEMENT: (id) => `${BASE_URL}/api/commandes-vente/${id}/paiement`,
    DELETE: (id) => `${BASE_URL}/api/commandes-vente/${id}`,
},


// ==================== URLS PAIEMENTS ====================
PAIEMENT: {
    GET_ALL: `${BASE_URL}/api/paiements`,
    GET_BY_ID: (id) => `${BASE_URL}/api/paiements/${id}`,
    GET_BY_FACTURE: (id) => `${BASE_URL}/api/paiements/facture/${id}`,
    GET_BY_COMMANDE: (id) => `${BASE_URL}/api/paiements/commande/${id}`,
    GET_STATS: `${BASE_URL}/api/paiements/stats`,
    EXPORT: `${BASE_URL}/api/paiements/export`,
    CREATE: `${BASE_URL}/api/paiements`,
    DELETE: (id) => `${BASE_URL}/api/paiements/${id}`,
},

// ==================== URLS FACTURES ====================
FACTURE: {
    GET_ALL: `${BASE_URL}/api/factures`,
    GET_BY_ID: (id) => `${BASE_URL}/api/factures/${id}`,
    GET_BY_STATUT: (statut) => `${BASE_URL}/api/factures/statut/${statut}`,
    GET_BY_COMMANDE: (id) => `${BASE_URL}/api/factures/commande/${id}`,
    GET_STATS: `${BASE_URL}/api/factures/stats`,
    EXPORT: `${BASE_URL}/api/factures/export`,
    CREATE: `${BASE_URL}/api/factures`,
    UPDATE_STATUT: (id) => `${BASE_URL}/api/factures/${id}/statut`,
    UPDATE_ECHEANCE: (id) => `${BASE_URL}/api/factures/${id}/echeance`,
    DELETE: (id) => `${BASE_URL}/api/factures/${id}`,
},
    // ==================== URLS MOUVEMENTS DE STOCK ====================
    MOUVEMENT_STOCK: {
        GET_ALL: `${BASE_URL}/api/mouvement-stock`,
        GET_BY_ID: (id) => `${BASE_URL}/api/mouvement-stock/${id}`,
        GET_BY_PRODUIT: (id_produit) => `${BASE_URL}/api/mouvement-stock/produit/${id_produit}`,
        GET_BY_TYPE: (type) => `${BASE_URL}/api/mouvement-stock/type/${type}`,
        GET_DERNIERS: `${BASE_URL}/api/mouvement-stock/derniers`,
        GET_STATS: `${BASE_URL}/api/mouvement-stock/stats`,
        EXPORT: `${BASE_URL}/api/mouvement-stock/export`,
    },

        // ==================== URLS INVENTAIRES ====================
    INVENTAIRE: {
        GET_ALL: `${BASE_URL}/api/inventaires`,
        GET_BY_ID: (id) => `${BASE_URL}/api/inventaires/${id}`,
        GET_STATS: `${BASE_URL}/api/inventaires/stats`,
        CREATE: `${BASE_URL}/api/inventaires`,
        DELETE: (id) => `${BASE_URL}/api/inventaires/${id}`,
        DEMARRER: (id) => `${BASE_URL}/api/inventaires/${id}/demarrer`,
        SAISIR_LIGNE: (id, idLigne) => `${BASE_URL}/api/inventaires/${id}/lignes/${idLigne}`,
        SAISIR_LIGNES: (id) => `${BASE_URL}/api/inventaires/${id}/lignes`,
        VALIDER: (id) => `${BASE_URL}/api/inventaires/${id}/valider`,
        ANNULER: (id) => `${BASE_URL}/api/inventaires/${id}/annuler`,
    },
};

export default API_URL;