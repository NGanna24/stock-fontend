// components/Facture/FacturePDF.jsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// ============================================================
// FONTS
// ============================================================
Font.register({
    family: 'Helvetica',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/helvetica/v1/Helvetica.ttf' },
        { src: 'https://fonts.gstatic.com/s/helvetica/v1/Helvetica-Bold.ttf', fontWeight: 'bold' },
    ],
});

// ============================================================
// HELPERS INTERNES (pas de fichier externe)
// ============================================================
const formatMontant = (value) => {
    const num = Number(value || 0);
    if (isNaN(num)) return '0 FCFA';
    const fixed = Math.round(num).toString();
    const formatted = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} FCFA`;
};

const formatDateFR = (date) => {
    if (!date) return '-';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return '-';
    }
};

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },

    // EN-TÊTE
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottom: '2 solid #2563eb',
        paddingBottom: 15,
    },
    headerLeft: { flex: 1 },
    headerRight: { alignItems: 'flex-end' },
    companyName: { fontSize: 20, fontWeight: 'bold', color: '#1a56db' },
    companyInfo: { fontSize: 9, color: '#4a5568', marginTop: 2 },
    documentTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e3a5f', marginTop: 5 },
    documentNumber: { fontSize: 14, fontWeight: 'bold', color: '#2563eb' },
    documentStatus: {
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 5,
        padding: '4 12',
        borderRadius: 12,
    },

    // STATUTS
    statusPayee: { backgroundColor: '#d1fae5', color: '#065f46' },
    statusEnAttente: { backgroundColor: '#fef3c7', color: '#92400e' },
    statusPartielle: { backgroundColor: '#fef3c7', color: '#92400e' },
    statusRetard: { backgroundColor: '#fce4ec', color: '#c62828' },
    statusAnnulee: { backgroundColor: '#fce4ec', color: '#c62828' },

    // SECTIONS
    section: { marginBottom: 15 },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1e3a5f',
        marginBottom: 8,
        backgroundColor: '#f0f4ff',
        padding: 5,
        borderRadius: 3,
    },

    // GRILLE
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    gridItem: { width: '50%', marginBottom: 4 },
    label: { fontSize: 8, color: '#718096', marginBottom: 2 },
    value: { fontSize: 10, color: '#1a202c' },

    // TABLEAU
    table: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f0f4ff',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tableRowAlternate: { backgroundColor: '#fafafa' },
    colProduit: { width: '35%' },
    colQte: { width: '12%', textAlign: 'center' },
    colPrix: { width: '18%', textAlign: 'right' },
    colRemise: { width: '15%', textAlign: 'right' },
    colTotal: { width: '20%', textAlign: 'right' },
    tableHeaderText: { fontSize: 8, fontWeight: 'bold', color: '#1e3a5f' },
    tableCellText: { fontSize: 9, color: '#1a202c' },

    // TOTAUX
    totals: { marginTop: 10, alignItems: 'flex-end' },
    totalLine: { flexDirection: 'row', paddingVertical: 3 },
    totalLabel: {
        width: 150,
        textAlign: 'right',
        paddingRight: 10,
        fontSize: 10,
        color: '#4a5568',
    },
    totalValue: {
        width: 130,
        textAlign: 'right',
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1a202c',
    },
    totalGrand: {
        fontSize: 14,
        color: '#2563eb',
        borderTopWidth: 2,
        borderTopColor: '#2563eb',
        paddingTop: 5,
    },

    // PAIEMENTS
    paiements: { marginTop: 10 },
    paiementsTable: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    paiementsHeader: {
        flexDirection: 'row',
        backgroundColor: '#f0f4ff',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    paiementsRow: {
        flexDirection: 'row',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    paiementsColDate: { width: '30%' },
    paiementsColMontant: { width: '30%', textAlign: 'right' },
    paiementsColMode: { width: '25%', textAlign: 'center' },
    paiementsColRef: { width: '15%', textAlign: 'center' },

    // PIED
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerText: { fontSize: 8, color: '#a0aec0' },
});

// ============================================================
// COMPOSANT
// ============================================================
const FacturePDF = ({ data }) => {
    const {
        numero_facture,
        date_facture,
        date_facture_formatee,
        date_echeance,
        date_echeance_formatee,
        nomclient,
        telephone,
        email,
        adresse,
        montant_total,
        statut,
        mode_paiement,
        notes,
        lignes = [],
        paiements = [],
        numero_commande,
    } = data || {};

    // ============================================================
    // RECALCUL DES TOTAUX (aucune TVA)
    // ============================================================
    const montantTotalNum = parseFloat(montant_total || 0);

    const montantPayeCalcule = paiements.reduce(
        (sum, p) => sum + parseFloat(p.montant || 0),
        0
    );

    const resteAPayerCalcule = Math.max(0, montantTotalNum - montantPayeCalcule);

    // Statut recalculé localement
    const statutCalcule = (() => {
        if (statut === 'annulee') return 'annulee';
        if (resteAPayerCalcule <= 0 && montantTotalNum > 0) return 'payee';
        if (montantPayeCalcule > 0 && resteAPayerCalcule > 0) return 'partiellement_payee';
        const dateEch = date_echeance ? new Date(date_echeance) : null;
        if (dateEch && dateEch < new Date() && resteAPayerCalcule > 0) return 'en_retard';
        return statut || 'en_attente';
    })();

    // ============================================================
    // HELPERS
    // ============================================================
    const getStatutLabel = (s) =>
        ({
            en_attente: 'En attente',
            payee: 'Payée',
            partiellement_payee: 'Partiellement payée',
            en_retard: 'En retard',
            annulee: 'Annulée',
        }[s] || s);

    const getStatutBadge = (s) =>
        ({
            en_attente: 'statusEnAttente',
            payee: 'statusPayee',
            partiellement_payee: 'statusPartielle',
            en_retard: 'statusRetard',
            annulee: 'statusAnnulee',
        }[s] || 'statusEnAttente');

    const getModePaiementLabel = (mode) =>
        ({
            especes: 'Espèces',
            carte: 'Carte',
            virement: 'Virement',
            cheque: 'Chèque',
            mobile_money: 'Mobile Money',
            autre: 'Autre',
        }[mode] || mode || '-');

    const formatDate = (d, formatted) => formatted || formatDateFR(d);

    // ============================================================
    // RENDU
    // ============================================================
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* ========== EN-TÊTE ========== */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.companyName}>VOTRE ENTREPRISE</Text>
                        <Text style={styles.companyInfo}>123 Rue Principale, Ville</Text>
                        <Text style={styles.companyInfo}>Tél: +225 00 00 00 00</Text>
                        <Text style={styles.companyInfo}>Email: contact@entreprise.com</Text>
                        <Text style={styles.companyInfo}>N° TVA: FR123456789</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.documentTitle}>FACTURE</Text>
                        <Text style={styles.documentNumber}>N° {numero_facture}</Text>
                        <Text style={styles.companyInfo}>
                            Date: {formatDate(date_facture, date_facture_formatee)}
                        </Text>
                        <Text style={[styles.documentStatus, styles[getStatutBadge(statutCalcule)]]}>
                            {getStatutLabel(statutCalcule)}
                        </Text>
                    </View>
                </View>

                {/* ========== CLIENT ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CLIENT</Text>
                    <View style={styles.grid}>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Nom</Text>
                            <Text style={styles.value}>{nomclient || '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Téléphone</Text>
                            <Text style={styles.value}>{telephone || '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Email</Text>
                            <Text style={styles.value}>{email || '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Commande</Text>
                            <Text style={styles.value}>{numero_commande || '-'}</Text>
                        </View>
                        {adresse && (
                            <View style={[styles.gridItem, { width: '100%' }]}>
                                <Text style={styles.label}>Adresse</Text>
                                <Text style={styles.value}>{adresse}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ========== INFORMATIONS FACTURE ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>INFORMATIONS FACTURE</Text>
                    <View style={styles.grid}>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>N° Facture</Text>
                            <Text style={styles.value}>{numero_facture}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Date d'échéance</Text>
                            <Text style={styles.value}>
                                {formatDate(date_echeance, date_echeance_formatee)}
                            </Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Mode de paiement</Text>
                            <Text style={styles.value}>{getModePaiementLabel(mode_paiement)}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Statut</Text>
                            <Text style={styles.value}>{getStatutLabel(statutCalcule)}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Montant total</Text>
                            <Text
                                style={[
                                    styles.value,
                                    { fontSize: 12, fontWeight: 'bold', color: '#2563eb' },
                                ]}
                            >
                                {formatMontant(montantTotalNum)}
                            </Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Montant payé</Text>
                            <Text
                                style={[
                                    styles.value,
                                    { color: '#10b981', fontWeight: 'bold' },
                                ]}
                            >
                                {formatMontant(montantPayeCalcule)}
                            </Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Reste à payer</Text>
                            <Text
                                style={[
                                    styles.value,
                                    {
                                        color:
                                            resteAPayerCalcule > 0 ? '#ef4444' : '#10b981',
                                        fontWeight: 'bold',
                                    },
                                ]}
                            >
                                {formatMontant(resteAPayerCalcule)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ========== PRODUITS ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PRODUITS</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.colProduit, styles.tableHeaderText]}>Produit</Text>
                            <Text style={[styles.colQte, styles.tableHeaderText]}>Qté</Text>
                            <Text style={[styles.colPrix, styles.tableHeaderText]}>Prix unit.</Text>
                            <Text style={[styles.colRemise, styles.tableHeaderText]}>Remise</Text>
                            <Text style={[styles.colTotal, styles.tableHeaderText]}>Total</Text>
                        </View>

                        {lignes.length === 0 ? (
                            <View style={styles.tableRow}>
                                <Text style={[styles.colProduit, styles.tableCellText]}>
                                    Aucun produit
                                </Text>
                            </View>
                        ) : (
                            lignes.map((ligne, index) => {
                                const qte = parseFloat(ligne.quantite || 0);
                                const prix = parseFloat(ligne.prix_vente || 0);
                                const remise = parseFloat(ligne.remise || 0);
                                const totalBrut = qte * prix;
                                const totalApresRemise = totalBrut * (1 - remise / 100);

                                return (
                                    <View
                                        key={index}
                                        style={[
                                            styles.tableRow,
                                            index % 2 === 0 ? styles.tableRowAlternate : {},
                                        ]}
                                    >
                                        <Text style={[styles.colProduit, styles.tableCellText]}>
                                            {ligne.produit_nom || 'Produit'}
                                            {ligne.marque_nom && ` (${ligne.marque_nom})`}
                                        </Text>
                                        <Text style={[styles.colQte, styles.tableCellText]}>
                                            {qte} {ligne.unite_symbole || ''}
                                        </Text>
                                        <Text style={[styles.colPrix, styles.tableCellText]}>
                                            {formatMontant(prix)}
                                        </Text>
                                        <Text style={[styles.colRemise, styles.tableCellText]}>
                                            {remise > 0 ? `${remise}%` : '-'}
                                        </Text>
                                        <Text style={[styles.colTotal, styles.tableCellText]}>
                                            {formatMontant(totalApresRemise)}
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </View>

                {/* ========== TOTAUX (SANS TVA) ========== */}
                <View style={styles.section}>
                    <View style={styles.totals}>
                        <View style={styles.totalLine}>
                            <Text style={styles.totalLabel}>Total à payer</Text>
                            <Text style={[styles.totalValue, styles.totalGrand]}>
                                {formatMontant(montantTotalNum)}
                            </Text>
                        </View>
                        <View style={styles.totalLine}>
                            <Text style={styles.totalLabel}>Montant payé</Text>
                            <Text style={[styles.totalValue, { color: '#10b981' }]}>
                                {formatMontant(montantPayeCalcule)}
                            </Text>
                        </View>
                        <View style={styles.totalLine}>
                            <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>
                                Reste à payer
                            </Text>
                            <Text
                                style={[
                                    styles.totalValue,
                                    {
                                        fontSize: 12,
                                        color:
                                            resteAPayerCalcule > 0 ? '#ef4444' : '#10b981',
                                    },
                                ]}
                            >
                                {formatMontant(resteAPayerCalcule)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ========== PAIEMENTS ========== */}
                {paiements && paiements.length > 0 && (
                    <View style={styles.paiements}>
                        <Text style={styles.sectionTitle}>PAIEMENTS</Text>
                        <View style={styles.paiementsTable}>
                            <View style={styles.paiementsHeader}>
                                <Text style={[styles.paiementsColDate, styles.tableHeaderText]}>
                                    Date
                                </Text>
                                <Text style={[styles.paiementsColMontant, styles.tableHeaderText]}>
                                    Montant
                                </Text>
                                <Text style={[styles.paiementsColMode, styles.tableHeaderText]}>
                                    Mode
                                </Text>
                                <Text style={[styles.paiementsColRef, styles.tableHeaderText]}>
                                    Réf.
                                </Text>
                            </View>
                            {paiements.map((paiement, index) => (
                                <View key={index} style={styles.paiementsRow}>
                                    <Text style={[styles.paiementsColDate, styles.tableCellText]}>
                                        {paiement.date_paiement_formatee ||
                                            formatDateFR(paiement.date_paiement)}
                                    </Text>
                                    <Text
                                        style={[styles.paiementsColMontant, styles.tableCellText]}
                                    >
                                        {formatMontant(paiement.montant)}
                                    </Text>
                                    <Text style={[styles.paiementsColMode, styles.tableCellText]}>
                                        {getModePaiementLabel(paiement.mode_paiement)}
                                    </Text>
                                    <Text style={[styles.paiementsColRef, styles.tableCellText]}>
                                        {paiement.reference || '-'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ========== NOTES ========== */}
                {notes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>NOTES</Text>
                        <Text style={styles.value}>{notes}</Text>
                    </View>
                )}

                {/* ========== PIED DE PAGE ========== */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Document valable comme facture</Text>
                    <Text style={styles.footerText}>
                        Page 1/1 • Généré le {formatDateFR(new Date())}
                    </Text>
                </View>
            </Page>
        </Document>
    );
};

export default FacturePDF;