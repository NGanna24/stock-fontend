// components/HorsLigne/HorsLigne.jsx
//
// Bandeau « hors ligne » + panneau des ventes en attente d'envoi.
// Monté une seule fois dans DashboardLayout : il démarre aussi la surveillance de la connexion.
import React, { useEffect, useRef, useState } from 'react';
import {
  WifiOff, RefreshCw, CloudUpload, CheckCircle, AlertTriangle, X, Loader, Trash2, RotateCcw, PackageX, Database,
} from 'lucide-react';
import { useUser } from '../../context/AuthContext';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import {
  useHorsLigne, demarrerHorsLigne, actualiser, synchroniser, preparer, ventesLocales, historiqueEnvois,
  abandonnerVente, reessayerVente, oublierBilan, verifierConnexion,
} from '../../offline/horsLigne';
import '../../pages/Ventes/Ventes.css';
import './HorsLigne.css';

const NBSP = ' ';
const fm = (v) => `${Math.round(Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}${NBSP}FCFA`;
const pad = (n) => String(n).padStart(2, '0');
const heure = (d) => { const x = new Date(d); return isNaN(x) ? '-' : `${pad(x.getHours())}:${pad(x.getMinutes())}`; };
const dateHeure = (d) => {
  const x = new Date(d);
  if (isNaN(x)) return '-';
  const auj = new Date().toDateString() === x.toDateString();
  return auj ? `aujourd'hui à ${heure(d)}` : `le ${pad(x.getDate())}/${pad(x.getMonth() + 1)} à ${heure(d)}`;
};
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// ============================================================
// PANNEAU
// ============================================================
function Panneau({ hl, onClose }) {
  const [ventes, setVentes] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [action, setAction] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);
  const ref = useRef(null);

  const recharger = async () => {
    setVentes(await ventesLocales());
    setHistorique(await historiqueEnvois());
  };
  useEffect(() => { recharger(); }, [hl.enAttente, hl.rejetees, hl.derniereSynchro]);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector(".confirm-modal-overlay")) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const lancer = async (nom, fn) => {
    setAction(nom);
    setErreur(null);
    try { await fn(); } catch (e) { setErreur(e.message || 'Opération impossible'); } finally { setAction(null); recharger(); }
  };

  const miennes = (ventes || []).filter((v) => v.estAMoi);
  const attente = miennes.filter((v) => v.statut !== 'rejetee');
  const rejetees = miennes.filter((v) => v.statut === 'rejetee');
  const autres = (ventes || []).filter((v) => !v.estAMoi);
  const totalAttente = attente.reduce((s, v) => s + v.montant_total, 0);

  return (
    <div className="vt hl-root">
      <div className="vt-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div ref={ref} className="vt-modal vt-modal--lg" role="dialog" aria-modal="true" aria-labelledby="hl-titre" tabIndex={-1}>
          {(hl.synchro || action) && <div className="vt-busybar" />}
          <div className="vt-modal-head">
            <div className="vt-modal-titles">
              <h2 id="hl-titre" className="vt-modal-title">Ventes hors ligne</h2>
              <p className="vt-modal-sub">
                {hl.enLigne ? 'Connexion internet rétablie' : 'Pas de connexion : les ventes sont gardées sur cet appareil'}
              </p>
            </div>
            <button type="button" className="vt-iconbtn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
          </div>

          <div className="vt-modal-body">
            {erreur && <div className="vt-error" role="alert"><AlertTriangle size={16} /><span>{erreur}</span></div>}

            <dl className="vt-facts hl-facts">
              <div><dt>Connexion</dt><dd className={hl.enLigne ? 'hl-ok' : 'hl-ko'}>{hl.enLigne ? 'En ligne' : 'Hors ligne'}</dd></div>
              <div><dt>En attente d'envoi</dt><dd>{pluriel(attente.length, 'vente')}</dd></div>
              <div><dt>Montant en attente</dt><dd>{fm(totalAttente)}</dd></div>
              <div><dt>Catalogue sur l'appareil</dt><dd>{hl.catalogueDate ? `${hl.nbProduits} produits, ${dateHeure(hl.catalogueDate)}` : 'Pas encore téléchargé'}</dd></div>
            </dl>

            {rejetees.length > 0 && (
              <>
                <h3 className="vt-section-title hl-danger-title">Refusées par le serveur</h3>
                <ul className="hl-liste">
                  {rejetees.map((v) => (
                    <li key={v.id_local} className="hl-item hl-item--ko">
                      <div className="hl-item-main">
                        <strong>{v.numero_provisoire}</strong> · {v.nomclient || 'Client'} · {fm(v.montant_total)}
                        <div className="hl-item-sub hl-ko">{v.message}</div>
                      </div>
                      <div className="hl-item-actions">
                        <button type="button" className="vt-btn vt-btn--sm" disabled={!!action || !hl.enLigne}
                                onClick={() => lancer(`r-${v.id_local}`, () => reessayerVente(v.id_local))}>
                          <RotateCcw size={14} /> Réessayer
                        </button>
                        <button type="button" className="vt-btn vt-btn--sm hl-suppr" disabled={!!action}
                                onClick={() => setASupprimer(v)}>
                          <Trash2 size={14} /> Supprimer
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3 className="vt-section-title">En attente d'envoi</h3>
            {ventes === null ? <p className="vt-muted">Chargement…</p> : attente.length === 0 ? (
              <p className="vt-muted hl-vide"><CheckCircle size={15} /> Aucune vente en attente : tout est enregistré sur le serveur.</p>
            ) : (
              <ul className="hl-liste">
                {attente.map((v) => {
                  const paye = v.paiements.reduce((s, p) => s + p.montant, 0);
                  return (
                    <li key={v.id_local} className="hl-item">
                      <div className="hl-item-main">
                        <strong>{v.numero_provisoire}</strong> · {heure(v.date_vente)} · {v.nomclient || 'Client'}
                        <div className="hl-item-sub">
                          {pluriel(v.lignes.length, 'produit')} · {paye >= v.montant_total - 0.01 ? 'payée' : paye > 0 ? `payé ${fm(paye)}` : 'non payée'}
                        </div>
                      </div>
                      <strong className="vt-num">{fm(v.montant_total)}</strong>
                    </li>
                  );
                })}
              </ul>
            )}
            {autres.length > 0 && (
              <p className="hl-note">
                {pluriel(autres.length, 'autre vente')} faite{autres.length > 1 ? 's' : ''} sur cet appareil par un autre compte : elle{autres.length > 1 ? 's' : ''} sera{autres.length > 1 ? 'ont' : ''} envoyée{autres.length > 1 ? 's' : ''} quand cette personne se reconnectera.
              </p>
            )}

            {historique.length > 0 && (
              <>
                <h3 className="vt-section-title hl-gap">Derniers envois</h3>
                <ul className="hl-liste">
                  {historique.slice(0, 10).map((h) => (
                    <li key={`${h.numero_provisoire}-${h.numero_commande}`} className="hl-item">
                      <div className="hl-item-main">
                        <strong>{h.numero_provisoire}</strong> → <strong>{h.numero_commande}</strong> · {h.nomclient || 'Client'}
                        <div className="hl-item-sub">Envoyée {dateHeure(h.envoye_le)}</div>
                        {h.ruptures?.length > 0 && h.ruptures.map((r) => (
                          <div key={r.id_produit} className="hl-rupture">
                            <PackageX size={13} /> Stock à vérifier : {r.produit} (stock passé à {r.stock_apres})
                          </div>
                        ))}
                      </div>
                      <strong className="vt-num">{fm(h.montant_total)}</strong>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="vt-modal-foot hl-foot">
            <button type="button" className="vt-btn" disabled={!hl.enLigne || !!action}
                    onClick={() => lancer('catalogue', () => preparer({ force: true }))}>
              {action === 'catalogue' ? <Loader size={16} className="vt-spin" /> : <Database size={16} />} Mettre à jour le catalogue
            </button>
            {!hl.enLigne && (
              <button type="button" className="vt-btn" disabled={!!action} onClick={() => lancer('test', verifierConnexion)}>
                <RefreshCw size={16} className={action === 'test' ? 'vt-spin' : ''} /> Tester la connexion
              </button>
            )}
            <button type="button" className="vt-btn vt-btn--primary" disabled={!hl.enLigne || attente.length === 0 || hl.synchro || !!action}
                    onClick={() => lancer('envoi', synchroniser)}>
              {hl.synchro ? <Loader size={16} className="vt-spin" /> : <CloudUpload size={16} />} Envoyer maintenant
            </button>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={!!aSupprimer}
        onClose={() => setASupprimer(null)}
        onConfirm={() => {
          const v = aSupprimer;
          setASupprimer(null);
          lancer(`s-${v.id_local}`, () => abandonnerVente(v.id_local));
        }}
        title="Supprimer cette vente ?"
        message={aSupprimer ? `La vente ${aSupprimer.numero_provisoire} (${fm(aSupprimer.montant_total)}) sera retirée de cet appareil et ne sera jamais enregistrée. Faites-le seulement si elle a été saisie à nouveau ou annulée.` : ''}
        confirmLabel="Supprimer"
        type="danger"
      />
    </div>
  );
}

// ============================================================
// BANDEAU
// ============================================================
export default function HorsLigne() {
  const hl = useHorsLigne();
  const { user } = useUser();
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => { demarrerHorsLigne(); }, []);
  // Changement de compte : catalogue et compteurs propres à ce compte
  useEffect(() => { if (user) actualiser().then(() => synchroniser()).catch(() => {}); }, [user?.id, user?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bilan d'envoi sans problème : disparaît tout seul
  const bilan = hl.dernierBilan;
  const bilanAProbleme = bilan && (bilan.ruptures.length || bilan.rejetees.length || bilan.avertissements.length);
  useEffect(() => {
    if (!bilan || bilanAProbleme) return undefined;
    const t = setTimeout(oublierBilan, 6000);
    return () => clearTimeout(t);
  }, [bilan, bilanAProbleme]);

  let contenu = null;
  let ton = 'info';
  if (!hl.enLigne) {
    ton = 'off';
    contenu = (
      <>
        <WifiOff size={16} />
        <span>
          <strong>Hors ligne.</strong>{' '}
          {hl.pret ? 'Vous pouvez continuer à vendre.' : 'Le catalogue n\'a pas encore été téléchargé sur cet appareil : la vente hors ligne n\'est pas possible.'}
          {hl.enAttente > 0 && ` ${pluriel(hl.enAttente, 'vente')} ser${hl.enAttente > 1 ? 'ont envoyées' : 'a envoyée'} au retour de la connexion.`}
        </span>
      </>
    );
  } else if (hl.synchro) {
    contenu = <><Loader size={16} className="vt-spin" /><span>Envoi des ventes faites hors ligne…</span></>;
  } else if (hl.rejetees > 0) {
    ton = 'ko';
    contenu = <><AlertTriangle size={16} /><span><strong>{pluriel(hl.rejetees, 'vente')} hors ligne refusée{hl.rejetees > 1 ? 's' : ''}</strong> par le serveur : à vérifier.</span></>;
  } else if (bilan) {
    ton = bilanAProbleme ? 'warn' : 'ok';
    contenu = (
      <>
        {bilanAProbleme ? <PackageX size={16} /> : <CheckCircle size={16} />}
        <span>
          {bilan.envoyees.length > 0 && <><strong>{pluriel(bilan.envoyees.length, 'vente')} hors ligne enregistrée{bilan.envoyees.length > 1 ? 's' : ''}.</strong> </>}
          {bilan.ruptures.length > 0 && `Stock à vérifier pour ${pluriel(new Set(bilan.ruptures.map((r) => r.id_produit)).size, 'produit')} (vendu au-delà du stock). `}
          {bilan.avertissements.length > 0 && bilan.avertissements[0]}
        </span>
      </>
    );
  } else if (hl.enAttente > 0) {
    ton = 'warn';
    contenu = <><CloudUpload size={16} /><span>{pluriel(hl.enAttente, 'vente')} hors ligne en attente d'envoi.</span></>;
  }

  return (
    <>
      {contenu && (
        <div className="hl-bandeau" data-ton={ton} role="status" aria-live="polite">
          {contenu}
          <button type="button" className="hl-bandeau-btn" onClick={() => setOuvert(true)}>Voir</button>
          {bilan && hl.enLigne && !hl.synchro && hl.rejetees === 0 && (
            <button type="button" className="hl-bandeau-x" onClick={oublierBilan} aria-label="Masquer"><X size={14} /></button>
          )}
        </div>
      )}
      {ouvert && <Panneau hl={hl} onClose={() => setOuvert(false)} />}
    </>
  );
}
