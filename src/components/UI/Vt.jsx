// components/UI/Vt.jsx
// ------------------------------------------------------------
// Briques communes au style « Ventes » (classes vt-*).
// Toute page refaite les importe pour avoir le même rendu,
// les mêmes comportements (Échap, clic dehors, focus) et le mode sombre.
//
//   import { Page, PageHead, Modal, ModalHead, ... } from '../../components/UI/Vt';
// ------------------------------------------------------------
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, MoreVertical, X } from 'lucide-react';
import '../../pages/Ventes/Ventes.css';
import './Vt.css';

// ============================================================
// FORMATS
// ============================================================
export const NBSP = ' ';
const milliers = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

export const fcfa = (v) => {
  const n = typeof v === 'string' ? parseFloat(v.replace(/,/g, '')) : Number(v);
  if (!Number.isFinite(n)) return `0${NBSP}FCFA`;
  return `${n < 0 ? '−' : ''}${milliers(Math.round(Math.abs(n)))}${NBSP}FCFA`;
};

export const nombre = (v, dec = 2) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(n * 10 ** dec) / 10 ** dec;
  const [e, d] = String(Math.abs(r)).split('.');
  return `${r < 0 ? '−' : ''}${milliers(e)}${d ? `,${d}` : ''}`;
};

export const dateFR = (d) => {
  if (!d) return '-';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '-';
  return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
};

