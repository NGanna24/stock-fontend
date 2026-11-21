// components/Transfert/BonTransfertPDF.jsx
// Bon de transfert en PDF (A4) : même pipeline que les factures (aperçu + impression Electron).
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import CachetSignature from '../Documents/CachetSignature';
import { fmtNum, fmtDate, libelleUnite } from './TrModal';

const C = { ink: '#111827', muted: '#4B5563', soft: '#6B7280', line: '#D1D5DB', lineFort: '#9CA3AF', fond: '#F3F4F6' };

const s = StyleSheet.create({
    page: { paddingTop: 34, paddingBottom: 60, paddingHorizontal: 38, fontFamily: 'Helvetica', fontSize: 10, color: C.ink },

    // En-tête
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: C.ink },
    emetteur: { maxWidth: 260 },
    emetteurNom: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
    petit: { fontSize: 8.5, color: C.muted, marginTop: 2 },
    titreBloc: { alignItems: 'flex-end' },
    titre: { fontSize: 20, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
    numero: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 4 },

    // Bande d'informations
    bande: { flexDirection: 'row', marginTop: 14, borderWidth: 1, borderColor: C.line, borderRadius: 4 },
    cellule: { flexGrow: 1, flexBasis: 0, paddingVertical: 7, paddingHorizontal: 10 },
    celluleSep: { borderLeftWidth: 1, borderLeftColor: C.line },
    etiquette: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.soft, letterSpacing: 0.5 },
    valeur: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginTop: 3 },

    // Expéditeur / destinataire
    parties: { flexDirection: 'row', marginTop: 12 },
    partie: { flexGrow: 1, flexBasis: 0, borderWidth: 1, borderColor: C.line, borderRadius: 4, paddingVertical: 9, paddingHorizontal: 11 },
    partieNom: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', marginTop: 4 },
    fleche: { width: 30, alignItems: 'center', justifyContent: 'center' },
    flecheTxt: { fontSize: 14, color: C.lineFort, fontFamily: 'Helvetica-Bold' },

    // Tableau
    tableau: { marginTop: 16 },
    tHead: { flexDirection: 'row', backgroundColor: C.fond, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.lineFort },
    tRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line, alignItems: 'center' },
    th: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.muted, paddingVertical: 7, paddingHorizontal: 6, letterSpacing: 0.4 },
    td: { fontSize: 10, paddingVertical: 8, paddingHorizontal: 6 },
    produitNom: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
    produitDetail: { fontSize: 8.5, color: C.muted, marginTop: 2 },
    qte: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
    cN: { width: 30, textAlign: 'center' },
    cP: { flexGrow: 1, flexBasis: 0 },
    cQ: { width: 120, textAlign: 'right' },
    cE: { width: 110, textAlign: 'right' },
    cC: { width: 54, alignItems: 'center' },
    caseVide: { width: 12, height: 12, borderWidth: 1, borderColor: C.ink, borderRadius: 2 },
    total: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 7 },
    totalTxt: { fontSize: 9, color: C.muted },

    motif: { marginTop: 12, fontSize: 9.5 },

    // Chauffeur
    section: { marginTop: 18, borderWidth: 1, borderColor: C.line, borderRadius: 4, paddingTop: 9, paddingBottom: 4, paddingHorizontal: 11 },
    champs: { flexDirection: 'row', marginTop: 6 },
    champ: { flexGrow: 1, flexBasis: 0, marginRight: 14, marginBottom: 8 },
    champDernier: { marginRight: 0 },
    champLabel: { fontSize: 8, color: C.muted },
    champLigne: { height: 20, borderBottomWidth: 1, borderBottomColor: C.lineFort },

    // Signatures
    signatures: { flexDirection: 'row', marginTop: 14 },
    sign: { flexGrow: 1, flexBasis: 0, height: 118, borderWidth: 1, borderColor: C.line, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, marginRight: 10 },
    signDernier: { marginRight: 0 },
    signTitre: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
    signSous: { fontSize: 7.5, color: C.soft, marginTop: 2 },

    // Pied de page
    pied: { position: 'absolute', left: 38, right: 38, bottom: 26, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
    piedTxt: { fontSize: 7.5, color: C.soft },
});

/** « 80 Pièce » -> « 80 Pièces » (les symboles courts comme « kg » ou « pc » restent tels quels). */
const pluriel = (mot, n) => {
    const m = String(mot || '').trim();
    if (Number(n) < 2 || m.length < 3 || /[sxz]$/i.test(m) || m === m.toUpperCase()) return m;
    return `${m}s`;
};
const quantiteLisible = (l) => `${fmtNum(l.quantite_saisie)} ${pluriel(libelleUnite(l), l.quantite_saisie)}`;
const equivalentLisible = (l) =>
    Number(l.quantite_base) > 1 ? `${fmtNum(l.quantite)} ${pluriel(l.unite_nom || '', l.quantite)}`.trim() : '';

