// components/Facture/FactureTicketPDF.jsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// ============================================================
// CONFIG
// ============================================================
const isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.');

const API_BASE_URL = isLocal ? 'http://192.168.187.1:8080' : 'https://miyo.n-double.com';

// 80mm = 80 * 2.83465 = ~226.77 points
const TICKET_WIDTH = 226.77;

// ============================================================
// HELPERS
// ============================================================
const formatMontant = (value) => {
  const num = Number(value || 0);
  if (isNaN(num)) return '0 FCFA';
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F';
};

const formatDateHeure = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const jj = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mn = String(d.getMinutes()).padStart(2, '0');
    return `${jj}/${mm}/${yy} ${hh}:${mn}`;
  } catch {
    return '-';
  }
};

const SEP = '--------------------------------';

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  page: {
    width: TICKET_WIDTH,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontFamily: 'Courier',
    fontSize: 8.5,
    lineHeight: 1.35,
    color: '#000',
  },

  center: { textAlign: 'center' },
  bold: { fontFamily: 'Courier-Bold' },
  small: { fontSize: 7.5 },
  tiny: { fontSize: 6.5 },

  shopName: {
    fontFamily: 'Courier-Bold',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 2,
  },
  shopLine: {
    textAlign: 'center',
    fontSize: 7.5,
    marginBottom: 1,
  },
  logo: {
    alignSelf: 'center',
    width: 50,          // ✅ largeur fixe
    height: 50,         // ✅ hauteur fixe
    objectFit: 'contain',
    marginBottom: 4,
  },

  sep: {
    textAlign: 'center',
    fontSize: 8,
    marginVertical: 3,
    letterSpacing: -0.5,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 0.5,
  },
  rowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1,
    fontFamily: 'Courier-Bold',
  },

  // Ligne produit
  prodName: {
    fontFamily: 'Courier-Bold',
    fontSize: 8.5,
    marginTop: 2,
  },
  prodMeta: {
    fontSize: 8,
    marginLeft: 6,
  },
  prodTotal: {
    fontFamily: 'Courier-Bold',
    fontSize: 8.5,
    textAlign: 'right',
  },

  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
    fontFamily: 'Courier-Bold',
    fontSize: 11,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8.5,
    marginVertical: 0.5,
  },

  thanks: {
    textAlign: 'center',
    fontFamily: 'Courier-Bold',
    fontSize: 9,
    marginTop: 4,
  },
});

