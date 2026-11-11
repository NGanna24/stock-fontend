// components/Parametres/CachetsSignature.jsx
// ============================================================
// Paramètres > Cachets et signature (patron).
//  1. Les cachets du magasin (PNG) : Payé, Non payé, Livré, Cachet général…
//  2. La signature (PNG), facultative
//  3. Quel cachet sur quel document (factures : selon le paiement)
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2, Upload, Check, X, Loader, ImageOff } from 'lucide-react';
import API_URL from '../../config/api';
import { TYPES_DOCUMENTS, chargerReglagesDocuments, definirReglagesDocuments, useReglagesDocuments } from '../../config/documents';
import './CachetsSignature.css';

const entetes = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const message = (e, d) => e?.response?.data?.message || d;
const PAIEMENTS = [
  { cle: 'payee', label: 'Payée' },
  { cle: 'partielle', label: 'Payée en partie' },
  { cle: 'non_payee', label: 'Non payée' },
];

function ChoixFichier({ onFichier, disabled, libelle = 'Choisir une image', id }) {
  const ref = useRef(null);
  return (
    <>
      <input ref={ref} id={id} type="file" accept="image/png,image/webp,image/jpeg" hidden disabled={disabled}
             onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFichier(f); }} />
      <button type="button" className="vt-btn vt-btn--sm" onClick={() => ref.current?.click()} disabled={disabled}>
        <Upload size={14} /> {libelle}
      </button>
    </>
  );
}