const dateHeure = (d) =>
    `${fmtDate(d)} à ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const Champ = ({ label, dernier }) => (
    <View style={[s.champ, dernier && s.champDernier]}>
        <Text style={s.champLabel}>{label}</Text>
        <View style={s.champLigne} />
    </View>
);

export default function BonTransfertPDF({ transfert: t }) {
    const magasin = t.magasin_nom || t.demandeur_nom;
    const lignes = t.lignes && t.lignes.length > 0 ? t.lignes : [t];
    const avecEquivalent = lignes.some((l) => equivalentLisible(l));
    const adresseEntrepot = [t.entrepot_adresse, t.entrepot_ville].filter(Boolean).join(', ');
    const imprimeLe = dateHeure(new Date());

    return (
        <Document title={`Bon de transfert ${t.numero_transfert || ''}`}>
            <Page size="A4" style={s.page}>
                <View style={s.top}>
                    <View style={s.emetteur}>
                        <Text style={s.emetteurNom}>{t.entrepot_nom}</Text>
                        {adresseEntrepot ? <Text style={s.petit}>{adresseEntrepot}</Text> : null}
                    </View>
                    <View style={s.titreBloc}>
                        <Text style={s.titre}>BON DE TRANSFERT</Text>
                        <Text style={s.numero}>N° {t.numero_transfert}</Text>
                    </View>
                </View>

                <View style={s.bande}>
                    <View style={s.cellule}>
                        <Text style={s.etiquette}>APPROUVÉ LE</Text>
                        <Text style={s.valeur}>{fmtDate(t.date_validation) || '-'}</Text>
                    </View>
                    <View style={[s.cellule, s.celluleSep]}>
                        <Text style={s.etiquette}>APPROUVÉ PAR</Text>
                        <Text style={s.valeur}>{t.approbateur_nom || '-'}</Text>
                    </View>
                    <View style={[s.cellule, s.celluleSep]}>
                        <Text style={s.etiquette}>PRODUITS</Text>
                        <Text style={s.valeur}>{lignes.length}</Text>
                    </View>
                    <View style={[s.cellule, s.celluleSep]}>
                        <Text style={s.etiquette}>IMPRIMÉ LE</Text>
                        <Text style={s.valeur}>{imprimeLe}</Text>
                    </View>
                </View>

                <View style={s.parties}>
                    <View style={s.partie}>
                        <Text style={s.etiquette}>EXPÉDITEUR · ENTREPÔT</Text>
                        <Text style={s.partieNom}>{t.entrepot_nom}</Text>
                        {adresseEntrepot ? <Text style={s.petit}>{adresseEntrepot}</Text> : null}
                    </View>
                    <View style={s.fleche}><Text style={s.flecheTxt}>{'>'}</Text></View>
                    <View style={s.partie}>
                        <Text style={s.etiquette}>DESTINATAIRE · MAGASIN</Text>
                        <Text style={s.partieNom}>{magasin}</Text>
                        {t.magasin_ville ? <Text style={s.petit}>{t.magasin_ville}</Text> : null}
                        {t.demandeur_nom && t.magasin_nom ? <Text style={s.petit}>Demandeur : {t.demandeur_nom}</Text> : null}
                    </View>
                </View>

                <View style={s.tableau}>
                    <View style={s.tHead}>
                        <Text style={[s.th, s.cN]}>N°</Text>
                        <Text style={[s.th, s.cP]}>PRODUIT</Text>
                        <Text style={[s.th, s.cQ]}>QUANTITÉ À REMETTRE</Text>
                        {avecEquivalent && <Text style={[s.th, s.cE]}>SOIT (UNITÉ DE BASE)</Text>}
                        <Text style={[s.th, s.cC, { textAlign: 'center' }]}>REMIS</Text>
                    </View>
                    {lignes.map((l, i) => {
                        const detail = [l.marque_nom, l.modele_nom].filter(Boolean).join(' · ');
                        return (
                            <View key={l.id_transfert || i} style={s.tRow} wrap={false}>
                                <Text style={[s.td, s.cN]}>{i + 1}</Text>
                                <View style={[s.td, s.cP]}>
                                    <Text style={s.produitNom}>{l.produit_nom}</Text>
                                    {detail ? <Text style={s.produitDetail}>{detail}</Text> : null}
                                </View>
                                <Text style={[s.td, s.cQ, s.qte]}>{quantiteLisible(l)}</Text>
                                {avecEquivalent && <Text style={[s.td, s.cE]}>{equivalentLisible(l) || '-'}</Text>}
                                <View style={[s.td, s.cC]}><View style={s.caseVide} /></View>
                            </View>
                        );
                    })}
                    <View style={s.total}>
                        <Text style={s.totalTxt}>
                            {lignes.length} produit{lignes.length > 1 ? 's' : ''} à remettre
                        </Text>
                    </View>
                </View>

                {t.motif ? (
                    <Text style={s.motif}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Motif : </Text>{t.motif}</Text>
                ) : null}

                <View style={s.section} wrap={false}>
                    <Text style={s.etiquette}>CHAUFFEUR</Text>
                    <View style={s.champs}>
                        <Champ label="Nom et prénoms" />
                        <Champ label="N° de pièce d'identité" dernier />
                    </View>
                    <View style={s.champs}>
                        <Champ label="Téléphone" />
                        <Champ label="Immatriculation du véhicule" dernier />
                    </View>
                </View>

                <View style={s.signatures} wrap={false}>
                    <View style={s.sign}>
                        <Text style={s.signTitre}>Gérant de l'entrepôt</Text>
                        <Text style={s.signSous}>Remise · date et signature</Text>
                        <CachetSignature type="bon_transfert" style={{ justifyContent: 'flex-start', marginTop: 6 }} />
                    </View>
                    <View style={s.sign}>
                        <Text style={s.signTitre}>Chauffeur</Text>
                        <Text style={s.signSous}>Prise en charge · date et signature</Text>
                    </View>
                    <View style={[s.sign, s.signDernier]}>
                        <Text style={s.signTitre}>Magasin destinataire</Text>
                        <Text style={s.signSous}>Réception · date et signature</Text>
                    </View>
                </View>

                <View style={s.pied} fixed>
                    <Text style={s.piedTxt}>À présenter au gérant de l'entrepôt. Ce bon n'est valable qu'une seule fois.</Text>
                    <Text style={s.piedTxt}>N° {t.numero_transfert}</Text>
                </View>
            </Page>
        </Document>
    );
}
