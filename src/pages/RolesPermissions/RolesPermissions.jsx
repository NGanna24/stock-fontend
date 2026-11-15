// pages/RolesPermissions/RolesPermissions.jsx
//
// Le propriétaire choisit, pour chaque rôle d'employé, les pages visibles et les actions sensibles.
// Le serveur applique ces règles lui-même (backend/utils/permissions.js) ; les employés
// les reçoivent en moins d'une minute, sans se reconnecter.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ShieldCheck, Briefcase, Calculator, Package, RotateCcw, Save, Info, Check, Undo2, LayoutGrid, KeyRound,
} from 'lucide-react';
import { Page, PageHead, useToast, Toast, ErrorBar } from '../../components/UI/Vt';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import API_URL from '../../config/api';
import { getErrorMessage } from '../../utils/errorMessages';
import './RolesPermissions.css';

const ICONES = { manager: Briefcase, caissier: Calculator, magasinier: Package };
const RESUMES = {
  manager: 'Gère la boutique au quotidien',
  caissier: 'Encaisse les ventes',
  magasinier: 'Range et suit le stock',
};

const entetes = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const trie = (l) => [...(l || [])].sort();
const memes = (a, b) => JSON.stringify(trie(a)) === JSON.stringify(trie(b));

const Interrupteur = ({ id, checked, onChange, label }) => (
  <label className="rp-switch" htmlFor={id}>
    <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
    <span className="rp-switch-track" aria-hidden="true"><span className="rp-switch-thumb" /></span>
  </label>
);

