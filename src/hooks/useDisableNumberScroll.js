// src/hooks/useDisableNumberScroll.js
import { useEffect } from "react";

/**
 * Empêche la molette de souris de modifier la valeur des <input type="number">.
 *
 * Comportement :
 * - Le scroll de la page reste normal quand le champ n'a pas le focus.
 * - Si un champ number a le focus, la molette ne change plus sa valeur
 *   (l'utilisateur doit taper au clavier).
 *
 * @param {boolean} active - Active/désactive le blocage (utile pour ne l'activer
 *                           que lorsqu'une modale est ouverte, par exemple).
 */
export const useDisableNumberScroll = (active = true) => {
  useEffect(() => {
    if (!active) return undefined;

    const onWheel = (e) => {
      const el = e.target;
      if (
        el instanceof HTMLInputElement &&
        el.type === "number" &&
        el === document.activeElement
      ) {
        // Empêche le navigateur de modifier la valeur au scroll
        e.preventDefault();
      }
    };

    // passive:false obligatoire pour pouvoir appeler preventDefault()
    document.addEventListener("wheel", onWheel, { passive: false });
    return () =>
      document.removeEventListener("wheel", onWheel, { passive: false });
  }, [active]);
};

export default useDisableNumberScroll;