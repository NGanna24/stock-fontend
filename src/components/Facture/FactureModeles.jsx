// components/Facture/FactureModeles.jsx
// ============================================================
// MODÈLES DE FACTURE A4 (en plus du modèle « Classique » de FacturePDF.jsx)
//   - Moderne : grand titre orange, cartes douces, total mis en avant
//   - Épuré   : sobre, beaucoup de blanc, filets fins
//   - Compact : serré, pour beaucoup de lignes sur une page
// Couleurs Miyo (orange #C2410C, tons sombres), sans bande sur les côtés.
// Les données sont celles de FacturePDF (mêmes champs).
// ============================================================
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { libelleMode } from '../../config/modesPaiement';
import { etatPaiement } from '../../config/documents';
import CachetSignature from '../Documents/CachetSignature';

const isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.');
const API_BASE_URL = isLocal ? 'http://192.168.187.1:8080' : 'https://miyo.n-double.com';

const C = {
  orange: '#C2410C',
  orangeDoux: '#FFF4ED',
  orangeTrait: '#FED7AA',
  encre: '#1C1917',
  encre2: '#44403C',
  gris: '#78716C',
  trait: '#E7E5E4',
  fond: '#FAFAF9',
  blanc: '#FFFFFF',
};

const montant = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
const dateFR = (d) => {
  if (!d) return '-';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? String(d) : x.toLocaleDateString('fr-FR');
};
const STATUTS = {
  en_attente: 'En attente', payee: 'Payée', partiellement_payee: 'Payée en partie', en_retard: 'En retard', annulee: 'Annulée',
};

// Tout ce que les modèles affichent, calculé une fois
export function preparerFacture(data) {
  const d = data || {};
  const magasin = d.magasin || {};
  const lignes = (d.lignes || []).map((l, i) => {
    const qte = parseFloat(l.quantite || 0);
    const prix = parseFloat(l.prix_vente || 0);
    const remise = parseFloat(l.remise || 0);
    return {
      numero: String(i + 1).padStart(2, '0'),
      nom: [l.produit_nom || 'Produit', l.marque_nom].filter(Boolean).join(' - ') + (l.unite_symbole ? ` (${l.unite_symbole})` : ''),
      qte, prix, remise, total: qte * prix * (1 - remise / 100),
    };
  });
  const total = parseFloat(d.montant_total || 0);
  const paye = (d.paiements || []).reduce((s, p) => s + parseFloat(p.montant || 0), 0);
  const reste = Math.max(0, total - paye);
  const logo = magasin.logo_url ? (magasin.logo_url.startsWith('http') ? magasin.logo_url : `${API_BASE_URL}${magasin.logo_url}`) : null;
  const nom = magasin.nom_commercial || 'Mon magasin';
  return {
    d, magasin, lignes, total, paye, reste, logo, nom,
    initiales: nom.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
    adresse: [magasin.quartier, magasin.ville, magasin.pays].filter(Boolean).join(', '),
    telephones: [magasin.telephone, magasin.telephone2].filter(Boolean).join(' / '),
    statut: STATUTS[d.statut] || 'En attente',
    mode: libelleMode(d.mode_paiement),
    date: d.date_facture_formatee || dateFR(d.date_facture),
    echeance: d.date_echeance_formatee || dateFR(d.date_echeance),
    paiement: etatPaiement(total, paye),
    mentions: [
      magasin.numero_rccm && `RCCM : ${magasin.numero_rccm}`,
      magasin.numero_nif && `NIF : ${magasin.numero_nif}`,
      magasin.numero_contribuable && `N° Contribuable : ${magasin.numero_contribuable}`,
    ].filter(Boolean),
    conditions: d.notes || 'Merci pour votre confiance. Tout retard de paiement peut entraîner des pénalités conformément à nos conditions générales de vente.',
  };
}

const NumeroPage = ({ style }) => (
  <Text fixed style={style} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
);

/* ============================================================
   MODERNE
   ============================================================ */
