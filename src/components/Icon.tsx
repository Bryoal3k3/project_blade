import type { ReactNode } from 'react';

const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const PATHS = {
  bolt: <path d="M13.5 2 4.5 13.5h6L9.5 22l9.5-12h-6.2z" />,
  shield: <path d="M12 2.2 20 5v6.2c0 5-3.4 9-8 10.6-4.6-1.6-8-5.6-8-10.6V5z" />,
  battery: (
    <>
      <rect x="2.5" y="6.5" width="16" height="11" rx="2" {...stroke} strokeWidth="2" />
      <rect x="19" y="10" width="2.5" height="4" rx="1" />
      <rect x="5" y="9" width="3" height="6" rx=".6" />
      <rect x="9.25" y="9" width="3" height="6" rx=".6" />
      <rect x="13.5" y="9" width="3" height="6" rx=".6" />
    </>
  ),
  yin: (
    <>
      <circle cx="12" cy="12" r="9.5" {...stroke} strokeWidth="2" />
      <path d="M12 2.5a9.5 9.5 0 0 1 0 19 4.75 4.75 0 0 1 0-9.5 4.75 4.75 0 0 0 0-9.5z" />
    </>
  ),
  dash: <path d="M2.5 6l8 6-8 6zM12 6l8 6-8 6z" />,
  lock: (
    <path d="M7 10V7.5a5 5 0 0 1 10 0V10h1a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 18 21H6a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 6 10zm2.5 0h5V7.5a2.5 2.5 0 0 0-5 0z" />
  ),
  back: <path d="M15 4 7 12l8 8" {...stroke} strokeWidth="2.6" />,
  speaker: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" {...stroke} strokeWidth="2" />
    </>
  ),
  heart: <path className="fillable" d="M12 20.5s-8-4.9-8-10.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8 2.5c0 5.7-8 10.6-8 10.6z" />,
  star: <path className="fillable" d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />,
  grid: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </>
  ),
  spin: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" {...stroke} strokeWidth="2.4" />
      <path d="M20 3.5v5h-5" {...stroke} strokeWidth="2.4" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ? `ic ${className}` : 'ic'} fill="currentColor" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
