// src/styles/colors.js
// ============================================================
// PALETTE MIYO — Version moderne (dashboard gestion de stock)
// Identité : orange brûlé / caramel (rappel du singe du logo)
// Neutres froids (slate) pour un rendu pro et lisible
// ============================================================

export const COLORS = {
  // ============================================================
  // COULEUR PRIMAIRE — identité Miyo (orange brûlé)
  // ============================================================
  primary:        '#C2410C',   // Orange brûlé — actions principales
  primaryDark:    '#9A3412',   // Hover / pressed
  primaryLight:   '#EA580C',   // Accents, liens
  primarySoft:    '#FFF7ED',   // Fond très léger (badges, hover)
  primaryTint:    '#FFEDD5',   // Fond sélection

  // Variante caramel (rappel du logo)
  caramel:        '#D97706',
  caramelSoft:    '#FEF3C7',

  // ============================================================
  // FONDS (neutres froids — slate)
  // ============================================================
  bg:             '#F8FAFC',   // Fond général
  bgAlt:          '#F1F5F9',   // Fond alternatif (sections)
  surface:        '#FFFFFF',   // Cartes / panneaux
  surfaceAlt:     '#F8FAFC',   // Surface secondaire
  surfaceHover:   '#F1F5F9',   // Hover sur ligne
  surfaceActive:  '#E2E8F0',   // État actif / pressé

  // ============================================================
  // TEXTES (slate froids — contraste WCAG AA)
  // ============================================================
  text:           '#0F172A',   // Texte principal
  textSecondary:  '#334155',   // Texte secondaire
  textTertiary:   '#64748B',   // Texte tertiaire
  textMuted:      '#94A3B8',   // Placeholder / disabled
  textInverse:    '#FFFFFF',   // Sur fond foncé

  // ============================================================
  // BORDURES / LIGNES
  // ============================================================
  border:         '#E2E8F0',   // Bordure standard
  borderSoft:     '#F1F5F9',   // Bordure très légère
  borderStrong:   '#CBD5E1',   // Bordure marquée
  borderFocus:    '#C2410C',   // Bordure focus (primaire)

  // ============================================================
  // SÉMANTIQUES (vives, reconnaissables)
  // ============================================================
  success:        '#16A34A',   // Vert émeraude
  successSoft:    '#DCFCE7',
  successDeep:    '#14532D',

  danger:         '#DC2626',   // Rouge vif
  dangerSoft:     '#FEE2E2',
  dangerDeep:     '#7F1D1D',

  warning:        '#D97706',   // Ambre
  warningSoft:    '#FEF3C7',
  warningDeep:    '#78350F',

  info:           '#2563EB',   // Bleu
  infoSoft:       '#DBEAFE',
  infoDeep:       '#1E3A8A',

  // ============================================================
  // COULEURS SPÉCIALES (statuts dashboard)
  // ============================================================
  oxide:          '#DC2626',   // Rouge oxydé (rupture)
  moss:           '#16A34A',   // Vert mousse (OK)
  sky:            '#0EA5E9',   // Bleu ciel (info)
  teal:           '#0D9488',   // Turquoise (partiel)
  gold:           '#F59E0B',   // Or (mises en avant / charts)
  violet:         '#7C3AED',   // Violet (catégories)
  pink:           '#DB2777',   // Rose (tags secondaires)

  // ============================================================
  // GRAPHIQUES (couleurs distinctes et harmonieuses)
  // ============================================================
  chart1:         '#C2410C',   // Primaire
  chart2:         '#0D9488',   // Teal
  chart3:         '#2563EB',   // Bleu
  chart4:         '#D97706',   // Ambre
  chart5:         '#7C3AED',   // Violet
  chart6:         '#DB2777',   // Rose

  inkChart:       '#0F172A',   // Texte dans les graphiques

  // ============================================================
  // OMBRES (subtiles, froides)
  // ============================================================
  shadowSm:  '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
  shadow:    '0 1px 3px 0 rgba(15, 23, 42, 0.10), 0 1px 2px -1px rgba(15, 23, 42, 0.10)',
  shadowMd:  '0 4px 6px -1px rgba(15, 23, 42, 0.10), 0 2px 4px -2px rgba(15, 23, 42, 0.06)',
  shadowLg:  '0 10px 15px -3px rgba(15, 23, 42, 0.10), 0 4px 6px -4px rgba(15, 23, 42, 0.05)',
  shadowXl:  '0 20px 25px -5px rgba(15, 23, 42, 0.10), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',

  // ============================================================
  // RADIUS (arrondis modernes)
  // ============================================================
  radiusSm:      '6px',
  radius:        '10px',
  radiusMd:      '12px',
  radiusLg:      '16px',
  radiusFull:    '9999px',

  // ============================================================
  // TRANSITIONS
  // ============================================================
  ease:          '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut:       '200ms cubic-bezier(0, 0, 0.2, 1)',
  easeInOut:     '250ms cubic-bezier(0.4, 0, 0.2, 1)',

  // ============================================================
  // POLICES (Inter = standard SaaS moderne)
  // ============================================================
  fontDisplay:   "'Inter', system-ui, -apple-system, sans-serif",
  fontBody:      "'Inter', system-ui, -apple-system, sans-serif",
  fontMono:      "'JetBrains Mono', 'SF Mono', Consolas, monospace",
  fontDashboard:          "'Inter', system-ui, -apple-system, sans-serif",
  fontDashboardDisplay:   "'Inter', system-ui, -apple-system, sans-serif",
};

