// pages/SuperAdmin/Suivi/Alertes.jsx
// Ce qui demande une action du Super Admin, du plus urgent au moins urgent.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, CalendarX2, Moon, Lock, MapPinOff, CheckCircle2, Wallet, Unlock } from 'lucide-react';
import SuiviAdminService from '../../../services/superAdmin/suiviAdminService';
import { Chargement, Chiffre, EnTete, Erreur, Etat, Panneau, dateCourte, dateHeure, fcfa, relatif, useChargement, useMessage } from './outils';

const GROUPES = [
  { cle: 'expirent', titre: 'Abonnements qui finissent bientôt', sous: 'Dans les 7 prochains jours : prévenir le patron avant la coupure.', icone: CalendarClock, ton: 'warn' },
  { cle: 'expires', titre: 'Abonnements expirés', sous: "Le patron ne peut plus travailler normalement tant qu'il n'a pas payé.", icone: CalendarX2, ton: 'danger' },
  { cle: 'bloques', titre: 'Comptes bloqués', sous: 'Trop de codes faux : le compte se débloque seul, ou ici tout de suite.', icone: Lock, ton: 'danger' },
  { cle: 'inactifs', titre: 'Patrons qui ne se connectent plus', sous: 'Plus de 14 jours sans connexion alors que leur abonnement est valable.', icone: Moon, ton: 'brand' },
  { cle: 'sans_position', titre: 'Magasins sans position sur la carte', sous: 'À compléter pour la carte globale (moins urgent).', icone: MapPinOff, ton: null },
];

