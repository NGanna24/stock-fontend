// components/Clients/ModalClient.jsx
//
// Créer ou modifier une fiche client (utilisé par la page Clients, la fiche et la page Vente).
// À placer à l'intérieur d'un conteneur « .vt » (styles de la page Ventes).
// Le plafond de crédit n'est modifiable que par l'admin et le manager.
import React, { useEffect, useRef, useState } from 'react';
import { X, Loader, AlertTriangle, User, Store, Building2 } from 'lucide-react';
import ClientService from '../../services/clientService';
import './ModalClient.css';

export const TYPES_CLIENT = [
  { value: 'particulier', label: 'Particulier', Icon: User },
  { value: 'revendeur', label: 'Revendeur', Icon: Store },
  { value: 'entreprise', label: 'Entreprise', Icon: Building2 },
];

const DECIMAL_RE = /^\d*[.,]?\d*$/;

let lockDepth = 0;
const lockScroll = () => { if (lockDepth++ === 0) document.body.style.overflow = 'hidden'; };
const unlockScroll = () => { lockDepth = Math.max(0, lockDepth - 1); if (lockDepth === 0) document.body.style.overflow = ''; };

/**
 * props : token, client (null = création), valeurs (pré-remplissage : { nom, telephone }),
 *         peutFixerPlafond, onClose, onSaved(client), onVoirExistant(id_client)
 */
