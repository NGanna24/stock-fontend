// components/Documents/CachetSignature.jsx
// Cachet et signature posés dans la zone de signature d'un document PDF (react-pdf).
// Rien n'est affiché si le magasin n'a rien réglé pour ce type de document.
import React from 'react';
import { View, Image, StyleSheet } from '@react-pdf/renderer';
import { cachetPour } from '../../config/documents';

const s = StyleSheet.create({
  zone: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cachet: { width: 86, height: 86, objectFit: 'contain' },
  signature: { width: 110, height: 46, objectFit: 'contain', marginLeft: 4 },
  // Version réduite (ticket 80 mm)
  cachetPetit: { width: 62, height: 62, objectFit: 'contain' },
  signaturePetit: { width: 80, height: 34, objectFit: 'contain', marginLeft: 3 },
});

export default function CachetSignature({ type, paiement, petit = false, style }) {
  const { cachet, signature } = cachetPour(type, { paiement });
  if (!cachet && !signature) return null;
  return (
    <View style={[s.zone, style]}>
      {cachet && <Image src={cachet.image} style={petit ? s.cachetPetit : s.cachet} />}
      {signature && <Image src={signature} style={petit ? s.signaturePetit : s.signature} />}
    </View>
  );
}
