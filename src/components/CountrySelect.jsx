// components/CountrySelect.jsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Flag from 'react-world-flags';
import { ChevronDown, Search, Check } from 'lucide-react';
import './CountrySelect.css';

export const COUNTRIES = [
    { code: 'CI', name: "Côte d'Ivoire", dial: '+225', example: '01 40 01 03 85' },
    // { code: 'SN', name: 'Sénégal',       dial: '+221', example: '77 123 45 67' },
    // { code: 'ML', name: 'Mali',          dial: '+223', example: '65 00 13 57' },
    { code: 'BF', name: 'Burkina Faso',  dial: '+226', example: '65 00 13 57' },
    // { code: 'GN', name: 'Guinée',        dial: '+224', example: '622 12 34 56' },
    // { code: 'TG', name: 'Togo',          dial: '+228', example: '90 12 34 56' },
    // { code: 'BJ', name: 'Bénin',         dial: '+229', example: '97 12 34 56' },
    // { code: 'NE', name: 'Niger',         dial: '+227', example: '90 12 34 56' },
    // { code: 'CM', name: 'Cameroun',      dial: '+237', example: '6 12 34 56 78' },
];

function CountrySelect({ value, onChange, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [dropdownStyle, setDropdownStyle] = useState({});

    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    const current = useMemo(
        () => COUNTRIES.find((c) => c.code === value) || COUNTRIES[0],
        [value]
    );

    // ============================================================
    // FILTRAGE
    // ============================================================
    const filtered = useMemo(() => {
        if (!search.trim()) return COUNTRIES;
        const q = search.toLowerCase().trim();
        return COUNTRIES.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.dial.includes(q) ||
                c.code.toLowerCase().includes(q)
        );
    }, [search]);

    // ============================================================
    // POSITIONNEMENT DU DROPDOWN (calculé depuis le trigger)
    // ============================================================
    const updateDropdownPosition = useCallback(() => {
        if (!triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownWidth = 300;
        const margin = 8;
        const minHeight = 200;
        const maxHeightLimit = 320;

        // Espace disponible en haut et en bas
        const spaceBelow = window.innerHeight - rect.bottom - margin;
        const spaceAbove = rect.top - margin;

        // Ouvrir vers le bas sauf si pas assez de place
        const openUpward = spaceBelow < minHeight && spaceAbove > spaceBelow;

        // Hauteur max = espace disponible (plafonné)
        const availableSpace = openUpward ? spaceAbove : spaceBelow;
        const maxHeight = Math.min(
            maxHeightLimit,
            Math.max(minHeight, availableSpace)
        );

        // Position horizontale (empêcher le débordement à droite)
        const maxLeft = window.innerWidth - dropdownWidth - 8;
        const left = Math.min(rect.left, maxLeft);

        setDropdownStyle({
            position: 'fixed',
            top: openUpward
                ? `${rect.top - margin}px`
                : `${rect.bottom + margin}px`,
            left: `${Math.max(8, left)}px`,
            width: `${dropdownWidth}px`,
            maxHeight: `${maxHeight}px`,
            transform: openUpward ? 'translateY(-100%)' : 'none',
            zIndex: 99999,
        });
    }, []);

    // Mettre à jour à l'ouverture + au scroll + au resize
    useEffect(() => {
        if (!isOpen) return;

        updateDropdownPosition();

        const handleScrollOrResize = () => updateDropdownPosition();
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);

        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen, updateDropdownPosition]);

    // ============================================================
    // CLIC EXTÉRIEUR → FERMER
    // ============================================================
    useEffect(() => {
        const handleClickOutside = (e) => {
            const clickedTrigger = triggerRef.current?.contains(e.target);
            const clickedDropdown = dropdownRef.current?.contains(e.target);
            if (!clickedTrigger && !clickedDropdown) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ============================================================
    // FOCUS RECHERCHE À L'OUVERTURE
    // ============================================================
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // ============================================================
    // ESCAPE
    // ============================================================
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearch('');
        }
    };

    const handleSelect = (code) => {
        onChange(code);
        setIsOpen(false);
        setSearch('');
    };

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <>
            {/* ============================================ */}
            {/* BOUTON DÉCLENCHEUR                            */}
            {/* ============================================ */}
            <button
                ref={triggerRef}
                type="button"
                className={`country-trigger ${isOpen ? 'is-open' : ''}`}
                onClick={() => !disabled && setIsOpen((o) => !o)}
                disabled={disabled}
                aria-label="Choisir un pays"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <Flag code={current.code} className="country-flag" alt={current.name} />
                <span className="country-dial">{current.dial}</span>
                <ChevronDown
                    size={14}
                    className={`country-arrow ${isOpen ? 'is-open' : ''}`}
                />
            </button>

            {/* ============================================ */}
            {/* DROPDOWN via PORTAL                          */}
            {/* ============================================ */}
            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="country-dropdown"
                    style={dropdownStyle}
                    onKeyDown={handleKeyDown}
                >
                    {/* Recherche */}
                    <div className="country-search">
                        <Search size={15} className="country-search-icon" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Rechercher un pays..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Liste */}
                    <ul className="country-list" role="listbox">
                        {filtered.length === 0 ? (
                            <li className="country-empty">
                                Aucun pays trouvé
                            </li>
                        ) : (
                            filtered.map((c) => {
                                const isSelected = c.code === value;
                                return (
                                    <li key={c.code} role="option" aria-selected={isSelected}>
                                        <button
                                            type="button"
                                            className={`country-item ${isSelected ? 'is-selected' : ''}`}
                                            onClick={() => handleSelect(c.code)}
                                        >
                                            <Flag
                                                code={c.code}
                                                className="country-item-flag"
                                                alt={c.name}
                                            />
                                            <span className="country-item-name">
                                                {c.name}
                                            </span>
                                            <span className="country-item-dial">
                                                {c.dial}
                                            </span>
                                            {isSelected && (
                                                <Check size={14} className="country-item-check" />
                                            )}
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>,
                document.body
            )}
        </>
    );
}

export default CountrySelect;