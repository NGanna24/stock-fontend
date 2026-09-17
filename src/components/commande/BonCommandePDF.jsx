// components/CommandeAchat/BonCommandePDF.jsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// ============================================================
// FONTS
// ============================================================
Font.register({
    family: 'Helvetica',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/helvetica/v1/Helvetica.ttf' },
        { src: 'https://fonts.gstatic.com/s/helvetica/v1/Helvetica-Bold.ttf', fontWeight: 'bold' },
        { src: 'https://fonts.gstatic.com/s/helvetica/v1/Helvetica-Oblique.ttf', fontStyle: 'italic' },
    ],
});

// ============================================================
// CONFIG
// ============================================================
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
   window.location.hostname === "127.0.0.1" ||
   window.location.hostname.startsWith("192.168."));

const API_BASE_URL = isLocal
  ? "http://192.168.187.1:8080"
  : "https://miyo.n-double.com";

const COLORS = {
    dark: '#2d3748',
    darkLight: '#4a5568',
    gray: '#e2e8f0',
    grayLight: '#f7fafc',
    grayText: '#718096',
    black: '#1a202c',
    white: '#ffffff',
    accent: '#2563eb',
    warning: '#f59e0b',
};

// ============================================================
// HELPERS
// ============================================================
const formatMontant = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (isNaN(num)) return null;
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
        padding: 0,
        fontSize: 10,
        fontFamily: 'Helvetica',
        backgroundColor: COLORS.white,
    },

    // ==================== HEADER ====================
    header: {
        flexDirection: 'row',
        paddingHorizontal: 40,
        paddingTop: 30,
        paddingBottom: 20,
        alignItems: 'flex-start',
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    logoBox: {
        width: 60,
        height: 60,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    logoImage: {
        maxWidth: 60,
        maxHeight: 60,
        objectFit: 'contain',
    },
    logoPlaceholder: {
        fontSize: 20,
        color: COLORS.white,
        fontWeight: 'bold',
    },
    headerCompanyInfo: {
        flex: 1,
        paddingTop: 4,
    },
    headerCompanyName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.black,
        marginBottom: 2,
    },
    headerCompanySlogan: {
        fontSize: 8,
        color: COLORS.grayText,
        marginBottom: 4,
    },
    headerCompanyText: {
        fontSize: 8,
        color: COLORS.grayText,
        lineHeight: 1.4,
    },

    headerRight: {
        alignItems: 'flex-end',
    },
    invoiceTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: COLORS.black,
        letterSpacing: 2,
    },
    invoiceTitleSub: {
        fontSize: 10,
        color: COLORS.grayText,
        marginTop: 4,
        letterSpacing: 1,
    },

    // ==================== BLOC INFO ====================
    infoBlock: {
        flexDirection: 'row',
        paddingHorizontal: 40,
        paddingBottom: 25,
        justifyContent: 'space-between',
    },
    infoClient: {
        flex: 1,
        paddingRight: 20,
    },
    infoTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: COLORS.grayText,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
    },
    clientName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.black,
        marginBottom: 4,
    },
    clientSub: {
        fontSize: 9,
        color: COLORS.grayText,
        marginBottom: 8,
    },
    clientContactLabel: {
        fontSize: 8,
        color: COLORS.grayText,
        marginTop: 6,
        marginBottom: 2,
    },
    clientContactText: {
        fontSize: 9,
        color: COLORS.black,
        lineHeight: 1.4,
    },

    infoMeta: {
        width: 220,
    },
    infoMetaLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    infoMetaLabel: {
        fontSize: 9,
        color: COLORS.grayText,
    },
    infoMetaValue: {
        fontSize: 9,
        color: COLORS.black,
        fontWeight: 'bold',
        textAlign: 'right',
    },

    // ==================== TABLEAU ====================
    tableWrapper: {
        paddingHorizontal: 40,
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: COLORS.dark,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    tableHeaderText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: COLORS.white,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayLight,
    },
    tableRowAlt: {
        backgroundColor: COLORS.grayLight,
    },
    tableCellText: {
        fontSize: 9,
        color: COLORS.black,
    },
    tableCellGray: {
        fontSize: 9,
        color: COLORS.grayText,
    },
    tableCellEmpty: {
        fontSize: 9,
        color: COLORS.grayText,
        fontStyle: 'italic',
    },

    colIndex: { width: '6%', textAlign: 'center' },
    colDesc: { width: '40%' },
    colUnit: { width: '12%', textAlign: 'center' },
    colQty: { width: '10%', textAlign: 'center' },
    colPrice: { width: '16%', textAlign: 'right' },
    colAmount: { width: '16%', textAlign: 'right' },

    // ==================== TOTAUX ====================
    totalsWrapper: {
        paddingHorizontal: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    totalsLeft: {
        flex: 1,
        paddingRight: 20,
    },
    totalDueLabel: {
        fontSize: 9,
        color: COLORS.grayText,
        marginBottom: 4,
    },
    totalDueValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.black,
        marginBottom: 4,
    },
    totalDueValueEmpty: {
        fontSize: 14,
        fontStyle: 'italic',
        color: COLORS.grayText,
        marginBottom: 4,
    },
    totalDueNote: {
        fontSize: 8,
        color: COLORS.grayText,
        fontStyle: 'italic',
    },

    totalsRight: {
        width: 260,
    },
    totalLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayLight,
    },
    totalLineLast: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        backgroundColor: COLORS.dark,
        paddingHorizontal: 10,
        marginTop: 6,
    },
    totalLabel: {
        fontSize: 9,
        color: COLORS.grayText,
    },
    totalValue: {
        fontSize: 9,
        color: COLORS.black,
        fontWeight: 'bold',
    },
    totalValueEmpty: {
        fontSize: 9,
        color: COLORS.grayText,
        fontStyle: 'italic',
    },
    totalLabelLast: {
        fontSize: 11,
        color: COLORS.white,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    totalValueLast: {
        fontSize: 12,
        color: COLORS.white,
        fontWeight: 'bold',
    },

    // ==================== CONDITIONS + SIGNATURE ====================
    termsWrapper: {
        paddingHorizontal: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    termsBlock: {
        flex: 1,
        paddingRight: 30,
    },
    termsTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.black,
        marginBottom: 8,
    },
    termsText: {
        fontSize: 8,
        color: COLORS.grayText,
        lineHeight: 1.5,
    },

    signatureBlock: {
        width: 180,
        alignItems: 'center',
        paddingTop: 20,
    },
    signatureLine: {
        width: 120,
        height: 1,
        backgroundColor: COLORS.black,
        marginBottom: 6,
    },
    signatureName: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.black,
        marginBottom: 2,
    },
    signatureRole: {
        fontSize: 8,
        color: COLORS.grayText,
        textAlign: 'center',
    },

    // ==================== FOOTER ====================
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.dark,
        paddingVertical: 15,
        paddingHorizontal: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerCol: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerColCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    footerColRight: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
    },
    footerIcon: {
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerIconText: {
        fontSize: 12,
        color: COLORS.white,
    },
    footerText: {
        fontSize: 8,
        color: COLORS.white,
        lineHeight: 1.4,
    },
});