export default function RolesPermissions() {
  const [toast, afficherToast, cacherToast] = useToast();
  const [catalogue, setCatalogue] = useState(null); // { modules, actions, defauts }
  const [serveur, setServeur] = useState({});       // role -> { modules, actions, personnalise }
  const [brouillons, setBrouillons] = useState({}); // role -> { modules, actions }
  const [role, setRole] = useState('caissier');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);
  const [aRetablir, setARetablir] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const res = await axios.get(API_URL.PERMISSIONS.LISTE, entetes());
      const d = res.data.data;
      const parRole = {};
      d.roles.forEach((r) => { parRole[r.role] = r; });
      setCatalogue({ modules: d.modules, actions: d.actions, defauts: d.defauts, roles: d.roles });
      setServeur(parRole);
      setBrouillons(Object.fromEntries(d.roles.map((r) => [r.role, { modules: r.modules, actions: r.actions }])));
    } catch (e) {
      setErreur(getErrorMessage(e, 'Impossible de charger les permissions'));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const modifies = useMemo(() => Object.keys(brouillons).filter((r) => {
    const s = serveur[r];
    const b = brouillons[r];
    return s && b && (!memes(s.modules, b.modules) || !memes(s.actions, b.actions));
  }), [brouillons, serveur]);

  // Quitter la page avec des changements non enregistrés
  useEffect(() => {
    if (!modifies.length) return undefined;
    const avant = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avant);
    return () => window.removeEventListener('beforeunload', avant);
  }, [modifies.length]);

  const groupes = useMemo(() => {
    if (!catalogue) return [];
    const out = [];
    catalogue.modules.forEach((m) => {
      let g = out.find((x) => x.nom === m.groupe);
      if (!g) { g = { nom: m.groupe, modules: [] }; out.push(g); }
      g.modules.push(m);
    });
    return out;
  }, [catalogue]);

  const brouillon = brouillons[role] || { modules: [], actions: [] };
  const defaut = catalogue?.defauts?.[role] || { modules: [], actions: [] };
  const estDefaut = memes(brouillon.modules, defaut.modules) && memes(brouillon.actions, defaut.actions);

  const basculer = (champ, id, valeur) => {
    setBrouillons((prev) => {
      const actuel = prev[role][champ];
      const suivant = valeur ? [...new Set([...actuel, id])] : actuel.filter((x) => x !== id);
      return { ...prev, [role]: { ...prev[role], [champ]: suivant } };
    });
  };

  const basculerGroupe = (g, valeur) => {
    const ids = g.modules.map((m) => m.id);
    setBrouillons((prev) => {
      const actuel = prev[role].modules;
      const suivant = valeur ? [...new Set([...actuel, ...ids])] : actuel.filter((x) => !ids.includes(x));
      return { ...prev, [role]: { ...prev[role], modules: suivant } };
    });
  };

  const annulerChangements = () => {
    setBrouillons((prev) => {
      const out = { ...prev };
      modifies.forEach((r) => { out[r] = { modules: serveur[r].modules, actions: serveur[r].actions }; });
      return out;
    });
  };

  const enregistrer = async () => {
    if (!modifies.length) return;
    setEnregistrement(true);
    try {
      const maj = { ...serveur };
      for (const r of modifies) {
        const res = await axios.put(API_URL.PERMISSIONS.ROLE(r), brouillons[r], entetes());
        maj[r] = { ...maj[r], ...res.data.data };
      }
      setServeur(maj);
      setBrouillons((prev) => {
        const out = { ...prev };
        modifies.forEach((r) => { out[r] = { modules: maj[r].modules, actions: maj[r].actions }; });
        return out;
      });
      afficherToast(
        modifies.length > 1 ? 'Permissions enregistrées pour les rôles modifiés' : `Permissions du rôle ${serveur[modifies[0]].libelle} enregistrées`,
        'success'
      );
    } catch (e) {
      afficherToast(getErrorMessage(e, "Les permissions n'ont pas pu être enregistrées"), 'error');
    } finally {
      setEnregistrement(false);
    }
  };

  const retablir = async () => {
    setEnregistrement(true);
    try {
      const res = await axios.delete(API_URL.PERMISSIONS.ROLE(role), entetes());
      const d = res.data.data;
      setServeur((prev) => ({ ...prev, [role]: { ...prev[role], ...d } }));
      setBrouillons((prev) => ({ ...prev, [role]: { modules: d.modules, actions: d.actions } }));
      afficherToast(`Rôle ${serveur[role].libelle} remis par défaut`, 'success');
    } catch (e) {
      afficherToast(getErrorMessage(e, "Le rôle n'a pas pu être remis par défaut"), 'error');
    } finally {
      setEnregistrement(false);
      setARetablir(false);
    }
  };

  const libelleRole = serveur[role]?.libelle || role;
  let numero = 0;

  return (
    <Page className="rp-page">
      <PageHead
        title="Rôles et permissions"
        sub="Choisissez ce que chaque employé peut voir et faire selon son rôle. Vous, le propriétaire, gardez toujours accès à tout."
      />

      {erreur && <ErrorBar message={erreur} onRetry={charger} />}

      {chargement && !catalogue ? (
        <div className="rp-chargement" role="status">Chargement des permissions…</div>
      ) : catalogue && (
        <div className="rp-grille">
          {/* ---------- Choix du rôle ---------- */}
          <nav className="rp-roles" aria-label="Rôles">
            <ol>
              {catalogue.roles.map((r, i) => {
                const Icon = ICONES[r.role] || ShieldCheck;
                const b = brouillons[r.role] || r;
                const on = r.role === role;
                const change = modifies.includes(r.role);
                const d = catalogue.defauts[r.role];
                const parDefaut = memes(b.modules, d.modules) && memes(b.actions, d.actions);
                return (
                  <li key={r.role}>
                    <button
                      type="button"
                      className={`rp-role ${on ? 'is-on' : ''}`}
                      aria-current={on ? 'true' : undefined}
                      onClick={() => setRole(r.role)}
                    >
                      <span className="rp-role-num">{i + 1}</span>
                      <span className="rp-role-icone" aria-hidden="true"><Icon size={18} /></span>
                      <span className="rp-role-texte">
                        <span className="rp-role-nom">
                          {r.libelle}
                          {change && <span className="rp-pastille" title="Changements non enregistrés">Non enregistré</span>}
                        </span>
                        <span className="rp-role-resume">{RESUMES[r.role]}</span>
                        <span className="rp-role-chiffres">
                          {b.modules.length} page{b.modules.length > 1 ? 's' : ''} · {b.actions.length} action{b.actions.length > 1 ? 's' : ''}
                          {' · '}{parDefaut ? 'par défaut' : 'personnalisé'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="rp-note">
              <Info size={14} aria-hidden="true" />
              Les changements s'appliquent aux employés en moins d'une minute, sans qu'ils aient besoin de se reconnecter.
            </p>
          </nav>

          {/* ---------- Réglages du rôle choisi ---------- */}
          <div className="rp-contenu">
            <section className="rp-section" aria-labelledby="rp-pages-titre">
              <header className="rp-section-head">
                <span className="rp-section-icone" aria-hidden="true"><LayoutGrid size={18} /></span>
                <div>
                  <h2 id="rp-pages-titre">1. Pages visibles par le rôle {libelleRole}</h2>
                  <p>Une page décochée disparaît du menu et le logiciel refuse d'y accéder. Le tableau de bord et les paramètres restent toujours visibles.</p>
                </div>
              </header>
              <div className="rp-section-corps">
                {groupes.map((g) => {
                  const coches = g.modules.filter((m) => brouillon.modules.includes(m.id)).length;
                  const tout = coches === g.modules.length;
                  return (
                    <div key={g.nom} className="rp-groupe">
                      <div className="rp-groupe-head">
                        <h3>{g.nom}</h3>
                        <span className="rp-groupe-compte">{coches} sur {g.modules.length}</span>
                        <button type="button" className="rp-lien" onClick={() => basculerGroupe(g, !tout)}>
                          {tout ? 'Tout décocher' : 'Tout cocher'}
                        </button>
                      </div>
                      <ol className="rp-liste">
                        {g.modules.map((m) => {
                          numero += 1;
                          const id = `rp-m-${role}-${m.id}`;
                          const on = brouillon.modules.includes(m.id);
                          return (
                            <li key={m.id} className={`rp-ligne ${on ? 'is-on' : ''}`}>
                              <span className="rp-num">{numero}</span>
                              <label htmlFor={id} className="rp-ligne-texte">{m.libelle}</label>
                              <Interrupteur id={id} checked={on} label={`${m.libelle} pour ${libelleRole}`} onChange={(v) => basculer('modules', m.id, v)} />
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rp-section" aria-labelledby="rp-actions-titre">
              <header className="rp-section-head">
                <span className="rp-section-icone" aria-hidden="true"><KeyRound size={18} /></span>
                <div>
                  <h2 id="rp-actions-titre">2. Actions sensibles</h2>
                  <p>En plus des pages : ce que le rôle {libelleRole} a le droit de faire avec l'argent, le stock et les clients.</p>
                </div>
              </header>
              <div className="rp-section-corps">
                <ol className="rp-liste">
                  {catalogue.actions.map((a, i) => {
                    const id = `rp-a-${role}-${a.id}`;
                    const on = brouillon.actions.includes(a.id);
                    return (
                      <li key={a.id} className={`rp-ligne rp-ligne--action ${on ? 'is-on' : ''}`}>
                        <span className="rp-num">{i + 1}</span>
                        <label htmlFor={id} className="rp-ligne-texte">
                          <span className="rp-ligne-titre">{a.libelle}</span>
                          <span className="rp-ligne-aide">{a.aide}</span>
                        </label>
                        <Interrupteur id={id} checked={on} label={`${a.libelle} pour ${libelleRole}`} onChange={(v) => basculer('actions', a.id, v)} />
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>

            <div className="rp-bas">
              <button
                type="button"
                className="vt-btn"
                onClick={() => setARetablir(true)}
                disabled={enregistrement || (estDefaut && !serveur[role]?.personnalise)}
              >
                <RotateCcw size={16} aria-hidden="true" /> Revenir aux réglages par défaut
              </button>
              {estDefaut && <span className="rp-defaut"><Check size={14} aria-hidden="true" /> Réglages par défaut</span>}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Barre d'enregistrement ---------- */}
      {modifies.length > 0 && (
        <div className="rp-barre" role="region" aria-label="Changements non enregistrés">
          <span className="rp-barre-texte">
            Changements non enregistrés : {modifies.map((r) => serveur[r]?.libelle).join(', ')}
          </span>
          <div className="rp-barre-actions">
            <button type="button" className="vt-btn" onClick={annulerChangements} disabled={enregistrement}>
              <Undo2 size={16} aria-hidden="true" /> Annuler
            </button>
            <button type="button" className="vt-btn vt-btn--primary" onClick={enregistrer} disabled={enregistrement}>
              <Save size={16} aria-hidden="true" /> {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={aRetablir}
        onClose={() => setARetablir(false)}
        onConfirm={retablir}
        loading={enregistrement}
        type="warning"
        title={`Remettre le rôle ${libelleRole} par défaut ?`}
        message="Les pages et actions de ce rôle reviennent aux réglages de départ de Miyo. Vos choix pour ce rôle seront perdus."
        confirmLabel="Remettre par défaut"
      />

      <Toast toast={toast} onClose={cacherToast} />
    </Page>
  );
}
