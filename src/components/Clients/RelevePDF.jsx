// components/Clients/RelevePDF.jsx
// Relevé de compte client (A4) : solde au début, ventes (débit), paiements (crédit), solde après chaque opération.
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const montant = (v) => {
  const n = Number(v) || 0;
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${n < 0 ? '-' : ''}${s}`;
};
const dateFR = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '');
const MODES = { especes: 'Espèces', carte: 'Carte', virement: 'Virement', cheque: 'Chèque', autre: 'Autre' };

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9.5, fontFamily: 'Helvetica', color: '#111827' },
  entete: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  magasin: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  petit: { fontSize: 8.5, color: '#4b5563', marginTop: 2 },
  titre: { fontSize: 15, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  bloc: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  client: { width: '55%', padding: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4 },
  label: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase', marginBottom: 3 },
  fort: { fontFamily: 'Helvetica-Bold' },
  resume: { width: '40%', padding: 10, backgroundColor: '#f9fafb', borderRadius: 4 },
  ligneResume: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  soldeFinal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#d1d5db' },
  tHead: { flexDirection: 'row', backgroundColor: '#f3f4f6', paddingVertical: 5, paddingHorizontal: 4, fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  tRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  cDate: { width: '12%' },
  cLib: { width: '40%' },
  cNum: { width: '16%', textAlign: 'right' },
  pied: { position: 'absolute', bottom: 24, left: 36, right: 36, fontSize: 8, color: '#9ca3af', flexDirection: 'row', justifyContent: 'space-between' },
});

export default function RelevePDF({ data, magasin }) {
  const { client, periode, solde_ouverture: ouverture, total_debit: debit, total_credit: credit, solde_cloture: cloture, lignes } = data;
  const nomMagasin = magasin?.nom_commercial || magasin?.nom || 'Mon magasin';
  const periodeTxt = periode?.debut ? `Du ${dateFR(periode.debut)} au ${dateFR(periode.fin)}` : 'Depuis le début';
  return (
    <Document title={`Relevé ${client.nom}`}>
      <Page size="A4" style={s.page}>
        <View style={s.entete}>
          <View>
            <Text style={s.magasin}>{nomMagasin}</Text>
            {magasin?.telephone ? <Text style={s.petit}>Tél. : {magasin.telephone}</Text> : null}
            {[magasin?.quartier, magasin?.ville].filter(Boolean).length ? <Text style={s.petit}>{[magasin?.quartier, magasin?.ville].filter(Boolean).join(', ')}</Text> : null}
          </View>
          <View>
            <Text style={s.titre}>RELEVÉ DE COMPTE</Text>
            <Text style={[s.petit, { textAlign: 'right' }]}>{periodeTxt}</Text>
            <Text style={[s.petit, { textAlign: 'right' }]}>Édité le {new Date().toLocaleDateString('fr-FR')}</Text>
          </View>
        </View>

        <View style={s.bloc}>
          <View style={s.client}>
            <Text style={s.label}>Client</Text>
            <Text style={s.fort}>{client.nom}{client.code_client ? `  ·  N° ${client.code_client}` : ''}</Text>
            {client.telephone ? <Text style={s.petit}>{[client.telephone, client.telephone2].filter(Boolean).join(' / ')}</Text> : null}
            {[client.adresse, client.quartier, client.ville].filter(Boolean).length ? <Text style={s.petit}>{[client.adresse, client.quartier, client.ville].filter(Boolean).join(', ')}</Text> : null}
          </View>
          <View style={s.resume}>
            <View style={s.ligneResume}><Text>Solde au début</Text><Text>{montant(ouverture)} F</Text></View>
            <View style={s.ligneResume}><Text>Achats de la période</Text><Text>+ {montant(debit)} F</Text></View>
            <View style={s.ligneResume}><Text>Paiements reçus</Text><Text>- {montant(credit)} F</Text></View>
            <View style={s.soldeFinal}><Text style={s.fort}>{cloture >= 0 ? 'Reste à payer' : 'Avance du client'}</Text><Text style={s.fort}>{montant(Math.abs(cloture))} F</Text></View>
          </View>
        </View>

        <View style={s.tHead} fixed>
          <Text style={s.cDate}>Date</Text>
          <Text style={s.cLib}>Opération</Text>
          <Text style={s.cNum}>Achat</Text>
          <Text style={s.cNum}>Paiement</Text>
          <Text style={s.cNum}>Solde</Text>
        </View>
        <View style={s.tRow}>
          <Text style={s.cDate}>{periode?.debut ? dateFR(periode.debut) : ''}</Text>
          <Text style={[s.cLib, s.fort]}>Solde au début</Text>
          <Text style={s.cNum} />
          <Text style={s.cNum} />
          <Text style={[s.cNum, s.fort]}>{montant(ouverture)}</Text>
        </View>
        {lignes.map((l, i) => (
          <View style={s.tRow} key={i} wrap={false}>
            <Text style={s.cDate}>{dateFR(l.date)}</Text>
            <Text style={s.cLib}>
              {l.type === 'vente' ? `Achat – facture ${l.reference || ''}` : l.type === 'remboursement' ? `Remboursement – ${l.reference || ''}` : `Paiement ${MODES[l.mode_paiement] ? `(${MODES[l.mode_paiement]})` : ''} – ${l.reference || ''}`}
            </Text>
            <Text style={s.cNum}>{l.debit ? montant(l.debit) : ''}</Text>
            <Text style={s.cNum}>{l.credit ? montant(l.credit) : ''}</Text>
            <Text style={s.cNum}>{montant(l.solde)}</Text>
          </View>
        ))}
        {lignes.length === 0 ? <View style={s.tRow}><Text style={s.petit}>Aucune opération sur la période.</Text></View> : null}

        <View style={s.pied} fixed>
          <Text>Montants en FCFA · ventes annulées non incluses</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
