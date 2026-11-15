// pages/SuperAdmin/Suivi/Audit.jsx
// Journal d'audit : tout ce qui a été fait dans la console Super Admin.
import React, { useEffect, useState } from 'react';
import { Search, ScrollText, ChevronLeft, ChevronRight, Wallet, Settings2, UserCog, Store, ShieldAlert, LogIn, Lock } from 'lucide-react';
import SuiviAdminService from '../../../services/superAdmin/suiviAdminService';
import { Chargement, EnTete, Erreur, Etat, dateHeure, jourLisible, heure, pluriel, useChargement } from './outils';

const ACTIONS = {
  abonnement: { lib: 'Abonnements', Icone: Wallet, ton: 'brand' },
  reglages: { lib: 'Réglages', Icone: Settings2, ton: '' },
  patron: { lib: 'Patrons', Icone: UserCog, ton: '' },
  magasin: { lib: 'Magasins', Icone: Store, ton: '' },
  securite: { lib: 'Sécurité', Icone: ShieldAlert, ton: 'warn' },
  connexion: { lib: 'Connexions', Icone: LogIn, ton: '' },
  echec_connexion: { lib: 'Connexions refusées', Icone: Lock, ton: 'danger' },
  blocage: { lib: 'Blocages', Icone: Lock, ton: 'danger' },
};
const PERIODES = [[1, "Aujourd'hui"], [7, '7 jours'], [30, '30 jours'], [365, '12 mois']];
const PAR_PAGE = 50;

/** Détails lisibles (montant, mois, référence…) */
const detailsLisibles = (brut) => {
  if (!brut) return null;
  try {
    const o = JSON.parse(brut);
    const noms = { nb_mois: 'Mois', montant: 'Montant', moyen_paiement: 'Moyen', reference: 'Référence', latitude: 'Latitude', longitude: 'Longitude', id_abonnement: 'Paiement n°' };
    const parties = Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '' && typeof v !== 'object')
      .map(([k, v]) => `${noms[k] || k} : ${v}`);
    return parties.length ? parties.join(' · ') : null;
  } catch {
    return String(brut).slice(0, 200);
  }
};

export default function Audit() {
  const [jours, setJours] = useState(30);
  const [action, setAction] = useState('');
  const [saisie, setSaisie] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => { setQ(saisie.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [saisie]);

  const { donnees, chargement, erreur, recharger } = useChargement(
    () => SuiviAdminService.journal({ jours, action, q, page, limite: PAR_PAGE }),
    [jours, action, q, page]
  );
  const d = donnees || { lignes: [], actions: [], total: 0 };
  const nbPages = Math.max(1, Math.ceil((d.total || 0) / PAR_PAGE));

  const groupes = [];
  for (const l of d.lignes) {
    const j = jourLisible(l.date_action);
    if (!groupes.length || groupes[groupes.length - 1].jour !== j) groupes.push({ jour: j, liste: [] });
    groupes[groupes.length - 1].liste.push(l);
  }
  let numero = (page - 1) * PAR_PAGE;

  return (
    <div className="su">
      <EnTete titre="Journal d'audit" sous="Qui a fait quoi dans la console Super Admin, et quand." chargement={chargement} onRecharger={recharger} />
      <Erreur texte={erreur} onRecharger={recharger} />

      <div className="su-outils">
        <div className="su-seg" role="group" aria-label="Période">
          {PERIODES.map(([v, l]) => (
            <button key={v} type="button" className={jours === v ? 'is-on' : ''} aria-pressed={jours === v} onClick={() => { setJours(v); setPage(1); }}>{l}</button>
          ))}
        </div>
        <select className="su-select" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} aria-label="Type d'action">
          <option value="">Toutes les actions</option>
          {Object.entries(ACTIONS).map(([k, a]) => {
            const n = d.actions.find((x) => x.action === k)?.n;
            return <option key={k} value={k}>{a.lib}{n ? ` (${n})` : ''}</option>;
          })}
        </select>
        <div className="su-recherche">
          <Search size={16} />
          <input type="search" value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Patron, magasin, administrateur ou adresse IP" aria-label="Rechercher dans le journal" />
        </div>
      </div>

      <section className="su-panneau">
        {chargement && !donnees ? <Chargement /> : d.lignes.length === 0 ? (
          <Etat icone={ScrollText} titre="Rien dans le journal" texte="Les actions faites dans la console (prolongations, blocages, réglages, connexions) sont notées ici à partir de maintenant." />
        ) : (
          <>
            {groupes.map((g) => (
              <div key={g.jour}>
                <div className="su-fil-jour">{g.jour}</div>
                <ol className="su-fil" style={{ counterReset: `su-fil ${numero}` }}>
                  {g.liste.map((l) => {
                    numero += 1;
                    const a = ACTIONS[l.action] || { Icone: ScrollText, ton: '' };
                    const det = detailsLisibles(l.details);
                    return (
                      <li key={l.id_journal}>
                        <span className={`su-fil-ic ${a.ton ? `su-fil-ic--${a.ton}` : ''}`}><a.Icone size={17} /></span>
                        <div className="su-fil-txt">
                          <b>{l.libelle}</b>{l.cible_nom ? <> · {l.cible_nom}</> : null}
                          <div className="su-fil-meta">
                            {l.acteur_nom || 'Inconnu'}{l.ip ? ` · IP ${l.ip}` : ''}{a.lib ? ` · ${a.lib}` : ''}
                          </div>
                          {det && <div className="su-details">{det}</div>}
                        </div>
                        <span className="su-fil-heure" title={dateHeure(l.date_action)}>{heure(l.date_action)}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
            <div className="su-pages">
              <span>{pluriel(d.total, 'action')} · page {page} sur {nbPages}</span>
              {nbPages > 1 && (
                <div className="su-pages-nav">
                  <button type="button" className="su-btn su-btn--sm" onClick={() => setPage(page - 1)} disabled={page <= 1}><ChevronLeft size={14} /> Plus récentes</button>
                  <button type="button" className="su-btn su-btn--sm" onClick={() => setPage(page + 1)} disabled={page >= nbPages}>Plus anciennes <ChevronRight size={14} /></button>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
