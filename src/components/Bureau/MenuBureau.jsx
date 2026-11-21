// components/Bureau/MenuBureau.jsx
// Fait le lien entre le menu du logiciel installé (Electron : Fichier, Édition, Affichage, Aide)
// et le site : le menu ne montre que les pages autorisées, et ses commandes ouvrent les pages ici.
// Sur le navigateur (pas d'Electron), ce composant ne fait rien.
import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/AuthContext';
import { hasAccess, usePermissions } from '../../config/rolePermissions';
import { MENU_CONFIG } from '../Dashboard/Sidebar/Sidebar';

const CLE_BARRE = 'miyo:sidebar-collapsed';
const CLE_NOUVEAU = 'miyo:menu-nouveau';

const api = () => (typeof window !== 'undefined' ? window.electronAPI : null);

const barreReduite = () => {
  try { return localStorage.getItem(CLE_BARRE) === '1'; } catch { return false; }
};

/** Bouton visible et utilisable dont le texte commence par `texte` (fenêtre ouverte d'abord, puis la page) */
const trouverBouton = (texte) => {
  const motif = new RegExp(`^\\s*${texte}`, 'i');
  const zones = [
    ...document.querySelectorAll('[role="dialog"], .vt-modal'),
    document.querySelector('.dashboard-content'),
  ].filter(Boolean);
  for (const zone of zones) {
    const bouton = [...zone.querySelectorAll('button, a[role="button"]')].find(
      (b) => !b.disabled && b.offsetParent !== null && motif.test(b.textContent || '')
    );
    if (bouton) return bouton;
  }
  return null;
};

/**
 * Pour une page qui sait ouvrir son formulaire « nouveau » depuis le menu Fichier.
 * useNouveauDepuisMenu('depenses', () => setFormDepense({}))
 */
export function useNouveauDepuisMenu(page, ouvrir) {
  const rappel = useRef(ouvrir);
  rappel.current = ouvrir;
  useEffect(() => {
    // Demande faite avant que la page soit affichée
    try {
      if (sessionStorage.getItem(CLE_NOUVEAU) === page) {
        sessionStorage.removeItem(CLE_NOUVEAU);
        setTimeout(() => rappel.current?.(), 0);
      }
    } catch { /* stockage indisponible */ }
    // Demande faite alors que la page est déjà ouverte
    const surDemande = (e) => {
      if (e.detail !== page) return;
      try { sessionStorage.removeItem(CLE_NOUVEAU); } catch { /* sans importance */ }
      rappel.current?.();
    };
    window.addEventListener('miyo:nouveau', surDemande);
    return () => window.removeEventListener('miyo:nouveau', surDemande);
  }, [page]);
}

export default function MenuBureau() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || '';
  const slug = user?.slug || '';
  usePermissions(role); // se redessine quand le patron change les droits
  const dernierEnvoi = useRef('');

  // ---------- Ce que le menu doit savoir ----------
  const envoyerContexte = useCallback(() => {
    const e = api();
    if (!e?.setMenuContext) return;
    const proprietaire = role === 'admin';
    const sections = user
      ? MENU_CONFIG.filter((s) => (s.allowedRoles ? s.allowedRoles.includes(role) : true))
          .map((s) => ({
            titre: s.section,
            items: s.items
              .filter((it) => (it.proprietaire ? proprietaire : hasAccess(role, it.id)))
              .map((it) => ({ id: it.id, titre: it.title, chemin: it.path })),
          }))
          .filter((s) => s.items.length > 0)
      : [];
    const contexte = {
      connecte: !!user,
      nom: user?.fullname || '',
      role,
      magasin: window.__miyoMagasin || '',
      proprietaire,
      sections,
      sombre: document.body.classList.contains('dark-mode'),
      barreReduite: barreReduite(),
    };
    const json = JSON.stringify(contexte);
    if (json === dernierEnvoi.current) return;
    dernierEnvoi.current = json;
    e.setMenuContext(contexte);
  }, [user, role]);

  // À chaque rendu (droits, page, utilisateur) : n'envoie que si quelque chose a changé
  useEffect(() => { envoyerContexte(); });

  // Nom du magasin, thème, barre : changements faits ailleurs dans le site
  useEffect(() => {
    if (!api()?.setMenuContext) return undefined;
    const maj = () => setTimeout(envoyerContexte, 30);
    window.addEventListener('miyo:magasin', maj);
    window.addEventListener('miyo:preferences', maj);
    window.addEventListener('miyo:theme', maj);
    return () => {
      window.removeEventListener('miyo:magasin', maj);
      window.removeEventListener('miyo:preferences', maj);
      window.removeEventListener('miyo:theme', maj);
    };
  }, [envoyerContexte]);

  // Déconnexion (le tableau de bord se ferme) : le menu repasse en mode « non connecté »
  useEffect(() => () => {
    const e = api();
    if (e?.setMenuContext) e.setMenuContext({ connecte: false, sections: [] });
  }, []);

  // ---------- Commandes venues du menu ----------
  useEffect(() => {
    const e = api();
    if (!e?.onMenuAction) return undefined;
    const vers = (chemin) => navigate(`/${slug}${chemin}`);

    const arreter = e.onMenuAction((demande) => {
      const action = demande?.action;
      switch (action) {
        case 'aller':
          if (typeof demande.chemin === 'string' && demande.chemin.startsWith('/')) {
            const [chemin, ancre] = demande.chemin.split('#');
            if (ancre) {
              try { localStorage.setItem('miyo:parametres-rubrique', ancre); } catch { /* sans importance */ }
            }
            vers(demande.chemin);
            if (ancre) window.dispatchEvent(new HashChangeEvent('hashchange'));
            if (!ancre && location.pathname === `/${slug}${chemin}`) window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          break;
        case 'nouveau': {
          const page = String(demande.page || '');
          if (!page) break;
          try { sessionStorage.setItem(CLE_NOUVEAU, page); } catch { /* sans importance */ }
          if (location.pathname.startsWith(`/${slug}/${page}`)) {
            window.dispatchEvent(new CustomEvent('miyo:nouveau', { detail: page }));
          } else {
            vers(`/${page}`);
          }
          break;
        }
        case 'recherche':
        case 'theme':
        case 'deconnexion':
          window.dispatchEvent(new CustomEvent('miyo:menu', { detail: { action } }));
          break;
        case 'barre': {
          const suivant = barreReduite() ? '0' : '1';
          try { localStorage.setItem(CLE_BARRE, suivant); } catch { /* sans importance */ }
          window.dispatchEvent(new CustomEvent('miyo:preferences', { detail: { cle: CLE_BARRE, valeur: suivant } }));
          break;
        }
        case 'exporter': {
          const bouton = trouverBouton('Exporter');
          if (bouton) bouton.click();
          else e.menuSignaler?.("Cette page n'a pas de liste à exporter. Ouvrez une liste (produits, ventes, factures…) puis réessayez.");
          break;
        }
        case 'imprimer': {
          const bouton = trouverBouton('Imprimer');
          if (bouton) bouton.click();
          else e.imprimerPage?.();
          break;
        }
        default:
          break;
      }
    });
    return arreter;
  }, [navigate, slug, location.pathname]);

  return null;
}
