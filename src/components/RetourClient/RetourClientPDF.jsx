// components/RetourClient/RetourClientPDF.jsx
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// ============================================================
// STYLES PDF
// ============================================================
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#8b5cf6',
  },
  headerLeft: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  documentNumber: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  documentDate: {
    fontSize: 9,
    color: '#64748b',
  },

  // Status badge
  statusBadge: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Sections
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 100,
    fontSize: 9,
    color: '#64748b',
    fontWeight: 'bold',
  },
  infoValue: {
    flex: 1,
    fontSize: 10,
    color: '#0f172a',
  },

  // Tableau produits
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeaderCell: {
    padding: 6,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    padding: 6,
    fontSize: 9,
    color: '#1e293b',
  },
  
  // Colonnes
  colProduit: { flex: 3 },
  colQte: { flex: 1, textAlign: 'center' },
  colPrix: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  colMotif: { flex: 1.5, textAlign: 'center' },
  colEtat: { flex: 1, textAlign: 'center' },

  // Motif badge
  motifBadge: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 6,
    fontSize: 8,
    textAlign: 'center',
  },

  // Total
  totalSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#8b5cf6',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalBox: {
    width: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  totalValue: {
    fontSize: 10,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  totalFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalFinalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalFinalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },

  // Notes
  notesSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderLeftWidth: 3,
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#1e293b',
    lineHeight: 1.4,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
    marginBottom: 2,
  },
});

// ============================================================
// HELPERS
// ============================================================
const formatMontant = (value) => {
  if (!value && value !== 0) return '0 FCFA';
  const num = parseFloat(value) || 0;
  return Math.round(num).toLocaleString('fr-FR') + ' FCFA';
};

const formatDate = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
};

const getMotifLabel = (motif) => {
  const motifs = {
    'defectueux': 'Défectueux',
    'non_conforme': 'Non conforme',
    'mecontentement': 'Mécontentement',
    'erreur_livraison': 'Erreur livraison',
    'echange': 'Échange',
    'autre': 'Autre'
  };
  return motifs[motif] || motif;
};

const getMotifColor = (motif) => {
  const colors = {
    'defectueux': '#ef4444',
    'non_conforme': '#f59e0b',
    'mecontentement': '#8b5cf6',
    'erreur_livraison': '#3b82f6',
    'echange': '#8b5cf6',
    'autre': '#64748b'
  };
  return colors[motif] || '#64748b';
};

const getStatutLabel = (statut) => {
  const statuts = {
    'en_attente': 'En attente',
    'recu': 'Reçu',
    'controle': 'Contrôle',
    'accepte': 'Accepté',
    'refuse': 'Refusé',
    'rembourse': 'Remboursé',
    'echange': 'Échangé',
    'annule': 'Annulé'
  };
  return statuts[statut] || statut;
};

const getStatutColor = (statut) => {
  const colors = {
    'en_attente': '#f59e0b',
    'recu': '#3b82f6',
    'controle': '#f59e0b',
    'accepte': '#10b981',
    'refuse': '#ef4444',
    'rembourse': '#3b82f6',
    'echange': '#8b5cf6',
    'annule': '#ef4444'
  };
  return colors[statut] || '#64748b';
};

