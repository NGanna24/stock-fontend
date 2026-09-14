// components/RetourFournisseur/RetourPDF.jsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// ============================================================
// STYLES
// ============================================================

Font.register({
    family: 'Helvetica',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/helvetica/v1/Helvetica.ttf' },
        { src: 'https://fonts.gstatic.com/s/helvetica/v1/Helvetica-Bold.ttf', fontWeight: 'bold' },
    ],
});

const styles = StyleSheet.create({
    // PAGE
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
        borderBottom: '2 solid #1a56db',
        paddingBottom: 15,
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    companyName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a56db',
    },
    companyInfo: {
        fontSize: 9,
        color: '#4a5568',
        marginTop: 2,
    },
    documentTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e3a5f',
        marginTop: 5,
    },
    documentNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2563eb',
    },

    // SECTION
    section: {
        marginBottom: 15,
    },
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
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    gridItem: {
        width: '50%',
        marginBottom: 4,
    },
    label: {
        fontSize: 8,
        color: '#718096',
        marginBottom: 2,
    },
    value: {
        fontSize: 10,
        color: '#1a202c',
    },

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
    tableRowAlternate: {
        backgroundColor: '#fafafa',
    },
    colProduit: { width: '28%' },
    colQte: { width: '10%', textAlign: 'center' },
    colPrix: { width: '15%', textAlign: 'right' },
    colTotal: { width: '17%', textAlign: 'right' },
    colMotif: { width: '15%', textAlign: 'center' },
    colEtat: { width: '15%', textAlign: 'center' },
    tableHeaderText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#1e3a5f',
    },
    tableCellText: {
        fontSize: 9,
        color: '#1a202c',
    },

    // TOTAUX
    totals: {
        marginTop: 10,
        alignItems: 'flex-end',
    },
    totalLine: {
        flexDirection: 'row',
        paddingVertical: 3,
    },
    totalLabel: {
        width: 150,
        textAlign: 'right',
        paddingRight: 10,
        fontSize: 10,
        color: '#4a5568',
    },
    totalValue: {
        width: 100,
        textAlign: 'right',
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1a202c',
    },
    totalGrand: {
        fontSize: 14,
        color: '#1a56db',
        borderTopWidth: 2,
        borderTopColor: '#1a56db',
        paddingTop: 5,
    },

    // BADGES
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        fontSize: 7,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    badgeDefectueux: { backgroundColor: '#fce4ec', color: '#c62828' },
    badgeNonConforme: { backgroundColor: '#fff3e0', color: '#e65100' },
    badgeSurplus: { backgroundColor: '#e3f2fd', color: '#0d47a1' },
    badgePerime: { backgroundColor: '#f3e5f5', color: '#6a1b9a' },
    badgeAutre: { backgroundColor: '#f5f5f5', color: '#616161' },

    // ÉTAT PRODUIT
    etatNeuf: { color: '#065f46' },
    etatEndommage: { color: '#92400e' },
    etatUsage: { color: '#475569' },

    // SIGNATURES
    signatures: {
        marginTop: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 20,
    },
    signatureBox: {
        alignItems: 'center',
        width: '45%',
    },
    signatureLine: {
        borderBottomWidth: 1,
        borderBottomColor: '#1a202c',
        width: '80%',
        marginTop: 30,
        marginBottom: 5,
    },
    signatureLabel: {
        fontSize: 9,
        color: '#4a5568',
        textAlign: 'center',
    },

    // PIED DE PAGE
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
    footerText: {
        fontSize: 8,
        color: '#a0aec0',
    },
});

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const RetourPDF = ({ data }) => {
    const {
        numero_retour,
        date_retour,
        fournisseur = {},
        commande = {},
        reception = {},
        lignes = [],
        motif_retour,
        notes,
        utilisateur = {},
    } = data;

    // Calcul des totaux
    const totalHT = lignes.reduce((sum, l) => sum + (l.quantite * l.prix_achat), 0);
    const tva = totalHT * 0.18;
    const totalTTC = totalHT + tva;

    // Fonctions utilitaires
    const getMotifLabel = (motif) => {
        const motifs = {
            'defectueux': 'Défectueux',
            'non_conforme': 'Non conforme',
            'surplus': 'Surplus',
            'perime': 'Périmé',
            'autre': 'Autre'
        };
        return motifs[motif] || motif;
    };

    const getMotifBadge = (motif) => {
        const classes = {
            'defectueux': 'badgeDefectueux',
            'non_conforme': 'badgeNonConforme',
            'surplus': 'badgeSurplus',
            'perime': 'badgePerime',
            'autre': 'badgeAutre'
        };
        return classes[motif] || 'badgeAutre';
    };

    const getEtatLabel = (etat) => {
        const etats = {
            'neuf': 'Neuf',
            'endommage': 'Endommagé',
            'usage': 'Usagé'
        };
        return etats[etat] || etat;
    };

    const formatMontant = (value) => {
        if (!value) return '0';
        return Math.round(value).toLocaleString('fr-FR') + ' FCFA';
    };

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
                        <Text style={styles.documentTitle}>BON DE RETOUR</Text>
                        <Text style={styles.documentNumber}>N° {numero_retour}</Text>
                        <Text style={styles.companyInfo}>
                            Date: {new Date(date_retour).toLocaleDateString('fr-FR')}
                        </Text>
                    </View>
                </View>

                {/* ========== FOURNISSEUR ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>FOURNISSEUR</Text>
                    <View style={styles.grid}>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Nom</Text>
                            <Text style={styles.value}>{fournisseur.nom || '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Téléphone</Text>
                            <Text style={styles.value}>{fournisseur.telephone || '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Email</Text>
                            <Text style={styles.value}>{fournisseur.email || '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Ville</Text>
                            <Text style={styles.value}>{fournisseur.ville || '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Pays</Text>
                            <Text style={styles.value}>{fournisseur.pays || '-'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>N° TVA</Text>
                            <Text style={styles.value}>{fournisseur.numero_tva || '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* ========== PRODUITS ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PRODUITS RETOURNÉS</Text>
                    
                    <View style={styles.table}>
                        {/* En-tête */}
                        <View style={styles.tableHeader}>
                            <Text style={[styles.colProduit, styles.tableHeaderText]}>Produit</Text>
                            <Text style={[styles.colQte, styles.tableHeaderText]}>Qté</Text>
                            <Text style={[styles.colPrix, styles.tableHeaderText]}>Prix</Text>
                            <Text style={[styles.colTotal, styles.tableHeaderText]}>Total</Text>
                            <Text style={[styles.colMotif, styles.tableHeaderText]}>Motif</Text>
                            <Text style={[styles.colEtat, styles.tableHeaderText]}>État</Text>
                        </View>

                        {/* Lignes */}
                        {lignes.length === 0 ? (
                            <View style={styles.tableRow}>
                                <Text style={[styles.colProduit, styles.tableCellText]}>Aucun produit</Text>
                            </View>
                        ) : (
                            lignes.map((ligne, index) => (
                                <View key={index} style={[
                                    styles.tableRow,
                                    index % 2 === 0 ? styles.tableRowAlternate : {}
                                ]}>
                                    <Text style={[styles.colProduit, styles.tableCellText]}>
                                        {ligne.produit_nom || 'Produit inconnu'}
                                        {ligne.marque_nom && ` (${ligne.marque_nom})`}
                                    </Text>
                                    <Text style={[styles.colQte, styles.tableCellText]}>
                                        {ligne.quantite} {ligne.unite_symbole || ''}
                                    </Text>
                                    <Text style={[styles.colPrix, styles.tableCellText]}>
                                        {formatMontant(ligne.prix_achat)}
                                    </Text>
                                    <Text style={[styles.colTotal, styles.tableCellText]}>
                                        {formatMontant(ligne.quantite * ligne.prix_achat)}
                                    </Text>
                                    <View style={[styles.colMotif]}>
                                        <Text style={[styles.badge, styles[getMotifBadge(ligne.motif_retour || motif_retour)]]}>
                                            {getMotifLabel(ligne.motif_retour || motif_retour)}
                                        </Text>
                                    </View>
                                    <Text style={[styles.colEtat, styles.tableCellText, styles['etat' + (ligne.etat_produit?.charAt(0).toUpperCase() + ligne.etat_produit?.slice(1)) || '']]}>
                                        {getEtatLabel(ligne.etat_produit)}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                {/* ========== RÉCAPITULATIF ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}> RÉCAPITULATIF</Text>
                    <View style={styles.totals}>
                        <View style={styles.totalLine}>
                            <Text style={styles.totalLabel}>Total HT</Text>
                            <Text style={styles.totalValue}>{formatMontant(totalHT)}</Text>
                        </View>
                        <View style={styles.totalLine}>
                            <Text style={styles.totalLabel}>TVA (18%)</Text>
                            <Text style={styles.totalValue}>{formatMontant(tva)}</Text>
                        </View>
                        <View style={styles.totalLine}>
                            <Text style={styles.totalLabel}>Total TTC</Text>
                            <Text style={[styles.totalValue, styles.totalGrand]}>
                                {formatMontant(totalTTC)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ========== INFORMATIONS ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>INFORMATIONS COMPLÉMENTAIRES</Text>
                    <View style={styles.grid}>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Motif principal</Text>
                            <Text style={styles.value}>{getMotifLabel(motif_retour)}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Commande associée</Text>
                            <Text style={styles.value}>{commande.numero_commande || 'Sans commande'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Réception associée</Text>
                            <Text style={styles.value}>{reception.numero_reception || 'Sans réception'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>Créé par</Text>
                            <Text style={styles.value}>{utilisateur.fullname || '-'}</Text>
                        </View>
                        {notes && (
                            <View style={[styles.gridItem, { width: '100%' }]}>
                                <Text style={styles.label}>Notes</Text>
                                <Text style={styles.value}>{notes}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ========== SIGNATURES ========== */}
                <View style={styles.signatures}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Cachet & signature du fournisseur</Text>
                        <View style={styles.signatureLine} />
                        <Text style={[styles.signatureLabel, { fontSize: 8, color: '#718096' }]}>
                            Bon pour retour
                        </Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Cachet & signature de l'entreprise</Text>
                        <View style={styles.signatureLine} />
                        <Text style={[styles.signatureLabel, { fontSize: 8, color: '#718096' }]}>
                            Bon pour réception
                        </Text>
                    </View>
                </View>

                {/* ========== PIED DE PAGE ========== */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Document valable pour retour de marchandise
                    </Text>
                    <Text style={styles.footerText}>
                        Page 1/1 • Généré le {new Date().toLocaleDateString('fr-FR')}
                    </Text>
                </View>
            </Page>
        </Document>
    );
};

export default RetourPDF;