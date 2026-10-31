import { useEffect, useRef, useState } from 'react';
import type { Bey } from '../data/types';
import { SUPER_LAUNCH } from '../data/battle';
import { BeyPicture } from './BeyPicture';
import { SIDE_NAMES } from './BattleBits';
import { Icon } from './Icon';
import { playCount } from '../lib/sound';

/** The marker takes this long to cross the bar once. */
export const SWEEP_MS = 1000;
/** Taps in the first moments of a sweep don't count, so an excited double tap can't waste a launch. */
const ARM_MS = 220;
/** The result stays up this long before the next launch or the battle. */
const RESULT_MS = 900;

/** Where the marker is, from -1 (left end) to 1 (right end). It starts at the left and sweeps back and forth. */
export function sweepPosition(elapsedMs: number): number {
  const phase = (Math.max(0, elapsedMs) / SWEEP_MS) % 2;
  return phase <= 1 ? -1 + 2 * phase : 3 - 2 * phase;
}

/** Launch power from where the marker stopped: 1.1 dead centre, 0.9 at either end. */
export function launchPower(position: number): number {
  return Math.round((0.9 + 0.2 * (1 - Math.min(1, Math.abs(position)))) * 1000) / 1000;
}

export type LaunchGrade = 'super' | 'great' | 'good' | 'weak';

export function launchGrade(power: number): LaunchGrade {
  if (power >= SUPER_LAUNCH) return 'super';
  if (power >= 1) return 'great';
  if (power >= 0.95) return 'good';
  return 'weak';
}

export const LAUNCH_LABELS: Record<LaunchGrade, string> = { super: 'Super Launch!', great: 'Great rip!', good: 'Good rip', weak: 'Weak rip...' };

export function launchLabel(power: number): string {
  return LAUNCH_LABELS[launchGrade(power)];
}

interface Props {
  beys: [Bey, Bey];
  names: [string, string];
  onDone: (launch: [number, number]) => void;
}

/**
 * Each side launches its Bey in turn, Red then Blue: a marker sweeps the bar, and a tap stops it.
 * In the orange middle it's a Super Launch; near the ends it's a weak rip. One player can do both.
 */
export function LaunchMeter({ beys, names, onDone }: Props) {
  const [side, setSide] = useState<0 | 1>(0);
  const [power, setPower] = useState<number | null>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const position = useRef(-1);
  const startedAt = useRef(0);
  const locked = useRef(false);
  const launches = useRef<[number, number]>([1, 1]);
  const timer = useRef<number | undefined>(undefined);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (power !== null) return;
    startedAt.current = performance.now();
    position.current = -1;
    locked.current = false;
    if (marker.current) marker.current.style.left = '0%';
    if (typeof requestAnimationFrame !== 'function') return;
    let frame = 0;
    const loop = (now: number) => {
      position.current = sweepPosition(now - startedAt.current);
      if (marker.current) marker.current.style.left = `${(position.current + 1) * 50}%`;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [side, power]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const launch = () => {
    if (locked.current || performance.now() - startedAt.current < ARM_MS) return;
    locked.current = true;
    const result = launchPower(position.current);
    launches.current[side] = result;
    setPower(result);
    playCount(result >= SUPER_LAUNCH);
    timer.current = window.setTimeout(() => {
      if (side === 0) {
        setSide(1);
        setPower(null);
      } else {
        done.current([launches.current[0], launches.current[1]]);
      }
    }, RESULT_MS);
  };

  const grade = power === null ? null : launchGrade(power);
  const className = ['launch', `side-${side}`, grade && 'is-launched', grade && `is-${grade}`].filter(Boolean).join(' ');

  return (
    <div className="launcher">
      <button type="button" className={className} onPointerDown={launch} onClick={launch} aria-label={`Launch the ${SIDE_NAMES[side].toLowerCase()} Bey`}>
        <span className="launch-head">
          <span className="side-label">{SIDE_NAMES[side]}</span>
          <span className="launch-name">{names[side]}</span>
        </span>
        <span className="launch-pic">
          <BeyPicture bey={beys[side]} spin={power !== null} />
        </span>
        <span className="launch-track" aria-hidden="true">
          <span className="launch-zone" />
          <span className="launch-marker" ref={marker} />
        </span>
        <span className="launch-ends" aria-hidden="true">
          <span>Weak</span>
          <span>Super</span>
          <span>Weak</span>
        </span>
        {grade === null ? (
          <span className="launch-cue">
            <Icon name="bolt" />
            Tap to launch!
            <Icon name="bolt" />
          </span>
        ) : (
          <span className="launch-result">{LAUNCH_LABELS[grade]}</span>
        )}
      </button>
      <p className="visually-hidden" role="status">
        {grade === null ? `${SIDE_NAMES[side]}: tap to launch ${names[side]}` : `${SIDE_NAMES[side]}: ${LAUNCH_LABELS[grade]}`}
      </p>
      <p className="battle-rule">Tap when the marker is in the orange middle for a Super Launch!</p>
    </div>
  );
}