// ============================================================
// COMPOSANT PDF
// ============================================================
const RetourClientPDF = ({ data }) => {
  if (!data) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Aucune donnée disponible</Text>
        </Page>
      </Document>
    );
  }

  const lignes = data.lignes || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* ============================================================ */}
        {/* HEADER                                                       */}
        {/* ============================================================ */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>GESTION DE STOCK</Text>
            <Text style={styles.companyInfo}>Système de gestion commerciale</Text>
            <Text style={styles.companyInfo}>Abidjan, Côte d'Ivoire</Text>
            <Text style={styles.companyInfo}>Tél: +225 XX XX XX XX XX</Text>
          </View>
          
          <View style={styles.headerRight}>
            <Text style={styles.documentTitle}>BON DE RETOUR</Text>
            <Text style={styles.documentNumber}>{data.numero_retour}</Text>
            <Text style={styles.documentDate}>Date: {formatDate(data.date_retour)}</Text>
            
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatutColor(data.statut) }
            ]}>
              <Text style={styles.statusText}>{getStatutLabel(data.statut)}</Text>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* CLIENT                                                       */}
        {/* ============================================================ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMATIONS CLIENT</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nom :</Text>
            <Text style={styles.infoValue}>{data.nomclient || '-'}</Text>
          </View>
          
          {data.telephone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone :</Text>
              <Text style={styles.infoValue}>{data.telephone}</Text>
            </View>
          )}
          
          {data.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email :</Text>
              <Text style={styles.infoValue}>{data.email}</Text>
            </View>
          )}
          
          {data.adresse && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Adresse :</Text>
              <Text style={styles.infoValue}>{data.adresse}</Text>
            </View>
          )}
        </View>

        {/* ============================================================ */}
        {/* COMMANDE & FACTURE                                           */}
        {/* ============================================================ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RÉFÉRENCES</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Commande :</Text>
            <Text style={styles.infoValue}>{data.numero_commande || 'Sans commande'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Facture :</Text>
            <Text style={styles.infoValue}>{data.numero_facture || 'Sans facture'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Motif global :</Text>
            <Text style={styles.infoValue}>{getMotifLabel(data.motif_retour)}</Text>
          </View>
        </View>

        {/* ============================================================ */}
        {/* TABLEAU PRODUITS                                             */}
        {/* ============================================================ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRODUITS RETOURNÉS ({lignes.length})</Text>
          
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colProduit]}>Produit</Text>
              <Text style={[styles.tableHeaderCell, styles.colQte]}>Qté</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrix]}>Prix unitaire</Text>
              <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
              <Text style={[styles.tableHeaderCell, styles.colMotif]}>Motif</Text>
              <Text style={[styles.tableHeaderCell, styles.colEtat]}>État</Text>
            </View>
            
            {/* Lignes */}
            {lignes.map((ligne, index) => {
              const isLast = index === lignes.length - 1;
              const montantLigne = ligne.montant_total || (ligne.quantite * ligne.prix_vente);
              
              return (
                <View 
                  key={index} 
                  style={[styles.tableRow, isLast && styles.tableRowLast]}
                >
                  <View style={styles.colProduit}>
                    <Text style={styles.tableCell}>{ligne.produit_nom || '-'}</Text>
                    {ligne.marque_nom && (
                      <Text style={[styles.tableCell, { fontSize: 8, color: '#64748b' }]}>
                        {ligne.marque_nom}
                      </Text>
                    )}
                  </View>
                  
                  <Text style={[styles.tableCell, styles.colQte]}>
                    {ligne.quantite} {ligne.unite_symbole || ''}
                  </Text>
                  
                  <Text style={[styles.tableCell, styles.colPrix]}>
                    {formatMontant(ligne.prix_vente)}
                  </Text>
                  
                  <Text style={[styles.tableCell, styles.colTotal, { fontWeight: 'bold' }]}>
                    {formatMontant(montantLigne)}
                  </Text>
                  
                  <View style={styles.colMotif}>
                    <Text style={[
                      styles.motifBadge,
                      { 
                        backgroundColor: getMotifColor(ligne.motif_retour) + '20',
                        color: getMotifColor(ligne.motif_retour)
                      }
                    ]}>
                      {getMotifLabel(ligne.motif_retour)}
                    </Text>
                  </View>
                  
                  <Text style={[styles.tableCell, styles.colEtat, { textTransform: 'capitalize' }]}>
                    {ligne.etat_produit || 'Neuf'}
                  </Text>
                </View>
              );
            })}
          </View>
          
          {/* Total */}
          <View style={styles.totalSection}>
            <View style={styles.totalBox}>
              <View style={styles.totalFinal}>
                <Text style={styles.totalFinalLabel}>MONTANT TOTAL</Text>
                <Text style={styles.totalFinalValue}>
                  {formatMontant(data.montant_total)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* NOTES                                                        */}
        {/* ============================================================ */}
        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>NOTES</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* ============================================================ */}
        {/* FOOTER                                                       */}
        {/* ============================================================ */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
          </Text>
          <Text style={styles.footerText}>
            {data.utilisateur_nom ? `Créé par: ${data.utilisateur_nom}` : 'Système de gestion de stock'}
          </Text>
          <Text style={styles.footerText}>
            Bon de retour N° {data.numero_retour}
          </Text>
        </View>

      </Page>
    </Document>
  );
};

export default RetourClientPDF;