// components/Transfert/BonTransfertPDF.jsx
// Bon de transfert en PDF (A4) : même pipeline que les factures (aperçu + impression Electron).
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { fmtNum, fmtDate, libelleQuantite, libelleEquivalent } from './TrModal';

const C = { ink: '#0f172a', muted: '#475569', line: '#94a3b8', soft: '#f1f5f9' };

const s = StyleSheet.create({
    page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, color: C.ink },
    top: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: C.ink, paddingBottom: 10, marginBottom: 16 },
    h1: { fontSize: 20, fontFamily: 'Helvetica-Bold' },
    muted: { fontSize: 9, color: C.muted, marginTop: 2 },
    num: { fontSize: 18, fontFamily: 'Courier-Bold', textAlign: 'right' },
    right: { alignItems: 'flex-end' },
    grid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    box: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 5, padding: 9 },
    boxLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.muted, marginBottom: 4 },
    boxValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
    tHead: { flexDirection: 'row', backgroundColor: C.soft, borderWidth: 1, borderColor: C.line },
    tRow: { flexDirection: 'row', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.line },
    th: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.muted, padding: 7 },
    td: { fontSize: 10, padding: 7 },
    qty: { fontSize: 13, fontFamily: 'Helvetica-Bold', padding: 7 },
    cN: { width: '8%', textAlign: 'center' },
    cP: { flex: 1 },
    cQ: { width: '26%' },
    cE: { width: '26%' },
    motif: { marginTop: 12 },
    line: { borderBottomWidth: 1, borderBottomColor: C.line, height: 20, marginBottom: 8 },
    signRow: { flexDirection: 'row', gap: 20, marginTop: 24 },
    sign: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 5, height: 110, padding: 8 },
    signTxt: { fontSize: 9, color: C.muted },
    foot: { marginTop: 18, fontSize: 8, color: '#64748b', textAlign: 'center' },
});

export default function BonTransfertPDF({ transfert: t }) {
    const magasin = t.magasin_nom || t.demandeur_nom;
    const lignes = t.lignes && t.lignes.length > 0 ? t.lignes : [t];
    const multi = lignes.length > 1;
    const adresseEntrepot = [t.entrepot_adresse, t.entrepot_ville].filter(Boolean).join(', ');

    return (
        <Document title={`Bon de transfert ${t.numero_transfert || ''}`}>
            <Page size="A4" style={s.page}>
                <View style={s.top}>
                    <View>
                        <Text style={s.h1}>BON DE TRANSFERT</Text>
                        <Text style={s.muted}>Entrepôt vers magasin{multi ? ` · ${lignes.length} produits` : ''}</Text>
                    </View>
                    <View style={s.right}>
                        <Text style={s.num}>{t.numero_transfert}</Text>
                        <Text style={s.muted}>
                            Approuvé le {fmtDate(t.date_validation)}{t.approbateur_nom ? ` par ${t.approbateur_nom}` : ''}
                        </Text>
                    </View>
                </View>

                <View style={s.grid}>
                    <View style={s.box}>
                        <Text style={s.boxLabel}>ENTREPÔT (REMISE DE LA MARCHANDISE)</Text>
                        <Text style={s.boxValue}>{t.entrepot_nom}</Text>
                        {adresseEntrepot ? <Text style={s.muted}>{adresseEntrepot}</Text> : null}
                    </View>
                    <View style={s.box}>
                        <Text style={s.boxLabel}>MAGASIN DESTINATAIRE</Text>
                        <Text style={s.boxValue}>{magasin}</Text>
                        {t.magasin_ville ? <Text style={s.muted}>{t.magasin_ville}</Text> : null}
                        {t.demandeur_nom && t.magasin_nom ? <Text style={s.muted}>Demandeur : {t.demandeur_nom}</Text> : null}
                    </View>
                </View>

                <View style={s.tHead} fixed>
                    {multi && <Text style={[s.th, s.cN]}>N°</Text>}
                    <Text style={[s.th, s.cP]}>PRODUIT</Text>
                    <Text style={[s.th, s.cQ]}>QUANTITÉ À REMETTRE</Text>
                    <Text style={[s.th, s.cE]}>ÉQUIVALENT (UNITÉ DE BASE)</Text>
                </View>
                {lignes.map((l, i) => {
                    const unite = l.unite_symbole || l.unite_nom || '';
                    const produit = [l.produit_nom, l.marque_nom, l.modele_nom].filter(Boolean).join(' — ');
                    const equiv = libelleEquivalent(l).replace(/^soit /, '') || `${fmtNum(l.quantite)} ${unite}`;
                    return (
                        <View key={l.id_transfert || i} style={s.tRow} wrap={false}>
                            {multi && <Text style={[s.td, s.cN]}>{i + 1}</Text>}
                            <Text style={[s.td, s.cP]}>{produit}</Text>
                            <Text style={[s.qty, s.cQ]}>{libelleQuantite(l)}</Text>
                            <Text style={[s.td, s.cE]}>{equiv}</Text>
                        </View>
                    );
                })}

                {t.motif ? (
                    <Text style={s.motif}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Motif : </Text>{t.motif}</Text>
                ) : null}

                <View style={[s.box, { flex: 0, marginTop: 16 }]} wrap={false}>
                    <Text style={s.boxLabel}>CHAUFFEUR</Text>
                    <Text style={s.signTxt}>Nom et pièce d'identité</Text>
                    <View style={s.line} />
                    <Text style={s.signTxt}>Téléphone / immatriculation du véhicule</Text>
                    <View style={s.line} />
                </View>

                <View style={s.signRow} wrap={false}>
                    <View style={s.sign}>
                        <Text style={s.signTxt}>Le gérant de l'entrepôt (remise)</Text>
                        <Text style={s.signTxt}>Nom, date et signature :</Text>
                    </View>
                    <View style={s.sign}>
                        <Text style={s.signTxt}>Le chauffeur (réception)</Text>
                        <Text style={s.signTxt}>Nom, date et signature :</Text>
                    </View>
                </View>

                <Text style={s.foot}>À présenter au gérant de l'entrepôt. Ce bon n'est valable qu'une seule fois.</Text>
            </Page>
        </Document>
    );
}