const m = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 70, paddingHorizontal: 40, fontFamily: 'Helvetica', fontSize: 9.5, color: C.encre },
  tete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  marque: { flexDirection: 'row', alignItems: 'center', maxWidth: '60%' },
  logo: { width: 54, height: 54, objectFit: 'contain', marginRight: 12 },
  initiales: { width: 54, height: 54, marginRight: 12, borderRadius: 12, backgroundColor: C.orange, color: C.blanc, fontSize: 20, fontWeight: 'bold', textAlign: 'center', paddingTop: 15 },
  nom: { fontSize: 14, fontWeight: 'bold' },
  petit: { fontSize: 8.5, color: C.gris, marginTop: 2 },
  titre: { fontSize: 30, fontWeight: 'bold', color: C.orange, textAlign: 'right', letterSpacing: 1 },
  numero: { fontSize: 10, textAlign: 'right', marginTop: 4, color: C.encre2 },
  cartes: { flexDirection: 'row', marginBottom: 20 },
  carte: { flex: 1, backgroundColor: C.fond, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.trait },
  carteTitre: { fontSize: 7.5, color: C.orange, fontWeight: 'bold', letterSpacing: 1, marginBottom: 6 },
  client: { fontSize: 13, fontWeight: 'bold', marginBottom: 3 },
  ligneInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  infoLib: { color: C.gris },
  infoVal: { fontWeight: 'bold' },
  thead: { flexDirection: 'row', backgroundColor: C.orangeDoux, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 8 },
  th: { fontSize: 8, fontWeight: 'bold', color: C.orange, letterSpacing: 0.5 },
  tr: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.trait },
  cN: { width: '7%' }, cD: { width: '45%' }, cP: { width: '17%', textAlign: 'right' }, cQ: { width: '10%', textAlign: 'center' }, cM: { width: '21%', textAlign: 'right' },
  gris: { color: C.gris },
  bas: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  totaux: { width: '46%' },
  totLigne: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totBoite: { marginTop: 8, backgroundColor: C.orange, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totBoiteLib: { color: C.blanc, fontSize: 10, fontWeight: 'bold' },
  totBoiteVal: { color: C.blanc, fontSize: 16, fontWeight: 'bold' },
  conditions: { flex: 1, marginRight: 16 },
  condTitre: { fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
  condTexte: { fontSize: 8, color: C.gris, lineHeight: 1.5 },
  signature: { marginTop: 16, alignItems: 'flex-end' },
  signTrait: { width: 170, borderBottomWidth: 1, borderBottomColor: C.encre2, marginBottom: 4 },
  pied: { position: 'absolute', bottom: 26, left: 40, right: 40, borderTopWidth: 1, borderTopColor: C.trait, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  piedTxt: { fontSize: 7.5, color: C.gris },
  pageNum: { position: 'absolute', bottom: 12, right: 40, fontSize: 7, color: C.gris },
});

export function FactureModerne({ data }) {
  const f = preparerFacture(data);
  return (
    <Document>
      <Page size="A4" style={m.page} wrap>
        <View style={m.tete}>
          <View style={m.marque}>
            {f.logo ? <Image src={f.logo} style={m.logo} /> : <Text style={m.initiales}>{f.initiales}</Text>}
            <View>
              <Text style={m.nom}>{f.nom}</Text>
              {f.magasin.slogan ? <Text style={m.petit}>{f.magasin.slogan}</Text> : null}
              {f.adresse ? <Text style={m.petit}>{f.adresse}</Text> : null}
              {f.telephones ? <Text style={m.petit}>Tél : {f.telephones}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={m.titre}>FACTURE</Text>
            <Text style={m.numero}>{f.d.numero_facture}</Text>
          </View>
        </View>

        <View style={m.cartes} wrap={false}>
          <View style={[m.carte, { marginRight: 12 }]}>
            <Text style={m.carteTitre}>FACTURÉ À</Text>
            <Text style={m.client}>{f.d.nomclient || '-'}</Text>
            {f.d.adresse ? <Text style={m.petit}>{f.d.adresse}</Text> : null}
            {f.d.telephone ? <Text style={m.petit}>Tél : {f.d.telephone}</Text> : null}
            {f.d.email ? <Text style={m.petit}>{f.d.email}</Text> : null}
          </View>
          <View style={m.carte}>
            <Text style={m.carteTitre}>DÉTAILS</Text>
            <View style={m.ligneInfo}><Text style={m.infoLib}>Date</Text><Text style={m.infoVal}>{f.date}</Text></View>
            <View style={m.ligneInfo}><Text style={m.infoLib}>Échéance</Text><Text style={m.infoVal}>{f.echeance}</Text></View>
            <View style={m.ligneInfo}><Text style={m.infoLib}>Statut</Text><Text style={m.infoVal}>{f.statut}</Text></View>
            <View style={m.ligneInfo}><Text style={m.infoLib}>Paiement</Text><Text style={m.infoVal}>{f.mode}</Text></View>
            {f.d.numero_commande ? <View style={m.ligneInfo}><Text style={m.infoLib}>Commande</Text><Text style={m.infoVal}>{f.d.numero_commande}</Text></View> : null}
          </View>
        </View>

        <View style={m.thead} fixed>
          <Text style={[m.th, m.cN]}>N°</Text><Text style={[m.th, m.cD]}>DÉSIGNATION</Text>
          <Text style={[m.th, m.cP]}>PRIX</Text><Text style={[m.th, m.cQ]}>QTÉ</Text><Text style={[m.th, m.cM]}>MONTANT</Text>
        </View>
        {f.lignes.length === 0 ? <View style={m.tr}><Text style={m.gris}>Aucun produit</Text></View> : f.lignes.map((l) => (
          <View key={l.numero} style={m.tr} wrap={false}>
            <Text style={[m.cN, m.gris]}>{l.numero}</Text>
            <Text style={m.cD}>{l.nom}{l.remise ? ` (remise ${l.remise} %)` : ''}</Text>
            <Text style={m.cP}>{montant(l.prix)}</Text>
            <Text style={m.cQ}>{l.qte}</Text>
            <Text style={[m.cM, { fontWeight: 'bold' }]}>{montant(l.total)}</Text>
          </View>
        ))}

        <View style={m.bas} wrap={false} minPresenceAhead={140}>
          <View style={m.conditions}>
            <Text style={m.condTitre}>Conditions</Text>
            <Text style={m.condTexte}>{f.conditions}</Text>
            <View style={m.signature}>
              <CachetSignature type="facture" paiement={f.paiement} />
              <View style={m.signTrait} />
              <Text style={{ fontSize: 8.5, fontWeight: 'bold' }}>{f.nom}</Text>
              <Text style={m.petit}>Signature autorisée</Text>
            </View>
          </View>
          <View style={m.totaux}>
            <View style={m.totLigne}><Text style={m.infoLib}>Total de la facture</Text><Text style={m.infoVal}>{montant(f.total)}</Text></View>
            <View style={m.totLigne}><Text style={m.infoLib}>Déjà payé</Text><Text style={m.infoVal}>{montant(f.paye)}</Text></View>
            <View style={m.totBoite}>
              <Text style={m.totBoiteLib}>{f.reste > 0 ? 'RESTE À PAYER' : 'TOTAL PAYÉ'}</Text>
              <Text style={m.totBoiteVal}>{montant(f.reste > 0 ? f.reste : f.total)}</Text>
            </View>
          </View>
        </View>

        <View style={m.pied} fixed>
          <Text style={m.piedTxt}>{[f.telephones, f.magasin.email, f.magasin.whatsapp && `WhatsApp ${f.magasin.whatsapp}`].filter(Boolean).join('  ·  ')}</Text>
          <Text style={m.piedTxt}>{f.mentions.join('  ·  ')}</Text>
        </View>
        <NumeroPage style={m.pageNum} />
      </Page>
    </Document>
  );
}

/* ============================================================
   ÉPURÉ
   ============================================================ */
const e = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 72, paddingHorizontal: 54, fontFamily: 'Helvetica', fontSize: 9.5, color: C.encre },
  tete: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  logo: { width: 44, height: 44, objectFit: 'contain', marginBottom: 8 },
  nom: { fontSize: 12, fontWeight: 'bold' },
  petit: { fontSize: 8.5, color: C.gris, marginTop: 2 },
  titre: { fontSize: 11, letterSpacing: 4, color: C.gris, textAlign: 'right' },
  numero: { fontSize: 18, fontWeight: 'bold', textAlign: 'right', marginTop: 4 },
  date: { fontSize: 8.5, color: C.gris, textAlign: 'right', marginTop: 2 },
  bloc: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  lib: { fontSize: 7.5, letterSpacing: 2, color: C.gris, marginBottom: 6 },
  client: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  meta: { alignItems: 'flex-end' },
  thead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.encre, paddingBottom: 6 },
  th: { fontSize: 7.5, letterSpacing: 1.5, color: C.gris },
  tr: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: C.trait },
  cN: { width: '7%' }, cD: { width: '47%' }, cP: { width: '17%', textAlign: 'right' }, cQ: { width: '9%', textAlign: 'center' }, cM: { width: '20%', textAlign: 'right' },
  totaux: { marginTop: 18, marginLeft: '50%' },
  totLigne: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totFinal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 6, borderTopWidth: 1, borderTopColor: C.encre },
  totFinalLib: { fontSize: 10, fontWeight: 'bold' },
  totFinalVal: { fontSize: 15, fontWeight: 'bold', color: C.orange },
  bas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 36 },
  cond: { width: '55%', fontSize: 8, color: C.gris, lineHeight: 1.6 },
  sign: { alignItems: 'center' },
  signTrait: { width: 150, borderBottomWidth: 0.5, borderBottomColor: C.encre, marginBottom: 4 },
  pied: { position: 'absolute', bottom: 30, left: 54, right: 54, flexDirection: 'row', justifyContent: 'space-between' },
  piedTxt: { fontSize: 7, color: C.gris },
  pageNum: { position: 'absolute', bottom: 16, right: 54, fontSize: 7, color: C.gris },
});

