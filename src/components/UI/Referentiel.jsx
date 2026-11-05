// components/UI/Referentiel.jsx
// ------------------------------------------------------------
// Page « liste simple » au style Ventes : catégories, marques, modèles, unités…
// Chaque page ne fournit que sa configuration (libellés, champs, service).
// ------------------------------------------------------------
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Download, RefreshCw, Pencil, Trash2, ToggleLeft, ToggleRight, Check, Loader, SearchX } from 'lucide-react';
import { useUser } from '../../context/AuthContext';
import {
  Page, PageHead, Overview, Stage, SearchBox, Badge, ErrorBar, Empty, SkeletonRows, Pager,
  usePagination, useToast, Toast, Modal, ModalHead, Confirm, ActionsMenu, dateFR, sansAccents, pluriel,
} from './Vt';

/**
 * config = {
 *   className, titre, sousTitre, icone,
 *   mot: { un: 'catégorie', des: 'catégories', le: 'la catégorie', nouveau: 'Nouvelle catégorie', feminin: true },
 *   idKey: 'id_categorie',
 *   champs: [{ name, label, placeholder, requis, max, type: 'text'|'textarea', court }],
 *   colonnes: [{ titre, rendu: (item) => node, className }],   // après la colonne « Nom »
 *   service: { lister(token), creer(token, data), modifier(token, id, data), supprimer(token, id), exporter?(token) → texte CSV },
 *   formLarge: true → fenêtre plus large, champs sur 2 colonnes (un champ « plein: true » prend toute la ligne)
 *   statut?: { actif: (item) => bool, basculer: (token, item) => Promise<response>, appliquer: (item) => item },
 *   rolesGestion: ['admin', 'manager'],
 *   aideVide: 'texte affiché quand la liste est vide',
 * }
 */
