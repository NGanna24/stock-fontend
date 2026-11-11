// pages/Emplacements/Emplacements.jsx
// ============================================================
// Où ranger le stock : emplacement > rayon > étagère.
// Trois colonnes : on choisit un emplacement pour voir ses rayons,
// puis un rayon pour voir ses étagères. Ces listes sont ensuite
// proposées dans la fiche produit.
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Check, X, RefreshCw, ChevronRight, Loader } from 'lucide-react';
import { useUser } from '../../context/AuthContext';
import { Page, PageHead, ErrorBar, Confirm, Toast, useToast, pluriel } from '../../components/UI/Vt';
import {
  NIVEAUX, listerEmplacements, creerEmplacement, renommerEmplacement, supprimerEmplacement, enfantsDe,
} from '../../config/emplacements';
import '../Ventes/Ventes.css';
import './Emplacements.css';

// Nombre de produits rangés dans un nœud et tout ce qu'il contient
function totalProduits(liste, n) {
  const enfants = liste.filter((e) => e.id_parent === n.id_emplacement);
  return n.nb_produits + enfants.reduce((s, e) => s + totalProduits(liste, e), 0);
}

function Colonne({ niveau, items, liste, parent, choisi, onChoisir, peutModifier, onAjouter, onRenommer, onSupprimer, occupe, entrepot }) {
  const [nouveau, setNouveau] = useState('');
  const [edition, setEdition] = useState(null); // { id, nom }
  const bloque = niveau.cle !== 'emplacement' && !parent;
  const dernier = niveau.cle === 'etagere';

  const ajouter = async (e) => {
    e.preventDefault();
    if (!nouveau.trim()) return;
    if (await onAjouter(niveau.cle, nouveau.trim(), parent?.id_emplacement)) setNouveau('');
  };
  const valider = async () => {
    if (!edition?.nom.trim()) return;
    if (await onRenommer(edition.id, edition.nom.trim())) setEdition(null);
  };

  return (
    <section className="em-col" aria-labelledby={`em-t-${niveau.cle}`}>
      <header className="em-col-head">
        <h2 id={`em-t-${niveau.cle}`}>{niveau.titre}</h2>
        <span className="vt-muted em-col-sous">
          {bloque
            ? (niveau.cle === 'rayon' ? 'Choisissez un emplacement' : 'Choisissez un rayon')
            : parent ? `dans ${parent.nom}` : pluriel(items.length, niveau.un, `${niveau.un}s`)}
        </span>
      </header>

      {bloque ? (
        <p className="em-vide">
          {niveau.cle === 'rayon'
            ? 'Cliquez sur un emplacement à gauche pour voir et ajouter ses rayons.'
            : 'Cliquez sur un rayon pour voir et ajouter ses étagères.'}
        </p>
      ) : (
        <>
          {items.length === 0 ? (
            <p className="em-vide">Aucun{niveau.cle === 'etagere' ? 'e' : ''} {niveau.un} pour le moment.</p>
          ) : (
            <ol className="em-liste">
              {items.map((it, i) => {
                const nb = totalProduits(liste, it);
                const actif = choisi === it.id_emplacement;
                const enEdition = edition?.id === it.id_emplacement;
                return (
                  <li key={it.id_emplacement} className={`em-item ${actif ? 'is-active' : ''}`}>
                    <span className="em-num">{i + 1}</span>
                    {enEdition ? (
                      <form className="em-edit" onSubmit={(e) => { e.preventDefault(); valider(); }}>
                        <input className="vt-input" value={edition.nom} maxLength={100} autoFocus
                               onChange={(e) => setEdition({ ...edition, nom: e.target.value })}
                               onKeyDown={(e) => { if (e.key === 'Escape') setEdition(null); }}
                               aria-label={`Nouveau nom de ${it.nom}`} />
                        <button type="submit" className="vt-iconbtn" aria-label="Valider" disabled={occupe}><Check size={16} /></button>
                        <button type="button" className="vt-iconbtn" aria-label="Annuler" onClick={() => setEdition(null)}><X size={16} /></button>
                      </form>
                    ) : (
                      <>
                        <button type="button" className="em-nom" onClick={() => !dernier && onChoisir(it)}
                                aria-pressed={dernier ? undefined : actif} disabled={dernier}>
                          <span className="em-nom-txt">{it.nom}</span>
                          <span className="em-nb">{pluriel(nb, 'produit')}</span>
                          {!dernier && <ChevronRight size={15} className="em-chev" />}
                        </button>
                        {peutModifier && (
                          <span className="em-actions">
                            <button type="button" className="vt-iconbtn vt-iconbtn--sm" title="Renommer" aria-label={`Renommer ${it.nom}`}
                                    onClick={() => setEdition({ id: it.id_emplacement, nom: it.nom })}><Pencil size={14} /></button>
                            <button type="button" className="vt-iconbtn vt-iconbtn--sm" title="Supprimer" aria-label={`Supprimer ${it.nom}`}
                                    onClick={() => onSupprimer(it, nb)}><Trash2 size={14} /></button>
                          </span>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {peutModifier && (
            <form className="em-ajout" onSubmit={ajouter}>
              <input className="vt-input" value={nouveau} onChange={(e) => setNouveau(e.target.value)}
                     placeholder={entrepot ? niveau.exempleEntrepot : niveau.exemple} maxLength={100} aria-label={niveau.nouveau} />
              <button type="submit" className="vt-btn vt-btn--primary" disabled={occupe || !nouveau.trim()}>
                <Plus size={16} /> Ajouter
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}

// Les trois colonnes + confirmations. idEntrepot vide = boutique.
// afficher(message, type) : notification de la page qui l'accueille.
export function GestionEmplacements({ idEntrepot = null, afficher, rechargement = 0, onChange }) {
  const { user } = useUser();
  const role = String(user?.role || '').toLowerCase();
  const peutModifier = user?.type !== 'employe' || role !== 'caissier';

  const [liste, setListe] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [idEmp, setIdEmp] = useState(null);
  const [idRayon, setIdRayon] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try { setListe(await listerEmplacements(idEntrepot)); }
    catch { setErreur('Impossible de charger les emplacements.'); }
    finally { setChargement(false); }
  }, [idEntrepot]);
  useEffect(() => { setIdEmp(null); setIdRayon(null); charger(); }, [charger, rechargement]);

  const emplacements = useMemo(() => enfantsDe(liste, null, 'emplacement'), [liste]);
  const empChoisi = emplacements.find((e) => e.id_emplacement === idEmp) || null;
  const rayons = useMemo(() => (empChoisi ? enfantsDe(liste, empChoisi.id_emplacement, 'rayon') : []), [liste, empChoisi]);
  const rayonChoisi = rayons.find((r) => r.id_emplacement === idRayon) || null;
  const etageres = useMemo(() => (rayonChoisi ? enfantsDe(liste, rayonChoisi.id_emplacement, 'etagere') : []), [liste, rayonChoisi]);

  const ajouter = async (niveau, nom, id_parent) => {
    setOccupe(true);
    try {
      const e = await creerEmplacement({ niveau, nom, id_parent, id_entrepot: idEntrepot });
      setListe((l) => [...l, e]);
      afficher(`« ${e.nom} » ajouté`, 'success');
      return true;
    } catch (e) { afficher(e.message, 'error'); return false; }
    finally { setOccupe(false); }
  };

  const renommer = async (id, nom) => {
    setOccupe(true);
    try {
      await renommerEmplacement(id, nom);
      setListe((l) => l.map((x) => (x.id_emplacement === id ? { ...x, nom } : x)));
      afficher('Nom modifié. Les fiches produits sont à jour.', 'success');
      onChange?.();
      return true;
    } catch (e) { afficher(e.message, 'error'); return false; }
    finally { setOccupe(false); }
  };

  const supprimer = async () => {
    const cible = aSupprimer.item;
    setOccupe(true);
    try {
      await supprimerEmplacement(cible.id_emplacement);
      await charger();
      if (cible.id_emplacement === idEmp) { setIdEmp(null); setIdRayon(null); }
      if (cible.id_emplacement === idRayon) setIdRayon(null);
      afficher(`« ${cible.nom} » supprimé`, 'success');
      setASupprimer(null);
    } catch (e) { afficher(e.message, 'error'); setASupprimer(null); }
    finally { setOccupe(false); }
  };

  const communs = { liste, peutModifier, onAjouter: ajouter, onRenommer: renommer, occupe, entrepot: !!idEntrepot,
    onSupprimer: (item, nb) => setASupprimer({ item, nb }) };

  return (
    <>
      {erreur && <ErrorBar message={erreur} onRetry={charger} />}

      {chargement && liste.length === 0 ? (
        <div className="em-chargement"><Loader size={18} className="vt-spin" /> Chargement…</div>
      ) : (
        <div className="em-grille">
          <Colonne niveau={NIVEAUX[0]} items={emplacements} parent={null} choisi={idEmp}
                   onChoisir={(e) => { setIdEmp(e.id_emplacement); setIdRayon(null); }} {...communs} />
          <Colonne niveau={NIVEAUX[1]} items={rayons} parent={empChoisi} choisi={idRayon}
                   onChoisir={(r) => setIdRayon(r.id_emplacement)} {...communs} />
          <Colonne niveau={NIVEAUX[2]} items={etageres} parent={rayonChoisi} choisi={null}
                   onChoisir={() => {}} {...communs} />
        </div>
      )}

      {!chargement && emplacements.length === 0 && !erreur && (
        <p className="em-astuce"><MapPin size={14} /> {idEntrepot
          ? 'Commencez par un emplacement (par exemple « Zone A » ou « Quai »), puis ajoutez-y des rayons.'
          : 'Commencez par un emplacement (par exemple « Boutique » ou « Réserve »), puis ajoutez-y des rayons.'}</p>
      )}

      {aSupprimer && (
        aSupprimer.nb > 0 ? (
          <Confirm title="Suppression impossible" confirmLabel="Compris" cancelLabel="Fermer"
                   onConfirm={() => setASupprimer(null)} onClose={() => setASupprimer(null)}>
            <p><strong>{pluriel(aSupprimer.nb, 'produit')}</strong> {aSupprimer.nb > 1 ? 'sont rangés' : 'est rangé'} dans « {aSupprimer.item.nom} ».
              Changez d'abord leur emplacement dans la fiche produit.</p>
          </Confirm>
        ) : (
          <Confirm title={`Supprimer « ${aSupprimer.item.nom} » ?`} danger confirmLabel="Supprimer" busy={occupe}
                   onConfirm={supprimer} onClose={() => !occupe && setASupprimer(null)}>
            <p>{aSupprimer.item.niveau === 'etagere'
              ? 'Cette étagère sera retirée de la liste.'
              : 'Tout ce qu\'il contient (rayons, étagères) sera aussi supprimé.'}</p>
          </Confirm>
        )
      )}
    </>
  );
}

export default function Emplacements() {
  const [toast, afficher, fermer] = useToast();
  const [rechargement, setRechargement] = useState(0);

  return (
    <Page className="em">
      <PageHead title="Emplacements" sub="Où sont rangés les produits de la boutique : emplacement, puis rayon, puis étagère. Ces listes sont proposées dans la fiche produit. Chaque entrepôt a les siennes, dans la page Entrepôt.">
        <button type="button" className="vt-btn vt-btn--icon" onClick={() => setRechargement((n) => n + 1)} aria-label="Rafraîchir" title="Rafraîchir">
          <RefreshCw size={16} />
        </button>
      </PageHead>
      <GestionEmplacements afficher={afficher} rechargement={rechargement} />
      <Toast toast={toast} onClose={fermer} />
    </Page>
  );
}
