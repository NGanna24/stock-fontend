// components/Facture/FacturePDF.jsx
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
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.startsWith("192.168.");

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
};

// ============================================================
// HELPERS
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
        padding: 0,
        paddingBottom: 60,   // ✅ FIX : espace pour le footer fixe
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
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.black,
        letterSpacing: 2,
    },

    // ==================== BLOC INFO CLIENT + FACTURE ====================
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
        minHeight: 28,          // ✅ FIX : hauteur minimale
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

    colIndex: { width: '6%', textAlign: 'center' },
    colDesc: { width: '44%' },
    colPrice: { width: '16%', textAlign: 'right' },
    colQty: { width: '14%', textAlign: 'center' },
    colAmount: { width: '20%', textAlign: 'right' },

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
    },

    // ==================== FOOTER ====================
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 15,
        paddingHorizontal: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.dark,
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

    // ✅ NOUVEAU : Bloc pagination
    pageNumber: {
        position: 'absolute',
        bottom: 40,
        right: 40,
        fontSize: 8,
        color: COLORS.grayText,
    },
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
        magasin,
    } = data || {};

    // ============================================================
    // RECALCUL DES TOTAUX
    // ============================================================
    const montantTotalNum = parseFloat(montant_total || 0);
    const montantPayeCalcule = paiements.reduce(
        (sum, p) => sum + parseFloat(p.montant || 0),
        0
    );
    const resteAPayerCalcule = Math.max(0, montantTotalNum - montantPayeCalcule);

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

    const getNomMagasin = () => {
        return magasin?.nom_commercial || 'Mon magasin';
    };

    const getInitiales = () => {
        const nom = getNomMagasin();
        return nom
            .split(' ')
            .map(w => w[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    // ============================================================
    // HELPERS FACTURE
    // ============================================================
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

    const getStatutLabel = (s) =>
        ({
            en_attente: 'EN ATTENTE',
            payee: 'PAYÉE',
            partiellement_payee: 'PARTIELLE',
            en_retard: 'EN RETARD',
            annulee: 'ANNULÉE',
        }[s] || s || 'EN ATTENTE');

    // ============================================================
    // RENDU
    // ============================================================
    return (
        <Document>
            <Page size="A4" style={styles.page} wrap>

                {/* ============================================================ */}
                {/* HEADER : fixé uniquement sur la 1ère page                    */}
                {/* ============================================================ */}
                <View style={styles.header} fixed={false}>
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
                        <Text style={styles.invoiceTitle}>FACTURE</Text>
                    </View>
                </View>

                {/* ============================================================ */}
                {/* BLOC CLIENT + INFOS FACTURE                                  */}
                {/* ============================================================ */}
                <View style={styles.infoBlock} wrap={false}>
                    <View style={styles.infoClient}>
                        <Text style={styles.infoTitle}>FACTURÉ À</Text>
                        <Text style={styles.clientName}>{nomclient || '-'}</Text>
                        {adresse && (
                            <Text style={styles.clientSub}>{adresse}</Text>
                        )}

                        <Text style={styles.clientContactLabel}>Contact</Text>
                        {telephone && (
                            <Text style={styles.clientContactText}>Tél : {telephone}</Text>
                        )}
                        {email && (
                            <Text style={styles.clientContactText}>Email : {email}</Text>
                        )}
                    </View>

                    <View style={styles.infoMeta}>
                        <View style={styles.infoMetaLine}>
                            <Text style={styles.infoMetaLabel}>N° Facture :</Text>
                            <Text style={styles.infoMetaValue}>{numero_facture}</Text>
                        </View>
                        <View style={styles.infoMetaLine}>
                            <Text style={styles.infoMetaLabel}>Date :</Text>
                            <Text style={styles.infoMetaValue}>
                                {formatDate(date_facture, date_facture_formatee)}
                            </Text>
                        </View>
                        <View style={styles.infoMetaLine}>
                            <Text style={styles.infoMetaLabel}>Échéance :</Text>
                            <Text style={styles.infoMetaValue}>
                                {formatDate(date_echeance, date_echeance_formatee)}
                            </Text>
                        </View>
                        <View style={styles.infoMetaLine}>
                            <Text style={styles.infoMetaLabel}>Statut :</Text>
                            <Text style={styles.infoMetaValue}>{getStatutLabel(statut)}</Text>
                        </View>
                        <View style={styles.infoMetaLine}>
                            <Text style={styles.infoMetaLabel}>Paiement :</Text>
                            <Text style={styles.infoMetaValue}>
                                {getModePaiementLabel(mode_paiement)}
                            </Text>
                        </View>
                        {numero_commande && (
                            <View style={styles.infoMetaLine}>
                                <Text style={styles.infoMetaLabel}>Commande :</Text>
                                <Text style={styles.infoMetaValue}>{numero_commande}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ============================================================ */}
                {/* TABLEAU PRODUITS                                             */}
                {/* ============================================================ */}
                <View style={styles.tableWrapper}>
                    {/* ✅ FIX : En-tête du tableau répété sur chaque page */}
                    <View style={styles.tableHeader} fixed>
                        <Text style={[styles.colIndex, styles.tableHeaderText]}>#</Text>
                        <Text style={[styles.colDesc, styles.tableHeaderText]}>Description</Text>
                        <Text style={[styles.colPrice, styles.tableHeaderText]}>Prix</Text>
                        <Text style={[styles.colQty, styles.tableHeaderText]}>Qté</Text>
                        <Text style={[styles.colAmount, styles.tableHeaderText]}>Montant</Text>
                    </View>

                    {/* ✅ FIX : Lignes avec wrap={false} pour éviter la coupure */}
                    {lignes.length === 0 ? (
                        <View style={styles.tableRow}>
                            <Text style={[styles.colDesc, styles.tableCellGray]}>
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
                            const numero = String(index + 1).padStart(2, '0');

                            return (
                                <View
                                    key={index}
                                    // ✅ FIX CRITIQUE : empêche la ligne d'être coupée entre 2 pages
                                    wrap={false}
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
                                        {ligne.unite_symbole && ` (${ligne.unite_symbole})`}
                                    </Text>
                                    <Text style={[styles.colPrice, styles.tableCellText]}>
                                        {formatMontant(prix)}
                                    </Text>
                                    <Text style={[styles.colQty, styles.tableCellText]}>
                                        {qte}
                                    </Text>
                                    <Text style={[styles.colAmount, styles.tableCellText]}>
                                        {formatMontant(totalApresRemise)}
                                    </Text>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* ============================================================ */}
                {/* TOTAUX                                                       */}
                {/* ============================================================ */}
                {/* ✅ FIX : minPresenceAhead pour ne pas isoler en bas de page */}
                <View style={styles.totalsWrapper} wrap={false} minPresenceAhead={100}>
                    <View style={styles.totalsLeft}>
                        <Text style={styles.totalDueLabel}>Total à payer</Text>
                        <Text style={styles.totalDueValue}>
                            {formatMontant(montantTotalNum)}
                        </Text>
                        {resteAPayerCalcule > 0 && (
                            <Text style={styles.totalDueNote}>
                                Reste à payer : {formatMontant(resteAPayerCalcule)}
                            </Text>
                        )}
                        {resteAPayerCalcule <= 0 && montantTotalNum > 0 && (
                            <Text style={[styles.totalDueNote, { color: '#10b981' }]}>
                                Facture entièrement payée
                            </Text>
                        )}
                    </View>

                    <View style={styles.totalsRight}>
                        <View style={styles.totalLine}>
                            <Text style={styles.totalLabel}>Sous-total</Text>
                            <Text style={styles.totalValue}>
                                {formatMontant(montantTotalNum)}
                            </Text>
                        </View>
                        <View style={styles.totalLine}>
                            <Text style={styles.totalLabel}>Montant payé</Text>
                            <Text style={styles.totalValue}>
                                {formatMontant(montantPayeCalcule)}
                            </Text>
                        </View>

                        <View style={styles.totalLineLast}>
                            <Text style={styles.totalLabelLast}>TOTAL</Text>
                            <Text style={styles.totalValueLast}>
                                {formatMontant(resteAPayerCalcule > 0 ? resteAPayerCalcule : montantTotalNum)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ============================================================ */}
                {/* CONDITIONS + SIGNATURE                                       */}
                {/* ============================================================ */}
                {/* ✅ FIX : minPresenceAhead + wrap=false pour ne pas couper */}
                <View
                    style={styles.termsWrapper}
                    wrap={false}
                    minPresenceAhead={120}
                >
                    <View style={styles.termsBlock}>
                        <Text style={styles.termsTitle}>Conditions & Informations</Text>
                        <Text style={styles.termsText}>
                            {notes || 'Merci pour votre confiance. Tout retard de paiement peut entraîner des pénalités conformément à nos conditions générales de vente.'}
                        </Text>
                    </View>

                    <View style={styles.signatureBlock}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureName}>{getNomMagasin()}</Text>
                        <Text style={styles.signatureRole}>Signature autorisée</Text>
                    </View>
                </View>

                {/* ============================================================ */}
                {/* FOOTER NOIR : fixé sur toutes les pages                      */}
                {/* ============================================================ */}
                <View style={styles.footer} fixed>
                    <View style={styles.footerCol}>
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
                        <View>
                            <Text style={styles.footerText}>
                                {getAdresseComplete() || 'Adresse non renseignée'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.footerColRight}>
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

                {/* ============================================================ */}
                {/* MENTIONS LÉGALES (au-dessus du footer, fixe sur chaque page) */}
                {/* ============================================================ */}
                <View
                    fixed
                    style={{
                        position: 'absolute',
                        bottom: 70,
                        left: 40,
                        right: 40,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                    }}
                >
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

                {/* ✅ NOUVEAU : Numérotation des pages */}
                <Text
                    fixed
                    style={styles.pageNumber}
                    render={({ pageNumber, totalPages }) =>
                        `Page ${pageNumber} / ${totalPages}`
                    }
                />

            </Page>
        </Document>
    );
};

export default FacturePDF;