// Small inline icons. Each status has a distinct shape so meaning never relies on colour alone.
interface P { className?: string }
const base = { width: 14, height: 14, viewBox: '0 0 16 16', 'aria-hidden': true, focusable: false } as const;

export const IconTriangle = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M8 1.5 15 14H1z" fill="currentColor" />
    <path d="M8 6v4M8 11.5v1" stroke="var(--chip-ink, #fff)" strokeWidth="1.6" />
  </svg>
);

export const IconCircle = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const IconCheck = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="m2.5 8.5 3.5 3.5 7-8" fill="none" stroke="currentColor" strokeWidth="2.2" />
  </svg>
);

export const IconCross = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="m3 3 10 10M13 3 3 13" stroke="currentColor" strokeWidth="2.2" />
  </svg>
);

export const IconBell = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M8 1.5a4 4 0 0 0-4 4V9l-1.5 3h11L12 9V5.5a4 4 0 0 0-4-4ZM6.3 13.5a1.8 1.8 0 0 0 3.4 0" fill="currentColor" />
  </svg>
);

export const IconEyeOff = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="8" cy="8" r="2" fill="currentColor" />
    <path d="m2 14 12-12" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const IconDiamond = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M8 1.5 14.5 8 8 14.5 1.5 8z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 5v4M8 10.5v1" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const IconInfo = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 7v4.5M8 4.5v1" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const IconCopy = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="5" y="5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
