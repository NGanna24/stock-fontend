// pages/SuperAdmin/Suivi/Rapports.jsx
// Rapport sur une période : argent encaissé, nouveaux patrons, ventes des magasins.
// Exports Excel (fichiers .csv) et impression.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Banknote, Receipt, UserPlus, ShoppingCart, Store, TrendingUp, Download, Printer, CalendarRange, Users, FileSpreadsheet,
} from 'lucide-react';
import SuiviAdminService from '../../../services/superAdmin/suiviAdminService';
import AbonnementAdminService from '../../../services/superAdmin/abonnementAdminService';
import { Courbe, Anneau, court } from './graphiques';
import { Chargement, Chiffre, EnTete, Erreur, Etat, Panneau, dateCourte, dateHeure, fcfa, nombre, pluriel, useChargement, useMessage } from './outils';

const MOYENS = { wave: 'Wave', orange: 'Orange Money', mtn: 'MTN MoMo', moov: 'Moov Money', banque: 'Banque', especes: 'Espèces', autre: 'Non précisé' };

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function bornes(periode) {
  const a = new Date();
  const y = a.getFullYear();
  const m = a.getMonth();
  switch (periode) {
    case 'mois_dernier': return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
    case '3_mois': return [iso(new Date(y, m - 2, 1)), iso(a)];
    case 'annee': return [iso(new Date(y, 0, 1)), iso(a)];
    case 'annee_derniere': return [iso(new Date(y - 1, 0, 1)), iso(new Date(y - 1, 11, 31))];
    default: return [iso(new Date(y, m, 1)), iso(a)];
  }
}
const PERIODES = [
  ['mois', 'Ce mois-ci'], ['mois_dernier', 'Mois dernier'], ['3_mois', '3 derniers mois'],
  ['annee', 'Cette année'], ['annee_derniere', "L'an dernier"], ['perso', 'Choisir les dates'],
];

