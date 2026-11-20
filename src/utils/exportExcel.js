// utils/exportExcel.js
// ============================================================
// EXPORT EXCEL COMMUN À TOUTES LES PAGES (aucune dépendance)
// Produit un vrai fichier .xlsx :
//   - titre et date d'export en haut,
//   - en-tête orange Miyo, colonne N°, lignes alternées,
//   - nombres, montants (FCFA), pourcentages et dates reconnus
//     (Excel peut trier, filtrer et calculer dessus),
//   - ligne TOTAL pour les montants, filtres et en-tête figé,
//   - accents corrects (fichier XML en UTF-8, pas de CSV).
//
// exporterExcel({ titre, fichier, entetes, lignes })   → données déjà dans la page
// exporterCsvEnExcel({ donnees, titre, fichier })       → CSV renvoyé par le serveur
// ============================================================

// ---------- Outils texte ----------
const sansAccents = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const xml = (s) =>
  String(s ?? '')
    // caractères interdits en XML
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\ufffe\uffff]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const lettre = (n) => {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// ---------- Lecture d'un CSV (séparateur ; , ou tabulation, guillemets) ----------
export function lireCsv(texte) {
  const t = String(texte ?? '').replace(/^\ufeff/, '');
  // Séparateur : celui qui revient le plus sur une même ligne (15 premières lignes)
  const debut = t.split(/\r?\n/, 15);
  const compter = (c) => Math.max(0, ...debut.map((l) => l.split(c).length - 1));
  const sep = [';', ',', '\t'].sort((a, b) => compter(b) - compter(a))[0];

  const lignes = [];
  let ligne = [];
  let cellule = '';
  let entreGuillemets = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (entreGuillemets) {
      if (c === '"') {
        if (t[i + 1] === '"') { cellule += '"'; i++; }
        else entreGuillemets = false;
      } else cellule += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === sep) { ligne.push(cellule); cellule = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      ligne.push(cellule); cellule = '';
      if (ligne.some((x) => x !== '')) lignes.push(ligne);
      ligne = [];
    } else cellule += c;
  }
  ligne.push(cellule);
  if (ligne.some((x) => x !== '')) lignes.push(ligne);
  // Certains exports serveur commencent par un titre et un résumé (« Total alertes: 3 »)
  // avant l'en-tête : l'en-tête est la première ligne de la largeur maximale.
  const largeur = Math.max(0, ...lignes.map((l) => l.length));
  let k = lignes.findIndex((l) => l.length === largeur);
  if (largeur <= 1 || k < 0) k = 0;
  const resume = lignes.slice(0, k).map((l) => l.filter((x) => x.trim() !== '').join(' ').trim()).filter(Boolean);
  const [entetes = [], ...reste] = lignes.slice(k);
  return { entetes: entetes.map((e) => e.trim()), lignes: reste, resume };
}

// ---------- Reconnaissance des valeurs ----------
const RE_NOMBRE = /^-?\d{1,3}([\s\u00a0\u202f]?\d{3})*([.,]\d+)?$|^-?\d+([.,]\d+)?$/;
const enNombre = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s*(fcfa|cfa|f|%)\s*$/i, '').trim();
  if (!s || !RE_NOMBRE.test(s)) return null;
  const n = Number(s.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// Date Excel : nombre de jours depuis le 30/12/1899 (heure locale conservée)
const EPOQUE = Date.UTC(1899, 11, 30);
const serieExcel = (an, mois, jour, h = 0, mi = 0, se = 0) =>
  (Date.UTC(an, mois - 1, jour, h, mi, se) - EPOQUE) / 86400000;

const enDate = (v) => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return { serie: serieExcel(v.getFullYear(), v.getMonth() + 1, v.getDate(), v.getHours(), v.getMinutes(), v.getSeconds()),
      heure: v.getHours() + v.getMinutes() + v.getSeconds() > 0 };
  }
  if (typeof v !== 'string') return null;
  const s = v.trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,à]+(\d{1,2})[:h](\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [, j, mo, a, h, mi, se] = m;
    if (+mo > 12 || +j > 31) return null;
    return { serie: serieExcel(+a, +mo, +j, +(h || 0), +(mi || 0), +(se || 0)), heure: h !== undefined };
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/);
  if (m) {
    const [, a, mo, j, h, mi, se, zone] = m;
    if (zone) {
      // Moment exact venu du serveur : on l'affiche à l'heure locale
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return enDate(d);
    }
    return { serie: serieExcel(+a, +mo, +j, +(h || 0), +(mi || 0), +(se || 0)), heure: h !== undefined && `${h}${mi}${se || ''}` !== '0000' };
  }
  return null;
};