export default function CachetsSignature({ afficher }) {
  const reglages = useReglagesDocuments();
  const [regles, setRegles] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [nom, setNom] = useState('');
  const [fichier, setFichier] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [edition, setEdition] = useState(null); // { id, nom }

  useEffect(() => { chargerReglagesDocuments(true).then((r) => setRegles(r.regles || {})); }, []);
  useEffect(() => {
    if (!fichier) { setApercu(null); return undefined; }
    const u = URL.createObjectURL(fichier);
    setApercu(u);
    return () => URL.revokeObjectURL(u);
  }, [fichier]);

  const appliquer = (data, texte) => {
    definirReglagesDocuments({ cachets: data.cachets, signature: data.signature, regles: data.regles, modele_facture: data.modele_facture });
    afficher(texte || data.message || 'Enregistré', 'success');
  };

  const envoyerImage = async (url, champs, methode = 'post') => {
    const fd = new FormData();
    Object.entries(champs).forEach(([k, v]) => v != null && fd.append(k, v));
    const r = await axios[methode](url, fd, entetes());
    return r.data;
  };

  const ajouter = async (e) => {
    e.preventDefault();
    if (!nom.trim() || !fichier) { afficher('Donnez un nom et choisissez l\'image du cachet', 'error'); return; }
    setOccupe(true);
    try {
      const d = await envoyerImage(API_URL.DOCUMENTS_REGLAGES.CACHETS, { nom: nom.trim(), image: fichier });
      appliquer(d, `Cachet « ${nom.trim()} » ajouté`);
      setNom(''); setFichier(null);
    } catch (err) { afficher(message(err, "Impossible d'ajouter le cachet"), 'error'); }
    finally { setOccupe(false); }
  };

  const remplacerImage = async (c, f) => {
    setOccupe(true);
    try { appliquer(await envoyerImage(API_URL.DOCUMENTS_REGLAGES.CACHET(c.id_cachet), { image: f }, 'put'), 'Image du cachet remplacée'); }
    catch (err) { afficher(message(err, "Impossible de remplacer l'image"), 'error'); }
    finally { setOccupe(false); }
  };

  const renommer = async () => {
    if (!edition?.nom.trim()) return;
    setOccupe(true);
    try {
      const r = await axios.put(API_URL.DOCUMENTS_REGLAGES.CACHET(edition.id), { nom: edition.nom.trim() }, entetes());
      appliquer(r.data, 'Cachet renommé');
      setEdition(null);
    } catch (err) { afficher(message(err, 'Impossible de renommer'), 'error'); }
    finally { setOccupe(false); }
  };

  const supprimer = async (c) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Supprimer le cachet « ${c.nom} » ? Les documents qui l'utilisaient n'auront plus de cachet.`)) return;
    setOccupe(true);
    try {
      const r = await axios.delete(API_URL.DOCUMENTS_REGLAGES.CACHET(c.id_cachet), entetes());
      appliquer(r.data, 'Cachet supprimé');
      setRegles(r.data.regles);
    } catch (err) { afficher(message(err, 'Impossible de supprimer'), 'error'); }
    finally { setOccupe(false); }
  };

  const signature = async (f) => {
    setOccupe(true);
    try {
      if (f) appliquer(await envoyerImage(API_URL.DOCUMENTS_REGLAGES.SIGNATURE, { image: f }), 'Signature enregistrée');
      else appliquer((await axios.delete(API_URL.DOCUMENTS_REGLAGES.SIGNATURE, entetes())).data, 'Signature retirée');
    } catch (err) { afficher(message(err, 'Impossible de modifier la signature'), 'error'); }
    finally { setOccupe(false); }
  };

  const changerRegle = (type, champ, valeur) => setRegles((r) => ({ ...r, [type]: { ...(r?.[type] || {}), [champ]: valeur } }));

  const enregistrerRegles = async () => {
    setOccupe(true);
    try {
      const r = await axios.put(API_URL.DOCUMENTS_REGLAGES.TOUT, { regles }, entetes());
      appliquer(r.data, 'Réglages des documents enregistrés');
      setRegles(r.data.regles);
    } catch (err) { afficher(message(err, "Impossible d'enregistrer"), 'error'); }
    finally { setOccupe(false); }
  };

  const { cachets } = reglages;
  const choixCachet = (type, champ) => (
    <select className="vt-input cs-select" value={regles?.[type]?.[champ] || ''} disabled={occupe || !regles}
            onChange={(e) => changerRegle(type, champ, e.target.value ? Number(e.target.value) : null)}
            aria-label={`Cachet : ${TYPES_DOCUMENTS.find((t) => t.cle === type)?.label} ${champ !== 'cachet' ? `(${PAIEMENTS.find((p) => p.cle === champ)?.label})` : ''}`}>
      <option value="">Aucun cachet</option>
      {cachets.map((c, i) => <option key={c.id_cachet} value={c.id_cachet}>{i + 1}. {c.nom}</option>)}
    </select>
  );

  return (
    <div className="cs">
      {/* 1. Cachets */}
      <h3 className="cs-titre">1. Les cachets du magasin</h3>
      <p className="pr-ligne-aide">Image PNG à fond transparent de préférence (1 Mo maximum). Exemples : Payé, Non payé, Payé non livré, Livré, Cachet général du magasin.</p>
      {cachets.length > 0 ? (
        <ol className="cs-liste">
          {cachets.map((c, i) => (
            <li key={c.id_cachet} className="cs-cachet">
              <span className="cs-num">{i + 1}</span>
              <span className="cs-image">{c.image ? <img src={c.image} alt={`Cachet ${c.nom}`} /> : <ImageOff size={20} />}</span>
              {edition?.id === c.id_cachet ? (
                <form className="cs-edit" onSubmit={(e) => { e.preventDefault(); renommer(); }}>
                  <input className="vt-input" value={edition.nom} maxLength={80} autoFocus aria-label="Nouveau nom du cachet"
                         onChange={(e) => setEdition({ ...edition, nom: e.target.value })} onKeyDown={(e) => e.key === 'Escape' && setEdition(null)} />
                  <button type="submit" className="vt-iconbtn vt-iconbtn--sm" aria-label="Valider" disabled={occupe}><Check size={15} /></button>
                  <button type="button" className="vt-iconbtn vt-iconbtn--sm" aria-label="Annuler" onClick={() => setEdition(null)}><X size={15} /></button>
                </form>
              ) : (
                <span className="cs-nom">{c.nom}</span>
              )}
              <span className="cs-actions">
                <button type="button" className="vt-iconbtn vt-iconbtn--sm" title="Renommer" aria-label={`Renommer ${c.nom}`}
                        onClick={() => setEdition({ id: c.id_cachet, nom: c.nom })} disabled={occupe}><Pencil size={14} /></button>
                <ChoixFichier id={`cs-rempl-${c.id_cachet}`} libelle="Remplacer" onFichier={(f) => remplacerImage(c, f)} disabled={occupe} />
                <button type="button" className="vt-iconbtn vt-iconbtn--sm" title="Supprimer" aria-label={`Supprimer ${c.nom}`}
                        onClick={() => supprimer(c)} disabled={occupe}><Trash2 size={14} /></button>
              </span>
            </li>
          ))}
        </ol>
      ) : <p className="cs-vide">Aucun cachet pour le moment.</p>}

      <form className="cs-ajout" onSubmit={ajouter}>
        <div className="vt-field">
          <label htmlFor="cs-nom">Nom du cachet</label>
          <input id="cs-nom" className="vt-input" value={nom} maxLength={80} placeholder="Ex : Payé" onChange={(e) => setNom(e.target.value)} disabled={occupe} />
        </div>
        <div className="vt-field">
          <span className="vt-field-label">Image</span>
          <div className="cs-fichier">
            {apercu && <img src={apercu} alt="Aperçu du cachet" />}
            <ChoixFichier id="cs-image" libelle={fichier ? 'Changer' : 'Choisir une image'} onFichier={setFichier} disabled={occupe} />
            {fichier && <span className="vt-muted cs-fichier-nom">{fichier.name}</span>}
          </div>
        </div>
        <button type="submit" className="vt-btn vt-btn--primary" disabled={occupe || !nom.trim() || !fichier}>
          {occupe ? <Loader size={15} className="vt-spin" /> : <Plus size={15} />} Ajouter le cachet
        </button>
      </form>

      {/* 2. Signature */}
      <h3 className="cs-titre">2. La signature (facultatif)</h3>
      <div className="cs-signature">
        <span className="cs-image cs-image--large">{reglages.signature ? <img src={reglages.signature} alt="Signature" /> : <span className="vt-muted">Aucune signature</span>}</span>
        <ChoixFichier id="cs-sign" libelle={reglages.signature ? 'Remplacer' : 'Ajouter une signature'} onFichier={signature} disabled={occupe} />
        {reglages.signature && <button type="button" className="vt-btn vt-btn--sm" onClick={() => signature(null)} disabled={occupe}><Trash2 size={14} /> Retirer</button>}
      </div>

      {/* 3. Règles */}
      <h3 className="cs-titre">3. Quel cachet sur quel document</h3>
      <p className="pr-ligne-aide">Au moment d'imprimer, vous pourrez encore choisir un autre cachet pour un document précis.</p>
      <div className="vt-table-wrap">
        <table className="vt-table cs-table">
          <thead><tr><th>Document</th><th>Cachet</th><th>Signature</th></tr></thead>
          <tbody>
            {TYPES_DOCUMENTS.map((t) => (
              <tr key={t.cle}>
                <td className="vt-cell-main">{t.label}</td>
                <td>
                  {t.selonPaiement ? (
                    <div className="cs-paiements">
                      {PAIEMENTS.map((p) => (
                        <label key={p.cle} className="cs-paiement"><span>{p.label}</span>{choixCachet(t.cle, p.cle)}</label>
                      ))}
                    </div>
                  ) : choixCachet(t.cle, 'cachet')}
                </td>
                <td>
                  <label className="cs-case">
                    <input type="checkbox" checked={!!regles?.[t.cle]?.signature} disabled={occupe || !regles || !reglages.signature}
                           onChange={(e) => changerRegle(t.cle, 'signature', e.target.checked)} />
                    <span>{reglages.signature ? 'Afficher' : 'Ajoutez une signature'}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pr-actions">
        <button type="button" className="vt-btn vt-btn--primary" onClick={enregistrerRegles} disabled={occupe || !regles}>
          {occupe ? 'Enregistrement…' : 'Enregistrer les réglages des documents'}
        </button>
      </div>
    </div>
  );
}
