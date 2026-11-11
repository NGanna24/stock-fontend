// components/UI/PhotoProfil.jsx
// Photo de profil avec « Changer » / « Retirer » (patron, employé, fiche employé).
import React, { useRef, useState } from 'react';
import axios from 'axios';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import Avatar, { preparerPhoto } from './Avatar';
import '../../pages/Ventes/Ventes.css';
import './Avatar.css';

/**
 * url      : adresse d'envoi (POST pour envoyer, DELETE pour retirer)
 * onChange : reçoit la nouvelle adresse de la photo (ou null)
 * onMessage: (texte, 'success' | 'error')
 */
export default function PhotoProfil({ nom, photo, url, onChange, onMessage, taille = 84 }) {
  const champ = useRef(null);
  const [envoi, setEnvoi] = useState(null); // 'envoi' | 'retrait'
  const entete = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const choisir = async (e) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    setEnvoi('envoi');
    try {
      const prete = await preparerPhoto(fichier);
      const fd = new FormData();
      fd.append('photo', prete);
      const r = await axios.post(url, fd, { headers: entete() });
      onChange?.(r.data.photo_url);
      onMessage?.('Photo enregistrée', 'success');
    } catch (err) {
      onMessage?.(err?.response?.data?.message || err.message || "Impossible d'enregistrer la photo", 'error');
    } finally { setEnvoi(null); }
  };

  const retirer = async () => {
    setEnvoi('retrait');
    try {
      await axios.delete(url, { headers: entete() });
      onChange?.(null);
      onMessage?.('Photo retirée', 'success');
    } catch (err) {
      onMessage?.(err?.response?.data?.message || 'Impossible de retirer la photo', 'error');
    } finally { setEnvoi(null); }
  };

  return (
    <div className="vt vt-photo">
      <button type="button" className="vt-photo-cadre" onClick={() => champ.current?.click()} disabled={!!envoi}
        aria-label={photo ? 'Changer la photo' : 'Ajouter une photo'}>
        <Avatar nom={nom} photo={photo} taille={taille} />
        <span className="vt-photo-badge">{envoi === 'envoi' ? <Loader2 size={14} className="vt-spin" /> : <Camera size={14} />}</span>
      </button>
      <div className="vt-photo-actions">
        <button type="button" className="vt-btn vt-btn--sm" onClick={() => champ.current?.click()} disabled={!!envoi}>
          <Camera size={14} /> {photo ? 'Changer la photo' : 'Ajouter une photo'}
        </button>
        {photo && (
          <button type="button" className="vt-btn vt-btn--sm vt-btn--danger-ghost" onClick={retirer} disabled={!!envoi}>
            {envoi === 'retrait' ? <Loader2 size={14} className="vt-spin" /> : <Trash2 size={14} />} Retirer
          </button>
        )}
      </div>
      <input ref={champ} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choisir} />
    </div>
  );
}
