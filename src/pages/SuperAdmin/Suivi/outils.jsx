// pages/SuperAdmin/Suivi/outils.jsx
// Petits éléments communs aux pages de suivi de la console Super Admin.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import './Suivi.css';

export const fcfa = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
export const nombre = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ');

/** « 2026-11-13 09:18:52 » → Date locale (sans décalage de fuseau) */
const versDate = (s) => {
  if (!s) return null;
  const [d, h = '00:00:00'] = String(s).split(/[ T]/);
  const [a, m, j] = d.split('-').map(Number);
  const [hh, mm, ss] = h.split(':').map(Number);
  return new Date(a, (m || 1) - 1, j || 1, hh || 0, mm || 0, ss || 0);
};
export const dateCourte = (s) => {
  const d = versDate(s);
  return d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
};
export const dateHeure = (s) => {
  const d = versDate(s);
  return d ? `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : '-';
};
export const heure = (s) => {
  const d = versDate(s);
  return d ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
};
/** « Aujourd'hui », « Hier », « lundi 10 novembre » */
export const jourLisible = (s) => {
  const d = versDate(s);
  if (!d) return '';
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  const jour = new Date(d); jour.setHours(0, 0, 0, 0);
  const ecart = Math.round((auj - jour) / 86400000);
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};
/** « il y a 3 jours », « dans 2 jours » */
export const relatif = (jours) => {
  const n = Math.abs(Number(jours) || 0);
  if (Number(jours) === 0) return "aujourd'hui";
  const txt = `${n} jour${n > 1 ? 's' : ''}`;
  return Number(jours) > 0 ? `dans ${txt}` : `il y a ${txt}`;
};
export const pluriel = (n, mot, motPluriel) => `${nombre(n)} ${Number(n) > 1 ? (motPluriel || `${mot}s`) : mot}`;

/** Charge des données, avec rechargement et erreur lisible */
export function useChargement(charger, deps = []) {
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const ref = useRef(charger);
  ref.current = charger;
  const recharger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const r = await ref.current();
      if (r && r.success === false) throw new Error(r.message || 'Chargement impossible');
      setDonnees(r);
    } catch (e) {
      setErreur(e?.response?.data?.message || e.message || 'Chargement impossible');
    } finally {
      setChargement(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { recharger(); }, deps);
  return { donnees, chargement, erreur, recharger };
}

export function EnTete({ titre, sous, chargement, onRecharger, children }) {
  return (
    <header className="su-tete">
      <div>
        <h1>{titre}</h1>
        {sous && <p>{sous}</p>}
      </div>
      <div className="su-actions">
        {children}
        {onRecharger && (
          <button type="button" className="su-btn su-icone" onClick={onRecharger} disabled={chargement} aria-label="Rafraîchir" title="Rafraîchir">
            <RefreshCw size={16} className={chargement ? 'su-spin' : ''} />
          </button>
        )}
      </div>
    </header>
  );
}

export function Chiffre({ icone: Icone, libelle, valeur, unite, sous, ton, onClick, actif }) {
  const contenu = (
    <>
      <span className="su-chiffre-lib">{Icone && <Icone size={15} />} {libelle}</span>
      <span className="su-chiffre-val">{valeur}{unite && <small>{unite}</small>}</span>
      {sous && <span className="su-chiffre-sous">{sous}</span>}
    </>
  );
  const cls = `su-chiffre ${ton ? `su-chiffre--${ton}` : ''} ${actif ? 'is-on' : ''}`;
  return onClick
    ? <button type="button" className={cls} onClick={onClick} aria-pressed={!!actif}>{contenu}</button>
    : <div className={cls}>{contenu}</div>;
}

export function Panneau({ titre, sous, icone: Icone, compte, tonCompte, actions, children, sansMarge }) {
  return (
    <section className="su-panneau">
      {(titre || actions) && (
        <div className="su-panneau-tete">
          <div>
            <h2>{Icone && <Icone size={16} />} {titre} {compte != null && <span className={`su-compte ${tonCompte && compte ? `su-compte--${tonCompte}` : ''}`}>{compte}</span>}</h2>
            {sous && <p>{sous}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={sansMarge ? '' : 'su-panneau-corps'}>{children}</div>
    </section>
  );
}

export function Etat({ icone: Icone, titre, texte }) {
  return (
    <div className="su-etat">
      {Icone && <Icone size={34} />}
      {titre && <strong>{titre}</strong>}
      {texte && <span>{texte}</span>}
    </div>
  );
}

export function Chargement() {
  return <div className="su-etat"><Loader2 size={26} className="su-spin" /> Chargement…</div>;
}

export function Erreur({ texte, onRecharger }) {
  if (!texte) return null;
  return (
    <div className="su-erreur" role="alert">
      <AlertCircle size={18} /> <span style={{ flex: 1 }}>{texte}</span>
      {onRecharger && <button type="button" className="su-btn su-btn--sm" onClick={onRecharger}>Réessayer</button>}
    </div>
  );
}

/** 12 barres verticales (une par mois), valeur affichée au-dessus */
export function Barres({ serie, valeur, format = nombre }) {
  const max = Math.max(1, ...serie.map(valeur));
  return (
    <div className="su-barres" role="img" aria-label={serie.map((m) => `${m.label} : ${format(valeur(m))}`).join(', ')}>
      {serie.map((m, i) => {
        const v = valeur(m);
        return (
          <div key={m.cle} className="su-barre" title={`${m.label} : ${format(v)}`}>
            <span className="su-barre-val">{v ? format(v) : ''}</span>
            <span className={`su-barre-col ${v ? '' : 'is-vide'} ${i === serie.length - 1 ? 'is-actuel' : ''}`} style={{ height: `${Math.max(2, (v / max) * 150)}px` }} />
            <span className="su-barre-lib">{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Petit message en bas à droite */
export function useMessage() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(null), 3200);
    return () => clearTimeout(t);
  }, [msg]);
  const vue = msg ? <div className={`su-toast ${msg.erreur ? 'su-toast--erreur' : ''}`} role="status">{msg.texte}</div> : null;
  return [vue, (texte, erreur = false) => setMsg({ texte, erreur })];
}
