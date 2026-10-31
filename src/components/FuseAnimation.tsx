import { useEffect, useRef, type ReactNode } from 'react';

/** How long the fuse takes, in milliseconds. Matches the timings in styles.css. */
export const FUSE_MS = 2900;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface Props {
  blade: ReactNode;
  ratchet?: ReactNode;
  bit: ReactNode;
  onDone: () => void;
}

/** The parts fly in from three sides, flash as they lock together, and the new Bey spins up. */
export function FuseAnimation({ blade, ratchet, bit, onDone }: Props) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const timer = window.setTimeout(() => done.current(), prefersReducedMotion() ? 0 : FUSE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="fuse" role="status" aria-label="Fusing your Bey">
      <div className="fuse-ring" />
      <div className="fuse-part fuse-bit">{bit}</div>
      {ratchet && <div className="fuse-part fuse-ratchet">{ratchet}</div>}
      <div className="fuse-part fuse-blade">{blade}</div>
      <div className="fuse-flash" />
      <div className="fuse-final">{blade}</div>
      <div className="fuse-word">Fused!</div>
    </div>
  );
}
