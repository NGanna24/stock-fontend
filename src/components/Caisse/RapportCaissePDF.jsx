// components/Caisse/RapportCaissePDF.jsx
// « Z de caisse » : rapport de clôture imprimable sur ticket 80 mm (même style que le ticket de vente).
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import CachetSignature from '../Documents/CachetSignature';
import { libelleMode } from '../../config/modesPaiement';

const TICKET_WIDTH = 226.77; // 80 mm en points

const fm = (v) => `${Math.round(Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F`;
const fmSigne = (v) => `${Number(v) > 0 ? '+' : ''}${fm(v)}`;
const dh = (d) => {
  if (!d) return '-';
  const x = new Date(d);
  if (isNaN(x)) return '-';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()} ${p(x.getHours())}:${p(x.getMinutes())}`;
};
const MODES = new Proxy({}, { get: (_, code) => (typeof code === 'string' && code ? libelleMode(code).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : undefined) });
const SEP = '--------------------------------';

// Billets puis pièces (clés envoyées par la page Caisse)
export const COUPURES = [
  { cle: 'b10000', valeur: 10000, label: 'Billet 10 000' },
  { cle: 'b5000', valeur: 5000, label: 'Billet 5 000' },
  { cle: 'b2000', valeur: 2000, label: 'Billet 2 000' },
  { cle: 'b1000', valeur: 1000, label: 'Billet 1 000' },
  { cle: 'b500', valeur: 500, label: 'Billet 500' },
  { cle: 'p500', valeur: 500, label: 'Pièce 500' },
  { cle: 'p250', valeur: 250, label: 'Pièce 250' },
  { cle: 'p200', valeur: 200, label: 'Pièce 200' },
  { cle: 'p100', valeur: 100, label: 'Pièce 100' },
  { cle: 'p50', valeur: 50, label: 'Pièce 50' },
  { cle: 'p25', valeur: 25, label: 'Pièce 25' },
  { cle: 'p10', valeur: 10, label: 'Pièce 10' },
  { cle: 'p5', valeur: 5, label: 'Pièce 5' },
];

const s = StyleSheet.create({
  page: { paddingHorizontal: 8, paddingVertical: 10, fontFamily: 'Courier', fontSize: 8.5, lineHeight: 1.35, color: '#000' },
  center: { textAlign: 'center' },
  shop: { fontFamily: 'Courier-Bold', fontSize: 11, textAlign: 'center' },
  titre: { fontFamily: 'Courier-Bold', fontSize: 10, textAlign: 'center', marginTop: 2 },
  sep: { textAlign: 'center', fontSize: 8, marginVertical: 3, letterSpacing: -0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 0.5 },
  bold: { fontFamily: 'Courier-Bold' },
  big: { fontFamily: 'Courier-Bold', fontSize: 10 },
  small: { fontSize: 7.5 },
  sign: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between' },
});

const Ligne = ({ g, d, style }) => (
  <View style={[s.row, style]}><Text>{g}</Text><Text>{d}</Text></View>
);

export default function RapportCaissePDF({ data }) {
  const { session = {}, magasin } = data || {};
  const comptage = session.detail_comptage && typeof session.detail_comptage === 'object'
    ? COUPURES.filter((c) => Number(session.detail_comptage[c.cle]) > 0)
    : [];
  const autres = session.autres_modes || [];
  const ecart = Number(session.ecart) || 0;

  const hauteur = Math.max(
    300,
    40 + 60 + 70 + 120 + autres.length * 12 + (comptage.length ? 30 + comptage.length * 12 : 0)
      + (session.note_cloture ? 40 : 0) + 90
  );

  return (
    <Document>
      <Page size={{ width: TICKET_WIDTH, height: hauteur }} style={s.page} wrap={false}>
        <Text style={s.shop}>{magasin?.nom_commercial || 'MON MAGASIN'}</Text>
        <Text style={s.titre}>RAPPORT DE CAISSE (Z)</Text>
        <Text style={[s.center, s.small]}>Session n° {session.id_session}</Text>
        <Text style={s.sep}>{SEP}</Text>

        <Ligne g="Ouverture" d={dh(session.date_ouverture)} />
        <Ligne g="  par" d={session.ouvert_par_nom || '-'} />
        <Ligne g="Clôture" d={dh(session.date_cloture)} />
        <Ligne g="  par" d={session.cloture_par_nom || '-'} />
        <Text style={s.sep}>{SEP}</Text>

        <Text style={s.bold}>ESPECES</Text>
        <Ligne g="Fond initial" d={fm(session.fond_initial)} />
        <Ligne g="+ Encaissements" d={fm(session.especes_encaissees)} />
        {Number(session.especes_remboursees) > 0 && <Ligne g="- Remboursements" d={fm(session.especes_remboursees)} />}
        <Ligne g="- Dépenses" d={fm(session.depenses_especes)} />
        <Ligne g="= Attendu" d={fm(session.montant_theorique)} style={s.bold} />
        <Ligne g="Compté" d={fm(session.montant_compte)} style={s.bold} />
        <Ligne g="ECART" d={ecart === 0 ? '0 F' : fmSigne(ecart)} style={s.big} />
        <Text style={s.sep}>{SEP}</Text>

        <Text style={s.bold}>AUTRES MODES (hors tiroir)</Text>
        {autres.map((a) => (
          <Ligne key={a.mode_paiement} g={`${MODES[a.mode_paiement] || a.mode_paiement} (${a.nombre})`} d={fm(a.encaisse)} />
        ))}
        {autres.length === 0 && !(Number(session.autres_encaissements) > 0)
          ? <Text style={s.small}>Aucun</Text>
          : <Ligne g="Total" d={fm(session.autres_encaissements)} style={s.bold} />}

        {comptage.length > 0 && (
          <>
            <Text style={s.sep}>{SEP}</Text>
            <Text style={s.bold}>COMPTAGE</Text>
            {comptage.map((c) => (
              <Ligne key={c.cle} g={`${c.label} x ${session.detail_comptage[c.cle]}`} d={fm(c.valeur * Number(session.detail_comptage[c.cle]))} />
            ))}
          </>
        )}

        {session.note_cloture ? (
          <>
            <Text style={s.sep}>{SEP}</Text>
            <Text style={s.small}>Note : {session.note_cloture}</Text>
          </>
        ) : null}

        <Text style={s.sep}>{SEP}</Text>
        <View style={s.sign}><Text style={s.small}>Caissier</Text><Text style={s.small}>Responsable</Text></View>
        <View style={[s.sign, { marginTop: 18 }]}><Text style={s.small}>..........</Text><Text style={s.small}>..........</Text></View>
        <CachetSignature type="rapport_caisse" petit style={{ marginTop: 6 }} />
        <Text style={[s.center, s.small, { marginTop: 8 }]}>Imprimé le {dh(new Date())}</Text>
      </Page>
    </Document>
  );
}
