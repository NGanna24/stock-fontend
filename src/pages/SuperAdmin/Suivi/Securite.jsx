// pages/SuperAdmin/Suivi/Securite.jsx
// Sécurité : comptes de la console, comptes bloqués, connexions récentes.
import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Lock, Unlock, LogIn, KeyRound, Users, MonitorSmartphone } from 'lucide-react';
import SuiviAdminService from '../../../services/superAdmin/suiviAdminService';
import { Chargement, Chiffre, EnTete, Erreur, Etat, Panneau, dateHeure, nombre, useChargement, useMessage } from './outils';

/** « Chrome sur Windows » à partir du navigateur déclaré par l'appareil */
const appareil = (ua) => {
  if (!ua) return '';
  const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /Electron/.test(ua) ? 'Logiciel Miyo' : 'Autre';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${nav} sur ${os}` : nav;
};

export default function Securite() {
  const { donnees, chargement, erreur, recharger } = useChargement(() => SuiviAdminService.securite());
  const [message, afficher] = useMessage();
  const [envoi, setEnvoi] = useState(null);
  const d = donnees;
  const bloques = (d?.risques || []).filter((r) => r.bloque);

  const debloquer = async (r) => {
    setEnvoi(`${r.type}-${r.id}`);
    try {
      await SuiviAdminService.debloquer(r.type, r.id);
      afficher(`${r.fullname} peut de nouveau se connecter`);
      recharger();
    } catch (e) {
      afficher(e?.response?.data?.message || 'Déblocage impossible', true);
    } finally {
      setEnvoi(null);
    }
  };

  return (
    <div className="su">
      <EnTete titre="Sécurité" sous="Comptes de la console, comptes bloqués et connexions récentes." chargement={chargement} onRecharger={recharger} />
      <Erreur texte={erreur} onRecharger={recharger} />

      {chargement && !d ? <Chargement /> : d && (
        <>
          <div className="su-chiffres">
            <Chiffre icone={Users} libelle="Comptes de la console" valeur={nombre(d.admins.length)} sous={`${nombre(d.admins.filter((a) => a.actif).length)} actifs`} />
            <Chiffre icone={Lock} libelle="Comptes bloqués" valeur={nombre(bloques.length)} ton={bloques.length ? 'danger' : null} sous="patrons et employés" />
            <Chiffre icone={KeyRound} libelle="Codes faux en cours" valeur={nombre(d.risques.length)} ton={d.risques.length ? 'warn' : null} sous="comptes avec au moins un essai raté" />
            <Chiffre icone={ShieldAlert} libelle="Connexions refusées à la console" valeur={nombre(d.echecs_7j)} ton={d.echecs_7j ? 'warn' : null} sous="sur 7 jours" />
          </div>

          <Panneau titre="Patrons et employés à surveiller" sous="Codes faux répétés. Un compte bloqué se débloque seul après quelques minutes, ou tout de suite ici." icone={Lock} compte={d.risques.length} tonCompte={bloques.length ? 'danger' : 'warn'} sansMarge>
            {d.risques.length === 0 ? <Etat icone={ShieldCheck} titre="Aucun compte à surveiller" /> : (
              <div className="su-table-wrap">
                <table className="su-table">
                  <thead><tr><th className="n">N°</th><th>Compte</th><th className="cache-etroit">Magasin</th><th>Situation</th><th className="r">Action</th></tr></thead>
                  <tbody>
                    {d.risques.map((r) => (
                      <tr key={`${r.type}-${r.id}`}>
                        <td className="n" />
                        <td><span className="su-principal">{r.fullname}</span><span className="su-sous">{r.type === 'patron' ? 'Patron' : 'Employé'} · {r.telephone}</span></td>
                        <td className="cache-etroit">{r.nom_magasin || '-'}</td>
                        <td>
                          {r.bloque
                            ? <span className="su-tag su-tag--danger">Bloqué jusqu'au {dateHeure(r.bloque_jusqua)}</span>
                            : <span className="su-tag su-tag--warn">{r.tentatives_echouees} code{r.tentatives_echouees > 1 ? 's' : ''} faux</span>}
                        </td>
                        <td className="r">
                          <button type="button" className="su-btn su-btn--sm" onClick={() => debloquer(r)} disabled={envoi === `${r.type}-${r.id}`}>
                            <Unlock size={14} /> {r.bloque ? 'Débloquer' : 'Remettre à zéro'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panneau>

          <Panneau titre="Comptes de la console Super Admin" icone={ShieldCheck} sansMarge>
            <div className="su-table-wrap">
              <table className="su-table">
                <thead><tr><th className="n">N°</th><th>Administrateur</th><th>État</th><th>Dernière connexion</th><th className="cache-etroit">Adresse IP</th></tr></thead>
                <tbody>
                  {d.admins.map((a) => {
                    const bloque = a.bloque_jusqua && new Date(a.bloque_jusqua.replace(' ', 'T')) > new Date();
                    return (
                      <tr key={a.id_super_admin}>
                        <td className="n" />
                        <td><span className="su-principal">{a.fullname}</span><span className="su-sous">{[a.email, a.telephone].filter(Boolean).join(' · ')}</span></td>
                        <td>
                          {!a.actif ? <span className="su-tag">Désactivé</span>
                            : bloque ? <span className="su-tag su-tag--danger">Bloqué</span>
                            : a.tentatives_echouees ? <span className="su-tag su-tag--warn">{a.tentatives_echouees} code(s) faux</span>
                            : <span className="su-tag su-tag--brand">Actif</span>}
                        </td>
                        <td className="nw">{a.derniere_connexion ? dateHeure(a.derniere_connexion) : 'Jamais'}</td>
                        <td className="cache-etroit">{a.derniere_ip || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panneau>

          <div className="su-grille">
            <Panneau titre="Connexions à la console" sous="Les 30 dernières, réussies ou refusées" icone={LogIn} sansMarge>
              {d.connexions_console.length === 0 ? <Etat texte="Les connexions seront notées ici à partir de maintenant." /> : (
                <table className="su-table">
                  <tbody>
                    {d.connexions_console.map((c, i) => (
                      <tr key={i}>
                        <td className="n" />
                        <td>
                          <span className="su-principal">{c.acteur_nom || 'Inconnu'}</span>
                          <span className="su-sous">{c.libelle}{c.ip ? ` · IP ${c.ip}` : ''}{c.user_agent ? ` · ${appareil(c.user_agent)}` : ''}</span>
                        </td>
                        <td className="r">
                          <span className={`su-tag ${c.action === 'connexion' ? 'su-tag--brand' : 'su-tag--danger'}`}>{c.action === 'connexion' ? 'Réussie' : c.action === 'blocage' ? 'Blocage' : 'Refusée'}</span>
                          <span className="su-sous">{dateHeure(c.date_action)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panneau>
            <Panneau titre="Connexions dans les magasins" sous="Les 30 dernières (patrons et employés)" icone={MonitorSmartphone} sansMarge>
              {d.connexions_magasins.length === 0 ? <Etat texte="Aucune connexion notée." /> : (
                <table className="su-table">
                  <tbody>
                    {d.connexions_magasins.map((c, i) => (
                      <tr key={i}>
                        <td className="n" />
                        <td><span className="su-principal">{c.acteur_nom || 'Inconnu'}</span><span className="su-sous">{c.acteur_role || ''} · {c.nom_magasin || c.patron}{c.ip ? ` · IP ${c.ip}` : ''}</span></td>
                        <td className="r nw">{dateHeure(c.date_action)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panneau>
          </div>
        </>
      )}
      {message}
    </div>
  );
}
