// components/Emplacement/ChoixEmplacement.jsx
// ============================================================
// Trois listes qui s'enchaînent : emplacement, puis rayon, puis étagère.
// « + Ajouter » dans une liste permet d'en créer un sans quitter la fiche.
// onChange(id, noms) : id du niveau le plus précis choisi (ou null),
// noms = { emplacement, rayon, etagere } pour l'affichage.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { NIVEAUX, listerEmplacements, creerEmplacement, enfantsDe, cheminDe } from '../../config/emplacements';
import './ChoixEmplacement.css';

const AJOUT = '__ajout__';

// idEntrepot : listes de cet entrepôt (vide = boutique)
export default function ChoixEmplacement({ value, onChange, idEntrepot = null, disabled = false, peutAjouter = true, classeChamp = 'pr-input', classeLabel = 'pr-lbl', classeChampBloc = 'pr-field' }) {
  const [liste, setListe] = useState([]);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [ajout, setAjout] = useState(null); // { niveau, nom, envoi }

  useEffect(() => {
    let vivant = true;
    listerEmplacements(idEntrepot)
      .then((l) => vivant && setListe(l))
      .catch(() => vivant && setErreur('Liste des emplacements indisponible'))
      .finally(() => vivant && setCharge(true));
    return () => { vivant = false; };
  }, [idEntrepot]);

  const chemin = useMemo(() => cheminDe(liste, value), [liste, value]);
  const nomDe = (id) => liste.find((e) => e.id_emplacement === id)?.nom || '';

  const choisir = (l, ids) => {
    const id = ids.etagere || ids.rayon || ids.emplacement || null;
    const n = (x) => l.find((e) => e.id_emplacement === x)?.nom || '';
    onChange(id, { emplacement: n(ids.emplacement), rayon: n(ids.rayon), etagere: n(ids.etagere) });
  };

  const parentDe = (niveau) => (niveau === 'rayon' ? chemin.emplacement : niveau === 'etagere' ? chemin.rayon : null);

  const changer = (niveau, v) => {
    setErreur(null);
    if (v === AJOUT) { setAjout({ niveau, nom: '', envoi: false }); return; }
    const id = v ? Number(v) : '';
    if (niveau === 'emplacement') choisir(liste, { emplacement: id, rayon: '', etagere: '' });
    if (niveau === 'rayon') choisir(liste, { emplacement: chemin.emplacement, rayon: id, etagere: '' });
    if (niveau === 'etagere') choisir(liste, { ...chemin, etagere: id });
  };

  const validerAjout = async () => {
    if (!ajout?.nom.trim()) return;
    setAjout((a) => ({ ...a, envoi: true }));
    try {
      const e = await creerEmplacement({ niveau: ajout.niveau, nom: ajout.nom.trim(), id_parent: parentDe(ajout.niveau), id_entrepot: idEntrepot });
      const l = [...liste, e];
      setListe(l);
      setAjout(null);
      if (ajout.niveau === 'emplacement') choisir(l, { emplacement: e.id_emplacement, rayon: '', etagere: '' });
      if (ajout.niveau === 'rayon') choisir(l, { emplacement: chemin.emplacement, rayon: e.id_emplacement, etagere: '' });
      if (ajout.niveau === 'etagere') choisir(l, { ...chemin, etagere: e.id_emplacement });
    } catch (err) {
      setErreur(err.message);
      setAjout((a) => (a ? { ...a, envoi: false } : a));
    }
  };

  return (
    <div className="ce">
      <div className="ce-grille">
        {NIVEAUX.map((niv) => {
          const parent = parentDe(niv.cle);
          const bloque = niv.cle !== 'emplacement' && !parent;
          const options = enfantsDe(liste, niv.cle === 'emplacement' ? null : parent, niv.cle);
          const idChamp = `ce-${niv.cle}`;
          const enAjout = ajout?.niveau === niv.cle;
          const libelle = niv.cle === 'etagere' ? 'Étagère' : niv.cle === 'rayon' ? 'Rayon' : 'Emplacement';
          return (
            <div className={`${classeChampBloc} ce-champ`} key={niv.cle}>
              <label className={classeLabel} htmlFor={idChamp}>{libelle}</label>
              {enAjout ? (
                <div className="ce-ajout">
                  <input id={idChamp} className={classeChamp} autoFocus maxLength={100} value={ajout.nom}
                         placeholder={idEntrepot ? niv.exempleEntrepot : niv.exemple} disabled={ajout.envoi}
                         onChange={(e) => setAjout({ ...ajout, nom: e.target.value })}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter') { e.preventDefault(); validerAjout(); }
                           if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setAjout(null); }
                         }} />
                  <button type="button" className="ce-btn" onClick={validerAjout} disabled={ajout.envoi || !ajout.nom.trim()}
                          aria-label={`Ajouter ${niv.un}`} title="Ajouter"><Check size={16} /></button>
                  <button type="button" className="ce-btn" onClick={() => setAjout(null)} disabled={ajout.envoi}
                          aria-label="Annuler" title="Annuler"><X size={16} /></button>
                </div>
              ) : (
                <select id={idChamp} className={classeChamp} value={chemin[niv.cle] || ''}
                        disabled={disabled || !charge || bloque}
                        onChange={(e) => changer(niv.cle, e.target.value)}>
                  <option value="">
                    {bloque
                      ? (niv.cle === 'rayon' ? "Choisissez d'abord l'emplacement" : "Choisissez d'abord le rayon")
                      : options.length ? 'Aucun' : `Aucun${niv.cle === 'etagere' ? 'e' : ''} ${niv.un} enregistré${niv.cle === 'etagere' ? 'e' : ''}`}
                  </option>
                  {options.map((o, i) => <option key={o.id_emplacement} value={o.id_emplacement}>{i + 1}. {o.nom}</option>)}
                  {peutAjouter && !bloque && <option value={AJOUT}>+ {niv.nouveau}…</option>}
                </select>
              )}
            </div>
          );
        })}
      </div>
      {erreur && <p className="ce-erreur" role="alert">{erreur}</p>}
      {charge && value && !chemin.emplacement && nomDe(Number(value)) === '' && (
        <p className="ce-aide">L'emplacement de ce produit n'existe plus. Choisissez-en un autre.</p>
      )}
    </div>
  );
}
