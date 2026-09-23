// components/StockSelector/StockInputWithSelector.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Box, Package, Info } from "lucide-react";
import "./StockSelector.css";

// ============================================================
// Utilitaires (identiques à StockSelector)
// ============================================================
function decomposerStock(stockBase, uniteCible, uniteBase) {
  const stock = parseFloat(stockBase) || 0;
  const qbCible = parseFloat(uniteCible?.quantite_base) || 1;

  if (qbCible <= 1) {
    return {
      qtePrincipale: stock,
      unitePrincipale: uniteBase?.nom || uniteCible?.nom || "Unité",
      qteReste: 0,
      uniteReste: null,
    };
  }

  const qtePrincipale = Math.floor(stock / qbCible);
  const resteBase = stock - qtePrincipale * qbCible;

  return {
    qtePrincipale,
    unitePrincipale: uniteCible.nom,
    qteReste: resteBase,
    uniteReste: uniteBase?.nom || "Unité",
  };
}

function buildUnitesList(unitesVente, uniteBase) {
  const liste = [];

  if (uniteBase?.nom) {
    liste.push({
      id_unite_vente: null,
      nom: uniteBase.nom,
      symbole: uniteBase.symbole || "",
      quantite_base: 1,
      is_base: true,
    });
  }

  const perso = (unitesVente || [])
    .filter((u) => u && u.nom)
    .map((u) => ({
      id_unite_vente: u.id_unite_vente,
      nom: u.nom,
      symbole: u.symbole || "",
      quantite_base: parseFloat(u.quantite_base) || 1,
      is_base: false,
      est_principal: u.est_principal,
    }))
    .sort((a, b) => a.quantite_base - b.quantite_base);

  return [...liste, ...perso];
}

// ============================================================
// LocalStorage : mémoriser l'unité choisie par produit
// ============================================================
const STORAGE_PREFIX = "stock_unit_form_";

function getStoredUniteId(idProduit) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${idProduit}`);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredUniteId(idProduit, idUnite) {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${idProduit}`,
      JSON.stringify(idUnite)
    );
  } catch {
    // silencieux
  }
}

// ============================================================
// Composant principal
// ============================================================
const StockInputWithSelector = ({
  value,
  onChange,
  name = "quantite_stock",
  idProduit,
  unitesVente = [],
  uniteBase = null,
  disabled = false,
  placeholder = "0",
  min = "0",
  step = "1",
}) => {
  // Construction de la liste des unités
  const unitesDisponibles = useMemo(
    () => buildUnitesList(unitesVente, uniteBase),
    [unitesVente, uniteBase]
  );

  const hasMultipleUnites = unitesDisponibles.length > 1;

  // Unité d'affichage choisie
  const [selectedUniteId, setSelectedUniteId] = useState(() => {
    const stored = getStoredUniteId(idProduit);
    if (
      stored !== null &&
      unitesDisponibles.some((u) => u.id_unite_vente === stored)
    ) {
      return stored;
    }
    const principale = unitesDisponibles.find((u) => u.est_principal);
    return principale ? principale.id_unite_vente : null;
  });

  // Resync si unité supprimée
  useEffect(() => {
    if (
      selectedUniteId !== null &&
      !unitesDisponibles.some((u) => u.id_unite_vente === selectedUniteId)
    ) {
      setSelectedUniteId(null);
      setStoredUniteId(idProduit, null);
    }
  }, [unitesDisponibles, selectedUniteId, idProduit]);

  const selectedUnite = useMemo(() => {
    return (
      unitesDisponibles.find((u) => u.id_unite_vente === selectedUniteId) ||
      unitesDisponibles[0] ||
      null
    );
  }, [unitesDisponibles, selectedUniteId]);

  // Décomposition
  const decomposition = useMemo(
    () => decomposerStock(value, selectedUnite, uniteBase),
    [value, selectedUnite, uniteBase]
  );

  // ============================================================
  // Dropdown (portal)
  // ============================================================
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePosition = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight || 200;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const spaceBelow = viewportHeight - rect.bottom;
      const showAbove = spaceBelow < menuHeight + 20 && rect.top > spaceBelow;

      let top = showAbove ? rect.top - menuHeight - 4 : rect.bottom + 4;
      let left = rect.right - 180;
      const width = 180;

      if (left < 8) left = 8;
      if (left + width > viewportWidth - 8) {
        left = viewportWidth - width - 8;
      }

      setCoords({ top, left, width });
    };

    requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleSelectUnite = (unite) => {
    setSelectedUniteId(unite.id_unite_vente);
    setStoredUniteId(idProduit, unite.id_unite_vente);
    setOpen(false);
  };

  const handleInputChange = (e) => {
    if (onChange) onChange(e);
  };

  const stockNum = parseFloat(value) || 0;
  const { qtePrincipale, unitePrincipale, qteReste, uniteReste } = decomposition;

  return (
    <div className="stock-input-with-selector">
      {/* Ligne : input + dropdown */}
      <div className="stock-input-row">
        <input
          type="number"
          name={name}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          step={step}
          min={min}
          disabled={disabled}
          className="stock-input-field"
        />

        {hasMultipleUnites && (
          <span ref={triggerRef} className="stock-unite-trigger-wrapper">
            <button
              type="button"
              className={`stock-unite-trigger ${open ? "open" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((v) => !v);
              }}
              disabled={disabled}
              title="Changer l'unité d'affichage"
            >
              <span>{unitePrincipale}</span>
              <ChevronDown size={12} />
            </button>
          </span>
        )}

        {!hasMultipleUnites && uniteBase?.nom && (
          <span className="stock-unite-static-label">{uniteBase.nom}</span>
        )}
      </div>

      {/* Aperçu de conversion */}
      {stockNum > 0 && (
        <small className="stock-preview">
          <Info size={11} />
          <span>
            = {qtePrincipale} {unitePrincipale}
            {qteReste > 0 && uniteReste && (
              <> + {qteReste} {uniteReste}</>
            )}
          </span>
        </small>
      )}

      {/* Dropdown portal */}
      {open &&
        hasMultipleUnites &&
        createPortal(
          <div
            ref={menuRef}
            className="stock-unite-menu"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              minWidth: `${coords.width}px`,
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {unitesDisponibles.map((unite) => (
              <button
                key={unite.id_unite_vente ?? `base-${unite.nom}`}
                type="button"
                className={`stock-unite-menu-item ${
                  unite.id_unite_vente === selectedUniteId ? "active" : ""
                }`}
                onClick={() => handleSelectUnite(unite)}
              >
                <span className="unite-menu-name">
                  {unite.is_base && <Package size={12} />}
                  {!unite.is_base && <Box size={12} />}
                  {unite.nom}
                </span>
                {unite.quantite_base > 1 && (
                  <span className="unite-menu-base">
                    × {unite.quantite_base}
                  </span>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export default StockInputWithSelector;