// components/StockSelector/StockSelector.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Box, Package } from "lucide-react";
import "./StockSelector.css";

// ============================================================
// Utilitaires de conversion
// ============================================================

/**
 * Décompose un stock (en unité de base) selon une unité cible.
 *
 * @param {number} stockBase       - Stock total en unité de base
 * @param {object} uniteCible      - Unité cible { nom, quantite_base, symbole }
 * @param {object} uniteBase       - Unité de base { nom, symbole } (quantite_base=1)
 * @returns {{ qtePrincipale, unitePrincipale, qteReste, uniteReste }}
 */
function decomposerStock(stockBase, uniteCible, uniteBase) {
    const stock = parseFloat(stockBase) || 0;
    const qbCible = parseFloat(uniteCible?.quantite_base) || 1;

    // Cas : unité cible = unité de base → pas de reste
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

/**
 * Construit la liste complète des unités (base + personnalisées)
 */
function buildUnitesList(unitesVente, uniteBase) {
    const liste = [];

    // 1. Unité de base (toujours en premier)
    if (uniteBase?.nom) {
        liste.push({
            id_unite_vente: null,
            nom: uniteBase.nom,
            symbole: uniteBase.symbole || "",
            quantite_base: 1,
            is_base: true,
        });
    }

    // 2. Unités personnalisées (triées par quantite_base croissant)
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
const STORAGE_PREFIX = "stock_unit_";

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
        // Silencieux (localStorage indisponible)
    }
}

// ============================================================
// Composant principal
// ============================================================
const StockSelector = ({
    idProduit,
    stockBase,
    unitesVente = [],
    uniteBase = null,
    isLowStock = false,
    isRupture = false,
    variant = "list", // "list" | "grid" | "details"
}) => {
    // Construction de la liste complète des unités
    const unitesDisponibles = useMemo(
        () => buildUnitesList(unitesVente, uniteBase),
        [unitesVente, uniteBase]
    );

    // Unité sélectionnée (id_unite_vente ou null pour base)
    const [selectedUniteId, setSelectedUniteId] = useState(() => {
        const stored = getStoredUniteId(idProduit);
        // Vérifier que l'unité stockée existe encore
        if (stored !== null && unitesDisponibles.some((u) => u.id_unite_vente === stored)) {
            return stored;
        }
        // Par défaut : unité principale si existe, sinon unité de base
        const principale = unitesDisponibles.find((u) => u.est_principal);
        return principale ? principale.id_unite_vente : null;
    });

    // Resynchroniser si la liste change (ex: produit édité)
    useEffect(() => {
        if (
            selectedUniteId !== null &&
            !unitesDisponibles.some((u) => u.id_unite_vente === selectedUniteId)
        ) {
            setSelectedUniteId(null);
            setStoredUniteId(idProduit, null);
        }
    }, [unitesDisponibles, selectedUniteId, idProduit]);

    // Unité actuellement sélectionnée (objet complet)
    const selectedUnite = useMemo(() => {
        return (
            unitesDisponibles.find((u) => u.id_unite_vente === selectedUniteId) ||
            unitesDisponibles[0] ||
            null
        );
    }, [unitesDisponibles, selectedUniteId]);

    // Décomposition du stock selon l'unité choisie
    const decomposition = useMemo(() => {
        return decomposerStock(stockBase, selectedUnite, uniteBase);
    }, [stockBase, selectedUnite, uniteBase]);

    // Dropdown : est-ce qu'on affiche le sélecteur ?
    const hasMultipleUnites = unitesDisponibles.length > 1;

    // ============================================================
    // Dropdown (avec portal pour éviter le clipping)
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
            let left = rect.left;
            const width = Math.max(rect.width, 160);

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

    // ============================================================
    // Cas : stock à 0 → on affiche juste "0"
    // ============================================================
    if (isRupture || parseFloat(stockBase) <= 0) {
        return (
            <div className={`stock-selector stock-selector-${variant} is-empty`}>
                <span className="stock-rupture">0</span>
                {hasMultipleUnites && selectedUnite && (
                    <span className="stock-unite-label">{selectedUnite.nom}</span>
                )}
            </div>
        );
    }

    // ============================================================
    // Rendu principal
    // ============================================================
    const { qtePrincipale, unitePrincipale, qteReste, uniteReste } = decomposition;

    return (
        <div
            className={`stock-selector stock-selector-${variant} ${
                isLowStock ? "is-low" : ""
            }`}
        >
            <div className="stock-main-row">
                <span className="stock-qte">{qtePrincipale}</span>

                {hasMultipleUnites ? (
                    <>
                        <span ref={triggerRef} className="stock-unite-trigger-wrapper">
                            <button
                                type="button"
                                className={`stock-unite-trigger ${
                                    open ? "open" : ""
                                }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpen((v) => !v);
                                }}
                                title="Changer l'unité d'affichage"
                            >
                                <span>{unitePrincipale}</span>
                                <ChevronDown size={12} />
                            </button>
                        </span>
                    </>
                ) : (
                    <span className="stock-unite-label">{unitePrincipale}</span>
                )}
            </div>

            {/* Reste (ex: + 3 Bidons) */}
            {qteReste > 0 && uniteReste && (
                <div className="stock-reste">
                    + {qteReste} {uniteReste}
                </div>
            )}

            {/* Dropdown en portal */}
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
                                    unite.id_unite_vente === selectedUniteId
                                        ? "active"
                                        : ""
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

export default StockSelector;