export function FactureEpure({ data }) {
  const f = preparerFacture(data);
  return (
    <Document>
      <Page size="A4" style={e.page} wrap>
        <View style={e.tete}>
          <View>
            {f.logo ? <Image src={f.logo} style={e.logo} /> : null}
            <Text style={e.nom}>{f.nom}</Text>
            {f.adresse ? <Text style={e.petit}>{f.adresse}</Text> : null}
            {f.telephones ? <Text style={e.petit}>{f.telephones}</Text> : null}
          </View>
          <View>
            <Text style={e.titre}>FACTURE</Text>
            <Text style={e.numero}>{f.d.numero_facture}</Text>
            <Text style={e.date}>du {f.date}</Text>
          </View>
        </View>

        <View style={e.bloc} wrap={false}>
          <View>
            <Text style={e.lib}>CLIENT</Text>
            <Text style={e.client}>{f.d.nomclient || '-'}</Text>
            {f.d.telephone ? <Text style={e.petit}>{f.d.telephone}</Text> : null}
            {f.d.adresse ? <Text style={e.petit}>{f.d.adresse}</Text> : null}
          </View>
          <View style={e.meta}>
            <Text style={e.lib}>ÉCHÉANCE</Text>
            <Text style={{ fontWeight: 'bold' }}>{f.echeance}</Text>
            <Text style={[e.petit, { marginTop: 6 }]}>{f.statut} · {f.mode}</Text>
            {f.d.numero_commande ? <Text style={e.petit}>Commande {f.d.numero_commande}</Text> : null}
          </View>
        </View>

        <View style={e.thead} fixed>
          <Text style={[e.th, e.cN]}>N°</Text><Text style={[e.th, e.cD]}>DÉSIGNATION</Text>
          <Text style={[e.th, e.cP]}>PRIX</Text><Text style={[e.th, e.cQ]}>QTÉ</Text><Text style={[e.th, e.cM]}>MONTANT</Text>
        </View>
        {f.lignes.length === 0 ? <View style={e.tr}><Text style={{ color: C.gris }}>Aucun produit</Text></View> : f.lignes.map((l) => (
          <View key={l.numero} style={e.tr} wrap={false}>
            <Text style={[e.cN, { color: C.gris }]}>{l.numero}</Text>
            <Text style={e.cD}>{l.nom}{l.remise ? ` (remise ${l.remise} %)` : ''}</Text>
            <Text style={e.cP}>{montant(l.prix)}</Text>
            <Text style={e.cQ}>{l.qte}</Text>
            <Text style={e.cM}>{montant(l.total)}</Text>
          </View>
        ))}

        <View style={e.totaux} wrap={false}>
          <View style={e.totLigne}><Text style={{ color: C.gris }}>Total</Text><Text>{montant(f.total)}</Text></View>
          <View style={e.totLigne}><Text style={{ color: C.gris }}>Payé</Text><Text>{montant(f.paye)}</Text></View>
          <View style={e.totFinal}>
            <Text style={e.totFinalLib}>{f.reste > 0 ? 'Reste à payer' : 'Total payé'}</Text>
            <Text style={e.totFinalVal}>{montant(f.reste > 0 ? f.reste : f.total)}</Text>
          </View>
        </View>

        <View style={e.bas} wrap={false} minPresenceAhead={120}>
          <Text style={e.cond}>{f.conditions}</Text>
          <View style={e.sign}>
            <CachetSignature type="facture" paiement={f.paiement} />
            <View style={e.signTrait} />
            <Text style={{ fontSize: 8 }}>{f.nom}</Text>
          </View>
        </View>

        <View style={e.pied} fixed>
          <Text style={e.piedTxt}>{[f.magasin.email, f.magasin.whatsapp && `WhatsApp ${f.magasin.whatsapp}`].filter(Boolean).join('  ·  ')}</Text>
          <Text style={e.piedTxt}>{f.mentions.join('  ·  ')}</Text>
        </View>
        <NumeroPage style={e.pageNum} />
      </Page>
    </Document>
  );
}

