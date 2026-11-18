// src/config/rolePermissions.js
//
// Ce que chaque rôle peut voir (pages du menu) et faire (actions sensibles).
//   - Le propriétaire voit tout.
//   - Pour les employés, le propriétaire règle les droits dans « Rôles et permissions » ;
//     les droits réels arrivent du serveur (/api/permissions/moi) et sont gardés ici.
//   - Tant qu'ils ne sont pas arrivés, on applique les réglages par défaut ci-dessous
//     (les mêmes que côté serveur : backend/utils/permissions.js).
import { useEffect, useState } from "react";

// Pages toujours ouvertes, quel que soit le rôle
const TOUJOURS = ["dashboard", "parametres", "mon-profil"];

export const ROLE_PERMISSIONS = {
    admin: ["*"],

    manager: [
        "alertes",
        "clients", "commandes-clients", "caisse", "factures", "recettes", "retours-clients", "relances", "depenses",
        "produits", "categories", "marques", "modeles", "unites", "mouvements", "inventaires", "emplacements",
        "fournisseurs", "commandes-achat", "receptions", "retours-fournisseurs", "transferts", "comptes-fournisseurs",
        "rapport-ventes", "rapport-achats", "rapport-stocks", "benefices",
    ],

    caissier: ["alertes", "clients", "commandes-clients", "caisse", "factures", "recettes", "retours-clients", "relances", "produits"],

    magasinier: [
        "alertes",
        "produits", "categories", "marques", "modeles", "unites", "mouvements", "inventaires", "emplacements",
        "fournisseurs", "commandes-achat", "receptions", "retours-fournisseurs",
    ],
};

export const ACTIONS_PAR_DEFAUT = {
    admin: ["*"],
    manager: [
        "ventes.annuler", "ventes.modifier_prix", "ventes.rembourser", "encaissements.supprimer", "clients.credit",
        "caisse.historique", "produits.modifier", "approvisionnement.gerer", "inventaires.gerer",
    ],
    caissier: ["ventes.annuler"],
    magasinier: [],
};

// ------------------------------------------------------------
// Droits reçus du serveur
// ------------------------------------------------------------
const CLE = "miyo:permissions";
const EVENEMENT = "miyo:permissions";

let effectifs = (() => {
    try { return JSON.parse(localStorage.getItem(CLE) || "null"); } catch { return null; }
})();

/** { role, proprietaire, modules, actions } venant du serveur, ou null pour revenir aux défauts */
export const definirPermissions = (p) => {
    effectifs = p && Array.isArray(p.modules) ? p : null;
    try {
        if (effectifs) localStorage.setItem(CLE, JSON.stringify(effectifs));
        else localStorage.removeItem(CLE);
    } catch { /* stockage indisponible */ }
    window.dispatchEvent(new CustomEvent(EVENEMENT));
};

const droitsDe = (role) => {
    if (effectifs && effectifs.role === role) {
        return effectifs.proprietaire ? { modules: ["*"], actions: ["*"] } : effectifs;
    }
    return { modules: ROLE_PERMISSIONS[role] || [], actions: ACTIONS_PAR_DEFAUT[role] || [] };
};

/** Le rôle a-t-il accès à cette page (id du menu) ? */
export const hasAccess = (role, itemId) => {
    if (TOUJOURS.includes(itemId)) return true;
    const { modules } = droitsDe(role);
    return modules.includes("*") || modules.includes(itemId);
};

/** Le rôle peut-il faire cette action sensible ? */
export const peutFaire = (role, action) => {
    const { actions } = droitsDe(role);
    return actions.includes("*") || actions.includes(action);
};

/** Baisse de prix maximum du rôle pendant la vente, en % (null = sans limite) */
export const remiseMax = (role) => {
    if (!effectifs || effectifs.role !== role || effectifs.proprietaire) return null;
    const n = parseFloat(effectifs.remise_max);
    return Number.isNaN(n) ? null : n;
};

/** Nom affiché du rôle (rôle personnalisé du patron s'il y en a un) */
export const libelleRoleCourant = (role) => (effectifs && effectifs.role === role ? effectifs.libelle_role || null : null);

/** Pour les composants : se met à jour quand le propriétaire change les droits */
export const usePermissions = (role) => {
    const [, forcer] = useState(0);
    useEffect(() => {
        const surChangement = () => forcer((n) => n + 1);
        window.addEventListener(EVENEMENT, surChangement);
        return () => window.removeEventListener(EVENEMENT, surChangement);
    }, []);
    return {
        aAcces: (itemId) => hasAccess(role, itemId),
        peut: (action) => peutFaire(role, action),
    };
};