export default function Referentiel({ config }) {
  const { user, isAuthenticated } = useUser();
  const token = localStorage.getItem('token');
  const { mot, idKey, champs, service, statut } = config;
  const vide = useMemo(() => Object.fromEntries(champs.map((c) => [c.name, ''])), [champs]);
  const canManage = !!user && (config.rolesGestion || ['admin', 'manager']).includes(user.role);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtreStatut, setFiltreStatut] = useState(''); // '' | 'actif' | 'inactif'
  const [toast, showToast, closeToast] = useToast();

  const [edition, setEdition] = useState(null); // null | { item|null }
  const [form, setForm] = useState(vide);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [aSupprimer, setASupprimer] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [basculant, setBasculant] = useState(null);

  const charger = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await service.lister(token);
      if (res.success) setItems(res.data || []);
      else setError(res.message || 'Erreur de chargement');
    } catch (e) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [token, service]);

  useEffect(() => { if (isAuthenticated && token) charger(); }, [isAuthenticated, token, charger]);

  const ouvrir = (item = null) => {
    setForm(item ? Object.fromEntries(champs.map((c) => [c.name, item[c.name] ?? ''])) : vide);
    setFormError(null);
    setEdition({ item });
  };

  const enregistrer = async () => {
    const manquant = champs.find((c) => c.requis && !String(form[c.name] || '').trim());
    if (manquant) { setFormError(`${manquant.label} : à remplir`); return; }
    const data = Object.fromEntries(champs.map((c) => {
      const v = String(form[c.name] || '').trim();
      return [c.name, v === '' && config.videNull ? null : v]; // videNull : champ vide envoyé « null »
    }));
    setSaving(true);
    setFormError(null);
    try {
      const res = edition.item
        ? await service.modifier(token, edition.item[idKey], data)
        : await service.creer(token, data);
      if (!res.success) throw new Error(res.message || "Erreur lors de l'enregistrement");
      setEdition(null);
      showToast(edition.item ? `${cap(mot.le)} « ${data.nom} » a été modifié${mot.feminin ? 'e' : ''}` : `${cap(mot.un)} « ${data.nom} » ajouté${mot.feminin ? 'e' : ''}`, 'success');
      charger();
    } catch (e) {
      setFormError(e.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const supprimer = async () => {
    setDeleting(true);
    try {
      const res = await service.supprimer(token, aSupprimer[idKey]);
      if (!res.success) throw new Error(res.message || 'Suppression impossible');
      showToast(`${cap(mot.le)} « ${aSupprimer.nom} » a été supprimé${mot.feminin ? 'e' : ''}`, 'success');
      setASupprimer(null);
      charger();
    } catch (e) {
      showToast(e.message || 'Suppression impossible', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const basculer = async (item) => {
    if (!statut || basculant) return;
    setBasculant(item[idKey]);
    try {
      const res = await statut.basculer(token, item);
      if (!res.success) throw new Error(res.message || 'Changement impossible');
      setItems((prev) => prev.map((x) => (x[idKey] === item[idKey] ? statut.appliquer(x) : x)));
      showToast(`« ${item.nom} » ${statut.actif(item) ? 'désactivé' : 'activé'}${mot.feminin ? 'e' : ''}`, 'success');
    } catch (e) {
      showToast(e.message || 'Changement impossible', 'error');
    } finally {
      setBasculant(null);
    }
  };

  const exporter = async () => {
    try {
      // Selon le serveur : texte CSV brut, ou { success, data: texte CSV }
      const r = await service.exporter(token);
      const contenu = typeof r === 'string' ? r : r?.data;
      if (typeof contenu !== 'string' || !contenu) throw new Error("Erreur lors de l'export");
      if (!contenu) throw new Error('Rien à exporter');
      const blob = new Blob(['﻿' + contenu], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mot.des.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showToast(e.message || "Erreur lors de l'export", 'error');
    }
  };

  const nbActifs = statut ? items.filter((i) => statut.actif(i)).length : items.length;
  const filtres = useMemo(() => {
    const q = sansAccents(searchTerm.trim());
    return items.filter((i) => {
      if (statut && filtreStatut === 'actif' && !statut.actif(i)) return false;
      if (statut && filtreStatut === 'inactif' && statut.actif(i)) return false;
      if (q && !sansAccents(champs.map((c) => i[c.name]).filter(Boolean).join(' ')).includes(q)) return false;
      return true;
    });
  }, [items, searchTerm, filtreStatut, statut, champs]);
  const { page, nbPages, setPage, numeros, visibles } = usePagination(filtres, 12, [searchTerm, filtreStatut]);
  const nbCols = 3 + (config.colonnes?.length || 0) + (statut ? 1 : 0);

  return (
    <Page className={`ref ${config.className || ''}`}>
      <PageHead title={config.titre} sub={config.sousTitre}>
        <button type="button" className="vt-btn vt-btn--icon" onClick={charger} disabled={loading} aria-label="Rafraîchir" title="Rafraîchir">
          <RefreshCw size={16} className={loading ? 'vt-spin' : ''} />
        </button>
        {service.exporter && (
          <button type="button" className="vt-btn" onClick={exporter}><Download size={16} /> Exporter</button>
        )}
        {canManage && (
          <button type="button" className="vt-btn vt-btn--primary" onClick={() => ouvrir()}>
            <Plus size={16} /> {mot.nouveau}
          </button>
        )}
      </PageHead>

      <Overview label={cap(mot.des)} value={loading && items.length === 0 ? '–' : items.length}
                note={statut ? `${nbActifs} ${mot.feminin ? 'active' : 'actif'}${nbActifs > 1 ? 's' : ''}${config.noteActifs ? ` · ${config.noteActifs}` : ''}` : config.noteSynthese}>
        {statut && (
          <>
            <Stage count={items.length} label={mot.feminin ? 'Toutes' : 'Tous'} tone="all" pressed={filtreStatut === ''} onClick={() => setFiltreStatut('')} />
            <Stage count={nbActifs} label={mot.feminin ? 'Actives' : 'Actifs'} tone="ok" pressed={filtreStatut === 'actif'}
                   onClick={() => setFiltreStatut(filtreStatut === 'actif' ? '' : 'actif')} />
            <Stage count={items.length - nbActifs} label={mot.feminin ? 'Désactivées' : 'Désactivés'} tone="muted"
                   pressed={filtreStatut === 'inactif'} onClick={() => setFiltreStatut(filtreStatut === 'inactif' ? '' : 'inactif')} />
          </>
        )}
      </Overview>

      <div className="vt-toolbar">
        <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder={`Rechercher ${mot.feminin ? 'une' : 'un'} ${mot.un}`} />
        <span className="vt-count">{pluriel(filtres.length, mot.un, mot.des)}</span>
      </div>

      {error && !loading && <ErrorBar message={error} onRetry={charger} />}

      <div className="vt-table-wrap" aria-busy={loading || undefined}>
        {loading && items.length > 0 && <div className="vt-busybar" />}
        <table className="vt-table ref-table">
          <thead>
            <tr>
              <th>Nom</th>
              {(config.colonnes || []).map((c) => <th key={c.titre} className={c.className}>{c.titre}</th>)}
              {statut && <th>Statut</th>}
              <th className="ref-hide">Ajouté le</th>
              <th className="vt-th-right">Actions</th>
            </tr>
          </thead>
          <tbody style={numeros}>
            {loading && items.length === 0
              ? <SkeletonRows cols={nbCols} />
              : visibles.map((item) => {
                const actif = statut ? statut.actif(item) : true;
                return (
                  <tr key={item[idKey]} className={actif ? undefined : 'ref-inactif'}>
                    <td>
                      {canManage
                        ? <button type="button" className="vt-link vt-cell-main" onClick={() => ouvrir(item)}>{config.nom ? config.nom(item) : item.nom}</button>
                        : <span className="vt-cell-main vt-cell-main--plain">{config.nom ? config.nom(item) : item.nom}</span>}
                    </td>
                    {(config.colonnes || []).map((c) => <td key={c.titre} className={c.className}>{c.rendu(item)}</td>)}
                    {statut && (
                      <td>
                        {basculant === item[idKey]
                          ? <span className="vt-muted"><Loader size={13} className="vt-spin" /></span>
                          : <Badge tone={actif ? 'ok' : 'muted'}>{actif ? (mot.feminin ? 'Active' : 'Actif') : (mot.feminin ? 'Désactivée' : 'Désactivé')}</Badge>}
                      </td>
                    )}
                    <td className="ref-hide vt-muted">{dateFR(item.date_creation)}</td>
                    <td className="vt-td-right">
                      {canManage ? (
                        <div className="vt-actions">
                          <button type="button" className="vt-iconbtn vt-iconbtn--sm" onClick={() => ouvrir(item)}
                                  aria-label={`Modifier ${item.nom}`} title="Modifier"><Pencil size={15} /></button>
                          <ActionsMenu label={`Autres actions pour ${item.nom}`} items={[
                            { label: 'Modifier', icon: Pencil, onClick: () => ouvrir(item) },
                            statut && { label: actif ? 'Désactiver' : 'Activer', icon: actif ? ToggleLeft : ToggleRight, onClick: () => basculer(item) },
                            { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setASupprimer(item) },
                          ]} />
                        </div>
                      ) : <span className="vt-muted">-</span>}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {!loading && visibles.length === 0 && (
          items.length === 0
            ? <Empty icon={config.icone} title={`Aucun${mot.feminin ? 'e' : ''} ${mot.un}`} text={config.aideVide}>
                {canManage && (
                  <button type="button" className="vt-btn vt-btn--primary vt-btn--sm" onClick={() => ouvrir()}>
                    <Plus size={14} /> {mot.nouveau}
                  </button>
                )}
              </Empty>
            : <Empty icon={SearchX} title={`Aucun${mot.feminin ? 'e' : ''} ${mot.un} ne correspond`} text="Modifiez la recherche ou le filtre." />
        )}
      </div>

      <Pager page={page} nbPages={nbPages} total={filtres.length} unite={mot.un} onChange={setPage} />

      {edition && (
        <Modal size={config.formLarge ? 'md' : 'sm'} busy={saving} labelledBy="ref-form-title" dismissable={!saving} onClose={() => setEdition(null)}>
          <ModalHead id="ref-form-title" title={edition.item ? `Modifier ${mot.le}` : mot.nouveau}
                     sub={edition.item ? `« ${edition.item.nom} »` : undefined}
                     onClose={() => setEdition(null)} disabled={saving} />
          <form className="vt-modal-body" onSubmit={(e) => { e.preventDefault(); enregistrer(); }}>
            {formError && <ErrorBar message={formError} />}
            <div className={config.formLarge ? 'ref-form-grid' : 'vt-stack'}>
              {champs.map((c, i) => (
                <div className={`vt-field ${c.plein ? 'ref-plein' : ''}`} key={c.name}>
                  <label htmlFor={`ref-${c.name}`}>{c.label}{c.requis ? '' : ' (facultatif)'}</label>
                  {c.type === 'textarea' ? (
                    <textarea id={`ref-${c.name}`} className="vt-input" rows="3" maxLength={c.max} placeholder={c.placeholder}
                              value={form[c.name]} onChange={(e) => { setFormError(null); setForm({ ...form, [c.name]: e.target.value }); }} />
                  ) : (
                    <input id={`ref-${c.name}`} type={c.type || 'text'} className="vt-input" maxLength={c.max} placeholder={c.placeholder}
                           inputMode={c.type === 'tel' ? 'tel' : undefined}
                           autoFocus={i === 0} style={c.court ? { maxWidth: 160 } : undefined}
                           value={form[c.name]} onChange={(e) => { setFormError(null); setForm({ ...form, [c.name]: e.target.value }); }} />
                  )}
                  {c.aide && <span className="vt-hint">{c.aide}</span>}
                </div>
              ))}
            </div>
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </form>
          <div className="vt-modal-foot vt-modal-foot--end">
            <button type="button" className="vt-btn" onClick={() => setEdition(null)} disabled={saving}>Fermer</button>
            <button type="button" className="vt-btn vt-btn--primary" onClick={enregistrer} disabled={saving}>
              {saving ? <Loader size={16} className="vt-spin" /> : <Check size={16} />}
              {saving ? 'Enregistrement' : edition.item ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </Modal>
      )}

      {aSupprimer && (
        <Confirm title={`Supprimer ${mot.le} ?`} danger busy={deleting} confirmLabel={deleting ? 'Suppression' : 'Supprimer'}
                 cancelLabel="Garder" onConfirm={supprimer} onClose={() => !deleting && setASupprimer(null)}>
          <p>{cap(mot.le)} <strong>« {aSupprimer.nom} »</strong> sera supprimé{mot.feminin ? 'e' : ''}.</p>
          {statut && <p>Si {mot.feminin ? 'elle' : 'il'} sert encore à des produits, désactivez-{mot.feminin ? 'la' : 'le'} plutôt : {mot.feminin ? 'elle' : 'il'} ne sera plus proposé{mot.feminin ? 'e' : ''} à la création des produits.</p>}
          <p className="vt-danger-warn">Cette action est irréversible.</p>
        </Confirm>
      )}

      <Toast toast={toast} onClose={closeToast} />
    </Page>
  );
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