export default function Alertes() {
  const navigate = useNavigate();
  const { donnees, chargement, erreur, recharger } = useChargement(() => SuiviAdminService.alertes());
  const [filtre, setFiltre] = useState(null);
  const [message, afficher] = useMessage();
  const [envoi, setEnvoi] = useState(null);

  const d = donnees || {};
  const n = (cle) => (d[cle] || []).length;
  const abonnement = (id) => navigate(`/super-admin/abonnements?patron=${id}`);
  const patron = (id) => navigate(`/super-admin/utilisateurs/${id}`);

  const debloquer = async (b) => {
    setEnvoi(`${b.type}-${b.id}`);
    try {
      await SuiviAdminService.debloquer(b.type, b.id);
      afficher(`${b.fullname} peut de nouveau se connecter`);
      recharger();
    } catch (e) {
      afficher(e?.response?.data?.message || 'Déblocage impossible', true);
    } finally {
      setEnvoi(null);
    }
  };

  const lignes = {
    expirent: (a) => (
      <tr key={a.id_utilisateur}>
        <td className="n" />
        <td><button type="button" className="su-lien" onClick={() => patron(a.id_utilisateur)}>{a.fullname}</button><span className="su-sous">{a.nom_magasin || 'Magasin sans nom'} · {a.telephone}</span></td>
        <td><span className={`su-tag ${a.en_essai ? '' : 'su-tag--brand'}`}>{a.en_essai ? "Période d'essai" : 'Abonné'}</span></td>
        <td className="nw">{dateCourte(a.date_fin)}<span className="su-sous">{relatif(a.jours_restants)}</span></td>
        <td className="r cache-etroit">{fcfa(a.montant_mensuel)}<span className="su-sous">par mois</span></td>
        <td className="r"><button type="button" className="su-btn su-btn--sm su-btn--primary" onClick={() => abonnement(a.id_utilisateur)}><Wallet size={14} /> Prolonger</button></td>
      </tr>
    ),
    expires: (a) => (
      <tr key={a.id_utilisateur}>
        <td className="n" />
        <td><button type="button" className="su-lien" onClick={() => patron(a.id_utilisateur)}>{a.fullname}</button><span className="su-sous">{a.nom_magasin || 'Magasin sans nom'} · {a.telephone}</span></td>
        <td><span className="su-tag su-tag--danger">{a.en_essai ? 'Essai terminé' : 'Expiré'}</span></td>
        <td className="nw">{dateCourte(a.date_fin)}<span className="su-sous">{relatif(a.jours_restants)}</span></td>
        <td className="r cache-etroit">{fcfa(a.montant_mensuel)}<span className="su-sous">par mois</span></td>
        <td className="r"><button type="button" className="su-btn su-btn--sm su-btn--primary" onClick={() => abonnement(a.id_utilisateur)}><Wallet size={14} /> Prolonger</button></td>
      </tr>
    ),
    bloques: (b) => (
      <tr key={`${b.type}-${b.id}`}>
        <td className="n" />
        <td><span className="su-principal">{b.fullname}</span><span className="su-sous">{b.type === 'patron' ? 'Patron' : 'Employé'} · {b.nom_magasin || '-'} · {b.telephone}</span></td>
        <td><span className="su-tag su-tag--danger">{b.tentatives_echouees} codes faux</span></td>
        <td className="nw">jusqu'au {dateHeure(b.bloque_jusqua)}</td>
        <td className="cache-etroit" />
        <td className="r">
          <button type="button" className="su-btn su-btn--sm" onClick={() => debloquer(b)} disabled={envoi === `${b.type}-${b.id}`}><Unlock size={14} /> Débloquer</button>
        </td>
      </tr>
    ),
    inactifs: (u) => (
      <tr key={u.id_utilisateur}>
        <td className="n" />
        <td><button type="button" className="su-lien" onClick={() => patron(u.id_utilisateur)}>{u.fullname}</button><span className="su-sous">{u.nom_magasin || 'Magasin sans nom'}{u.ville ? ` · ${u.ville}` : ''} · {u.telephone}</span></td>
        <td><span className="su-tag">{u.statut === 'essai' ? "Période d'essai" : 'Abonné'}</span></td>
        <td className="nw">{u.derniere_connexion ? dateHeure(u.derniere_connexion) : 'Jamais connecté'}<span className="su-sous">{u.jours} jours sans connexion</span></td>
        <td className="cache-etroit" />
        <td className="r"><a className="su-btn su-btn--sm" href={`tel:${u.telephone}`}>Appeler</a></td>
      </tr>
    ),
    sans_position: (m) => (
      <tr key={m.id_magasin}>
        <td className="n" />
        <td><span className="su-principal">{m.nom_commercial || 'Magasin sans nom'}</span><span className="su-sous">{m.fullname}</span></td>
        <td className="nw">{[m.quartier, m.ville].filter(Boolean).join(', ') || 'Adresse non renseignée'}</td>
        <td />
        <td className="cache-etroit" />
        <td className="r"><button type="button" className="su-btn su-btn--sm" onClick={() => navigate(`/super-admin/magasins/${m.id_magasin}`)}>Voir le magasin</button></td>
      </tr>
    ),
  };

  const visibles = GROUPES.filter((g) => (!filtre || filtre === g.cle));

  return (
    <div className="su">
      <EnTete
        titre="Alertes"
        sous="Ce qui demande votre attention, du plus urgent au moins urgent."
        chargement={chargement}
        onRecharger={recharger}
      />
      <Erreur texte={erreur} onRecharger={recharger} />

      {chargement && !donnees ? <Chargement /> : donnees && (
        <>
          <div className="su-chiffres">
            {GROUPES.slice(0, 4).map((g) => (
              <Chiffre
                key={g.cle}
                icone={g.icone}
                libelle={g.titre.replace('Abonnements qui finissent bientôt', 'Finissent bientôt').replace('Abonnements expirés', 'Expirés').replace('Patrons qui ne se connectent plus', 'Inactifs')}
                valeur={n(g.cle)}
                ton={n(g.cle) ? g.ton : null}
                onClick={() => setFiltre(filtre === g.cle ? null : g.cle)}
                actif={filtre === g.cle}
              />
            ))}
          </div>

          {d.total === 0 && n('sans_position') === 0 ? (
            <Panneau><Etat icone={CheckCircle2} titre="Rien à signaler" texte="Aucun abonnement à relancer, aucun compte bloqué." /></Panneau>
          ) : visibles.map((g) => (
            n(g.cle) > 0 && (
              <Panneau key={g.cle} titre={g.titre} sous={g.sous} icone={g.icone} compte={n(g.cle)} tonCompte={g.ton} sansMarge>
                <div className="su-table-wrap">
                  <table className="su-table">
                    <tbody>{d[g.cle].map(lignes[g.cle])}</tbody>
                  </table>
                </div>
              </Panneau>
            )
          ))}
          {filtre && n(filtre) === 0 && (
            <Panneau><Etat icone={CheckCircle2} titre="Rien dans cette catégorie" /></Panneau>
          )}
        </>
      )}
      {message}
    </div>
  );
}
