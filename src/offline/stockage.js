// offline/stockage.js
//
// Petit stockage persistant sur l'appareil (IndexedDB), sans dépendance.
//   - « kv »     : catalogue des produits, fiche du magasin, compteurs…
//   - « ventes » : ventes faites hors ligne, en attente d'envoi (clé : id_local)
// Si IndexedDB n'est pas disponible (navigation privée très restreinte), repli sur localStorage.

const NOM_BASE = 'miyo-hors-ligne';
const VERSION = 1;
const PREFIXE_LS = 'miyo:hl:';

let promesseBase = null;

const idbDisponible = () => {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
};

function ouvrir() {
  if (!idbDisponible()) return Promise.resolve(null);
  if (promesseBase) return promesseBase;
  promesseBase = new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(NOM_BASE, VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('ventes')) db.createObjectStore('ventes', { keyPath: 'id_local' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return promesseBase;
}

const enPromesse = (requete) => new Promise((resolve, reject) => {
  requete.onsuccess = () => resolve(requete.result);
  requete.onerror = () => reject(requete.error);
});

async function transaction(store, mode, action) {
  const db = await ouvrir();
  if (!db) return null;
  const tx = db.transaction(store, mode);
  const resultat = await enPromesse(action(tx.objectStore(store)));
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  return resultat;
}

// ---------- Repli localStorage ----------
const ls = {
  lire: (cle) => { try { const v = localStorage.getItem(PREFIXE_LS + cle); return v ? JSON.parse(v) : null; } catch { return null; } },
  ecrire: (cle, v) => { try { localStorage.setItem(PREFIXE_LS + cle, JSON.stringify(v)); } catch { /* plein */ } },
  suppr: (cle) => { try { localStorage.removeItem(PREFIXE_LS + cle); } catch { /* rien */ } },
};

// ============================================================
// API
// ============================================================
export async function lireKV(cle) {
  if (!(await ouvrir())) return ls.lire(`kv:${cle}`);
  return (await transaction('kv', 'readonly', (s) => s.get(cle))) ?? null;
}

export async function ecrireKV(cle, valeur) {
  if (!(await ouvrir())) { ls.ecrire(`kv:${cle}`, valeur); return; }
  await transaction('kv', 'readwrite', (s) => s.put(valeur, cle));
}

export async function supprimerKV(cle) {
  if (!(await ouvrir())) { ls.suppr(`kv:${cle}`); return; }
  await transaction('kv', 'readwrite', (s) => s.delete(cle));
}

export async function toutesLesVentes() {
  if (!(await ouvrir())) return ls.lire('ventes') || [];
  const liste = (await transaction('ventes', 'readonly', (s) => s.getAll())) || [];
  return liste.sort((a, b) => String(a.date_vente).localeCompare(String(b.date_vente)));
}

export async function lireVente(idLocal) {
  if (!(await ouvrir())) return (ls.lire('ventes') || []).find((v) => v.id_local === idLocal) || null;
  return (await transaction('ventes', 'readonly', (s) => s.get(idLocal))) ?? null;
}

export async function ecrireVente(vente) {
  if (!(await ouvrir())) {
    const liste = (ls.lire('ventes') || []).filter((v) => v.id_local !== vente.id_local);
    liste.push(vente);
    ls.ecrire('ventes', liste);
    return;
  }
  await transaction('ventes', 'readwrite', (s) => s.put(vente));
}

export async function supprimerVente(idLocal) {
  if (!(await ouvrir())) {
    ls.ecrire('ventes', (ls.lire('ventes') || []).filter((v) => v.id_local !== idLocal));
    return;
  }
  await transaction('ventes', 'readwrite', (s) => s.delete(idLocal));
}