/* ============================================================
   COMPACT
   ============================================================ */
const k = StyleSheet.create({
  page: { paddingTop: 26, paddingBottom: 50, paddingHorizontal: 30, fontFamily: 'Helvetica', fontSize: 8, color: C.encre },
  tete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: C.trait },
  marque: { flexDirection: 'row', alignItems: 'center', maxWidth: '58%' },
  logo: { width: 34, height: 34, objectFit: 'contain', marginRight: 8 },
  nom: { fontSize: 11, fontWeight: 'bold' },
  petit: { fontSize: 7, color: C.gris },
  titre: { fontSize: 14, fontWeight: 'bold', color: C.orange, textAlign: 'right' },
  infos: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, padding: 7, backgroundColor: C.fond, borderRadius: 6 },
  infoCol: { flexDirection: 'column' },
  lib: { fontSize: 6.5, color: C.gris, marginBottom: 1 },
  val: { fontSize: 8, fontWeight: 'bold' },
  thead: { flexDirection: 'row', backgroundColor: C.encre, paddingVertical: 4, paddingHorizontal: 5, borderRadius: 3 },
  th: { fontSize: 7, fontWeight: 'bold', color: C.blanc },
  tr: { flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 5 },
  trAlt: { backgroundColor: C.fond },
  cN: { width: '6%' }, cD: { width: '50%' }, cP: { width: '16%', textAlign: 'right' }, cQ: { width: '9%', textAlign: 'center' }, cM: { width: '19%', textAlign: 'right' },
  bas: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cond: { flex: 1, fontSize: 7, color: C.gris, lineHeight: 1.4 },
  totaux: { width: '40%' },
  totLigne: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totFinal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingVertical: 5, paddingHorizontal: 6, backgroundColor: C.orangeDoux, borderRadius: 4 },
  totFinalTxt: { fontSize: 10, fontWeight: 'bold', color: C.orange },
  sign: { marginTop: 8, alignItems: 'flex-end' },
  signTrait: { width: 130, borderBottomWidth: 0.5, borderBottomColor: C.encre, marginBottom: 2 },
  pied: { position: 'absolute', bottom: 20, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between' },
  pageNum: { position: 'absolute', bottom: 10, right: 30, fontSize: 6.5, color: C.gris },
});

