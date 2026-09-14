// components/SelectSearch/SelectSearch.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import './SelectSearch.css';

const SelectSearch = ({
  options = [],
  value,
  onChange,
  placeholder = "Sélectionner...",
  label = "",
  disabled = false,
  required = false,
  optionLabel = "nom",
  optionValue = "id",
  renderOption = null,
  name = "",
  className = "",
  noOptionsMessage = "Aucun résultat",
  initialLimit = 15,
  searchThreshold = 1,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Fonction de recherche avec score de pertinence
  const getSearchScore = (item, term) => {
    if (!term) return 0;
    
    const label = typeof item === 'string' ? item : item[optionLabel];
    const searchLower = term.toLowerCase();
    const labelLower = label.toLowerCase();
    
    // 1. Correspondance exacte (score le plus haut)
    if (labelLower === searchLower) return 100;
    
    // 2. Commence par le terme recherché
    if (labelLower.startsWith(searchLower)) return 80;
    
    // 3. Contient le terme recherché (plus le terme est au début, plus le score est élevé)
    if (labelLower.includes(searchLower)) {
      const index = labelLower.indexOf(searchLower);
      return 60 - index;
    }
    
    // 4. Recherche par mots-clés (ex: "Samsung TV" -> "tv samsung")
    const words = labelLower.split(/\s+/);
    const searchWords = searchLower.split(/\s+/);
    let matchCount = 0;
    searchWords.forEach(sw => {
      if (words.some(w => w.includes(sw) || sw.includes(w))) {
        matchCount++;
      }
    });
    if (matchCount > 0) {
      return 40 + (matchCount / searchWords.length) * 20;
    }
    
    return 0;
  };

  // Filtrer et trier les options par pertinence
  const getFilteredOptions = useMemo(() => {
    // Si pas de recherche, afficher les premiers éléments
    if (!searchTerm || searchTerm.length < searchThreshold) {
      return options.slice(0, initialLimit);
    }

    // Recherche active : filtrer et trier par pertinence
    const scored = options.map(opt => ({
      option: opt,
      score: getSearchScore(opt, searchTerm),
    }));

    // Filtrer ceux qui ont un score > 0
    const filtered = scored.filter(item => item.score > 0);
    
    // Trier par score décroissant
    filtered.sort((a, b) => b.score - a.score);
    
    // Retourner les options triées
    return filtered.map(item => item.option);
  }, [options, searchTerm, initialLimit, searchThreshold, optionLabel]);

  // Sélectionner une option
  const handleSelect = (opt) => {
    const val = typeof opt === 'string' ? opt : opt[optionValue];
    onChange({ target: { value: val, name: name || 'select' } });
    setIsOpen(false);
    setSearchTerm('');
  };

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Trouver l'option sélectionnée
  const selectedOption = options.find(opt => {
    if (!opt) return false;
    const val = typeof opt === 'string' ? opt : opt[optionValue];
    return String(val) === String(value);
  });

  const displayLabel = selectedOption 
    ? (typeof selectedOption === 'string' ? selectedOption : selectedOption[optionLabel])
    : placeholder;

  return (
    <div className={`select-search-wrapper ${className}`} ref={wrapperRef}>
      {label && (
        <label>
          {label} {required && <span className="required-star">*</span>}
        </label>
      )}
      <div 
        className={`select-search-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`select-search-value ${!selectedOption ? 'placeholder' : ''}`}>
          {displayLabel}
        </span>
        <ChevronDown size={18} className={`chevron ${isOpen ? 'rotated' : ''}`} />
      </div>

      {isOpen && !disabled && (
        <div className="select-search-dropdown">
          <div className="select-search-input-wrapper">
            {/* <Search size={16} className="search-icon" /> */}
            <input
              type="text"
              className="select-search-input"
              placeholder={`Rechercher parmi ${options.length} éléments...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm('');
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="select-search-options">
            {getFilteredOptions.length === 0 ? (
              <div className="no-options">
                <span>Aucun résultat pour "{searchTerm}"</span>
                <span className="no-options-hint">Essayez un autre terme</span>
              </div>
            ) : (
              <>
                {searchTerm && searchTerm.length >= searchThreshold && (
                  <div className="search-results-info">
                    {getFilteredOptions.length} résultat(s) trouvé(s)
                  </div>
                )}
                
                {getFilteredOptions.map((opt, index) => {
                  const val = typeof opt === 'string' ? opt : opt[optionValue];
                  const label = typeof opt === 'string' ? opt : opt[optionLabel];
                  const isSelected = String(val) === String(value);
                  
                  // Mettre en surbrillance le terme recherché
                  let displayLabelHtml = label;
                  if (searchTerm && searchTerm.length >= searchThreshold) {
                    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    displayLabelHtml = label.replace(
                      new RegExp(`(${escaped})`, 'gi'),
                      (match) => `<mark class="highlight">${match}</mark>`
                    );
                  }

                  return (
                    <div
                      key={index}
                      className={`select-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(opt)}
                    >
                      <span 
                        className="option-label"
                        dangerouslySetInnerHTML={{ __html: displayLabelHtml }}
                      />
                      {isSelected && <Check size={16} className="check-mark" />}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectSearch;