// src/config/rolePermissions.js (ou utils/rolePermissions.js)

export const ROLE_PERMISSIONS = {
    admin: ['*'],  // tout

    manager: [
        // Ventes & clients
        'clients', 'ventes', 'commandes-clients', 'caisse', 'factures', 'recettes', 'retours-clients', 'relances',
        // Catalogue & stock
        'produits', 'categories', 'marques', 'modeles', 'unites', 'mouvements', 'inventaires',
        // Approvisionnement
        'fournisseurs', 'commandes-achat', 'receptions', 'retours-fournisseurs', 'depenses', 'transferts', 'dettes-fournisseurs',
        // Rapports
        'rapport-ventes', 'rapport-achats', 'rapport-stocks', 'benefices',
        // Principal
        'dashboard', 'alertes',
    ],

    caissier: [
        'dashboard', 'alertes',
        // Ventes uniquement
        'clients', 'commandes-clients', 'caisse', 'factures', 'recettes', 'retours-clients', 'relances',
        // Consultation produits
        'produits',
    ],

    magasinier: [ 
        'dashboard', 'alertes',
        // Catalogue & stock
        'produits', 'categories', 'marques', 'modeles', 'unites', 'mouvements', 'inventaires',
        // Approvisionnement
        'fournisseurs', 'commandes-achat', 'receptions', 'retours-fournisseurs',
    ],
};

/**
 * Vérifie si un rôle a accès à un item de menu (par id)
 */
export const hasAccess = (role, itemId) => {
    const perms = ROLE_PERMISSIONS[role] || [];
    return perms.includes('*') || perms.includes(itemId);
};