// services/abonnementService.js : abonnement du patron connecté
import axios from 'axios';
import API_URL from '../config/api';

export async function chargerAbonnement() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const res = await axios.get(API_URL.ABONNEMENT.MOI, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data?.success && res.data.visible ? res.data : null;
}

// "7 déc. 2026"
export function dateAbonnement(s) {
    if (!s) return '-';
    const [a, m, j] = s.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    });
}

// Phrase d'échéance : "se termine dans 5 jours", "a expiré le …"
export function phraseEcheance(abo) {
    const j = abo.jours_restants;
    const quoi = abo.en_essai ? 'Votre essai gratuit' : 'Votre abonnement';
    if (j < 0) return `${quoi} a pris fin le ${dateAbonnement(abo.date_fin)}`;
    if (j === 0) return `${quoi} se termine aujourd'hui`;
    if (j === 1) return `${quoi} se termine demain`;
    return `${quoi} se termine dans ${j} jours`;
}
