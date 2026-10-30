import { useId, useMemo } from 'react';
import type { ArtShape, Bey } from '../data/types';
import { TYPE_INFO } from '../data/meta';
import { parseRatchet } from '../data';

/** Outline of the blade seen from above, as an SVG path in a 100x100 box. */
export function outlinePath(shape: ArtShape, blades: number): string {
  const steps = 240;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const t = ((i / steps) * blades) % 1;
    let r: number;
    if (shape === 'blade') r = 0.64 + 0.32 * Math.pow(t, 1.7);
    else if (shape === 'round') r = 0.8 + 0.15 * (0.5 + 0.5 * Math.cos(2 * Math.PI * t));
    else if (shape === 'wall') r = 0.8 + 0.16 * Math.min(1, Math.sin(Math.PI * t) * 2.2);
    else r = 0.7 + 0.26 * Math.abs(Math.sin(Math.PI * t)) * (t < 0.5 ? 1 : 0.62);
    const x = (50 + r * 47 * Math.cos(angle)).toFixed(2);
    const y = (50 + r * 47 * Math.sin(angle)).toFixed(2);
    d += `${i ? 'L' : 'M'}${x} ${y}`;
  }
  return `${d}Z`;
}

/** A drawn, top-down stand-in for a Bey that has no photo yet. */
export function BeyArt({ bey, className }: { bey: Bey; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const outline = useMemo(() => outlinePath(bey.art.shape, bey.art.blades), [bey.art.shape, bey.art.blades]);
  const color = TYPE_INFO[bey.type].color;
  const accent = bey.art.accent;
  const { points } = parseRatchet(bey.ratchet.name);

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}c`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset=".55" stopColor={color} />
          <stop offset="1" stopColor={accent} />
        </linearGradient>
        <radialGradient id={`${uid}m`} cx="38%" cy="30%" r="70%">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".6" />
          <stop offset=".55" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}b`} cx="42%" cy="38%" r="62%">
          <stop offset="0" stopColor="#F6F8FC" />
          <stop offset="1" stopColor="#8A92A6" />
        </radialGradient>
      </defs>
      <path d={outline} fill={`url(#${uid}c)`} stroke="#0E1018" strokeWidth="1.3" strokeLinejoin="round" />
      <path d={outline} fill={`url(#${uid}m)`} />
      <circle cx="50" cy="50" r="33" fill="none" stroke="#D3D8E2" strokeWidth="3.2" />
      <circle cx="50" cy="50" r="26" fill="#2B303C" stroke="#0E1018" strokeWidth="1" />
      {Array.from({ length: points }, (_, k) => (
        <rect
          key={k}
          x="47"
          y="19.5"
          width="6"
          height="6"
          rx="1.4"
          fill={accent}
          stroke="#0E1018"
          strokeWidth=".8"
          transform={`rotate(${((k / points) * 360).toFixed(1)} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="14" fill={`url(#${uid}b)`} stroke="#0E1018" strokeWidth="1" />
      <path d="M50 39.5l3.2 7h-6.4z" fill={color} stroke="#0E1018" strokeWidth=".6" />
    </svg>
  );
}