// ============================================================
// COMPOSANT
// ============================================================
const BonCommandePDF = ({ data }) => {
    const {
        numero_commande,
        date_commande,
        statut,
        notes,
        montant_total,
        lignes = [],
        fournisseur_nom,
        fournisseur_telephone,
        fournisseur_email,
        fournisseur_ville,
        fournisseur_pays,
        utilisateur_nom,
        magasin,
    } = data || {};

    const montantTotalNum = parseFloat(montant_total || 0);
    const hasMontant = montantTotalNum > 0;

    // ============================================================
    // HELPERS MAGASIN
    // ============================================================
    const getLogoUrl = () => {
        if (!magasin?.logo_url) return null;
        if (magasin.logo_url.startsWith('http')) return magasin.logo_url;
        return `${API_BASE_URL}${magasin.logo_url}`;
    };

    const getAdresseComplete = () => {
        if (!magasin) return '';
        return [magasin.quartier, magasin.ville, magasin.pays]
            .filter(Boolean)
            .join(', ');
    };

    const getNomMagasin = () => magasin?.nom_commercial || 'Mon magasin';

    const getInitiales = () => {
        const nom = getNomMagasin();
        return nom
            .split(' ')
            .map(w => w[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const getFournisseurAdresse = () => {
        return [fournisseur_ville, fournisseur_pays].filter(Boolean).join(', ');
    };

    const getStatutLabel = (s) =>
        ({
            en_attente: 'EN ATTENTE',
            envoyee: 'ENVOYÉE',
            partiellement_recue: 'PARTIELLE',
            recue: 'REÇUE',
            annulee: 'ANNULÉE',
        }[s] || s || 'EN ATTENTE');

    // ============================================================
    // RENDU
    // ============================================================
    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logoBox}>
                            {getLogoUrl() ? (
                                <Image src={getLogoUrl()} style={styles.logoImage} />
                            ) : (
                                <Text style={styles.logoPlaceholder}>
                                    {getInitiales()}
                                </Text>
                            )}
                        </View>

                        <View style={styles.headerCompanyInfo}>
                            <Text style={styles.headerCompanyName}>{getNomMagasin()}</Text>
                            {magasin?.slogan && (
                                <Text style={styles.headerCompanySlogan}>{magasin.slogan}</Text>
                            )}
                            {getAdresseComplete() && (
                                <Text style={styles.headerCompanyText}>
                                    {getAdresseComplete()}
                                </Text>
                            )}
                            {magasin?.telephone && (
                                <Text style={styles.headerCompanyText}>
                                    Tél : {magasin.telephone}
                                    {magasin.telephone2 && ` / ${magasin.telephone2}`}
                                </Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.headerRight}>
                        <Text style={styles.invoiceTitle}>BON DE COMMANDE</Text>
                        <Text style={styles.invoiceTitleSub}>PURCHASE ORDER</Text>
                    </View>
                </View>

                {/* BLOC FOURNISSEUR + INFOS COMMANDE */}
                <View style={styles.infoBlock}>
                    <View style={styles.infoClient}>
                        <Text style={styles.infoTitle}>FOURNISSEUR</Text>
                        <Text style={styles.clientName}>{fournisseur_nom || '-'}</Text>
                        {getFournisseurAdresse() && (
                            <Text style={styles.clientSub}>{getFournisseurAdresse()}</Text>
                        )}

                        <Text style={styles.clientContactLabel}>Contact</Text>
                        {fournisseur_telephone && (
                            <Text style={styles.clientContactText}>Tél : {fournisseur_telephone}</Text>
                        )}
                        {fournisseur_email && (
                            <Text style={styles.clientContactText}>Email : {fournisseur_email}</Text>
                        )}
                    </View>

                    <View style={styles.infoMeta}>
                        <View style={styles.infoMetaLine}>
                            <Text style={styles.infoMetaLabel}>N° Commande :</Text>
                            <Text style={styles.infoMetaValue}>{numero_commande}</Text>
                        </View>
                        <View style={styles.infoMetaLine}>
                            <Text style={styles.infoMetaLabel}>Date :</Text>
                            <Text style={styles.infoMetaValue}>{formatDateFR(date_commande)}</Text>
                        </View>
                        <View style={styles.infoMetaLine}>
                            <Text style={styles.infoMetaLabel}>Statut :</Text>
                            <Text style={styles.infoMetaValue}>{getStatutLabel(statut)}</Text>
                        </View>
                        {utilisateur_nom && (
                            <View style={styles.infoMetaLine}>
                                <Text style={styles.infoMetaLabel}>Émis par :</Text>
                                <Text style={styles.infoMetaValue}>{utilisateur_nom}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* TABLEAU PRODUITS */}
                <View style={styles.tableWrapper}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.colIndex, styles.tableHeaderText]}>#</Text>
                        <Text style={[styles.colDesc, styles.tableHeaderText]}>Description</Text>
                        <Text style={[styles.colUnit, styles.tableHeaderText]}>Unité</Text>
                        <Text style={[styles.colQty, styles.tableHeaderText]}>Qté</Text>
                        <Text style={[styles.colPrice, styles.tableHeaderText]}>Prix unit.</Text>
                        <Text style={[styles.colAmount, styles.tableHeaderText]}>Montant</Text>
                    </View>

                    {lignes.length === 0 ? (
                        <View style={styles.tableRow}>
                            <Text style={[styles.colDesc, styles.tableCellGray]}>
                                Aucun produit
                            </Text>
                        </View>
                    ) : (
                        lignes.map((ligne, index) => {
                            const qte = parseFloat(ligne.quantite || 0);
                            const prixBrut = ligne.prix_achat;
                            const prix = (prixBrut !== null && prixBrut !== undefined && prixBrut !== '')
                                ? parseFloat(prixBrut)
                                : null;
                            const remise = parseFloat(ligne.remise || 0);
                            const totalLigne = prix !== null
                                ? qte * prix * (1 - remise / 100)
                                : null;

                            const nomUnite = ligne.nom_unite_vente || ligne.unite_symbole || 'Unité';
                            const qteBase = parseFloat(ligne.quantite_base || 1);
                            const numero = String(index + 1).padStart(2, '0');

                            return (
                                <View
                                    key={index}
                                    style={[
                                        styles.tableRow,
                                        index % 2 === 1 ? styles.tableRowAlt : {}
                                    ]}
                                >
                                    <Text style={[styles.colIndex, styles.tableCellGray]}>
                                        {numero}
                                    </Text>
                                    <Text style={[styles.colDesc, styles.tableCellText]}>
                                        {ligne.produit_nom || 'Produit'}
                                        {ligne.marque_nom && ` - ${ligne.marque_nom}`}
                                        {ligne.modele_nom && ` (${ligne.modele_nom})`}
                                    </Text>
                                    <Text style={[styles.colUnit, styles.tableCellText]}>
                                        {nomUnite}
                                        {qteBase > 1 && ` (×${qteBase})`}
                                    </Text>
                                    <Text style={[styles.colQty, styles.tableCellText]}>
                                        {qte}
                                    </Text>
                                    <Text style={[styles.colPrice, prix !== null ? styles.tableCellText : styles.tableCellEmpty]}>
                                        {prix !== null ? formatMontant(prix) : 'À définir'}
                                    </Text>
                                    <Text style={[styles.colAmount, totalLigne !== null ? styles.tableCellText : styles.tableCellEmpty]}>
                                        {totalLigne !== null ? formatMontant(totalLigne) : '—'}
                                    </Text>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* TOTAUX */}
                <View style={styles.totalsWrapper}>
                    <View style={styles.totalsLeft}>
                        <Text style={styles.totalDueLabel}>
                            {hasMontant ? 'Total de la commande' : 'Total'}
                        </Text>
                        {hasMontant ? (
                            <Text style={styles.totalDueValue}>
                                {formatMontant(montantTotalNum)}
                            </Text>
                        ) : (
                            <Text style={styles.totalDueValueEmpty}>
                                À définir à la réception
                            </Text>
                        )}
                        {!hasMontant && (
                            <Text style={styles.totalDueNote}>
                                Les prix seront renseignés lors de la réception de la marchandise.
                            </Text>
                        )}
                    </View>

                    <View style={styles.totalsRight}>
                        <View style={styles.totalLine}>
                            <Text style={styles.totalLabel}>Nombre de lignes</Text>
                            <Text style={styles.totalValue}>{lignes.length}</Text>
                        </View>
                        <View style={styles.totalLine}>
                            <Text style={styles.totalLabel}>Sous-total</Text>
                            {hasMontant ? (
                                <Text style={styles.totalValue}>
                                    {formatMontant(montantTotalNum)}
                                </Text>
                            ) : (
                                <Text style={styles.totalValueEmpty}>À définir</Text>
                            )}
                        </View>

                        <View style={styles.totalLineLast}>
                            <Text style={styles.totalLabelLast}>TOTAL</Text>
                            {hasMontant ? (
                                <Text style={styles.totalValueLast}>
                                    {formatMontant(montantTotalNum)}
                                </Text>
                            ) : (
                                <Text style={styles.totalValueLast}>—</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* CONDITIONS + SIGNATURE */}
                <View style={styles.termsWrapper}>
                    <View style={styles.termsBlock}>
                        <Text style={styles.termsTitle}>Conditions & Mentions</Text>
                        <Text style={styles.termsText}>
                            {notes || 'Ce bon de commande est valable 30 jours à compter de sa date d\'émission. Merci de nous confirmer la disponibilité des produits et les délais de livraison.'}
                        </Text>
                    </View>

                    <View style={styles.signatureBlock}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureName}>{getNomMagasin()}</Text>
                        <Text style={styles.signatureRole}>
                            Cachet & signature du magasin
                        </Text>
                    </View>
                </View>

                {/* FOOTER */}
                <View style={styles.footer} fixed>
                    <View style={styles.footerCol}>
                        <View style={styles.footerIcon}>
                            <Text style={styles.footerIconText}>📞</Text>
                        </View>
                        <View>
                            {magasin?.telephone && (
                                <Text style={styles.footerText}>{magasin.telephone}</Text>
                            )}
                            {magasin?.telephone2 && (
                                <Text style={styles.footerText}>{magasin.telephone2}</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.footerColCenter}>
                        <View style={styles.footerIcon}>
                            <Text style={styles.footerIconText}>🏢</Text>
                        </View>
                        <View>
                            <Text style={styles.footerText}>
                                {getAdresseComplete() || 'Adresse non renseignée'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.footerColRight}>
                        <View style={styles.footerIcon}>
                            <Text style={styles.footerIconText}>✉️</Text>
                        </View>
                        <View>
                            {magasin?.email && (
                                <Text style={styles.footerText}>{magasin.email}</Text>
                            )}
                            {magasin?.whatsapp && (
                                <Text style={styles.footerText}>WhatsApp : {magasin.whatsapp}</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* MENTIONS LÉGALES */}
                <View style={{
                    position: 'absolute',
                    bottom: 65,
                    left: 40,
                    right: 40,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                }}>
                    {magasin?.numero_rccm && (
                        <Text style={{ fontSize: 7, color: COLORS.grayText }}>
                            RCCM : {magasin.numero_rccm}
                        </Text>
                    )}
                    {magasin?.numero_nif && (
                        <Text style={{ fontSize: 7, color: COLORS.grayText }}>
                            NIF : {magasin.numero_nif}
                        </Text>
                    )}
                    {magasin?.numero_contribuable && (
                        <Text style={{ fontSize: 7, color: COLORS.grayText }}>
                            N° Contribuable : {magasin.numero_contribuable}
                        </Text>
                    )}
                </View>

            </Page>
        </Document>
    );
};

export default BonCommandePDF;