// Libellés techniques (« en_attente ») en français lisible (« En attente »)
const ACCENTS = {
  payee: 'payée', payees: 'payées', annulee: 'annulée', annule: 'annulé', recue: 'reçue', recu: 'reçu', livree: 'livrée',
  livre: 'livré', validee: 'validée', valide: 'validé', terminee: 'terminée', termine: 'terminé', complete: 'complète',
  entree: 'entrée', entrees: 'entrées', cloturee: 'clôturée', cloture: 'clôturé', especes: 'espèces', cheque: 'chèque',
  credit: 'crédit', debit: 'débit', depense: 'dépense', depenses: 'dépenses', creee: 'créée', cree: 'créé',
  modifie: 'modifié', modifiee: 'modifiée', supprime: 'supprimé', supprimee: 'supprimée', echue: 'échue',
  employe: 'employé', categorie: 'catégorie', unite: 'unité', perime: 'périmé', endommage: 'endommagé',
  expire: 'expiré', expiree: 'expirée', retournee: 'retournée', traitee: 'traitée', envoyee: 'envoyée', ete: 'été',
};
const humaniser = (v) => {
  if (typeof v !== 'string' || !/^[a-z]+(_[a-z]+)*$/.test(v)) return v;
  const s = v.split('_').map((m) => ACCENTS[m] || m).join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Type d'une colonne d'après son titre et ses valeurs
const MOTS_MONTANT = ['montant', 'prix', 'total', 'paye', 'reste', 'solde', 'dette', 'chiffre', 'ca ', 'benefice',
  'valeur', 'cout', 'encaiss', 'recette', 'depense', 'credit', 'debit', 'remise', 'avance', 'du ', 'fcfa', 'marge brute'];
const MOTS_TEXTE = ['telephone', 'tel', 'contact', 'numero', 'reference', 'ref', 'code', 'slug', 'nni', 'lot', 'facture', 'commande', 'cni', 'id '];
const MOTS_LIBELLE = ['statut', 'etat', 'type', 'mode', 'role', 'action', 'module', 'categorie', 'unite', 'niveau'];

function typeColonne(titre, valeurs) {
  const t = ` ${sansAccents(titre)} `;
  const pleines = valeurs.filter((v) => v !== null && v !== undefined && v !== '' && v !== '-');
  if (!pleines.length) return 'texte';
  // mot entier (« commande » ne doit pas capter « Qté à commander »)
  const mots = t.trim().split(/[^a-z0-9]+/);
  if (!/(qte|quantite|valeur|montant|prix)/.test(t) && MOTS_TEXTE.some((m) => mots.includes(m.trim()))) return 'texte';
  const dates = pleines.map(enDate);
  if (dates.every(Boolean)) return dates.some((d) => d.heure) ? 'dateheure' : 'date';
  const nombres = pleines.map(enNombre);
  if (nombres.filter((n) => n !== null).length >= pleines.length * 0.9) {
    if (t.includes('%') || t.includes(' taux') || t.includes(' pourcent')) return 'pourcent';
    if (MOTS_MONTANT.some((m) => t.includes(m.startsWith(' ') ? m : ` ${m}`) || t.includes(m))) return 'montant';
    return nombres.every((n) => n === null || Number.isInteger(n)) ? 'entier' : 'decimal';
  }
  return MOTS_LIBELLE.some((m) => t.includes(` ${m}`)) ? 'libelle' : 'texte';
}

// ---------- Styles (index dans cellXfs) ----------
const S = {
  info: 23, titre: 1, sousTitre: 2, entete: 3, num: 4, numZ: 5,
  texte: 6, texteZ: 7, entier: 8, entierZ: 9, montant: 10, montantZ: 11,
  date: 12, dateZ: 13, dateheure: 14, dateheureZ: 15, decimal: 16, decimalZ: 17,
  pourcent: 18, pourcentZ: 19, totalLib: 20, totalMontant: 21, totalVide: 22,
};

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="6">
<numFmt numFmtId="164" formatCode="#,##0"/>
<numFmt numFmtId="165" formatCode="#,##0 &quot;FCFA&quot;"/>
<numFmt numFmtId="166" formatCode="dd/mm/yyyy"/>
<numFmt numFmtId="167" formatCode="dd/mm/yyyy hh:mm"/>
<numFmt numFmtId="168" formatCode="#,##0.00"/>
<numFmt numFmtId="169" formatCode="0.0&quot; %&quot;"/>
</numFmts>
<fonts count="5">
<font><sz val="11"/><color rgb="FF1C1917"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="16"/><color rgb="FFC2410C"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="10"/><color rgb="FF78716C"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF1C1917"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFC2410C"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFAFAF9"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF7ED"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="3">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFE7E5E4"/></left><right style="thin"><color rgb="FFE7E5E4"/></right><top style="thin"><color rgb="FFE7E5E4"/></top><bottom style="thin"><color rgb="FFE7E5E4"/></bottom><diagonal/></border>
<border><left style="thin"><color rgb="FFE7E5E4"/></left><right style="thin"><color rgb="FFE7E5E4"/></right><top style="medium"><color rgb="FFC2410C"/></top><bottom style="thin"><color rgb="FFE7E5E4"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="24">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="165" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="166" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="167" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="168" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="168" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="169" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="169" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="165" fontId="4" fillId="4" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// ---------- ZIP sans compression (format des fichiers .xlsx) ----------
const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (octets) => {
  let c = 0xffffffff;
  for (let i = 0; i < octets.length; i++) c = TABLE_CRC[(c ^ octets[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function zipper(fichiers) {
  const enc = new TextEncoder();
  const morceaux = [];
  const centraux = [];
  let decalage = 0;
  const maintenant = new Date();
  const heureDos = (maintenant.getHours() << 11) | (maintenant.getMinutes() << 5) | Math.floor(maintenant.getSeconds() / 2);
  const dateDos = ((maintenant.getFullYear() - 1980) << 9) | ((maintenant.getMonth() + 1) << 5) | maintenant.getDate();

  for (const { nom, contenu } of fichiers) {
    const nomOctets = enc.encode(nom);
    const donnees = enc.encode(contenu);
    const crc = crc32(donnees);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // noms en UTF-8
    local.setUint16(8, 0, true); // pas de compression
    local.setUint16(10, heureDos, true);
    local.setUint16(12, dateDos, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, donnees.length, true);
    local.setUint32(22, donnees.length, true);
    local.setUint16(26, nomOctets.length, true);
    local.setUint16(28, 0, true);
    morceaux.push(new Uint8Array(local.buffer), nomOctets, donnees);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, heureDos, true);
    central.setUint16(14, dateDos, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, donnees.length, true);
    central.setUint32(24, donnees.length, true);
    central.setUint16(28, nomOctets.length, true);
    central.setUint32(42, decalage, true);
    centraux.push(new Uint8Array(central.buffer), nomOctets);
    decalage += 30 + nomOctets.length + donnees.length;
  }
  const tailleCentrale = centraux.reduce((s, b) => s + b.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, fichiers.length, true);
  fin.setUint16(10, fichiers.length, true);
  fin.setUint32(12, tailleCentrale, true);
  fin.setUint32(16, decalage, true);
  return new Blob([...morceaux, ...centraux, new Uint8Array(fin.buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ---------- Construction de la feuille ----------
const formatAffiche = (v, type) => {
  if (v === null || v === undefined) return '';
  if (type === 'montant') return `${Math.round(v).toLocaleString('fr-FR')} FCFA`;
  if (type === 'date') return '00/00/0000';
  if (type === 'dateheure') return '00/00/0000 00:00';
  if (typeof v === 'number') return v.toLocaleString('fr-FR');
  return String(v);
};

/**
 * Construit le classeur et renvoie un Blob .xlsx.
 * @param {{ titre: string, sousTitre?: string, entetes: string[], lignes: any[][], totaux?: boolean }} p
 */
export function construireXlsx({ titre, sousTitre, entetes, lignes, totaux = true, resume = [] }) {
  const infos = (resume || []).filter((l, i) => !(i === 0 && !l.includes(':') && /rapport|alerte|export/i.test(l)));
  // 1. Colonnes : on enlève les identifiants techniques (« ID ») et la colonne N° existante
  const toutes = entetes.map((e, i) => ({ e: String(e ?? '').trim(), i }));
  const sansId = toutes.filter(({ e }) => {
      const t = sansAccents(e);
      return !(t === 'id' || /^id[ _]/.test(t) || /[ _]id$/.test(t) || t === 'n°' || t === 'no' || t === 'num' || t === '#');
    });
  const colonnes = (sansId.length ? sansId : toutes).map(({ e, i }) => {
    const brutes = lignes.map((l) => (Array.isArray(l) ? l[i] : undefined));
    const type = typeColonne(e, brutes);
    const valeurs = brutes.map((v) => {
      if (v === null || v === undefined || v === '' || v === '-' || v === '—') return null;
      if (type === 'date' || type === 'dateheure') return enDate(v)?.serie ?? null;
      if (['montant', 'entier', 'decimal', 'pourcent'].includes(type)) return enNombre(v);
      if (type === 'libelle') return humaniser(String(v).trim());
      return typeof v === 'string' ? v.trim() : String(v);
    });
    return { titre: e || ' ', type, valeurs };
  });

  const nbLignes = lignes.length;
  const nbCols = colonnes.length + 1; // + N°
  const derniereCol = lettre(nbCols);
  const LIGNE_ENTETE = 4 + (infos.length ? infos.length + 1 : 0);
  const premiereDonnee = LIGNE_ENTETE + 1;
  const derniereDonnee = LIGNE_ENTETE + nbLignes;

  // 2. Largeurs (d'après le texte affiché, plafonnées)
  const largeurs = [6, ...colonnes.map((c) => {
    const plusLong = Math.max(
      ...c.titre.split(/\s+/).map((m) => m.length),
      Math.min(c.titre.length, 18),
      ...c.valeurs.slice(0, 500).map((v) => formatAffiche(v, c.type).length)
    );
    return Math.min(Math.max(plusLong + 3, 9), c.type === 'texte' ? 48 : 30);
  })];

  // 3. Lignes XML
  const cellule = (ref, style, valeur, type) => {
    if (valeur === null || valeur === undefined || valeur === '') return `<c r="${ref}" s="${style}"/>`;
    if (typeof valeur === 'number' && ['montant', 'entier', 'decimal', 'pourcent', 'date', 'dateheure', 'num'].includes(type)) {
      return `<c r="${ref}" s="${style}"><v>${valeur}</v></c>`;
    }
    return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(valeur)}</t></is></c>`;
  };

  const exporte = new Date();
  const dateExport = `${exporte.toLocaleDateString('fr-FR')} à ${exporte.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  const rangs = [];
  rangs.push(`<row r="1" ht="26" customHeight="1">${cellule('A1', S.titre, titre)}</row>`);
  rangs.push(`<row r="2">${cellule('A2', S.sousTitre,
    [sousTitre, `Exporté depuis Miyo le ${dateExport}`, `${nbLignes} ligne${nbLignes > 1 ? 's' : ''}`].filter(Boolean).join('  ·  '))}</row>`);
  infos.forEach((l, i) => rangs.push(`<row r="${4 + i}">${cellule(`B${4 + i}`, S.info, l)}</row>`));
  rangs.push(`<row r="${LIGNE_ENTETE}" ht="32" customHeight="1">${[{ titre: 'N°' }, ...colonnes]
    .map((c, k) => cellule(`${lettre(k + 1)}${LIGNE_ENTETE}`, S.entete, c.titre)).join('')}</row>`);

  for (let r = 0; r < nbLignes; r++) {
    const z = r % 2 === 1 ? 'Z' : '';
    const ligne = premiereDonnee + r;
    const cells = [cellule(`A${ligne}`, S[`num${z}`], r + 1, 'num')];
    colonnes.forEach((c, k) => {
      const styleNom = c.type === 'libelle' ? 'texte' : c.type;
      cells.push(cellule(`${lettre(k + 2)}${ligne}`, S[`${styleNom}${z}`], c.valeurs[r], c.type));
    });
    rangs.push(`<row r="${ligne}">${cells.join('')}</row>`);
  }

  // 4. Ligne TOTAL (formules SUM sur les montants)
  // Total seulement pour les montants qui s'additionnent (pas pour un prix unitaire)
  const ADDITIONNABLES = ['montant', 'total', 'paye', 'reste', 'solde', 'dette', 'recette', 'depense', 'chiffre', 'ca',
    'benefice', 'encaiss', 'credit', 'debit', 'valeur', 'du', 'avance', 'remise', 'cout total', 'marge brute'];
  const colsMontant = colonnes.map((c, k) => {
    if (c.type !== 'montant') return null;
    const t = ` ${sansAccents(c.titre)} `;
    return ADDITIONNABLES.some((m) => t.includes(` ${m}`)) && !t.includes(' prix ') ? k + 2 : null;
  }).filter(Boolean);
  let refFin = `${derniereCol}${Math.max(derniereDonnee, LIGNE_ENTETE)}`;
  if (totaux && nbLignes > 1 && colsMontant.length) {
    const lt = derniereDonnee + 1;
    const cells = [];
    for (let k = 1; k <= nbCols; k++) {
      const ref = `${lettre(k)}${lt}`;
      if (colsMontant.includes(k)) {
        const L = lettre(k);
        cells.push(`<c r="${ref}" s="${S.totalMontant}"><f>SUBTOTAL(109,${L}${premiereDonnee}:${L}${derniereDonnee})</f></c>`);
      } else if (k === 2) cells.push(cellule(ref, S.totalLib, 'TOTAL'));
      else cells.push(`<c r="${ref}" s="${S.totalVide}"/>`);
    }
    rangs.push(`<row r="${lt}" ht="22" customHeight="1">${cells.join('')}</row>`);
    refFin = `${derniereCol}${lt}`;
  }

  const filtre = `A${LIGNE_ENTETE}:${derniereCol}${Math.max(derniereDonnee, premiereDonnee)}`;
  const feuille = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${refFin}"/>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane xSplit="1" ySplit="${LIGNE_ENTETE}" topLeftCell="B${premiereDonnee}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="B${premiereDonnee}" sqref="B${premiereDonnee}"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols>${largeurs.map((w, k) => `<col min="${k + 1}" max="${k + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${rangs.join('')}</sheetData>
<autoFilter ref="${filtre}"/>
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
<headerFooter><oddFooter>&amp;L${xml(titre)}&amp;RPage &amp;P / &amp;N</oddFooter></headerFooter>
</worksheet>`;

  const nomFeuille = (String(titre || 'Export').replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31)) || 'Export';
  const classeur = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView/></bookViews>
<sheets><sheet name="${xml(nomFeuille)}" sheetId="1" r:id="rId1"/></sheets>
<definedNames>
<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${xml(nomFeuille).replace(/'/g, "''")}'!$A$${LIGNE_ENTETE}:$${derniereCol}$${Math.max(derniereDonnee, premiereDonnee)}</definedName>
<definedName name="_xlnm.Print_Titles" localSheetId="0">'${xml(nomFeuille).replace(/'/g, "''")}'!$${LIGNE_ENTETE}:$${LIGNE_ENTETE}</definedName>
</definedNames>
<calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`;

  return zipper([
    { nom: '[Content_Types].xml', contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>` },
    { nom: '_rels/.rels', contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>` },
    { nom: 'docProps/core.xml', contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xml(titre)}</dc:title><dc:creator>Miyo</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${exporte.toISOString().slice(0, 19)}Z</dcterms:created>
</cp:coreProperties>` },
    { nom: 'docProps/app.xml', contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Miyo</Application></Properties>` },
    { nom: 'xl/workbook.xml', contenu: classeur },
    { nom: 'xl/_rels/workbook.xml.rels', contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
    { nom: 'xl/styles.xml', contenu: STYLES },
    { nom: 'xl/worksheets/sheet1.xml', contenu: feuille },
  ]);
}

// ---------- Téléchargement ----------
const telecharger = (blob, fichier) => {
  const nom = `${String(fichier || 'export').replace(/\.(csv|xlsx?)$/i, '')}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

/**
 * Exporte des données de la page.
 * @param {{ titre: string, fichier: string, entetes: string[], lignes: any[][], sousTitre?: string, totaux?: boolean }} p
 */
export async function exporterExcel(p) {
  telecharger(construireXlsx(p), p.fichier);
}

/**
 * Exporte un CSV renvoyé par le serveur (texte, Blob ou ArrayBuffer) en vrai fichier Excel.
 * @param {{ donnees: string|Blob|ArrayBuffer, titre: string, fichier: string, sousTitre?: string }} p
 */
export async function exporterCsvEnExcel({ donnees, titre, fichier, sousTitre }) {
  let texte = donnees;
  if (donnees instanceof Blob) texte = await donnees.text();
  else if (donnees instanceof ArrayBuffer) texte = new TextDecoder('utf-8').decode(donnees);
  const { entetes, lignes, resume } = lireCsv(texte);
  if (!entetes.length) throw new Error('Rien à exporter.');
  telecharger(construireXlsx({ titre, sousTitre, entetes, lignes, resume }), fichier);
}