// ============================================================
// VERSION CSS VARIABLES
// À injecter sur document.documentElement (voir index.js)
// ============================================================
export const MIYO_VARS = {
  // ---------- Primaire ----------
  '--miyo-primary':          COLORS.primary,
  '--miyo-primary-dark':     COLORS.primaryDark,
  '--miyo-primary-light':    COLORS.primaryLight,
  '--miyo-primary-soft':     COLORS.primarySoft,
  '--miyo-primary-tint':     COLORS.primaryTint,
  '--miyo-caramel':          COLORS.caramel,
  '--miyo-caramel-soft':     COLORS.caramelSoft,

  // ---------- Fonds ----------
  '--miyo-bg':               COLORS.bg,
  '--miyo-bg-alt':           COLORS.bgAlt,
  '--miyo-surface':          COLORS.surface,
  '--miyo-surface-alt':      COLORS.surfaceAlt,
  '--miyo-surface-hover':    COLORS.surfaceHover,
  '--miyo-surface-active':   COLORS.surfaceActive,

  // ---------- Textes ----------
  '--miyo-text':             COLORS.text,
  '--miyo-text-secondary':   COLORS.textSecondary,
  '--miyo-text-tertiary':    COLORS.textTertiary,
  '--miyo-text-muted':       COLORS.textMuted,
  '--miyo-text-inverse':     COLORS.textInverse,

  // ---------- Bordures ----------
  '--miyo-border':           COLORS.border,
  '--miyo-border-soft':      COLORS.borderSoft,
  '--miyo-border-strong':    COLORS.borderStrong,
  '--miyo-border-focus':     COLORS.borderFocus,

  // ---------- Sémantiques ----------
  '--miyo-success':          COLORS.success,
  '--miyo-success-soft':     COLORS.successSoft,
  '--miyo-success-deep':     COLORS.successDeep,
  '--miyo-danger':           COLORS.danger,
  '--miyo-danger-soft':      COLORS.dangerSoft,
  '--miyo-danger-deep':      COLORS.dangerDeep,
  '--miyo-warning':          COLORS.warning,
  '--miyo-warning-soft':     COLORS.warningSoft,
  '--miyo-warning-deep':     COLORS.warningDeep,
  '--miyo-info':             COLORS.info,
  '--miyo-info-soft':        COLORS.infoSoft,
  '--miyo-info-deep':        COLORS.infoDeep,

  // ---------- Spéciales dashboard ----------
  '--miyo-oxide':            COLORS.oxide,
  '--miyo-moss':             COLORS.moss,
  '--miyo-sky':              COLORS.sky,
  '--miyo-teal':             COLORS.teal,
  '--miyo-gold':             COLORS.gold,
  '--miyo-violet':           COLORS.violet,
  '--miyo-pink':             COLORS.pink,
  '--miyo-ink-chart':        COLORS.inkChart,

  // ---------- Graphiques ----------
  '--miyo-chart-1':          COLORS.chart1,
  '--miyo-chart-2':          COLORS.chart2,
  '--miyo-chart-3':          COLORS.chart3,
  '--miyo-chart-4':          COLORS.chart4,
  '--miyo-chart-5':          COLORS.chart5,
  '--miyo-chart-6':          COLORS.chart6,

  // ---------- Radius ----------
  '--miyo-radius-sm':        COLORS.radiusSm,
  '--miyo-radius':           COLORS.radius,
  '--miyo-radius-md':        COLORS.radiusMd,
  '--miyo-radius-lg':        COLORS.radiusLg,
  '--miyo-radius-full':      COLORS.radiusFull,

  // ---------- Ombres ----------
  '--miyo-shadow-sm':        COLORS.shadowSm,
  '--miyo-shadow':           COLORS.shadow,
  '--miyo-shadow-md':        COLORS.shadowMd,
  '--miyo-shadow-lg':        COLORS.shadowLg,
  '--miyo-shadow-xl':        COLORS.shadowXl,

  // ---------- Transitions ----------
  '--miyo-ease':             COLORS.ease,
  '--miyo-ease-out':         COLORS.easeOut,
  '--miyo-ease-in-out':      COLORS.easeInOut,

  // ---------- Polices ----------
  '--miyo-font-display':            COLORS.fontDisplay,
  '--miyo-font-body':               COLORS.fontBody,
  '--miyo-font-mono':               COLORS.fontMono,
  '--miyo-font-dashboard':          COLORS.fontDashboard,
  '--miyo-font-dashboard-display':  COLORS.fontDashboardDisplay,
};

export default COLORS;