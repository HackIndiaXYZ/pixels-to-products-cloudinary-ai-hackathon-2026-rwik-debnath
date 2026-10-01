import React from 'react';

export interface PressWireLogoProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Display mode: 'full' includes wordmark, 'mark' only displays the SVG emblem */
  variant?: 'full' | 'mark';
  /** Color theme */
  theme?: 'light' | 'dark';
  /** Optional subtitle below wordmark */
  subtitle?: string;
  /** Optional badge text next to wordmark (e.g., 'DESK', 'TIP LINE') */
  badge?: string;
  /** Optional badge color variant */
  badgeVariant?: 'neutral' | 'red';
  /** Optional click handler */
  onClick?: () => void;
  /** Additional custom classes */
  className?: string;
}

const SIZE_CONFIGS = {
  sm: {
    markSize: 22,
    markClass: 'w-[22px] h-[22px]',
    textClass: 'text-xs tracking-tight',
    subtitleClass: 'text-[9px]',
    badgeClass: 'text-[9px] px-1.5 py-0.5',
    gap: 'gap-2',
  },
  md: {
    markSize: 28,
    markClass: 'w-7 h-7',
    textClass: 'text-sm tracking-tight',
    subtitleClass: 'text-[10px]',
    badgeClass: 'text-[10px] px-1.5 py-0.5',
    gap: 'gap-2.5',
  },
  lg: {
    markSize: 32,
    markClass: 'w-8 h-8',
    textClass: 'text-base tracking-tight',
    subtitleClass: 'text-[10px]',
    badgeClass: 'text-[10px] px-2 py-0.5',
    gap: 'gap-2.5',
  },
  xl: {
    markSize: 44,
    markClass: 'w-11 h-11',
    textClass: 'text-xl tracking-tight',
    subtitleClass: 'text-xs',
    badgeClass: 'text-xs px-2.5 py-1',
    gap: 'gap-3.5',
  },
  '2xl': {
    markSize: 60,
    markClass: 'w-[60px] h-[60px]',
    textClass: 'text-3xl tracking-tight',
    subtitleClass: 'text-sm',
    badgeClass: 'text-xs px-3 py-1',
    gap: 'gap-4',
  },
};

/**
 * Minimal & Authoritative PressWire Newsroom Emblem
 *
 * Design Architecture:
 * - Solid obsidian tile (#090D16) with subtle precision border.
 * - Architectural Press stem & upper loop in pure stark white (#FFFFFF).
 * - Live teleprinter transmission wire pulse terminal in broadcast crimson (#E11D48).
 * - Zero tacky animations or fuzzy gradients — pure, crisp editorial gravity.
 */
export const PressWireMark: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = '',
}) => {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {/* Obsidian Tile Container */}
      <rect width="32" height="32" rx="7" fill="#090D16" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="6.5"
        stroke="#1E293B"
        strokeWidth="1"
        fill="none"
      />

      {/* Architectural Press Vertical Stem (The Mast) */}
      <rect x="6" y="6" width="4" height="20" rx="0.75" fill="#FFFFFF" />

      {/* Press Upper Loop with Precision Negative-Space Counter */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 6H15.5C17.9853 6 20 8.01472 20 10.5C20 12.9853 17.9853 15 15.5 15H10V6ZM10 9H15C15.8284 9 16.5 9.67157 16.5 10.5C16.5 11.3284 15.8284 12 15 12H10V9Z"
        fill="#FFFFFF"
      />

      {/* Live Broadcast Crimson Wire Terminal (Teleprinter Signal Node) */}
      <rect x="21.5" y="12" width="4.5" height="3" rx="0.75" fill="#E11D48" />
    </svg>
  );
};

export const PressWireLogo: React.FC<PressWireLogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'light',
  subtitle,
  badge,
  badgeVariant = 'neutral',
  onClick,
  className = '',
}) => {
  const config = SIZE_CONFIGS[size];

  const textColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const subtitleColor = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';

  const badgeStyles =
    badgeVariant === 'red'
      ? 'bg-rose-50 text-rose-600 border border-rose-200/80'
      : theme === 'dark'
        ? 'bg-slate-800 text-slate-300 border border-slate-700'
        : 'bg-slate-100 text-slate-700 border border-slate-200/70';

  const content = (
    <div className={`flex items-center ${config.gap} ${className}`}>
      {/* Emblem Mark */}
      <PressWireMark size={config.markSize} className={config.markClass} />

      {/* Typographic Lockup */}
      {variant === 'full' && (
        <div className="flex flex-col text-left">
          <div className="flex items-center space-x-1.5 leading-none">
            <span className={`font-extrabold ${textColor} ${config.textClass}`}>
              PRESSWIRE
            </span>
            {badge && (
              <span
                className={`font-mono font-bold uppercase rounded-md tracking-wider leading-none ${config.badgeClass} ${badgeStyles}`}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className={`mt-0.5 font-medium ${subtitleColor} ${config.subtitleClass} leading-tight`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        type="button"
        className="group inline-flex items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 rounded-lg transition-transform active:scale-[0.98] cursor-pointer"
        aria-label="PressWire Home"
        title="Return to Home"
      >
        {content}
      </button>
    );
  }

  return content;
};

export default PressWireLogo;
