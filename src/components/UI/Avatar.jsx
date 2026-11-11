// components/UI/Avatar.jsx
// Photo de profil ronde, ou initiales si pas de photo (ou si elle ne charge pas).
import React, { useEffect, useState } from 'react';
import { urlFichier } from '../../config/api';
import './Avatar.css';

export const initiales = (nom) =>
  String(nom || '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').substring(0, 2).toUpperCase() || 'U';

export default function Avatar({ nom, photo, taille = 36, className = '', carre = false }) {
  const src = urlFichier(photo);
  const [echec, setEchec] = useState(false);
  useEffect(() => setEchec(false), [src]);
  const style = { width: taille, height: taille, fontSize: Math.max(11, Math.round(taille * 0.38)) };
  return (
    <span className={`vt-avatar ${carre ? 'vt-avatar--carre' : ''} ${className}`} style={style} aria-hidden="true">
      {src && !echec ? <img src={src} alt="" onError={() => setEchec(true)} /> : initiales(nom)}
    </span>
  );
}

/**
 * Réduit une photo choisie (carré centré, 512 px, JPEG) avant l'envoi :
 * plus rapide à envoyer et à afficher, même avec une connexion faible.
 */
export function preparerPhoto(fichier, cote = 512) {
  return new Promise((resolve, reject) => {
    if (!fichier || !/^image\/(jpeg|png|webp)$/.test(fichier.type)) {
      reject(new Error('Choisissez une photo JPG, PNG ou WEBP'));
      return;
    }
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      const c = Math.min(img.width, img.height);
      const sortie = Math.min(cote, c);
      const canvas = document.createElement('canvas');
      canvas.width = sortie; canvas.height = sortie;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sortie, sortie);
      ctx.drawImage(img, (img.width - c) / 2, (img.height - c) / 2, c, c, 0, 0, sortie, sortie);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' })) : reject(new Error('Photo illisible'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Photo illisible')); };
    img.src = url;
  });
}
