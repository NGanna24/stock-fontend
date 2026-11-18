// pages/RolesPermissions/RolesPermissions.jsx
//
// Le propriétaire choisit, pour chaque rôle d'employé, les pages visibles et les actions sensibles.
// Le serveur applique ces règles lui-même (backend/utils/permissions.js) ; les employés
// les reçoivent en moins d'une minute, sans se reconnecter.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ShieldCheck, Briefcase, Calculator, Package, RotateCcw, Save, Info, Check, Undo2, LayoutGrid, KeyRound,
  Plus, Trash2, X, Users,
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
// Baisse de prix maximum : texte du champ <-> valeur (null = sans limite)
const remiseTexte = (v) => (v === null || v === undefined ? '' : String(v));
const remiseValeur = (t) => {
  const n = parseFloat(String(t).replace(',', '.'));
  return String(t).trim() === '' || Number.isNaN(n) ? null : Math.min(100, Math.max(0, n));
};
const brouillonDe = (r) => ({ modules: r.modules, actions: r.actions, remise: remiseTexte(r.remise_max), libelle: r.libelle });
const NOMS_BASE = { manager: 'Manager', caissier: 'Caissier', magasinier: 'Magasinier' };

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
      setBrouillons(Object.fromEntries(d.roles.map((r) => [r.role, brouillonDe(r)])));
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
    return s && b && (
      !memes(s.modules, b.modules) || !memes(s.actions, b.actions)
      || remiseValeur(b.remise) !== (s.remise_max ?? null)
      || (s.perso && (b.libelle || '').trim() !== (s.libelle || ''))
    );
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

  const brouillon = brouillons[role] || { modules: [], actions: [], remise: '' };
  const estPerso = !!serveur[role]?.perso;
  const defaut = catalogue?.defauts?.[role] || { modules: [], actions: [] };
  const estDefaut = !estPerso && memes(brouillon.modules, defaut.modules) && memes(brouillon.actions, defaut.actions) && remiseValeur(brouillon.remise) === null;
  const majChamp = (champ, valeur) => setBrouillons((prev) => ({ ...prev, [role]: { ...prev[role], [champ]: valeur } }));

  // ---------- Nouveau rôle personnalisé ----------
  const [creation, setCreation] = useState(null); // { libelle, role_base, envoi, erreur }
  const creer = async () => {
    if (!creation) return;
    setCreation((c) => ({ ...c, envoi: true, erreur: '' }));
    try {
      const res = await axios.post(API_URL.PERMISSIONS.ROLES, { libelle: creation.libelle, role_base: creation.role_base }, entetes());
      const nouveau = { ...res.data.data, perso: true, nb_employes: 0 };
      setCatalogue((c) => ({ ...c, roles: [...c.roles, nouveau] }));
      setServeur((prev) => ({ ...prev, [nouveau.role]: nouveau }));
      setBrouillons((prev) => ({ ...prev, [nouveau.role]: brouillonDe(nouveau) }));
      setRole(nouveau.role);
      setCreation(null);
      afficherToast(`Rôle « ${nouveau.libelle} » créé. Réglez ses pages et actions.`, 'success');
    } catch (e) {
      setCreation((c) => ({ ...c, envoi: false, erreur: getErrorMessage(e) }));
    }
  };

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
      modifies.forEach((r) => { out[r] = brouillonDe(serveur[r]); });
      return out;
    });
  };

  const enregistrer = async () => {
    if (!modifies.length) return;
    setEnregistrement(true);
    try {
      const maj = { ...serveur };
      for (const r of modifies) {
        const b = brouillons[r];
        const res = await axios.put(
          API_URL.PERMISSIONS.ROLE(r),
          { modules: b.modules, actions: b.actions, remise_max: remiseValeur(b.remise), ...(maj[r]?.perso ? { libelle: (b.libelle || '').trim() } : {}) },
          entetes()
        );
        maj[r] = { ...maj[r], ...res.data.data };
      }
      setServeur(maj);
      setBrouillons((prev) => {
        const out = { ...prev };
        modifies.forEach((r) => { out[r] = brouillonDe(maj[r]); });
        return out;
      });
      setCatalogue((c) => ({ ...c, roles: c.roles.map((x) => (maj[x.role] ? { ...x, libelle: maj[x.role].libelle || x.libelle } : x)) }));
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
      if (d?.supprime) {
        const nom = serveur[role]?.libelle;
        setCatalogue((c) => ({ ...c, roles: c.roles.filter((x) => x.role !== role) }));
        setBrouillons((prev) => { const o = { ...prev }; delete o[role]; return o; });
        setServeur((prev) => { const o = { ...prev }; delete o[role]; return o; });
        setRole('caissier');
        afficherToast(`Rôle « ${nom} » supprimé`, 'success');
        return;
      }
      setServeur((prev) => ({ ...prev, [role]: { ...prev[role], ...d } }));
      setBrouillons((prev) => ({ ...prev, [role]: brouillonDe(d) }));
      afficherToast(`Rôle ${serveur[role].libelle} remis par défaut`, 'success');
    } catch (e) {
      afficherToast(getErrorMessage(e), 'error');
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
                const parDefaut = !r.perso && d && memes(b.modules, d.modules) && memes(b.actions, d.actions) && remiseValeur(b.remise) === null;
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
                          {(r.perso ? b.libelle : r.libelle) || r.libelle}
                          {change && <span className="rp-pastille" title="Changements non enregistrés">Non enregistré</span>}
                        </span>
                        <span className="rp-role-resume">
                          {r.perso
                            ? `Créé par vous, basé sur ${NOMS_BASE[r.role_base] || r.role_base}${r.nb_employes ? ` · ${r.nb_employes} employé${r.nb_employes > 1 ? 's' : ''}` : ''}`
                            : RESUMES[r.role]}
                        </span>
                        <span className="rp-role-chiffres">
                          {b.modules.length} page{b.modules.length > 1 ? 's' : ''} · {b.actions.length} action{b.actions.length > 1 ? 's' : ''}
                          {r.perso ? '' : ` · ${parDefaut ? 'par défaut' : 'personnalisé'}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {creation ? (
              <div className="rp-creer">
                <label htmlFor="rp-nom-role">Nom du nouveau rôle</label>
                <input
                  id="rp-nom-role"
                  className="rp-input"
                  value={creation.libelle}
                  maxLength={60}
                  placeholder="Ex. Comptable, Vendeur principal"
                  autoFocus
                  onChange={(e) => setCreation((c) => ({ ...c, libelle: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') creer(); if (e.key === 'Escape') setCreation(null); }}
                />
                <label htmlFor="rp-base-role">Partir des droits de</label>
                <select
                  id="rp-base-role"
                  className="rp-input"
                  value={creation.role_base}
                  onChange={(e) => setCreation((c) => ({ ...c, role_base: e.target.value }))}
                >
                  {Object.entries(NOMS_BASE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {creation.erreur && <p className="rp-erreur" role="alert">{creation.erreur}</p>}
                <div className="rp-creer-actions">
                  <button type="button" className="vt-btn" onClick={() => setCreation(null)} disabled={creation.envoi}>
                    <X size={15} aria-hidden="true" /> Annuler
                  </button>
                  <button type="button" className="vt-btn vt-btn--primary" onClick={creer} disabled={creation.envoi || creation.libelle.trim().length < 2}>
                    <Check size={15} aria-hidden="true" /> Créer
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="rp-nouveau" onClick={() => setCreation({ libelle: '', role_base: 'caissier', envoi: false, erreur: '' })}>
                <Plus size={16} aria-hidden="true" /> Nouveau rôle
              </button>
            )}
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
                  {estPerso && (
                    <div className="rp-renommer">
                      <label htmlFor="rp-libelle">Nom du rôle</label>
                      <input id="rp-libelle" className="rp-input" value={brouillon.libelle || ''} maxLength={60} onChange={(e) => majChamp('libelle', e.target.value)} />
                    </div>
                  )}
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
                        {a.id === 'ventes.modifier_prix' && on && (
                          <div className="rp-remise">
                            <label htmlFor={`rp-remise-${role}`}>Baisse maximum</label>
                            <div className="rp-remise-champ">
                              <input
                                id={`rp-remise-${role}`}
                                className="rp-input"
                                inputMode="decimal"
                                placeholder="Sans limite"
                                value={brouillon.remise}
                                onChange={(e) => majChamp('remise', e.target.value.replace(/[^\d.,]/g, '').slice(0, 5))}
                                aria-describedby={`rp-remise-aide-${role}`}
                              />
                              <span aria-hidden="true">%</span>
                            </div>
                            <span id={`rp-remise-aide-${role}`} className="rp-ligne-aide">
                              {remiseValeur(brouillon.remise) === null
                                ? 'Vide : le prix peut descendre sans limite.'
                                : `Un article à 10 000 FCFA ne pourra pas être vendu sous ${Math.ceil(10000 * (1 - remiseValeur(brouillon.remise) / 100)).toLocaleString('fr-FR')} FCFA.`}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>

            <div className="rp-bas">
              {estPerso ? (
                <button type="button" className="vt-btn" onClick={() => setARetablir(true)} disabled={enregistrement}>
                  <Trash2 size={16} aria-hidden="true" /> Supprimer ce rôle
                </button>
              ) : (
                <button
                  type="button"
                  className="vt-btn"
                  onClick={() => setARetablir(true)}
                  disabled={enregistrement || (estDefaut && !serveur[role]?.personnalise)}
                >
                  <RotateCcw size={16} aria-hidden="true" /> Revenir aux réglages par défaut
                </button>
              )}
              {estPerso && serveur[role]?.nb_employes > 0 && (
                <span className="rp-defaut"><Users size={14} aria-hidden="true" /> {serveur[role].nb_employes} employé{serveur[role].nb_employes > 1 ? 's ont' : ' a'} ce rôle</span>
              )}
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
        title={estPerso ? `Supprimer le rôle ${libelleRole} ?` : `Remettre le rôle ${libelleRole} par défaut ?`}
        message={estPerso
          ? "Ce rôle disparaît. S'il est encore donné à des employés, changez d'abord leur rôle dans la page Employés."
          : 'Les pages et actions de ce rôle reviennent aux réglages de départ de Miyo. Vos choix pour ce rôle seront perdus.'}
        confirmLabel={estPerso ? 'Supprimer' : 'Remettre par défaut'}
      />

      <Toast toast={toast} onClose={cacherToast} />
    </Page>
  );
}
