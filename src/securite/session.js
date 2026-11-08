// securite/session.js
//
// Sécurité de la session dans le navigateur :
//   - retour à l'écran de connexion si le serveur dit que la session est expirée ou fermée ;
//   - jeton prolongé automatiquement tant que l'on travaille (session de 12 h côté serveur) ;
//   - verrouillage de l'écran après DELAI_VERROU_MIN minutes sans activité (voir VerrouSession) ;
//   - empreinte locale du code, pour déverrouiller sans internet (mode hors ligne).
import axios from 'axios';
import API_URL from '../config/api';
import { delaiVerrouMin, DELAI_VERROU_DEFAUT } from '../config/preferences';

/** Minutes sans activité avant verrouillage de l'écran (valeur par défaut ; réglable dans Paramètres). */
export const DELAI_VERROU_MIN = DELAI_VERROU_DEFAUT;
export { delaiVerrouMin };
const RENOUVELER_APRES_MIN = 60;      // on prolonge le jeton s'il a plus d'une heure…
const VERIF_RENOUVELLEMENT_MS = 5 * 60 * 1000; // …vérifié toutes les 5 minutes

const CLE_ACTIVITE = 'miyo:activite';
const CLE_VERROU = 'miyo:verrou';
const CLE_EMPREINTE = 'miyo:empreinte';
const CLE_RAISON = 'miyo:raison-deconnexion';

// ============================================================
// Activité / verrou (partagés entre onglets via localStorage)
// ============================================================
export const noterActivite = () => { try { localStorage.setItem(CLE_ACTIVITE, String(Date.now())); } catch { /* plein */ } };
export const derniereActivite = () => Number(localStorage.getItem(CLE_ACTIVITE)) || 0;
export const estVerrouille = () => localStorage.getItem(CLE_VERROU) === '1';
export const verrouiller = () => { try { localStorage.setItem(CLE_VERROU, '1'); } catch { /* plein */ } };
export const deverrouiller = () => { localStorage.removeItem(CLE_VERROU); noterActivite(); };
export const inactifDepuisTrop = () => {
  const d = derniereActivite();
  return d > 0 && Date.now() - d > delaiVerrouMin() * 60 * 1000;
};

/** Pourquoi on est revenu à l'écran de connexion (lu une fois par la page de connexion). */
export const lireRaisonDeconnexion = () => {
  const r = sessionStorage.getItem(CLE_RAISON);
  sessionStorage.removeItem(CLE_RAISON);
  return r;
};

/** Ferme la session sur cet appareil et retourne à la connexion. */
export function terminerSession(raison = null) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem(CLE_VERROU);
  localStorage.removeItem(CLE_EMPREINTE);
  if (raison) sessionStorage.setItem(CLE_RAISON, raison);
  if (!/\/login$/.test(window.location.pathname)) window.location.assign('/login');
}

/** Remplace le jeton (renouvellement, déverrouillage, « déconnecter partout »). */
export function remplacerJeton(token) {
  if (!token) return;
  localStorage.setItem('token', token);
  window.dispatchEvent(new CustomEvent('miyo:token', { detail: token }));
}

const ageJetonMin = (token) => {
  try {
    const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return p.iat ? (Date.now() / 1000 - p.iat) / 60 : Infinity;
  } catch {
    return Infinity;
  }
};

// ============================================================
// Empreinte locale du code (SHA-256 répété, sans dépendance)
// ============================================================
function sha256(texte) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const octets = Array.from(new TextEncoder().encode(texte));
  const longueur = octets.length * 8;
  octets.push(0x80);
  while (octets.length % 64 !== 56) octets.push(0);
  for (let i = 7; i >= 0; i--) octets.push(Math.floor(longueur / 2 ** (i * 8)) & 0xff);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let b = 0; b < octets.length; b += 64) {
    const W = new Array(64);
    for (let t = 0; t < 16; t++) W[t] = (octets[b + t * 4] << 24) | (octets[b + t * 4 + 1] << 16) | (octets[b + t * 4 + 2] << 8) | octets[b + t * 4 + 3];
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }
    let [a, bb, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & bb) ^ (a & c) ^ (bb & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

const empreinte = (code, sel) => {
  let h = `${sel}:${code}`;
  for (let i = 0; i < 2000; i++) h = sha256(`${sel}${h}`);
  return h;
};

/** Garde sur l'appareil une empreinte du code (jamais le code lui-même). */
export function memoriserEmpreinte(code) {
  if (!code) return;
  const sel = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try { localStorage.setItem(CLE_EMPREINTE, JSON.stringify({ sel, h: empreinte(String(code), sel), essais: 0 })); } catch { /* plein */ }
}

/** Vérifie le code sans internet. → true | false | null (pas d'empreinte sur cet appareil) */
export function verifierCodeLocal(code) {
  try {
    const e = JSON.parse(localStorage.getItem(CLE_EMPREINTE) || 'null');
    if (!e) return null;
    const ok = empreinte(String(code), e.sel) === e.h;
    e.essais = ok ? 0 : (e.essais || 0) + 1;
    localStorage.setItem(CLE_EMPREINTE, JSON.stringify(e));
    return ok ? true : e.essais;
  } catch {
    return null;
  }
}

// ============================================================
// Démarrage : intercepteur + renouvellement
// ============================================================
let installe = false;

const estSessionExpiree = (err) => {
  const r = err?.response;
  if (!r || r.status !== 401) return false;
  const url = String(err.config?.url || '');
  if (/\/utilisateur\/(login|verifier-code|register)|\/super-admin|\/api\/admin\//.test(url)) return false;
  return r.data?.code === 'SESSION_EXPIREE'
    || /session (expirée|fermée)|token (invalide|expiré|d'authentification)|non authentifié|(utilisateur|employé) introuvable/i.test(r.data?.message || '');
};

export function installerSession() {
  if (installe) return;
  installe = true;

  axios.interceptors.response.use(
    (r) => r,
    (err) => {
      if (estSessionExpiree(err) && localStorage.getItem('token')) {
        terminerSession(err.response.data?.message || 'Votre session a expiré : reconnectez-vous.');
      }
      return Promise.reject(err);
    }
  );

  // Prolonger le jeton tant que l'on travaille (et que l'écran n'est pas verrouillé)
  setInterval(async () => {
    const token = localStorage.getItem('token');
    if (!token || estVerrouille() || inactifDepuisTrop()) return;
    if (ageJetonMin(token) < RENOUVELER_APRES_MIN) return;
    try {
      const r = await axios.post(API_URL.AUTH.RENOUVELER, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (r.data?.token) remplacerJeton(r.data.token);
    } catch { /* hors ligne ou session fermée (gérée par l'intercepteur) */ }
  }, VERIF_RENOUVELLEMENT_MS);
}
