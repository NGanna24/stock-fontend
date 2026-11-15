// utils/telephone.js
// Numéros de téléphone selon le pays : même table et mêmes règles que le serveur
// (backend/utils/telephone.js). Côte d'Ivoire par défaut.

export const PAYS_TELEPHONE = [
    { code: 'CI', nom: "Côte d'Ivoire", indicatif: '225', longueurs: [10], groupes: [2, 2, 2, 2, 2], exemple: '07 07 08 09 10' },
    { code: 'BF', nom: 'Burkina Faso', indicatif: '226', longueurs: [8], groupes: [2, 2, 2, 2], exemple: '70 12 34 56' },
    { code: 'ML', nom: 'Mali', indicatif: '223', longueurs: [8], groupes: [2, 2, 2, 2], exemple: '65 00 13 57' },
    { code: 'SN', nom: 'Sénégal', indicatif: '221', longueurs: [9], groupes: [2, 3, 2, 2], exemple: '77 123 45 67' },
    { code: 'GN', nom: 'Guinée', indicatif: '224', longueurs: [9], groupes: [3, 2, 2, 2], exemple: '622 12 34 56' },
    { code: 'TG', nom: 'Togo', indicatif: '228', longueurs: [8], groupes: [2, 2, 2, 2], exemple: '90 12 34 56' },
    { code: 'BJ', nom: 'Bénin', indicatif: '229', longueurs: [10, 8], groupes: [2, 2, 2, 2, 2], exemple: '01 97 12 34 56' },
    { code: 'NE', nom: 'Niger', indicatif: '227', longueurs: [8], groupes: [2, 2, 2, 2], exemple: '90 12 34 56' },
    { code: 'GH', nom: 'Ghana', indicatif: '233', longueurs: [9], zero: true, groupes: [2, 3, 4], exemple: '024 123 4567' },
    { code: 'NG', nom: 'Nigeria', indicatif: '234', longueurs: [10], zero: true, groupes: [3, 3, 4], exemple: '0803 123 4567' },
    { code: 'LR', nom: 'Liberia', indicatif: '231', longueurs: [7, 8, 9], zero: true, groupes: [2, 3, 4], exemple: '077 123 4567' },
    { code: 'CM', nom: 'Cameroun', indicatif: '237', longueurs: [9], groupes: [1, 2, 2, 2, 2], exemple: '6 71 23 45 67' },
    { code: 'GA', nom: 'Gabon', indicatif: '241', longueurs: [8, 7], groupes: [2, 2, 2, 2], exemple: '06 12 34 56' },
    { code: 'CG', nom: 'Congo', indicatif: '242', longueurs: [9], groupes: [2, 3, 2, 2], exemple: '06 123 45 67' },
    { code: 'CD', nom: 'RD Congo', indicatif: '243', longueurs: [9], zero: true, groupes: [3, 3, 3], exemple: '081 234 5678' },
    { code: 'MA', nom: 'Maroc', indicatif: '212', longueurs: [9], zero: true, groupes: [1, 2, 2, 2, 2], exemple: '06 12 34 56 78' },
    { code: 'FR', nom: 'France', indicatif: '33', longueurs: [9], zero: true, groupes: [1, 2, 2, 2, 2], exemple: '06 12 34 56 78' },
    { code: 'US', nom: 'États-Unis / Canada', indicatif: '1', longueurs: [10], groupes: [3, 3, 4], exemple: '201 555 0123' },
];
const PAR_INDICATIF = [...PAYS_TELEPHONE].sort((a, b) => b.indicatif.length - a.indicatif.length);
export const INDICATIF_DEFAUT = '225';

const sansAccents = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const paysParIndicatif = (ind) => PAYS_TELEPHONE.find((p) => p.indicatif === String(ind || '').replace(/\D/g, ''));

