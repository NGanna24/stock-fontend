// pages/SuperAdmin/Dashboard/SuperAdminDashboard.jsx
// Vue d'ensemble de la plateforme : chiffres clés avec tendance, évolution sur 12 mois,
// abonnements, activité des magasins, heures de vente, villes, choses à traiter.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Store, Banknote, ShoppingCart, TrendingUp, CreditCard, Activity, Clock, MapPin, AlertTriangle,
  UserPlus, ChevronRight, Trophy, MapPinOff, Hourglass, UserX, ShieldAlert, CalendarX,
} from 'lucide-react';
import AdminService from '../../../services/superAdmin/adminService';
import SuiviAdminService from '../../../services/superAdmin/suiviAdminService';
import { Courbe, Anneau, Jauge, Mini, Colonnes, court } from '../Suivi/graphiques';
import { Chargement, EnTete, Erreur, Panneau, dateCourte, fcfa, nombre, pluriel, useChargement } from '../Suivi/outils';

const MOYENS = { wave: 'Wave', orange: 'Orange Money', mtn: 'MTN MoMo', moov: 'Moov Money', banque: 'Banque', especes: 'Espèces', autre: 'Non précisé' };
const salutation = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
};
// Évolution en %, seulement quand la base de comparaison est assez grande pour avoir un sens
const ecart = (a, b, base = 1) => {
  if (!b || b < base) return null;
  const p = Math.round(((a - b) / b) * 100);
  return Math.abs(p) > 300 ? null : p;
};
const initiales = (n = '') => n.split(' ').filter(Boolean).map((m) => m[0]).join('').slice(0, 2).toUpperCase() || '?';

async function toutCharger() {
  const [dash, stats, rev, ap, act] = await Promise.allSettled([
    AdminService.getDashboard(),
    SuiviAdminService.statistiques(),
    SuiviAdminService.revenus(),
    SuiviAdminService.apercu(),
    SuiviAdminService.activite({ jours: 7, limite: 6 }),
  ]);
  const val = (r) => (r.status === 'fulfilled' && r.value?.success !== false ? r.value : null);
  if (!val(stats) && !val(dash)) throw new Error('Chargement impossible');
  return { success: true, dash: val(dash), stats: val(stats), rev: val(rev), ap: val(ap), act: val(act) };
}

