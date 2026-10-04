// src/utils/errorMessages.js

/**
 * Traduit les erreurs réseau / API en messages français lisibles.
 * Utilisé dans AuthContext et autres services.
 */
export const getErrorMessage = (error) => {
    // 1. Pas d'erreur du tout
    if (!error) {
        return 'Une erreur inconnue est survenue.';
    }

    // 2. Erreur axios avec réponse du serveur
    if (error.response) {
        const status = error.response.status;
        const serverMessage =
            error.response.data?.message ||
            error.response.data?.error ||
            error.response.data?.errors?.[0]?.message;

        // Si le serveur a déjà un message, on le prend (souvent en français)
        if (serverMessage && typeof serverMessage === 'string') {
            return serverMessage;
        }

        // Sinon on traduit le code HTTP
        switch (status) {
            case 400:
                return 'Requête invalide. Vérifiez les informations saisies.';
            case 401:
                return 'Identifiants incorrects. Veuillez réessayer.';
            case 403:
                return "Accès refusé. Vous n'avez pas les permissions nécessaires.";
            case 404:
                return 'Ressource introuvable.';
            case 409:
                return 'Conflit : cette donnée existe déjà.';
            case 422:
                return 'Données invalides. Vérifiez le formulaire.';
            case 429:
                return 'Trop de tentatives. Réessayez dans quelques minutes.';
            case 500:
                return 'Erreur serveur. Veuillez réessayer plus tard.';
            case 502:
            case 503:
            case 504:
                return 'Le serveur est temporairement indisponible. Réessayez dans un instant.';
            default:
                return `Erreur serveur (${status}). Veuillez réessayer.`;
        }
    }

    // 3. Requête envoyée mais pas de réponse (serveur down, réseau coupé)
    if (error.request) {
        if (
            error.code === 'ECONNABORTED' ||
            error.message?.toLowerCase().includes('timeout')
        ) {
            return 'Le serveur met trop de temps à répondre. Vérifiez votre connexion.';
        }
        return 'Impossible de se connecter. Vérifiez votre connexion internet.';
    }

    // 4. Erreur de configuration / "Network Error" brut
    if (error.message === 'Network Error' || error.message?.includes('Network Error')) {
        return 'Impossible de se connecter. Vérifiez votre connexion internet.';
    }

    // 5. Message par défaut
    return error.message || 'Une erreur est survenue. Veuillez réessayer.';
};