/** Indicatif d'après le nom du pays tapé dans « Mon magasin » (« Côte d'Ivoire », « cote divoire », « CI »…) */
export function indicatifDuPays(nom) {
    const n = sansAccents(nom);
    if (!n) return null;
    if (n.includes('ivoire')) return '225';
    if (n.includes('burkina')) return '226';
    if (n.includes('congo') && (n.startsWith('rd') || n.includes('democratique') || n.includes('kinshasa'))) return '243';
    const p = PAYS_TELEPHONE.find((x) => sansAccents(x.nom) === n || x.code.toLowerCase() === n)
        || PAYS_TELEPHONE.find((x) => n.length >= 4 && sansAccents(x.nom).startsWith(n));
    return p ? p.indicatif : null;
}

/**
 * Analyse un numéro. Renvoie { norme: '+2250707080910', pays, national } ou { erreur: '…' }.
 * indicatif : pays utilisé quand le numéro est tapé sans « + » ni « 00 ».
 */
export function analyserTelephone(brut, indicatif = INDICATIF_DEFAUT) {
    const texte = String(brut ?? '').trim();
    if (!texte) return { erreur: 'Numéro vide' };
    let chiffres = texte.replace(/\D/g, '');
    const international = texte.startsWith('+') || chiffres.startsWith('00');
    if (chiffres.startsWith('00')) chiffres = chiffres.slice(2);

    let pays;
    let national;
    if (international) {
        pays = PAR_INDICATIF.find((p) => chiffres.startsWith(p.indicatif));
        if (!pays) {
            if (chiffres.length < 8 || chiffres.length > 15) return { erreur: 'Numéro international invalide' };
            return { norme: `+${chiffres}`, pays: null, national: chiffres };
        }
        national = chiffres.slice(pays.indicatif.length);
    } else {
        pays = paysParIndicatif(indicatif) || paysParIndicatif(INDICATIF_DEFAUT);
        // Numéro déjà tapé avec l'indicatif mais sans « + » (ex : 2250707080910)
        const sansPlus = !pays.longueurs.includes(chiffres.length)
            && PAR_INDICATIF.find((p) => chiffres.startsWith(p.indicatif) && p.longueurs.includes(chiffres.length - p.indicatif.length));
        if (sansPlus) { pays = sansPlus; national = chiffres.slice(sansPlus.indicatif.length); } else national = chiffres;
    }
    if (pays.zero && national.startsWith('0') && pays.longueurs.includes(national.length - 1)) national = national.slice(1);
    if (!pays.longueurs.includes(national.length)) {
        return { erreur: `Numéro invalide pour ${pays.nom} : ${pays.longueurs.join(' ou ')} chiffres attendus après +${pays.indicatif}`, pays };
    }
    return { norme: `+${pays.indicatif}${national}`, pays, national };
}

/** Forme unique (ou null si le numéro n'est pas exploitable) */
export function normaliserTelephone(brut, indicatif = INDICATIF_DEFAUT) {
    const r = analyserTelephone(brut, indicatif);
    return r.norme || null;
}

/** Affichage lisible : « +225 07 07 08 09 10 » */
export function formaterTelephone(brut, indicatif = INDICATIF_DEFAUT) {
    const r = analyserTelephone(brut, indicatif);
    if (!r.norme) return String(brut ?? '').trim();
    if (!r.pays) return r.norme;
    const morceaux = [];
    let i = 0;
    for (const n of r.pays.groupes || []) { if (i >= r.national.length) break; morceaux.push(r.national.slice(i, i + n)); i += n; }
    if (i < r.national.length) morceaux.push(r.national.slice(i));
    return `+${r.pays.indicatif} ${morceaux.join(' ')}`;
}


/** Indicatif par défaut d'un magasin : son pays, sinon le téléphone du patron, sinon +225 */
export function indicatifParDefaut(magasin, user) {
  const v = indicatifDuPays(magasin?.pays);
  if (v) return v;
  const t = String(user?.telephone || magasin?.telephone || '');
  if (t.startsWith('+')) {
    const p = PAR_INDICATIF.find((x) => t.replace(/\D/g, '').startsWith(x.indicatif));
    if (p) return p.indicatif;
  }
  return INDICATIF_DEFAUT;
}

export const paysDeIndicatif = (ind) => paysParIndicatif(ind);