export default function ModalClient({ token, client = null, valeurs = {}, peutFixerPlafond = false, onClose, onSaved, onVoirExistant }) {
  const edition = !!client;
  const [form, setForm] = useState(() => ({
    nom: client?.nom || valeurs.nom || '',
    type_client: client?.type_client || 'particulier',
    telephone: client?.telephone || valeurs.telephone || '',
    telephone2: client?.telephone2 || '',
    quartier: client?.quartier || '',
    ville: client?.ville || '',
    adresse: client?.adresse || '',
    email: client?.email || '',
    plafond_credit: client?.plafond_credit != null ? String(Math.round(client.plafond_credit)) : '',
    note: client?.note || '',
  }));
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [existant, setExistant] = useState(null);
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    lockScroll();
    ref.current?.querySelector('#mc-nom')?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) onCloseRef.current?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const enregistrer = async (e) => {
    e?.preventDefault();
    if (saving) return;
    if (!form.nom.trim()) { setErreur('Le nom du client est obligatoire.'); return; }
    setSaving(true);
    setErreur(null);
    setExistant(null);
    const data = {
      nom: form.nom.trim(),
      type_client: form.type_client,
      telephone: form.telephone.trim() || null,
      telephone2: form.telephone2.trim() || null,
      quartier: form.quartier.trim() || null,
      ville: form.ville.trim() || null,
      adresse: form.adresse.trim() || null,
      email: form.email.trim() || null,
      note: form.note.trim() || null,
    };
    if (peutFixerPlafond) {
      data.plafond_credit = form.plafond_credit === '' ? null : parseFloat(String(form.plafond_credit).replace(',', '.'));
    }
    try {
      const res = edition ? await ClientService.update(token, client.id_client, data) : await ClientService.create(token, data);
      onSaved(res.data);
    } catch (err) {
      setErreur(err.message || "La fiche n'a pas pu être enregistrée");
      if (err.id_client_existant) setExistant(err.id_client_existant);
      setSaving(false);
    }
  };

  return (
    <div className="vt-overlay" onMouseDown={(e) => { if (!saving && e.target === e.currentTarget) onClose(); }}>
      <form ref={ref} className="vt-modal vt-modal--md mc" role="dialog" aria-modal="true" aria-labelledby="mc-title"
            onSubmit={enregistrer} noValidate>
        {saving && <div className="vt-busybar" />}
        <div className="vt-modal-head">
          <div className="vt-modal-titles">
            <h2 id="mc-title" className="vt-modal-title">{edition ? `Modifier ${client.nom}` : 'Nouveau client'}</h2>
            <p className="vt-modal-sub">{edition ? `Fiche client${client.code_client ? ` ${client.code_client}` : ''}` : 'Un numéro client (CL-…) lui sera attribué automatiquement'}</p>
          </div>
          <button type="button" className="vt-iconbtn" onClick={() => !saving && onClose()} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="vt-modal-body">
          {erreur && (
            <div className="vt-error" role="alert">
              <AlertTriangle size={16} /><span>{erreur}</span>
              {existant && onVoirExistant && (
                <button type="button" className="vt-btn vt-btn--sm" onClick={() => onVoirExistant(existant)}>Voir ce client</button>
              )}
            </div>
          )}

          <div className="vt-field">
            <label htmlFor="mc-nom">Nom du client *</label>
            <input id="mc-nom" className="vt-input" maxLength={200} value={form.nom} onChange={set('nom')}
                   placeholder="Koné Awa, Quincaillerie Bamba…" autoComplete="off" />
          </div>

          <div className="vt-field mc-gap">
            <span className="vt-field-label" id="mc-type-label">Type de client</span>
            <div className="vt-modes mc-types" role="radiogroup" aria-labelledby="mc-type-label">
              {TYPES_CLIENT.map(({ value, label, Icon }) => (
                <button key={value} type="button" role="radio" aria-checked={form.type_client === value}
                        className={`vt-mode ${form.type_client === value ? 'is-active' : ''}`}
                        onClick={() => setForm((f) => ({ ...f, type_client: value }))}>
                  <Icon size={17} /><span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="vt-grid-2 mc-gap">
            <div className="vt-field">
              <label htmlFor="mc-tel">Téléphone</label>
              <input id="mc-tel" className="vt-input" inputMode="tel" maxLength={20} value={form.telephone} onChange={set('telephone')} placeholder="07 07 08 09 10" />
            </div>
            <div className="vt-field">
              <label htmlFor="mc-tel2">2e téléphone <span className="vt-muted">(facultatif)</span></label>
              <input id="mc-tel2" className="vt-input" inputMode="tel" maxLength={30} value={form.telephone2} onChange={set('telephone2')} />
            </div>
          </div>

          <div className="vt-grid-2 mc-gap">
            <div className="vt-field">
              <label htmlFor="mc-quartier">Quartier</label>
              <input id="mc-quartier" className="vt-input" maxLength={100} value={form.quartier} onChange={set('quartier')} placeholder="Adjamé, Yopougon…" />
            </div>
            <div className="vt-field">
              <label htmlFor="mc-ville">Ville</label>
              <input id="mc-ville" className="vt-input" maxLength={100} value={form.ville} onChange={set('ville')} placeholder="Abidjan" />
            </div>
          </div>

          <div className="vt-grid-2 mc-gap">
            <div className="vt-field">
              <label htmlFor="mc-adresse">Adresse / repère</label>
              <input id="mc-adresse" className="vt-input" maxLength={500} value={form.adresse} onChange={set('adresse')} placeholder="Près de la pharmacie…" />
            </div>
            <div className="vt-field">
              <label htmlFor="mc-email">E-mail</label>
              <input id="mc-email" className="vt-input" type="email" maxLength={100} value={form.email} onChange={set('email')} />
            </div>
          </div>

          <div className="vt-field mc-gap">
            <label htmlFor="mc-plafond">Plafond de crédit (FCFA)</label>
            <input id="mc-plafond" className="vt-input vt-num" inputMode="decimal" value={form.plafond_credit}
                   onChange={(e) => DECIMAL_RE.test(e.target.value) && setForm((f) => ({ ...f, plafond_credit: e.target.value }))}
                   placeholder="Aucun plafond" disabled={!peutFixerPlafond} />
            <p className="vt-hint">
              {peutFixerPlafond
                ? 'Montant maximum que le client peut devoir. Au-delà, un avertissement s\'affiche à la vente. Laissez vide pour ne pas limiter.'
                : 'Seuls l\'administrateur et le manager peuvent fixer le plafond.'}
            </p>
          </div>

          <div className="vt-field mc-gap">
            <label htmlFor="mc-note">Note</label>
            <textarea id="mc-note" className="vt-input mc-note" rows={2} maxLength={2000} value={form.note} onChange={set('note')}
                      placeholder="Préférences, conditions de paiement…" />
          </div>
        </div>

        <div className="vt-modal-foot vt-modal-foot--end">
          <button type="button" className="vt-btn" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="submit" className="vt-btn vt-btn--primary" disabled={saving}>
            {saving && <Loader size={16} className="vt-spin" />} {edition ? 'Enregistrer' : 'Créer le client'}
          </button>
        </div>
      </form> 
    </div>
  );
}
