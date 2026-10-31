import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Bey } from '../data/types';
import { BeyPicture, canSpin } from './BeyPicture';
import { Icon } from './Icon';

/** Turns per second for each throttle step, from stopped to full speed. */
export const SPIN_SPEEDS = [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1, 1.3, 1.6, 2, 2.5];
const DEFAULT_LEVEL = 3;
const STORAGE_KEY = 'project-blade:spin-level:v1';

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The last throttle setting on this device, or a gentle default (stopped if the device asks for less motion). */
export function savedLevel(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const level = Number(saved);
    if (saved !== null && Number.isInteger(level) && level >= 0 && level < SPIN_SPEEDS.length) return level;
  } catch {
    // Storage blocked: fall back to the default.
  }
  return prefersReducedMotion() ? 0 : DEFAULT_LEVEL;
}

/** The big spinning Bey at the top of its page, with a throttle that speeds it up or slows it down. */
export function SpinStage({ bey }: { bey: Bey }) {
  const spins = canSpin(bey);
  const [level, setLevel] = useState(savedLevel);
  const rotor = useRef<HTMLDivElement>(null);
  const target = useRef(SPIN_SPEEDS[level]);

  useEffect(() => {
    target.current = SPIN_SPEEDS[level];
    try {
      localStorage.setItem(STORAGE_KEY, String(level));
    } catch {
      // Storage blocked: the setting lasts until the page closes.
    }
  }, [level]);

  useEffect(() => {
    if (!spins || typeof requestAnimationFrame !== 'function') return;
    const direction = bey.spin === 'left' ? -1 : 1;
    let angle = 0;
    let speed = 0;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Ease toward the throttle, so the top spins up and winds down like a real one.
      speed += (target.current - speed) * Math.min(1, dt * 2.5);
      angle = (angle + direction * speed * 360 * dt) % 360;
      if (rotor.current) rotor.current.style.transform = `rotate(${angle}deg)`;
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [spins, bey.spin]);

  return (
    <>
      <div className="stage">
        <div className="rotor" ref={rotor}>
          <BeyPicture bey={bey} />
        </div>
      </div>
      {spins && (
        <div className="throttle">
          <label className="throttle-head" htmlFor="spin-speed">
            <span className="bar-label">
              <Icon name="spin" className={bey.spin === 'left' ? 'flip' : undefined} />
              Spin speed
            </span>
            <span className="bar-value">{level === 0 ? 'Stop' : level}</span>
          </label>
          <input
            id="spin-speed"
            type="range"
            min={0}
            max={SPIN_SPEEDS.length - 1}
            step={1}
            value={level}
            aria-valuetext={level === 0 ? 'Stopped' : `${level} of ${SPIN_SPEEDS.length - 1}`}
            style={{ '--fill': `${(level / (SPIN_SPEEDS.length - 1)) * 100}%` } as CSSProperties}
            onChange={(event) => setLevel(Number(event.target.value))}
          />
          <span className="throttle-ends" aria-hidden="true">
            <span>Stop</span>
            <span>Max</span>
          </span>
        </div>
      )}
    </>
  );
}