// ============================================================
// COMPOSANT
// ============================================================
const FactureTicketPDF = ({ data }) => {
  const {
    numero_facture,
    date_facture,
    nomclient,
    telephone,
    montant_total,
    mode_paiement,
    lignes = [],
    paiements = [],
    numero_commande,
    magasin,
    utilisateur_nom,
  } = data || {};

  const montantTotalNum = parseFloat(montant_total || 0);
  const montantPaye = (paiements || []).reduce(
    (s, p) => s + parseFloat(p.montant || 0),
    0
  );
  const rendu = Math.max(0, montantPaye - montantTotalNum);

  // Helpers magasin
  const getLogo = () => {
    if (!magasin?.logo_url) return null;
    return magasin.logo_url.startsWith('http')
      ? magasin.logo_url
      : `${API_BASE_URL}${magasin.logo_url}`;
  };
  const adresse = [magasin?.quartier, magasin?.ville, magasin?.pays]
    .filter(Boolean)
    .join(', ');

  const modeLabel =
    {
      especes: 'ESPECES',
      carte: 'CARTE',
      virement: 'VIREMENT',
      cheque: 'CHEQUE',
      mobile_money: 'MOBILE MONEY',
    }[mode_paiement] || (mode_paiement || '').toUpperCase();

  // ============================================================
  // ✅ Calcul de la hauteur dynamique du ticket
  // ============================================================
  // Base : en-tête (logo + nom + adresse + tel + séparateurs) ≈ 120pt
  // + infos facture (6 lignes max) ≈ 60pt
  // + lignes produits (30pt par produit)
  // + total + paiement + pied ≈ 100pt
  // + marge de sécurité 40pt
  const logoHeight = getLogo() ? 54 : 0;
  const nbLignesProduits = (lignes || []).length;
  const nbInfosFacture = [
    numero_facture,
    date_facture,
    numero_commande,
    utilisateur_nom,
    nomclient,
    telephone,
  ].filter(Boolean).length;
  const nbPaiements = (paiements || []).length > 0 ? 2 : 0;
  const mentionsLegales =
    magasin?.numero_rccm || magasin?.numero_nif ? 20 : 0;

  const estimatedHeight =
    30 +                                 // padding haut
    logoHeight +                         // logo
    40 +                                 // nom magasin + adresse + tel
    20 +                                 // séparateur
    nbInfosFacture * 12 +                // lignes infos facture
    20 +                                 // séparateur
    nbLignesProduits * 32 +              // lignes produits
    20 +                                 // séparateur
    30 +                                 // total
    nbPaiements * 14 +                   // paiements + rendu
    20 +                                 // séparateur
    30 +                                 // merci + date
    mentionsLegales +                    // mentions légales
    40;                                  // padding bas + marge de sécurité

  const TICKET_HEIGHT = Math.max(250, estimatedHeight);

  return (
    <Document>
      <Page
        size={{ width: TICKET_WIDTH, height: TICKET_HEIGHT }}
        style={styles.page}
        wrap={false}                     // ✅ empêche les sauts de page
      >
        {/* -------- En-tête magasin -------- */}
        {getLogo() && <Image src={getLogo()} style={styles.logo} />}
        <Text style={styles.shopName}>{magasin?.nom_commercial || 'MON MAGASIN'}</Text>
        {adresse ? <Text style={styles.shopLine}>{adresse}</Text> : null}
        {magasin?.telephone ? (
          <Text style={styles.shopLine}>Tel: {magasin.telephone}</Text>
        ) : null}

        <Text style={styles.sep}>{SEP}</Text>

        {/* -------- Infos facture -------- */}
        <View style={styles.row}>
          <Text>Facture</Text>
          <Text style={styles.bold}>{numero_facture || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text>Date</Text>
          <Text>{formatDateHeure(date_facture)}</Text>
        </View>
        {numero_commande ? (
          <View style={styles.row}>
            <Text>Commande</Text>
            <Text>{numero_commande}</Text>
          </View>
        ) : null}
        {utilisateur_nom ? (
          <View style={styles.row}>
            <Text>Caissier</Text>
            <Text>{utilisateur_nom}</Text>
          </View>
        ) : null}
        {nomclient ? (
          <View style={styles.row}>
            <Text>Client</Text>
            <Text>{nomclient}</Text>
          </View>
        ) : null}
        {telephone ? (
          <View style={styles.row}>
            <Text>Tel</Text>
            <Text>{telephone}</Text>
          </View>
        ) : null}

        <Text style={styles.sep}>{SEP}</Text>

        {/* -------- Lignes produits -------- */}
        {lignes.map((l, i) => {
          const qte = parseFloat(l.quantite || 0);
          const prix = parseFloat(l.prix_vente || 0);
          const remise = parseFloat(l.remise || 0);
          const total = qte * prix * (1 - remise / 100);
          const uniteLabel = l.nom_unite_vente || l.unite_symbole || '';
          return (
            <View key={i} style={{ marginBottom: 3 }}>
              <Text style={styles.prodName}>
                {(l.produit_nom || 'Produit').toUpperCase()}
                {l.marque_nom ? ` ${l.marque_nom}` : ''}
              </Text>
              <View style={styles.row}>
                <Text style={styles.prodMeta}>
                  {qte} {uniteLabel} x {formatMontant(prix)}
                  {l.quantite_base > 1 ? ` (${l.quantite_base})` : ''}
                </Text>
                <Text style={styles.prodTotal}>{formatMontant(total)}</Text>
              </View>
            </View>
          );
        })}

        <Text style={styles.sep}>{SEP}</Text>

        {/* -------- Total -------- */}
        <View style={styles.totalRow}>
          <Text>TOTAL</Text>
          <Text>{formatMontant(montantTotalNum)}</Text>
        </View>

        {montantPaye > 0 && (
          <>
            <View style={styles.paymentRow}>
              <Text>{modeLabel}</Text>
              <Text>{formatMontant(montantPaye)}</Text>
            </View>
            {rendu > 0 && (
              <View style={styles.paymentRow}>
                <Text>RENDU</Text>
                <Text>{formatMontant(rendu)}</Text>
              </View>
            )}
          </>
        )}

        <Text style={styles.sep}>{SEP}</Text>

        {/* -------- Pied -------- */}
        <Text style={styles.thanks}>MERCI DE VOTRE VISITE !</Text>
        <Text style={[styles.center, styles.small, { marginTop: 4 }]}>
          {formatDateHeure(new Date())}
        </Text>

        {/* Mentions légales (petit) */}
        {(magasin?.numero_rccm || magasin?.numero_nif) && (
          <View style={{ marginTop: 6 }}>
            {magasin?.numero_rccm ? (
              <Text style={[styles.center, styles.tiny]}>RCCM: {magasin.numero_rccm}</Text>
            ) : null}
            {magasin?.numero_nif ? (
              <Text style={[styles.center, styles.tiny]}>NIF: {magasin.numero_nif}</Text>
            ) : null}
          </View>
        )}
      </Page>
    </Document>
  );
};

export default FactureTicketPDF;