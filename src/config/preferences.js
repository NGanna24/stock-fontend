// config/preferences.js
// ------------------------------------------------------------
// Réglages propres à CET ordinateur (enregistrés dans le navigateur,
// rien n'est envoyé au serveur ni à la base de données).
// La page Paramètres les modifie ; le reste du logiciel les lit ici.
// ------------------------------------------------------------

export const CLES = {
  delaiVerrou: 'miyo:delai-verrou',     // minutes sans activité avant verrouillage
  sonAlertes: 'miyo:son-alertes',       // '1' = son des alertes activé, '0' = coupé
  formatFacture: 'miyo:format-facture', // 'demander' | 'a4' | 'ticket'
  menuReduit: 'miyo:sidebar-collapsed', // '1' = menu latéral réduit
};

export const DELAIS_VERROU = [5, 10, 15, 30, 60];
export const DELAI_VERROU_DEFAUT = 15;

const lire = (cle) => {
  try { return localStorage.getItem(cle); } catch { return null; }
};

const ecrire = (cle, valeur) => {
  try {
    if (valeur === null || valeur === undefined) localStorage.removeItem(cle);
    else localStorage.setItem(cle, String(valeur));
  } catch { /* stockage indisponible */ }
  window.dispatchEvent(new CustomEvent('miyo:preferences', { detail: { cle, valeur } }));
};

// ---------- Verrouillage ----------
export const delaiVerrouMin = () => {
  const n = Number(lire(CLES.delaiVerrou));
  return DELAIS_VERROU.includes(n) ? n : DELAI_VERROU_DEFAUT;
};
export const setDelaiVerrouMin = (n) => ecrire(CLES.delaiVerrou, n);

// ---------- Son des alertes ----------
export const sonAlertesActif = () => lire(CLES.sonAlertes) !== '0';
export const setSonAlertes = (actif) => ecrire(CLES.sonAlertes, actif ? '1' : '0');

// ---------- Format des factures ----------
export const formatFacture = () => {
  const f = lire(CLES.formatFacture);
  return f === 'a4' || f === 'ticket' ? f : 'demander';
};
export const setFormatFacture = (f) => ecrire(CLES.formatFacture, f === 'a4' || f === 'ticket' ? f : null);

// ---------- Menu latéral ----------
export const menuReduit = () => lire(CLES.menuReduit) === '1';
export const setMenuReduit = (reduit) => ecrire(CLES.menuReduit, reduit ? '1' : '0');