export function FactureCompact({ data }) {
  const f = preparerFacture(data);
  return (
    <Document>
      <Page size="A4" style={k.page} wrap>
        <View style={k.tete}>
          <View style={k.marque}>
            {f.logo ? <Image src={f.logo} style={k.logo} /> : null}
            <View>
              <Text style={k.nom}>{f.nom}</Text>
              <Text style={k.petit}>{[f.adresse, f.telephones && `Tél ${f.telephones}`].filter(Boolean).join(' · ')}</Text>
            </View>
          </View>
          <View>
            <Text style={k.titre}>FACTURE {f.d.numero_facture}</Text>
            <Text style={[k.petit, { textAlign: 'right' }]}>du {f.date} · échéance {f.echeance}</Text>
          </View>
        </View>

        <View style={k.infos} wrap={false}>
          <View style={k.infoCol}><Text style={k.lib}>CLIENT</Text><Text style={k.val}>{f.d.nomclient || '-'}</Text>
            {f.d.telephone ? <Text style={k.petit}>{f.d.telephone}</Text> : null}</View>
          <View style={k.infoCol}><Text style={k.lib}>STATUT</Text><Text style={k.val}>{f.statut}</Text></View>
          <View style={k.infoCol}><Text style={k.lib}>PAIEMENT</Text><Text style={k.val}>{f.mode}</Text></View>
          {f.d.numero_commande ? <View style={k.infoCol}><Text style={k.lib}>COMMANDE</Text><Text style={k.val}>{f.d.numero_commande}</Text></View> : null}
          <View style={k.infoCol}><Text style={k.lib}>LIGNES</Text><Text style={k.val}>{f.lignes.length}</Text></View>
        </View>

        <View style={k.thead} fixed>
          <Text style={[k.th, k.cN]}>N°</Text><Text style={[k.th, k.cD]}>Désignation</Text>
          <Text style={[k.th, k.cP]}>Prix</Text><Text style={[k.th, k.cQ]}>Qté</Text><Text style={[k.th, k.cM]}>Montant</Text>
        </View>
        {f.lignes.length === 0 ? <View style={k.tr}><Text style={{ color: C.gris }}>Aucun produit</Text></View> : f.lignes.map((l, i) => (
          <View key={l.numero} style={[k.tr, i % 2 ? k.trAlt : {}]} wrap={false}>
            <Text style={[k.cN, { color: C.gris }]}>{l.numero}</Text>
            <Text style={k.cD}>{l.nom}{l.remise ? ` (−${l.remise} %)` : ''}</Text>
            <Text style={k.cP}>{montant(l.prix)}</Text>
            <Text style={k.cQ}>{l.qte}</Text>
            <Text style={k.cM}>{montant(l.total)}</Text>
          </View>
        ))}

        <View style={k.bas} wrap={false} minPresenceAhead={90}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={k.cond}>{f.conditions}</Text>
            <View style={k.sign}>
              <CachetSignature type="facture" paiement={f.paiement} />
              <View style={k.signTrait} />
              <Text style={k.petit}>{f.nom}</Text>
            </View>
          </View>
          <View style={k.totaux}>
            <View style={k.totLigne}><Text style={{ color: C.gris }}>Total</Text><Text style={{ fontWeight: 'bold' }}>{montant(f.total)}</Text></View>
            <View style={k.totLigne}><Text style={{ color: C.gris }}>Payé</Text><Text style={{ fontWeight: 'bold' }}>{montant(f.paye)}</Text></View>
            <View style={k.totFinal}>
              <Text style={k.totFinalTxt}>{f.reste > 0 ? 'Reste à payer' : 'Payé'}</Text>
              <Text style={k.totFinalTxt}>{montant(f.reste > 0 ? f.reste : f.total)}</Text>
            </View>
          </View>
        </View>

        <View style={k.pied} fixed>
          <Text style={k.petit}>{[f.magasin.email, f.magasin.whatsapp && `WhatsApp ${f.magasin.whatsapp}`].filter(Boolean).join(' · ')}</Text>
          <Text style={k.petit}>{f.mentions.join(' · ')}</Text>
        </View>
        <NumeroPage style={k.pageNum} />
      </Page>
    </Document>
  );
}
