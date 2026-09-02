/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Inline SVG illustrations for the empty, refused and onboarding states.
 *
 * Drawn with `currentColor` and the brand token rather than fixed colours, so
 * one file serves both themes. Inline because the generated apps run in a
 * sandbox that blocks remote assets, and because a Mini App on mobile data
 * should not spend a request on decoration.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Waiting for a source: a play triangle turning into building blocks. */
export function EmptyIllustration({className}: {className?: string}) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 80"
      role="img"
      aria-hidden="true"
      width="120"
      height="80">
      <rect x="4" y="10" width="52" height="38" rx="6" {...stroke} opacity="0.5" />
      <path d="M24 22l14 7-14 7z" fill="var(--color-brand)" opacity="0.9" />
      <path d="M60 29h12" {...stroke} opacity="0.45" />
      <path d="M68 25l5 4-5 4" {...stroke} opacity="0.45" />
      <rect x="78" y="10" width="38" height="16" rx="4" {...stroke} />
      <rect x="78" y="32" width="18" height="16" rx="4" {...stroke} />
      <rect x="100" y="32" width="16" height="16" rx="4" fill="var(--color-brand)" opacity="0.25" stroke="none" />
      <path d="M12 62h44" {...stroke} opacity="0.3" />
      <path d="M12 70h26" {...stroke} opacity="0.2" />
    </svg>
  );
}

/** A sketch becoming an interface: pencil strokes resolving into controls. */
export function DiagramIllustration({className}: {className?: string}) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 80"
      role="img"
      aria-hidden="true"
      width="120"
      height="80">
      {/* the drawn side: loose, hand-made boxes */}
      <rect x="4" y="10" width="48" height="38" rx="3" {...stroke} opacity="0.45" strokeDasharray="4 3" />
      <path d="M11 20h26" {...stroke} opacity="0.5" />
      <rect x="11" y="27" width="20" height="8" rx="2" {...stroke} opacity="0.4" />
      <path d="M11 42h18" {...stroke} opacity="0.3" />

      {/* becoming */}
      <path d="M56 29h10" {...stroke} opacity="0.45" />
      <path d="M62 25l5 4-5 4" {...stroke} opacity="0.45" />

      {/* the built side: the same shapes, resolved */}
      <rect x="72" y="10" width="44" height="38" rx="5" {...stroke} />
      <path d="M79 20h26" {...stroke} opacity="0.55" />
      <rect x="79" y="27" width="20" height="8" rx="3" fill="var(--color-brand)" opacity="0.3" stroke="none" />
      <circle cx="107" cy="31" r="4" fill="var(--color-brand)" opacity="0.85" />
      <path d="M79 42h18" {...stroke} opacity="0.35" />

      <path d="M12 62h44" {...stroke} opacity="0.3" />
      <path d="M12 70h26" {...stroke} opacity="0.2" />
    </svg>
  );
}

/** A paper being read: pages with a magnifier. */
export function PaperIllustration({className}: {className?: string}) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 80"
      role="img"
      aria-hidden="true"
      width="120"
      height="80">
      <rect x="20" y="6" width="54" height="66" rx="5" {...stroke} />
      <path d="M30 20h34M30 30h34M30 40h22" {...stroke} opacity="0.45" />
      <rect x="30" y="48" width="20" height="14" rx="3" fill="var(--color-brand)" opacity="0.25" stroke="none" />
      <circle cx="86" cy="46" r="16" {...stroke} />
      <path d="M97 58l9 9" {...stroke} />
      <path d="M80 46h12M86 40v12" {...stroke} opacity="0.5" />
    </svg>
  );
}

/** Something was refused: a gentle stop, not an alarm. */
export function RefusedIllustration({className}: {className?: string}) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 80"
      role="img"
      aria-hidden="true"
      width="120"
      height="80">
      <circle cx="60" cy="40" r="26" {...stroke} opacity="0.55" />
      <path d="M42 22l36 36" {...stroke} opacity="0.55" />
      <path d="M18 62c8-6 14-6 22 0" {...stroke} opacity="0.25" />
      <path d="M80 62c8-6 14-6 22 0" {...stroke} opacity="0.25" />
    </svg>
  );
}

/**
 * Where the API key comes from: a mock of the AI Studio page with the
 * button that matters circled. A picture of the destination removes most of
 * the doubt about whether someone is in the right place.
 */
export function KeyIllustration({className}: {className?: string}) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 108"
      role="img"
      aria-hidden="true"
      width="200"
      height="108">
      {/* Browser chrome */}
      <rect x="2" y="2" width="196" height="104" rx="8" {...stroke} opacity="0.6" />
      <path d="M2 20h196" {...stroke} opacity="0.4" />
      <circle cx="14" cy="11" r="2.5" fill="currentColor" opacity="0.3" />
      <circle cx="24" cy="11" r="2.5" fill="currentColor" opacity="0.3" />
      <circle cx="34" cy="11" r="2.5" fill="currentColor" opacity="0.3" />
      <rect x="46" y="6" width="120" height="10" rx="5" fill="currentColor" opacity="0.12" />
      <text
        x="52"
        y="14"
        fontSize="6"
        fill="currentColor"
        opacity="0.55"
        fontFamily="monospace">
        aistudio.google.com/apikey
      </text>

      {/* Page content */}
      <path d="M16 34h60M16 44h96" {...stroke} opacity="0.3" />

      {/* The button, circled */}
      <rect x="16" y="58" width="74" height="20" rx="10" fill="var(--color-brand)" opacity="0.9" />
      <text x="28" y="71" fontSize="8" fill="#fff" fontWeight="600">
        Create API key
      </text>
      <ellipse
        cx="53"
        cy="68"
        rx="46"
        ry="17"
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="1.6"
        strokeDasharray="4 3"
        opacity="0.85"
      />
      <path
        d="M104 62c14-6 26-4 34 2"
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M138 64l-6-4M138 64l-7 3"
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect x="146" y="52" width="44" height="24" rx="5" {...stroke} opacity="0.6" />
      <path d="M152 64h32" {...stroke} opacity="0.4" strokeDasharray="3 3" />
      <text x="152" y="62" fontSize="6" fill="currentColor" opacity="0.55" fontFamily="monospace">
        AIza...
      </text>
    </svg>
  );
}