const dateLisible = (s) => (s ? new Date(`${s.slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** Écart avec la période précédente, en texte */
function ecart(actuel, avant) {
  if (!avant) return actuel ? 'rien sur la période précédente' : 'comme la période précédente';
  const p = Math.round(((actuel - avant) / avant) * 100);
  return `${p >= 0 ? '+' : ''}${p} % par rapport à la période précédente`;
}

/** Fichier .csv lisible par Excel (séparateur ; et accents conservés) */
function telechargerCsv(nom, colonnes, lignes) {
  const cellule = (v) => {
    const s = v == null ? '' : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const contenu = [colonnes.map((c) => cellule(c.titre)).join(';'), ...lignes.map((l, i) => colonnes.map((c) => cellule(c.valeur(l, i))).join(';'))].join('\r\n');
  const blob = new Blob(['﻿', contenu], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Rapports() {
  const navigate = useNavigate();
  const [periode, setPeriode] = useState('mois');
  const [perso, setPerso] = useState(() => bornes('mois'));
  const [du, au] = periode === 'perso' ? perso : bornes(periode);
  const [courbeVentes, setCourbeVentes] = useState('ventes');
  const [vueMessage, message] = useMessage();
  const [exportPatrons, setExportPatrons] = useState(false);

  const { donnees, chargement, erreur, recharger } = useChargement(() => SuiviAdminService.rapport({ du, au }), [du, au]);
  const d = donnees;
  const r = d?.resume || {};
  const p = r.precedent || {};
  const suffixe = d ? `${d.periode.du}_${d.periode.au}` : `${du}_${au}`;
  const titrePeriode = d ? `du ${dateLisible(d.periode.du)} au ${dateLisible(d.periode.au)}` : '';
  const totalMoyens = useMemo(() => (d?.par_moyen || []).reduce((s, m) => s + m.total, 0), [d]);

  const exporterPaiements = () => {
    if (!d?.paiements.length) return message('Aucun paiement sur cette période.', true);
    telechargerCsv(`miyo-paiements-${suffixe}.csv`, [
      { titre: 'N°', valeur: (_, i) => i + 1 },
      { titre: 'Date', valeur: (x) => x.date_creation },
      { titre: 'Patron', valeur: (x) => x.fullname },
      { titre: 'Téléphone', valeur: (x) => x.telephone },
      { titre: 'Magasin', valeur: (x) => x.nom_magasin },
      { titre: 'Ville', valeur: (x) => x.ville },
      { titre: 'Montant (FCFA)', valeur: (x) => x.montant },
      { titre: 'Mois payés', valeur: (x) => x.nb_mois },
      { titre: 'Du', valeur: (x) => x.date_debut },
      { titre: 'Au', valeur: (x) => x.date_fin },
      { titre: 'Moyen de paiement', valeur: (x) => MOYENS[x.moyen_paiement] || x.moyen_paiement },
      { titre: 'Référence', valeur: (x) => x.reference },
    ], d.paiements);
    return message('Fichier des paiements téléchargé.');
  };
  const exporterInscrits = () => {
    if (!d?.inscrits.length) return message('Aucun nouveau patron sur cette période.', true);
    telechargerCsv(`miyo-nouveaux-patrons-${suffixe}.csv`, [
      { titre: 'N°', valeur: (_, i) => i + 1 },
      { titre: 'Inscrit le', valeur: (x) => x.date_creation },
      { titre: 'Patron', valeur: (x) => x.fullname },
      { titre: 'Téléphone', valeur: (x) => x.telephone },
      { titre: 'Email', valeur: (x) => x.email },
      { titre: 'Magasin', valeur: (x) => x.nom_magasin },
      { titre: 'Ville', valeur: (x) => x.ville },
      { titre: 'Pays', valeur: (x) => x.pays },
      { titre: 'Compte', valeur: (x) => (x.actif ? 'Actif' : 'Désactivé') },
      { titre: 'Dernière connexion', valeur: (x) => x.derniere_connexion || 'Jamais' },
    ], d.inscrits);
    return message('Fichier des nouveaux patrons téléchargé.');
  };
  const exporterResume = () => {
    if (!d) return;
    telechargerCsv(`miyo-resume-${suffixe}.csv`, [
      { titre: d.periode.pas === 'jour' ? 'Jour' : 'Mois', valeur: (x) => x.cle },
      { titre: 'Encaissé (FCFA)', valeur: (x) => x.encaisse },
      { titre: 'Paiements', valeur: (x) => x.paiements },
      { titre: 'Nouveaux patrons', valeur: (x) => x.inscriptions },
      { titre: 'Ventes des magasins', valeur: (x) => x.ventes },
      { titre: "Chiffre d'affaires des magasins (FCFA)", valeur: (x) => x.chiffre },
    ], d.serie);
    message('Fichier du résumé téléchargé.');
  };
  const exporterTousPatrons = async () => {
    setExportPatrons(true);
    try {
      const res = await AbonnementAdminService.liste();
      const liste = res?.abonnements || [];
      if (!liste.length) return message('Aucun patron.', true);
      const statut = (a) => (a.statut === 'expire' ? 'Expiré' : a.statut === 'essai' ? 'Essai gratuit' : 'Abonné');
      telechargerCsv(`miyo-tous-les-patrons-${iso(new Date())}.csv`, [
        { titre: 'N°', valeur: (_, i) => i + 1 },
        { titre: 'Patron', valeur: (x) => x.fullname },
        { titre: 'Téléphone', valeur: (x) => x.telephone },
        { titre: 'Magasin', valeur: (x) => x.nom_magasin },
        { titre: 'Produits', valeur: (x) => x.nb_produits },
        { titre: 'Prix par mois (FCFA)', valeur: (x) => x.montant_mensuel },
        { titre: 'Abonnement', valeur: statut },
        { titre: "Valable jusqu'au", valeur: (x) => x.date_fin },
        { titre: 'Jours restants', valeur: (x) => x.jours_restants },
      ], liste);
      return message('Fichier de tous les patrons téléchargé.');
    } catch {
      return message("L'export n'a pas pu être fait. Réessaie.", true);
    } finally {
      setExportPatrons(false);
    }
  };

  return (
    <div className="su su-rapport">
      <EnTete titre="Rapports" sous="Choisis une période pour voir ce qui s'est passé, puis exporte ou imprime." chargement={chargement} onRecharger={recharger}>
        <button type="button" className="su-btn" onClick={() => window.print()} disabled={!d}><Printer size={15} /> Imprimer</button>
      </EnTete>

      <div className="su-outils su-sans-impression">
        <div className="su-seg" role="group" aria-label="Période">
          {PERIODES.map(([v, l]) => (
            <button key={v} type="button" className={periode === v ? 'is-on' : ''} aria-pressed={periode === v}
              onClick={() => { if (v === 'perso') setPerso([du, au]); setPeriode(v); }}>{l}</button>
          ))}
        </div>
        {periode === 'perso' && (
          <div className="su-dates">
            <label>Du <input type="date" className="su-select" value={perso[0]} max={perso[1]} onChange={(e) => e.target.value && setPerso([e.target.value, perso[1]])} /></label>
            <label>au <input type="date" className="su-select" value={perso[1]} min={perso[0]} max={iso(new Date())} onChange={(e) => e.target.value && setPerso([perso[0], e.target.value])} /></label>
          </div>
        )}
      </div>

      <Erreur texte={erreur} onRecharger={recharger} />

      {chargement && !d ? <Chargement /> : d && (
        <>
          <p className="su-rapport-periode"><CalendarRange size={15} /> Rapport {titrePeriode} <span>· {pluriel(d.periode.jours, 'jour')}</span></p>

          <div className="su-chiffres">
            <Chiffre icone={Banknote} libelle="Encaissé" valeur={nombre(r.encaisse)} unite="FCFA" ton="brand" sous={ecart(r.encaisse, p.encaisse)} />
            <Chiffre icone={Receipt} libelle="Paiements reçus" valeur={nombre(r.nb_paiements)} sous={totalMoyens ? `${(d.par_moyen[0] && (MOYENS[d.par_moyen[0].moyen] || d.par_moyen[0].moyen))} en tête` : 'Aucun paiement'} />
            <Chiffre icone={UserPlus} libelle="Nouveaux patrons" valeur={nombre(r.inscriptions)} sous={ecart(r.inscriptions, p.inscriptions)} />
            <Chiffre icone={ShoppingCart} libelle="Ventes dans les magasins" valeur={nombre(r.ventes)} sous={ecart(r.ventes, p.ventes)} />
            <Chiffre icone={TrendingUp} libelle="Chiffre d'affaires des magasins" valeur={court(r.chiffre_magasins)} unite="FCFA" sous="tous magasins confondus" />
            <Chiffre icone={Store} libelle="Magasins actifs" valeur={nombre(r.magasins_actifs)} sous="au moins une action" />
          </div>

          <Panneau titre="Argent encaissé" sous={d.periode.pas === 'jour' ? 'Jour par jour' : 'Mois par mois'} icone={Banknote}>
            <Courbe serie={d.serie} series={[{ cle: 'encaisse', nom: 'Encaissé' }]} format={fcfa} formatAxe={court} hauteur={260}
              total={{ valeur: fcfa(r.encaisse), libelle: pluriel(r.nb_paiements, 'paiement reçu', 'paiements reçus') }} />
          </Panneau>

          <div className="su-grille">
            <Panneau titre="Nouveaux patrons" sous={d.periode.pas === 'jour' ? 'Inscriptions par jour' : 'Inscriptions par mois'} icone={UserPlus}>
              <Courbe serie={d.serie} series={[{ cle: 'inscriptions', nom: 'Nouveaux patrons' }]} hauteur={220}
                total={{ valeur: nombre(r.inscriptions), libelle: 'inscrits sur la période' }} />
            </Panneau>
            <Panneau titre="Par moyen de paiement" sous="Sur la période" icone={Receipt}>
              <Anneau donnees={d.par_moyen.map((m) => ({ nom: MOYENS[m.moyen] || m.moyen, valeur: m.total }))} format={fcfa}
                centre={{ valeur: court(totalMoyens), libelle: 'FCFA encaissés' }} />
            </Panneau>
          </div>

          <Panneau
            titre="Ventes dans les magasins"
            sous="Tous magasins confondus"
            icone={ShoppingCart}
            actions={(
              <div className="su-seg su-sans-impression" role="group" aria-label="Valeur affichée">
                {[['ventes', 'Nombre de ventes'], ['chiffre', "Chiffre d'affaires"]].map(([v, l]) => (
                  <button key={v} type="button" className={courbeVentes === v ? 'is-on' : ''} aria-pressed={courbeVentes === v} onClick={() => setCourbeVentes(v)}>{l}</button>
                ))}
              </div>
            )}
          >
            <Courbe serie={d.serie} series={[{ cle: courbeVentes, nom: courbeVentes === 'chiffre' ? "Chiffre d'affaires" : 'Ventes' }]}
              format={courbeVentes === 'chiffre' ? fcfa : nombre} formatAxe={court} hauteur={240} />
          </Panneau>

          <div className="su-sans-impression">
          <Panneau titre="Exporter vers Excel" sous="Fichiers .csv qui s'ouvrent dans Excel ou Google Sheets" icone={FileSpreadsheet}>
            <ol className="su-exports">
              <li>
                <div><strong>Paiements de la période</strong><span>{pluriel(d.paiements.length, 'paiement')}, avec patron, montant, moyen et référence</span></div>
                <button type="button" className="su-btn" onClick={exporterPaiements}><Download size={15} /> Télécharger</button>
              </li>
              <li>
                <div><strong>Nouveaux patrons de la période</strong><span>{pluriel(d.inscrits.length, 'patron')}, avec contact et magasin</span></div>
                <button type="button" className="su-btn" onClick={exporterInscrits}><Download size={15} /> Télécharger</button>
              </li>
              <li>
                <div><strong>Résumé {d.periode.pas === 'jour' ? 'jour par jour' : 'mois par mois'}</strong><span>Encaissé, paiements, inscriptions et ventes</span></div>
                <button type="button" className="su-btn" onClick={exporterResume}><Download size={15} /> Télécharger</button>
              </li>
              <li>
                <div><strong>Tous les patrons aujourd'hui</strong><span>Avec leur abonnement et leur date de fin</span></div>
                <button type="button" className="su-btn" onClick={exporterTousPatrons} disabled={exportPatrons}><Users size={15} /> {exportPatrons ? 'Préparation…' : 'Télécharger'}</button>
              </li>
            </ol>
          </Panneau>
          </div>

          <Panneau titre="Paiements de la période" compte={d.paiements.length} icone={Receipt} sansMarge>
            {d.paiements.length === 0 ? <Etat icone={Receipt} titre="Aucun paiement" texte="Aucun abonnement payé sur cette période." /> : (
              <div className="su-table-wrap">
                <table className="su-table">
                  <thead><tr><th className="n">N°</th><th>Patron</th><th className="r">Montant</th><th className="cache-etroit">Période payée</th><th>Moyen</th><th className="cache-etroit">Enregistré</th></tr></thead>
                  <tbody>
                    {d.paiements.map((x) => (
                      <tr key={x.id_abonnement}>
                        <td className="n" />
                        <td><button type="button" className="su-lien" onClick={() => navigate(`/super-admin/utilisateurs/${x.id_utilisateur}`)}>{x.fullname}</button><span className="su-sous">{x.nom_magasin || 'Magasin sans nom'}</span></td>
                        <td className="r"><strong>{fcfa(x.montant)}</strong><span className="su-sous">{pluriel(x.nb_mois, 'mois', 'mois')}</span></td>
                        <td className="cache-etroit">{dateCourte(x.date_debut)} au {dateCourte(x.date_fin)}</td>
                        <td>{MOYENS[x.moyen_paiement] || x.moyen_paiement || 'Non précisé'}{x.reference && <span className="su-sous">{x.reference}</span>}</td>
                        <td className="cache-etroit nw">{dateHeure(x.date_creation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panneau>

          <Panneau titre="Nouveaux patrons de la période" compte={d.inscrits.length} icone={UserPlus} sansMarge>
            {d.inscrits.length === 0 ? <Etat icone={UserPlus} titre="Aucune inscription" texte="Aucun nouveau patron sur cette période." /> : (
              <div className="su-table-wrap">
                <table className="su-table">
                  <thead><tr><th className="n">N°</th><th>Patron</th><th>Magasin</th><th className="cache-etroit">Contact</th><th className="cache-etroit">Dernière connexion</th><th className="nw">Inscrit le</th></tr></thead>
                  <tbody>
                    {d.inscrits.map((x) => (
                      <tr key={x.id_utilisateur}>
                        <td className="n" />
                        <td><button type="button" className="su-lien" onClick={() => navigate(`/super-admin/utilisateurs/${x.id_utilisateur}`)}>{x.fullname}</button>{!x.actif && <span className="su-sous">Compte désactivé</span>}</td>
                        <td>{x.nom_magasin || 'Pas encore de magasin'}{x.ville && <span className="su-sous">{x.ville}</span>}</td>
                        <td className="cache-etroit">{x.telephone || '—'}{x.email && <span className="su-sous">{x.email}</span>}</td>
                        <td className="cache-etroit">{x.derniere_connexion ? dateHeure(x.derniere_connexion) : 'Jamais'}</td>
                        <td className="nw">{dateCourte(x.date_creation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panneau>
        </>
      )}
      {vueMessage}
    </div>
  );
}