function Tuile({ icone: Icone, libelle, valeur, unite, sous, tendance, serie, cle, onClick }) {
  return (
    <button type="button" className="vd-tuile" onClick={onClick}>
      <div className="vd-tuile-haut">
        <span className="vd-tuile-icone"><Icone size={17} /></span>
        <span className="vd-tuile-lib">{libelle}</span>
        {tendance != null && (
          <span className={`vd-tendance ${tendance >= 0 ? 'is-haut' : 'is-bas'}`}>{tendance >= 0 ? '+' : ''}{tendance} %</span>
        )}
      </div>
      <div className="vd-tuile-valeur">{valeur}{unite && <small>{unite}</small>}</div>
      <div className="vd-tuile-sous">{sous}</div>
      {serie && <div className="vd-tuile-mini"><Mini serie={serie} cle={cle} /></div>}
    </button>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { donnees, chargement, erreur, recharger } = useChargement(toutCharger, []);
  const [vue, setVue] = useState('encaisse');

  const d = donnees || {};
  const st = d.stats || {};
  const tot = st.totaux || {};
  const ab = st.abonnements || {};
  const rv = d.rev || {};
  const rt = rv.totaux || {};
  const ap = d.ap || {};
  const jours = ap.jours || [];
  const alertes = ap.alertes || {};

  // Séries sur 12 mois, alignées par mois
  const douze = useMemo(() => (st.inscriptions || []).map((m, i) => ({
    cle: m.cle,
    label: m.label,
    inscriptions: m.patrons,
    encaisse: rv.serie?.[i]?.total || 0,
    ventes: st.ventes?.[i]?.ventes || 0,
    chiffre: st.ventes?.[i]?.chiffre || 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [donnees]);

  const ventes30 = jours.reduce((s, j) => s + j.ventes, 0);
  const chiffre30 = jours.reduce((s, j) => s + j.chiffre, 0);
  const actions30 = jours.reduce((s, j) => s + j.actions, 0);
  const moitie = (k) => {
    const a = jours.slice(15).reduce((s, j) => s + j[k], 0);
    const b = jours.slice(0, 15).reduce((s, j) => s + j[k], 0);
    return ecart(a, b, 5);
  };
  const inscritsMois = douze.length ? douze[douze.length - 1].inscriptions : 0;
  const heurePic = (ap.heures || []).reduce((m, h) => (h.ventes > (m?.ventes || 0) ? h : m), null);

  const VUES = {
    encaisse: { nom: 'Encaissé', format: fcfa, total: fcfa(douze.reduce((s, m) => s + m.encaisse, 0)), lib: 'encaissés sur 12 mois' },
    inscriptions: { nom: 'Nouveaux patrons', format: nombre, total: nombre(douze.reduce((s, m) => s + m.inscriptions, 0)), lib: 'inscrits sur 12 mois' },
    chiffre: { nom: "Chiffre d'affaires des magasins", format: fcfa, total: fcfa(douze.reduce((s, m) => s + m.chiffre, 0)), lib: 'vendus par les magasins sur 12 mois' },
  };
  const v = VUES[vue];

  const aTraiter = [
    { icone: CalendarX, lib: 'Abonnements expirés', n: alertes.expires, lien: '/super-admin/alertes', ton: 'danger' },
    { icone: Hourglass, lib: 'Expirent dans 7 jours', n: alertes.expirent, lien: '/super-admin/alertes', ton: 'warn' },
    { icone: UserX, lib: 'Patrons inactifs depuis 14 jours', n: alertes.inactifs, lien: '/super-admin/alertes', ton: 'warn' },
    { icone: ShieldAlert, lib: 'Comptes bloqués', n: alertes.bloques, lien: '/super-admin/securite', ton: 'danger' },
    { icone: MapPinOff, lib: 'Magasins sans position', n: alertes.sans_position, lien: '/super-admin/carte', ton: 'neutre' },
  ];

  const derniers = d.dash?.derniers_utilisateurs || [];
  const top = st.top_magasins || [];
  const maxTop = Math.max(1, ...top.map((m) => m.chiffre));
  const evts = d.act?.evenements || [];

  return (
    <div className="su vd">
      <EnTete
        titre={`${salutation()}, voici Miyo aujourd'hui`}
        sous={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        chargement={chargement}
        onRecharger={recharger}
      />
      <Erreur texte={erreur} onRecharger={recharger} />

      {chargement && !donnees ? <Chargement /> : donnees && (
        <>
          {/* 1. Chiffres clés */}
          <div className="vd-tuiles">
            <Tuile icone={Users} libelle="Patrons" valeur={nombre(tot.patrons)} sous={`${pluriel(inscritsMois, 'nouveau', 'nouveaux')} ce mois-ci · ${nombre(tot.employes)} employés`}
              serie={douze} cle="inscriptions" onClick={() => navigate('/super-admin/utilisateurs')} />
            <Tuile icone={Store} libelle="Magasins actifs" valeur={nombre(tot.actifs_7j)} unite={`/ ${nombre(tot.magasins)}`}
              sous={`cette semaine · ${nombre(tot.actifs_30j)} sur 30 jours`} tendance={moitie('magasins')}
              serie={jours} cle="magasins" onClick={() => navigate('/super-admin/activite')} />
            <Tuile icone={Banknote} libelle="Encaissé ce mois-ci" valeur={court(rt.ce_mois)} unite="FCFA"
              sous={`Attendu par mois : ${fcfa(rt.revenu_mensuel)}`} tendance={ecart(rt.ce_mois, rt.mois_dernier)}
              serie={douze} cle="encaisse" onClick={() => navigate('/super-admin/revenus')} />
            <Tuile icone={ShoppingCart} libelle="Ventes (30 jours)" valeur={nombre(ventes30)}
              sous={`${fcfa(chiffre30)} dans les magasins`} tendance={moitie('ventes')}
              serie={jours} cle="ventes" onClick={() => navigate('/super-admin/statistiques')} />
          </div>

          {/* 2. Évolution + abonnements */}
          <div className="vd-ligne vd-ligne--2-1">
            <Panneau
              titre="Évolution sur 12 mois"
              icone={TrendingUp}
              actions={(
                <div className="su-seg" role="group" aria-label="Valeur affichée">
                  {[['encaisse', 'Encaissé'], ['inscriptions', 'Inscriptions'], ['chiffre', 'Ventes des magasins']].map(([k, l]) => (
                    <button key={k} type="button" className={vue === k ? 'is-on' : ''} aria-pressed={vue === k} onClick={() => setVue(k)}>{l}</button>
                  ))}
                </div>
              )}
            >
              <Courbe serie={douze} series={[{ cle: vue, nom: v.nom }]} format={v.format} formatAxe={court} hauteur={330}
                total={{ valeur: v.total, libelle: v.lib }} />
            </Panneau>
            <Panneau titre="Abonnements" icone={CreditCard}
              actions={<button type="button" className="su-lien" onClick={() => navigate('/super-admin/abonnements')}>Gérer <ChevronRight size={14} /></button>}>
              <Anneau
                taille={170}
                donnees={[
                  { nom: 'Abonnés payants', valeur: ab.actifs, couleur: '#C2410C' },
                  { nom: "En période d'essai", valeur: ab.essai, couleur: '#FDBA74' },
                  { nom: 'Expirés', valeur: ab.expires, couleur: '#A8A29E' },
                ]}
                centre={{ valeur: `${ab.taux_conversion || 0} %`, libelle: 'conversion' }}
              />
              <ol className="vd-mini-liste">
                <li><span>À renouveler sous 30 jours</span><strong>{nombre(rt.nb_a_renouveler)} · {fcfa(rt.a_renouveler)}</strong></li>
                <li><span>Essais en cours</span><strong>{nombre(rt.nb_essais)} · {fcfa(rt.potentiel_essais)}</strong></li>
                <li><span>Moyen le plus utilisé</span><strong>{rv.par_moyen?.[0] ? (MOYENS[rv.par_moyen[0].moyen] || rv.par_moyen[0].moyen) : '—'}</strong></li>
              </ol>
            </Panneau>
          </div>

          {/* 3. Activité 30 jours + heures */}
          <div className="vd-ligne vd-ligne--2-1">
            <Panneau titre="Activité des magasins" sous="Actions enregistrées chaque jour, 30 derniers jours" icone={Activity}
              actions={<button type="button" className="su-lien" onClick={() => navigate('/super-admin/activite')}>Voir le détail <ChevronRight size={14} /></button>}>
              <Courbe serie={jours} series={[{ cle: 'actions', nom: 'Actions' }, { cle: 'ventes', nom: 'Ventes', pointille: true }]} hauteur={250}
                total={{ valeur: nombre(actions30), libelle: `actions · ${pluriel(ventes30, 'vente')}` }} />
            </Panneau>
            <Panneau titre="Heures de vente" sous="Ventes par heure, 30 derniers jours" icone={Clock}>
              <Colonnes serie={(ap.heures || []).filter((h) => h.cle >= 6 && h.cle <= 22)} cle="ventes" nom="Ventes" hauteur={210} />
              {heurePic?.ventes > 0 && <p className="vd-note">Pic vers <strong>{heurePic.label}</strong> : évite de lancer une maintenance à cette heure-là.</p>}
            </Panneau>
          </div>

          {/* 4. Top magasins, villes, à traiter */}
          <div className="vd-ligne vd-ligne--3">
            <Panneau titre="Meilleurs magasins" sous="Chiffre d'affaires sur 30 jours" icone={Trophy}>
              {top.length === 0 ? <p className="vd-vide">Aucune vente sur 30 jours.</p> : (
                <ol className="vd-top">
                  {top.slice(0, 5).map((m) => (
                    <li key={m.id_utilisateur}>
                      <button type="button" onClick={() => navigate(`/super-admin/utilisateurs/${m.id_utilisateur}`)}>
                        <div className="vd-top-ligne">
                          <span className="vd-top-nom">{m.nom_magasin || m.fullname}</span>
                          <strong>{court(m.chiffre)} F</strong>
                        </div>
                        <div className="vd-top-piste"><span style={{ width: `${Math.max(4, (m.chiffre / maxTop) * 100)}%` }} /></div>
                        <small>{pluriel(m.ventes, 'vente')}{m.ville ? ` · ${m.ville}` : ''}</small>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </Panneau>
            <Panneau titre="Où sont les magasins" icone={MapPin}
              actions={<button type="button" className="su-lien" onClick={() => navigate('/super-admin/carte')}>Carte <ChevronRight size={14} /></button>}>
              <Anneau taille={150} donnees={(st.villes || []).map((x) => ({ nom: x.ville || 'Non renseignée', valeur: x.n }))} centre={{ libelle: 'magasins' }} />
            </Panneau>
            <Panneau titre="À traiter" icone={AlertTriangle} compte={alertes.total || 0} tonCompte="danger">
              <ol className="vd-traiter">
                {aTraiter.map((x) => {
                  const Ic = x.icone;
                  return (
                    <li key={x.lib}>
                      <button type="button" onClick={() => navigate(x.lien)} className={x.n ? `is-${x.ton}` : 'is-zero'}>
                        <Ic size={16} />
                        <span>{x.lib}</span>
                        <strong>{nombre(x.n)}</strong>
                        <ChevronRight size={14} />
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="vd-gps">
                <Jauge valeur={ap.gps?.geo || 0} objectif={ap.gps?.total || 0} libelle="avec position GPS" />
              </div>
            </Panneau>
          </div>

          {/* 5. Derniers patrons + activité récente */}
          <div className="vd-ligne vd-ligne--2">
            <Panneau titre="Derniers patrons inscrits" icone={UserPlus} sansMarge
              actions={<button type="button" className="su-lien" onClick={() => navigate('/super-admin/utilisateurs')}>Tous les patrons <ChevronRight size={14} /></button>}>
              {derniers.length === 0 ? <p className="vd-vide">Aucun patron.</p> : (
                <ol className="vd-patrons">
                  {derniers.slice(0, 6).map((u) => (
                    <li key={u.id_utilisateur}>
                      <button type="button" onClick={() => navigate(`/super-admin/utilisateurs/${u.id_utilisateur}`)}>
                        <span className="vd-avatar">{initiales(u.fullname)}</span>
                        <span className="vd-patron-txt">
                          <strong>{u.fullname}</strong>
                          <small>{u.nom_magasin || 'Magasin pas encore renseigné'}{u.ville ? ` · ${u.ville}` : ''}</small>
                        </span>
                        <span className="vd-patron-date">
                          {dateCourte(u.date_creation)}
                          <small>{u.derniere_connexion ? 'Déjà connecté' : 'Jamais connecté'}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </Panneau>
            <Panneau titre="Ce qui se passe" sous="Dernières actions dans les magasins" icone={Activity} sansMarge
              actions={<button type="button" className="su-lien" onClick={() => navigate('/super-admin/activite')}>Tout voir <ChevronRight size={14} /></button>}>
              {evts.length === 0 ? <p className="vd-vide">Rien cette semaine.</p> : (
                <ol className="vd-fil">
                  {evts.map((e, i) => (
                    <li key={i}>
                      <span className="vd-fil-txt">
                        <strong>{e.acteur_nom && /^[a-zà-ÿ]/.test(e.libelle || '') ? `${e.acteur_nom} ${e.libelle}` : e.libelle}</strong>
                        <small>{[e.nom_magasin, e.ville].filter(Boolean).join(' · ')}{e.montant ? ` · ${fcfa(e.montant)}` : ''}</small>
                      </span>
                      <span className="vd-fil-date">{(e.date_action || '').slice(11, 16)}<small>{dateCourte(e.date_action)}</small></span>
                    </li>
                  ))}
                </ol>
              )}
            </Panneau>
          </div>
        </>
      )}
    </div>
  );
}
