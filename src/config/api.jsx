// config/api.js

const BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.startsWith("192.168.")
    ? "http://192.168.187.1:8080"
    : "https://miyo.n-double.com";

export const API_URL = {

    // ==================== URLS DASHBOARD ====================
    DASHBOARD: {
        GET_STATS: `${BASE_URL}/api/dashboard/stats`,
        GET_KPIS: `${BASE_URL}/api/dashboard/kpis`,
        GET_VENTES_CHART: (jours = 30) => `${BASE_URL}/api/dashboard/ventes-chart?jours=${jours}`,
        GET_BENEFICES_JOUR: (jours = 30) => `${BASE_URL}/api/dashboard/benefices-jour?jours=${jours}`,
        GET_TOP_PRODUITS: (limit = 5, jours = 30) => `${BASE_URL}/api/dashboard/top-produits?limit=${limit}&jours=${jours}`,
        GET_ALERTES: `${BASE_URL}/api/dashboard/alertes`,
        GET_DERNIERS_MOUVEMENTS: (limit = 5) => `${BASE_URL}/api/dashboard/derniers-mouvements?limit=${limit}`,
        GET_DERNIERES_FACTURES: (limit = 5) => `${BASE_URL}/api/dashboard/dernieres-factures?limit=${limit}`,
        GET_DERNIERES_COMMANDES: (limit = 5) => `${BASE_URL}/api/dashboard/dernieres-commandes?limit=${limit}`,
    },

    // ==================== URLS ASSISTANT D'ACHAT ====================
    ASSISTANT_ACHAT: {
        GET_PROPOSITION: (niveau = 'normal', scope = {}) => {
            const q = new URLSearchParams({ niveau });
            if (scope.destination === 'entrepot' && scope.id_entrepot) {
                q.set('destination', 'entrepot');
                q.set('id_entrepot', String(scope.id_entrepot));
            }
            return `${BASE_URL}/api/assistant-achat/proposition?${q.toString()}`;
        },
        CREER: `${BASE_URL}/api/assistant-achat/creer`,
    },

    // ==================== URLS SEARCH ====================
    SEARCH: {
        GLOBAL: (q, limit = 5) =>
            `${BASE_URL}/api/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    },

    // ==================== URLS AUTH (TENANTS) ====================
    AUTH: {
        REGISTER: `${BASE_URL}/api/utilisateur/register`,
        LOGIN: `${BASE_URL}/api/utilisateur/login`,
        PROFILE: `${BASE_URL}/api/utilisateur/profile`,
        PROFILE_BY_SLUG: (slug) => `${BASE_URL}/api/utilisateur/profile/${slug}`,
        UPDATE_PROFILE: `${BASE_URL}/api/utilisateur/profile`,
        LOGOUT: `${BASE_URL}/api/utilisateur/logout`,
        CHANGE_PASSWORD: `${BASE_URL}/api/utilisateur/change-password`,
        FORGOT_PASSWORD: `${BASE_URL}/api/utilisateur/forgot-password`,
        VERIFY_RESET_CODE: `${BASE_URL}/api/utilisateur/verify-reset-code`,
        RESET_PASSWORD: `${BASE_URL}/api/utilisateur/reset-password`,
    },

    // ==================== URLS MAGASIN (TENANT) ====================
    MAGASIN: {
        GET_MON_MAGASIN: `${BASE_URL}/api/magasin/mon-magasin`,
        UPDATE_MON_MAGASIN: `${BASE_URL}/api/magasin/mon-magasin`,
        GET_BY_ID: (id) => `${BASE_URL}/api/magasin/${id}`,
        UPLOAD_LOGO: `${BASE_URL}/api/magasin/upload-logo`,
        DELETE_LOGO: `${BASE_URL}/api/magasin/logo`,
        GEOCODER: `${BASE_URL}/api/magasin/geocoder`,
        PROCHES: `${BASE_URL}/api/magasin/proches`,
    },

    // ==================== URLS EMPLOYÉS ====================
    EMPLOYE: {
        GET_ALL: `${BASE_URL}/api/employes`,
        GET_STATS: `${BASE_URL}/api/employes/stats`,
        GET_BY_ID: (id) => `${BASE_URL}/api/employes/${id}`,
        CREATE: `${BASE_URL}/api/employes`,
        UPDATE: (id) => `${BASE_URL}/api/employes/${id}`,
        TOGGLE: (id) => `${BASE_URL}/api/employes/${id}/actif`,
        DELETE: (id) => `${BASE_URL}/api/employes/${id}`,
        ROLES: `${BASE_URL}/api/utilisateur/roles`,
    },

    // ==================== URLS CATÉGORIES ====================
    CATEGORIE: {
        CREATE: `${BASE_URL}/api/categories`,
        GET_ALL: `${BASE_URL}/api/categories`,
        GET_MAIN: `${BASE_URL}/api/categories/main`,
        GET_TREE: `${BASE_URL}/api/categories/tree`,
        GET_STATS: `${BASE_URL}/api/categories/stats`,
        EXPORT: `${BASE_URL}/api/categories/export`,
        SEARCH: (keyword) => `${BASE_URL}/api/categories/search?keyword=${encodeURIComponent(keyword)}`,
        UPDATE_STATUS: (id) => `${BASE_URL}/api/categories/${id}/status`,
        GET_BY_ID: (id) => `${BASE_URL}/api/categories/${id}`,
        GET_BY_SLUG: (slug) => `${BASE_URL}/api/categories/slug/${slug}`,
        GET_SUB_CATEGORIES: (id) => `${BASE_URL}/api/categories/${id}/subcategories`,
        UPDATE: (id) => `${BASE_URL}/api/categories/${id}`,
        DELETE: (id) => `${BASE_URL}/api/categories/${id}`,
        REORDER: `${BASE_URL}/api/categories/reorder`,
    },

    // ==================== URLS PRODUITS ====================
    PRODUIT: {
        GET_ALL: `${BASE_URL}/api/produits`,
        GET_BY_ID: (id) => `${BASE_URL}/api/produits/${id}`,
        GET_BY_REFERENCE: (reference) => `${BASE_URL}/api/produits/reference/${reference}`,
        GET_BY_CATEGORIE: (id) => `${BASE_URL}/api/produits/categorie/${id}`,
        GET_BY_MARQUE: (id) => `${BASE_URL}/api/produits/marque/${id}`,
        GET_BY_FOURNISSEUR: (id) => `${BASE_URL}/api/produits/fournisseur/${id}`,
        GET_RUPTURE: `${BASE_URL}/api/produits/rupture`,
        GET_STOCK_BAS: `${BASE_URL}/api/produits/stock-bas`,
        SEARCH: (keyword) => `${BASE_URL}/api/produits/search?keyword=${encodeURIComponent(keyword)}`,
        GET_STATS: `${BASE_URL}/api/produits/stats`,
        EXPORT: `${BASE_URL}/api/produits/export`,
        CREATE: `${BASE_URL}/api/produits`,
        UPDATE: (id) => `${BASE_URL}/api/produits/${id}`,
        UPDATE_STOCK: (id) => `${BASE_URL}/api/produits/${id}/stock`,
        UPDATE_STATUS: (id) => `${BASE_URL}/api/produits/${id}/status`,
        DELETE: (id) => `${BASE_URL}/api/produits/${id}`,
        FILTER: `${BASE_URL}/api/produits/filter`,
        GET_BY_MODELE: (modele) => `${BASE_URL}/api/produits/modele/${encodeURIComponent(modele)}`,
        GET_BY_MODELE_ID: (id) => `${BASE_URL}/api/produits/modele-id/${id}`,
        GET_BY_STATUT: (statut) => `${BASE_URL}/api/produits/statut/${statut}`,
        GET_BY_PRIX_RANGE: (min, max) => `${BASE_URL}/api/produits/prix/${min}/${max}`,
        GET_BY_STOCK_RANGE: (min, max) => `${BASE_URL}/api/produits/stock/${min}/${max}`,
        SEARCH_ADVANCED: `${BASE_URL}/api/produits/search`,
    },

    // ==================== URLS MODELES ====================
    MODELE: {
        GET_ALL: `${BASE_URL}/api/modeles`,
        GET_BY_ID: (id) => `${BASE_URL}/api/modeles/${id}`,
        SEARCH: (keyword) => `${BASE_URL}/api/modeles/search?keyword=${encodeURIComponent(keyword)}`,
        GET_STATS: `${BASE_URL}/api/modeles/stats`,
        EXPORT: `${BASE_URL}/api/modeles/export`,
        CREATE: `${BASE_URL}/api/modeles`,
        UPDATE: (id) => `${BASE_URL}/api/modeles/${id}`,
        DELETE: (id) => `${BASE_URL}/api/modeles/${id}`,
    },

    // ==================== URLS MARQUES ====================
    MARQUE: {
        GET_ALL: `${BASE_URL}/api/marques`,
        GET_ACTIVE: `${BASE_URL}/api/marques/active`,
        GET_BY_ID: (id) => `${BASE_URL}/api/marques/${id}`,
        GET_BY_NOM: (nom) => `${BASE_URL}/api/marques/nom/${nom}`,
        SEARCH: (keyword) => `${BASE_URL}/api/marques/search?keyword=${encodeURIComponent(keyword)}`,
        GET_STATS: `${BASE_URL}/api/marques/stats`,
        EXPORT: `${BASE_URL}/api/marques/export`,
        CREATE: `${BASE_URL}/api/marques`,
        UPDATE: (id) => `${BASE_URL}/api/marques/${id}`,
        UPDATE_STATUS: (id) => `${BASE_URL}/api/marques/${id}/status`,
        DELETE: (id) => `${BASE_URL}/api/marques/${id}`,
    },

    // ==================== URLS UNITÉS ====================
    UNITE: {
        GET_ALL: `${BASE_URL}/api/unites`,
        GET_BY_ID: (id) => `${BASE_URL}/api/unites/${id}`,
        GET_BY_NOM: (nom) => `${BASE_URL}/api/unites/nom/${nom}`,
        SEARCH: (keyword) => `${BASE_URL}/api/unites/search?keyword=${encodeURIComponent(keyword)}`,
        GET_STATS: `${BASE_URL}/api/unites/stats`,
        EXPORT: `${BASE_URL}/api/unites/export`,
        CREATE: `${BASE_URL}/api/unites`,
        UPDATE: (id) => `${BASE_URL}/api/unites/${id}`,
        DELETE: (id) => `${BASE_URL}/api/unites/${id}`,
    },

    // ==================== URLS UNITÉS DE VENTE ====================
    UNITE_VENTE: {
        GET_BY_PRODUIT: (id_produit) => `${BASE_URL}/api/produits/${id_produit}/unites-vente`,
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

    // ==================== URLS DETTES FOURNISSEURS ====================
    DETTE_FOURNISSEUR: {
        LISTE: `${BASE_URL}/api/dettes-fournisseurs`,
        FOURNISSEUR: (id) => `${BASE_URL}/api/dettes-fournisseurs/fournisseurs/${id}`,
        PAIEMENTS: `${BASE_URL}/api/dettes-fournisseurs/paiements`,
        PAIEMENT: (id) => `${BASE_URL}/api/dettes-fournisseurs/paiements/${id}`,
    },

    // ==================== URLS MODE HORS LIGNE (ventes) ====================
    HORS_LIGNE: {
        CATALOGUE: `${BASE_URL}/api/hors-ligne/catalogue`,
        VENTES: `${BASE_URL}/api/hors-ligne/ventes`,
        HISTORIQUE: `${BASE_URL}/api/hors-ligne/historique`,
        // Simple test de joignabilité du serveur (n'importe quelle réponse HTTP suffit)
        PING: `${BASE_URL}/favicon.ico`,
    },

    // ==================== URLS RELANCES CLIENTS ====================
    RELANCE: {
        LISTE: `${BASE_URL}/api/relances`,
        CLIENT: `${BASE_URL}/api/relances/client`,
    },

    // ==================== URLS JOURNAL D'ACTIVITÉ (admin) ====================
    JOURNAL: {
        LISTE: `${BASE_URL}/api/journal`,
        FACETTES: `${BASE_URL}/api/journal/facettes`,
        EXPORT: `${BASE_URL}/api/journal/export`,
        ONE: (id) => `${BASE_URL}/api/journal/${id}`,
    },

    // ==================== URLS CAISSE JOURNALIÈRE ====================
    CAISSE: {
        COURANTE: `${BASE_URL}/api/caisse/courante`,
        OUVRIR: `${BASE_URL}/api/caisse/ouvrir`,
        CLOTURER: (id) => `${BASE_URL}/api/caisse/${id}/cloturer`,
        HISTORIQUE: `${BASE_URL}/api/caisse/historique`,
        ONE: (id) => `${BASE_URL}/api/caisse/${id}`,
    },

    // ==================== URLS DÉPENSES (frais de fonctionnement) ====================
    DEPENSE: {
        BASE: `${BASE_URL}/api/depenses`,
        ONE: (id) => `${BASE_URL}/api/depenses/${id}`,
        LOT: `${BASE_URL}/api/depenses/lot`,
        REPRISE: (mois) => `${BASE_URL}/api/depenses/reprise?mois=${encodeURIComponent(mois)}`,
        CATEGORIES: `${BASE_URL}/api/depenses/categories`,
        CATEGORIE: (id) => `${BASE_URL}/api/depenses/categories/${id}`,
    },

    // ==================== URLS RETOURS CLIENTS ====================
    RETOUR_CLIENT: {
        GET_ALL: `${BASE_URL}/api/retours-clients`,
        GET_BY_ID: (id) => `${BASE_URL}/api/retours-clients/${id}`,
        GET_STATS: `${BASE_URL}/api/retours-clients/stats`,
        CREATE: `${BASE_URL}/api/retours-clients`,
        ANNULER: (id) => `${BASE_URL}/api/retours-clients/${id}/annuler`,
        SEARCH_COMMANDE: (q, jours = 90) =>
            `${BASE_URL}/api/retours-clients/search-commande?q=${encodeURIComponent(q)}&jours=${jours}`,
    },

    // ==================== URLS FOURNISSEURS ====================
    FOURNISSEUR: {
        GET_ALL: `${BASE_URL}/api/fournisseurs`,
        GET_BY_ID: (id) => `${BASE_URL}/api/fournisseurs/${id}`,
        GET_ACTIVE: `${BASE_URL}/api/fournisseurs/active`,
        GET_STATS: `${BASE_URL}/api/fournisseurs/stats`,
        SEARCH: (keyword) => `${BASE_URL}/api/fournisseurs/search?keyword=${encodeURIComponent(keyword)}`,
        EXPORT: `${BASE_URL}/api/fournisseurs/export`,
        GET_BY_COUNTRY: (pays) => `${BASE_URL}/api/fournisseurs/country/${encodeURIComponent(pays)}`,
        GET_BY_CITY: (ville) => `${BASE_URL}/api/fournisseurs/city/${encodeURIComponent(ville)}`,
        GET_COUNTRIES: `${BASE_URL}/api/fournisseurs/countries`,
        GET_CITIES: `${BASE_URL}/api/fournisseurs/cities`,
        CREATE: `${BASE_URL}/api/fournisseurs`,
        UPDATE: (id) => `${BASE_URL}/api/fournisseurs/${id}`,
        DELETE: (id) => `${BASE_URL}/api/fournisseurs/${id}`,
        ACTIVATE: (id) => `${BASE_URL}/api/fournisseurs/${id}/activate`,
        DEACTIVATE: (id) => `${BASE_URL}/api/fournisseurs/${id}/deactivate`,
        GET_PRODUITS_RECUS: (id) => `${BASE_URL}/api/fournisseurs/${id}/produits-recu`,
    },

    // ==================== URLS COMMANDES D'ACHAT ====================
    COMMANDE_ACHAT: {
        GET_ALL: `${BASE_URL}/api/commandes-achat`,
        DESTINATIONS: `${BASE_URL}/api/commandes-achat/destinations`,
        GET_BY_ID: (id) => `${BASE_URL}/api/commandes-achat/${id}`,
        GET_BY_STATUT: (statut) => `${BASE_URL}/api/commandes-achat/statut/${statut}`,
        GET_BY_FOURNISSEUR: (id) => `${BASE_URL}/api/commandes-achat/fournisseur/${id}`,
        GET_CURRENT_MONTH: `${BASE_URL}/api/commandes-achat/mois`,
        GET_STATS: `${BASE_URL}/api/commandes-achat/stats`,
        EXPORT: `${BASE_URL}/api/commandes-achat/export`,
        CREATE: `${BASE_URL}/api/commandes-achat`,
        UPDATE: (id) => `${BASE_URL}/api/commandes-achat/${id}`,
        DELETE: (id) => `${BASE_URL}/api/commandes-achat/${id}`,
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
        PRODUITS_RECUS: (id) => `${BASE_URL}/api/retours-fournisseurs/produits-recus/${id}`,
        GET_STATS: `${BASE_URL}/api/retours-fournisseurs/stats`,
        EXPORT: `${BASE_URL}/api/retours-fournisseurs/export`,
        CREATE: `${BASE_URL}/api/retours-fournisseurs`,
        UPDATE_STATUT: (id) => `${BASE_URL}/api/retours-fournisseurs/${id}/statut`,
        ANNULER: (id) => `${BASE_URL}/api/retours-fournisseurs/${id}/annuler`,
        DELETE: (id) => `${BASE_URL}/api/retours-fournisseurs/${id}`,
    },

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

    // ==================== URLS COMMANDES DE VENTE ====================
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
        SEARCH_CLIENTS: (q, limit = 10) =>
        `${BASE_URL}/api/commandes-vente/search-clients?q=${encodeURIComponent(q)}&limit=${limit}`,
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

    // ============================================================
    // ✅ SUPER ADMIN — AUTH (au niveau racine)
    // ============================================================
    SUPER_ADMIN_AUTH: {
        LOGIN: `${BASE_URL}/api/super-admin/auth/login`,
        REGISTER: `${BASE_URL}/api/super-admin/auth/register`,
        ME: `${BASE_URL}/api/super-admin/auth/me`,
        CHANGE_PASSWORD: `${BASE_URL}/api/super-admin/auth/change-password`,
        LOGOUT: `${BASE_URL}/api/super-admin/auth/logout`,
    },

    // ==================== URLS ENTREPÔT ====================
ENTREPOT: {
    GET_ALL: `${BASE_URL}/api/entrepots`,
    CREATE: `${BASE_URL}/api/entrepots`,
    ADD_STOCK: (id) => `${BASE_URL}/api/entrepots/${id}/stock`,
    REJOINDRE: `${BASE_URL}/api/entrepots/rejoindre`,
    GET_BY_ID: (id) => `${BASE_URL}/api/entrepots/${id}`,
    UPDATE: (id) => `${BASE_URL}/api/entrepots/${id}`,
    REGENERER_CODE: (id) => `${BASE_URL}/api/entrepots/${id}/regenerer-code`,
    GET_MEMBRES: (id) => `${BASE_URL}/api/entrepots/${id}/membres`,
    RETIRER_MEMBRE: (id, idMembre) => `${BASE_URL}/api/entrepots/${id}/membres/${idMembre}`,
    GET_PRODUITS: (id) => `${BASE_URL}/api/entrepots/${id}/produits`,
    PARTAGER_PRODUIT: (id) => `${BASE_URL}/api/entrepots/${id}/produits`,
    RETIRER_PRODUIT: (id, idProduit) => `${BASE_URL}/api/entrepots/${id}/produits/${idProduit}`,
    GET_STOCK: (id) => `${BASE_URL}/api/entrepots/${id}/stock`,
    GET_TRANSFERTS: (id, statut = null) =>
        `${BASE_URL}/api/entrepots/${id}/transferts${statut ? `?statut=${statut}` : ''}`,
},

UNITE_VENTE_ENTREPOT: {
    GET_BY_PRODUIT: (id_entrepot, id_produit_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/produits/${id_produit_entrepot}/unites-vente`,
    CREATE: (id_entrepot, id_produit_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/produits/${id_produit_entrepot}/unites-vente`,
    UPDATE: (id_entrepot, id_produit_entrepot, id) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/produits/${id_produit_entrepot}/unites-vente/${id}`,
    DELETE: (id_entrepot, id_produit_entrepot, id) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/produits/${id_produit_entrepot}/unites-vente/${id}`,
},

PRODUIT_ENTREPOT: {
    GET_ALL: (id_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/produits`,
    GET_BY_ID: (id_entrepot, id_produit_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/produits/${id_produit_entrepot}`,
    SEARCH: (id_entrepot, keyword) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/produits/search?q=${encodeURIComponent(keyword || '')}`,
    GET_STATS: (id_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/produits/stats`,
    FILTER: (id_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/produits/filter`,
    CREATE: (id_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/produits`,
    UPDATE: (id_entrepot, id_produit_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/produits/${id_produit_entrepot}`,
    UPDATE_STOCK: (id_entrepot, id_produit_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/produits/${id_produit_entrepot}/stock`,
    DELETE: (id_entrepot, id_produit_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/produits/${id_produit_entrepot}`,
},
// ==================== URLS MOUVEMENTS / APERÇU ENTREPÔT ====================
MOUVEMENT_ENTREPOT: {
    LIST: (id_entrepot) => `${BASE_URL}/api/entrepots/${id_entrepot}/mouvements`,
    SYNTHESE: (id_entrepot) => `${BASE_URL}/api/entrepots/${id_entrepot}/synthese`,
},
INVENTAIRE_ENTREPOT: {
    BASE: (id_entrepot) => `${BASE_URL}/api/entrepots/${id_entrepot}/inventaires`,
    ONE: (id_entrepot, id) => `${BASE_URL}/api/entrepots/${id_entrepot}/inventaires/${id}`,
    LIGNE: (id_entrepot, id, id_ligne) => `${BASE_URL}/api/entrepots/${id_entrepot}/inventaires/${id}/lignes/${id_ligne}`,
    TOUT_CONFORME: (id_entrepot, id) => `${BASE_URL}/api/entrepots/${id_entrepot}/inventaires/${id}/tout-conforme`,
    VALIDER: (id_entrepot, id) => `${BASE_URL}/api/entrepots/${id_entrepot}/inventaires/${id}/valider`,
    ANNULER: (id_entrepot, id) => `${BASE_URL}/api/entrepots/${id_entrepot}/inventaires/${id}/annuler`,
},
// ==================== URLS TRANSFERTS (entrepôt -> mon magasin, approuvé par le propriétaire) ====================
TRANSFERT: {
    // Vue centrale : tous mes transferts, tous entrepôts confondus
    MES: `${BASE_URL}/api/transferts`,
    BY_ENTREPOT: (id_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/transferts`,
    LOT: (id_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/transferts/lot`,
    LOT_ACTION: (id_entrepot, numero_lot, action) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/transferts/lot/${encodeURIComponent(numero_lot)}/${action}`,
    EN_ATTENTE_COUNT: (id_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/transferts/en-attente/count`,
    PRODUITS_MAGASIN: (id_entrepot) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/transferts/produits-magasin`,
    APPROUVER: (id_entrepot, id_transfert) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/transferts/${id_transfert}/approuver`,
    REFUSER: (id_entrepot, id_transfert) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/transferts/${id_transfert}/refuser`,
    ANNULER: (id_entrepot, id_transfert) =>
        `${BASE_URL}/api/entrepots/${id_entrepot}/transferts/${id_transfert}/annuler`,
},

    // ============================================================
    // ✅ SUPER ADMIN — ADMIN (dashboard global + magasins)
    // ============================================================
    ADMIN: {
        // Dashboard complet
        GET_DASHBOARD: `${BASE_URL}/api/admin/dashboard`,

        // Statistiques globales
        GET_STATS: `${BASE_URL}/api/admin/stats`,

        // Utilisateurs (anciennes — dashboard)
        GET_UTILISATEURS: (limit = 50) => `${BASE_URL}/api/admin/utilisateurs?limit=${limit}`,
        GET_UTILISATEUR: (id) => `${BASE_URL}/api/admin/utilisateurs/${id}`,
        TOGGLE_UTILISATEUR: (id) => `${BASE_URL}/api/admin/utilisateurs/${id}/toggle`,
        GET_INACTIFS: (days = 30) => `${BASE_URL}/api/admin/inactifs?days=${days}`,

        // Analyses globales
        GET_TOP_PRODUITS: (limit = 10) => `${BASE_URL}/api/admin/top-produits?limit=${limit}`,
        GET_ACTIVITE: (limit = 20) => `${BASE_URL}/api/admin/activite?limit=${limit}`,
        GET_GEO: `${BASE_URL}/api/admin/geo`,

        // Magasins (gestion complète)
        MAGASINS: {
            LISTE: (params = {}) => {
                const qs = new URLSearchParams(
                    Object.entries(params).filter(([, v]) =>
                        v !== undefined && v !== null && v !== ''
                    )
                ).toString();
                return `${BASE_URL}/api/super-admin/magasins${qs ? `?${qs}` : ''}`;
            },
            CARTE: (limit = 1000) =>
                `${BASE_URL}/api/super-admin/magasins/carte?limit=${limit}`,
            STATS: `${BASE_URL}/api/super-admin/magasins/stats`,
            FILTRES: (pays = null) =>
                `${BASE_URL}/api/super-admin/magasins/filtres${pays ? `?pays=${encodeURIComponent(pays)}` : ''}`,
            DETAIL: (id) => `${BASE_URL}/api/super-admin/magasins/${id}`,
            TOGGLE: (id) => `${BASE_URL}/api/super-admin/magasins/${id}/toggle`,
            UPDATE_GEO: (id) => `${BASE_URL}/api/super-admin/magasins/${id}/geolocalisation`,
        },

        // Utilisateurs (module dédié)
        UTILISATEURS_ADMIN: {
            LISTE: (params = {}) => {
                const qs = new URLSearchParams(
                    Object.entries(params).filter(([, v]) =>
                        v !== undefined && v !== null && v !== ''
                    )
                ).toString();
                return `${BASE_URL}/api/super-admin/utilisateurs${qs ? `?${qs}` : ''}`;
            },
            STATS: `${BASE_URL}/api/super-admin/utilisateurs/stats`,
            INACTIFS: (days = 30) => `${BASE_URL}/api/super-admin/utilisateurs/inactifs?days=${days}`,
            DETAIL: (id) => `${BASE_URL}/api/super-admin/utilisateurs/${id}`,
            TOGGLE: (id) => `${BASE_URL}/api/super-admin/utilisateurs/${id}/toggle`,
        },
    },
};

export default API_URL;