export const dateHeureFR = (d) => {
  if (!d) return '-';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '-';
  return `${dateFR(x)} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};

export const sansAccents = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const pluriel = (n, mot, motPluriel) => `${n}${NBSP}${n > 1 ? (motPluriel || `${mot}s`) : mot}`;

// ============================================================
// PAGE
// ============================================================
export const Page = ({ className = '', children }) => (
  <div className={`ventes-container vt ${className}`}>{children}</div>
);

export const PageHead = ({ title, sub, children }) => (
  <header className="vt-head">
    <div>
      <h1 className="vt-title">{title}</h1>
      {sub && <p className="vt-sub">{sub}</p>}
    </div>
    {children && <div className="vt-head-actions">{children}</div>}
  </header>
);

// Bloc « chiffre principal + filtres en étapes » du haut des pages
export const Overview = ({ label, value, note, children, className = '' }) => (
  <section className={`vt-overview ${className}`} aria-label="Synthèse">
    <div className="vt-ca">
      <span className="vt-label">{label}</span>
      <strong className="vt-ca-value vt-num">{value}</strong>
      {note && <span className="vt-ca-note">{note}</span>}
    </div>
    {children && <div className="vt-rail" role="group">{children}</div>}
  </section>
);

export const Stage = ({ count, label, tone, pressed, onClick, apart = false }) => (
  <button type="button" className={`vt-stage ${apart ? 'vt-stage--apart' : ''}`} data-s={tone}
          aria-pressed={!!pressed} onClick={onClick}>
    <span className="vt-stage-count vt-num">{count}</span>
    <span className="vt-stage-label">{label}</span>
  </button>
);

export const SearchBox = ({ value, onChange, placeholder, label, inputRef, className = '' }) => (
  <div className={`vt-search ${className}`}>
    <input ref={inputRef} type="text" className="vt-input vt-search-input" placeholder={placeholder}
           aria-label={label || placeholder} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
    {value && (
      <button type="button" className="vt-search-clear" onClick={() => onChange('')} aria-label="Effacer">
        <X size={14} />
      </button>
    )}
  </div>
);

// Badge de statut : tone = ok | warn | bad | info | teal | muted | signal
export const Badge = ({ tone = 'muted', children, title }) => (
  <span className="vt-status vt-badge" data-s={tone} title={title}>
    <i className="vt-dot" />{children}
  </span>
);

export const ErrorBar = ({ message, onRetry }) => (
  <div className="vt-error" role="alert">
    <AlertTriangle size={16} /><span>{message}</span>
    {onRetry && <button type="button" className="vt-btn vt-btn--sm" onClick={onRetry}>Réessayer</button>}
  </div>
);

export const Empty = ({ icon: Icon, title, text, children }) => (
  <div className="vt-empty">
    {Icon && <Icon size={30} />}
    <p className="vt-empty-title">{title}</p>
    {text && <p className="vt-empty-text">{text}</p>}
    {children}
  </div>
);

export const SkeletonRows = ({ cols = 5, rows = 5, widths }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={`sk-${i}`} className="vt-skel-row" aria-hidden="true">
        {Array.from({ length: cols }).map((__, k) => (
          <td key={k}><span className="vt-skel" style={{ width: `${(widths && widths[k]) || 55}%` }} /></td>
        ))}
      </tr>
    ))}
  </>
);

export const Pager = ({ page, nbPages, total, unite = 'élément', onChange }) => {
  if (nbPages <= 1) return null;
  return (
    <nav className="vt-pager" aria-label="Pagination">
      <span className="vt-pager-info">{pluriel(total, unite)}</span>
      <div className="vt-pager-ctrl">
        <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => onChange(page - 1)}
                disabled={page <= 1} aria-label="Page précédente"><ChevronLeft size={18} /></button>
        <span className="vt-pager-page">Page {page} sur {nbPages}</span>
        <button type="button" className="vt-iconbtn vt-iconbtn--boxed" onClick={() => onChange(page + 1)}
                disabled={page >= nbPages} aria-label="Page suivante"><ChevronRight size={18} /></button>
      </div>
    </nav>
  );
};

// Pagination côté client : renvoie la page courante (corrigée si la liste rétrécit)
export const usePagination = (liste, parPage, deps = []) => {
  const [page, setPage] = useState(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, deps);
  const nbPages = Math.max(1, Math.ceil(liste.length / parPage));
  const courante = Math.min(page, nbPages);
  const debut = (courante - 1) * parPage; // pour la numérotation des lignes
  return {
    page: courante, nbPages, setPage, debut,
    numeros: { counterReset: `ligne ${debut}` },
    visibles: liste.slice(debut, debut + parPage),
  };
};

// ============================================================
// TOAST
// ============================================================
export const useToast = (duree = 4000) => {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((message, type = 'info') => {
    clearTimeout(timer.current);
    setToast({ message, type, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), type === 'error' ? duree + 2000 : duree);
  }, [duree]);
  const close = useCallback(() => { clearTimeout(timer.current); setToast(null); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [toast, show, close];
};

export const Toast = ({ toast, onClose }) => (toast ? (
  <div className="vt-toast" data-type={toast.type} role="status" aria-live="polite">
    <span className="vt-toast-bar" />
    <span className="vt-toast-msg">{toast.message}</span>
    <button type="button" className="vt-iconbtn vt-iconbtn--sm" onClick={onClose} aria-label="Fermer"><X size={14} /></button>
  </div>
) : null);

// ============================================================
// MODAL (même comportement que la page Ventes)
// ============================================================
let lockDepth = 0;
const lockScroll = () => { if (lockDepth++ === 0) document.body.style.overflow = 'hidden'; };
const unlockScroll = () => { lockDepth = Math.max(0, lockDepth - 1); if (lockDepth === 0) document.body.style.overflow = ''; };

export const Modal = ({ onClose, dismissable = true, size = 'md', busy = false, labelledBy, className = '', children }) => {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    lockScroll();
    if (ref.current && !ref.current.contains(document.activeElement)) ref.current.focus({ preventScroll: true });
    return () => {
      unlockScroll();
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (!dismissable) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented) onCloseRef.current?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dismissable]);
  return (
    <div className="vt vt-overlay" onMouseDown={(e) => { if (dismissable && e.target === e.currentTarget) onCloseRef.current?.(); }}>
      <div ref={ref} className={`vt-modal vt-modal--${size} ${className}`} role="dialog" aria-modal="true"
           aria-labelledby={labelledBy} aria-busy={busy || undefined} tabIndex={-1}>
        {busy && <div className="vt-busybar" />}
        {children}
      </div>
    </div>
  );
};

export const ModalHead = ({ id, title, sub, onClose, disabled, children }) => (
  <div className="vt-modal-head">
    <div className="vt-modal-titles">
      <h2 id={id} className="vt-modal-title">{title}</h2>
      {sub && <p className="vt-modal-sub">{sub}</p>}
    </div>
    {children}
    <button type="button" className="vt-iconbtn" onClick={() => !disabled && onClose()} aria-label="Fermer"><X size={18} /></button>
  </div>
);

// Confirmation (remplace window.confirm)
export const Confirm = ({ title, children, confirmLabel = 'Confirmer', cancelLabel = 'Retour', danger = false,
                          busy = false, onConfirm, onClose, icon: Icon = AlertTriangle }) => (
  <Modal size="sm" busy={busy} labelledBy="vt-confirm-title" dismissable={!busy} onClose={onClose}>
    <ModalHead id="vt-confirm-title" title={title} onClose={onClose} disabled={busy} />
    <div className="vt-modal-body">
      <div className={danger ? 'vt-danger-note' : 'vt-info-note'}>
        <Icon size={20} />
        <div>{children}</div>
      </div>
    </div>
    <div className="vt-modal-foot vt-modal-foot--end">
      <button type="button" className="vt-btn" onClick={onClose} disabled={busy}>{cancelLabel}</button>
      <button type="button" className={`vt-btn ${danger ? 'vt-btn--danger' : 'vt-btn--primary'}`} onClick={onConfirm} disabled={busy}>
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

// ============================================================
// MENU ANCRÉ (position fixe : jamais rogné par le tableau)
// ============================================================
export const AnchoredMenu = ({ open, anchorRef, onClose, width = 200, align = 'left', estHeight = 240, className = '', children }) => {
  const menuRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const gap = 6;
    const pad = 8;
    const below = window.innerHeight - r.bottom - gap - pad;
    const above = r.top - gap - pad;
    const flip = below < estHeight && above > below;
    let left = align === 'right' ? r.right - width : r.left;
    left = Math.min(Math.max(pad, left), Math.max(pad, window.innerWidth - width - pad));
    setPos(flip
      ? { left, width, bottom: window.innerHeight - r.top + gap, maxHeight: Math.max(120, above) }
      : { left, width, top: r.bottom + gap, maxHeight: Math.max(120, below) });
  }, [open, anchorRef, width, align, estHeight]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      closeRef.current();
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); } };
    const onScroll = (e) => { if (menuRef.current && menuRef.current.contains(e.target)) return; closeRef.current(); };
    const onResize = () => closeRef.current();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, anchorRef]);

  if (!open || !pos) return null;
  const style = { left: pos.left, width: pos.width, maxHeight: pos.maxHeight };
  if (pos.bottom !== undefined) style.bottom = pos.bottom; else style.top = pos.top;
  return (
    <div ref={menuRef} className={`vt vt-menu ${className}`} style={style} role="menu">{children}</div>
  );
};

// Menu « ⋮ » d'une ligne. items : [{ label, icon: Icon, onClick, danger, hidden, disabled, title }]
export const ActionsMenu = ({ label, items, width = 200 }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const visibles = items.filter((i) => i && !i.hidden);
  if (visibles.length === 0) return null;
  return (
    <>
      <button ref={btnRef} type="button" className="vt-iconbtn" aria-haspopup="menu" aria-expanded={open}
              aria-label={label} title="Autres actions" onClick={() => setOpen((o) => !o)}>
        <MoreVertical size={18} />
      </button>
      <AnchoredMenu open={open} anchorRef={btnRef} onClose={() => setOpen(false)} width={width} align="right"
                    estHeight={visibles.length * 38 + 12}>
        {visibles.map(({ label: l, icon: Icon, onClick, danger, disabled, title }) => (
          <button key={l} type="button" role="menuitem" disabled={disabled} title={title}
                  className={`vt-menu-item ${danger ? 'vt-menu-item--danger' : ''}`}
                  onClick={() => { setOpen(false); onClick(); }}>
            {Icon && <Icon size={15} />}<span>{l}</span>
          </button>
        ))}
      </AnchoredMenu>
    </>
  );
};

// Ligne « libellé : valeur » des fiches détail
export const KV = ({ items, className = '' }) => (
  <dl className={`vt-kv ${className}`}>
    {items.filter(Boolean).map(([k, v, strong]) => (
      <div key={k}><dt>{k}</dt><dd className={strong ? 'vt-kv-strong vt-num' : undefined}>{v}</dd></div>
    ))}
  </dl>
);

// ============================================================
// RAPPORTS : période, onglets, tuiles de chiffres
// ============================================================
const isoJour = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Bornes d'une période nommée (dates locales, pas UTC). */
export const bornesPeriode = (nom) => {
  const now = new Date();
  switch (nom) {
    case 'jour': return [isoJour(now), isoJour(now)];
    case 'semaine': {
      const d = new Date(now); d.setDate(now.getDate() - ((now.getDay() || 7) - 1));
      return [isoJour(d), isoJour(now)];
    }
    case 'annee': return [isoJour(new Date(now.getFullYear(), 0, 1)), isoJour(new Date(now.getFullYear(), 11, 31))];
    case 'mois':
    default: return [isoJour(new Date(now.getFullYear(), now.getMonth(), 1)), isoJour(new Date(now.getFullYear(), now.getMonth() + 1, 0))];
  }
};

const PERIODES = [['jour', "Aujourd'hui"], ['semaine', 'Cette semaine'], ['mois', 'Ce mois'], ['annee', 'Cette année']];

export const Periode = ({ debut, fin, onChange }) => {
  const active = PERIODES.find(([n]) => { const [d, f] = bornesPeriode(n); return d === debut && f === fin; })?.[0];
  return (
    <div className="vt-periode">
      <div className="vt-seg" role="group" aria-label="Période">
        {PERIODES.map(([n, l]) => (
          <button key={n} type="button" aria-pressed={active === n} onClick={() => onChange(...bornesPeriode(n))}>{l}</button>
        ))}
      </div>
      <div className="vt-periode-dates">
        <label className="vt-muted" htmlFor="vt-per-du">Du</label>
        <input id="vt-per-du" type="date" className="vt-input" value={debut} max={fin} onChange={(e) => e.target.value && onChange(e.target.value, fin)} />
        <label className="vt-muted" htmlFor="vt-per-au">au</label>
        <input id="vt-per-au" type="date" className="vt-input" value={fin} min={debut} onChange={(e) => e.target.value && onChange(debut, e.target.value)} />
      </div>
    </div>
  );
};

/** Onglets : items = [{ id, label, count? }] */
export const Onglets = ({ items, actif, onChange, label = 'Affichage' }) => (
  <div className="vt-seg vt-onglets" role="tablist" aria-label={label}>
    {items.map((o) => (
      <button key={o.id} type="button" role="tab" aria-selected={actif === o.id} aria-pressed={actif === o.id} onClick={() => onChange(o.id)}>
        {o.label}{o.count !== undefined && <span className="vt-onglet-count">{o.count}</span>}
      </button>
    ))}
  </div>
);

/** Tuiles de chiffres : items = [{ label, value, note, tone, fort }] */
export const Chiffres = ({ items, className = '' }) => (
  <section className={`vt-chiffres ${className}`} aria-label="Chiffres clés">
    {items.filter(Boolean).map((c) => (
      <div key={c.label} className={`vt-chiffre ${c.fort ? 'vt-chiffre--fort' : ''}`} data-s={c.tone}>
        <span className="vt-label">{c.label}</span>
        <strong className="vt-chiffre-val vt-num">{c.value}</strong>
        {c.note && <span className="vt-ca-note">{c.note}</span>}
      </div>
    ))}
  </section>
);

/** Carte avec titre (graphiques, tableaux de rapport) */
export const Carte = ({ titre, sous, actions, children, className = '' }) => (
  <section className={`vt-card ${className}`}>
    {(titre || actions) && (
      <div className="vt-card-head">
        <div>{titre && <h2>{titre}</h2>}{sous && <span className="vt-muted vt-card-sous">{sous}</span>}</div>
        {actions}
      </div>
    )}
    {children}
  </section>
);

/** Montant court pour les axes de graphiques : 1,2 M · 450 k */
export const montantCourt = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1).replace('.', ',').replace(',0', '')} M`;
  if (Math.abs(n) >= 1e3) return `${Math.round(n / 1e3)} k`;
  return String(Math.round(n));
};

/** Télécharge un texte CSV (avec BOM pour Excel) */
export const telechargerCsv = (texte, nomFichier) => {
  const blob = new Blob(['﻿' + texte], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nomFichier; a.click();
  URL.revokeObjectURL(url);
};
