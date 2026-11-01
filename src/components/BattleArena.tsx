import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import type { Bey } from '../data/types';
import { FINISH_LABELS, FINISH_POINTS, fighterFrom, type BattleResult } from '../data/battle';
import { PHOTOS } from './BeyPicture';
import { BeyPicture } from './BeyPicture';
import { FINISH_ICON, Scoreboard } from './BattleBits';
import { Icon } from './Icon';
import { playClack, playCount, playFinish } from '../lib/sound';

/** One simulated moment lasts this long on screen. */
const TICK_MS = 140;
const COUNTDOWN = ['3', '2', '1', 'Let it rip!'];
const COUNT_MS = 650;
const FINISH_MS = 2000;
/** Bey size as a share of the stadium's width; positions are in stadium radii from the centre. */
const BEY_SIZE = 0.24;
const TOUCH = BEY_SIZE;
/** How many frames back each glowing trail dot sits. */
const TRAIL = [3, 6, 9];
const POW_WORDS = ['BAM!', 'CLASH!', 'POW!', 'WHAM!', 'CRASH!', 'KA-BOOM!'];
const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

type Point = [number, number];
interface Step {
  at: [Point, Point];
  energy: [number, number];
  hit: boolean;
  dash?: 0 | 1;
  /** This Bey was behind and just took the lead. */
  comeback?: 0 | 1;
}

/** A great rip gets a shout-out when the round starts. */
const SUPER_LAUNCH = 1.05;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Where each Bey is at every moment: attackers roam wide, stamina types hug the middle, dashes
 * ride the rail, the Bey on the attack roams harder, and the loser of a crash gets knocked back.
 */
export function battlePath(beys: [Bey, Bey], result: BattleResult): Step[] {
  const aggression = beys.map((bey) => {
    const f = fighterFrom(bey);
    return Math.min(1, (f.attack / 150) * 0.6 + (f.dash / 100) * 0.6);
  });
  const angle = [Math.PI, 0];
  const phase = [0, 1.7];
  const knock = [0, 0];
  let leader: 0 | 1 | null = null;
  const behindBy = [0, 0];
  return result.ticks.map((tick, k) => {
    const at = [0, 1].map((i) => {
      const dir = beys[i].spin === 'left' ? -1 : 1;
      const push = tick.momentum === i ? 1.25 : 0.85;
      angle[i] += dir * (0.18 + 0.28 * aggression[i]) * (tick.dash === i ? 3 : 1);
      const roam = 0.14 + 0.44 * Math.min(1, aggression[i] * push) * (0.5 + 0.5 * Math.sin(k * 0.33 + phase[i]));
      const r = tick.dash === i ? 0.8 : Math.min(0.82, roam + knock[i]);
      knock[i] *= 0.55;
      return [r * Math.cos(angle[i]), r * Math.sin(angle[i])] as Point;
    }) as [Point, Point];
    if (tick.hit) {
      const mid: Point = [(at[0][0] + at[1][0]) / 2, (at[0][1] + at[1][1]) / 2];
      let dx = at[1][0] - at[0][0];
      let dy = at[1][1] - at[0][1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      at[0] = [mid[0] - dx * TOUCH, mid[1] - dy * TOUCH];
      at[1] = [mid[0] + dx * TOUCH, mid[1] + dy * TOUCH];
      if (tick.clash !== undefined) knock[1 - tick.clash] = 0.35;
    }
    // Spot a comeback: the Bey that was clearly behind is now clearly ahead.
    const gap = tick.energy[0] - tick.energy[1];
    behindBy[0] = Math.max(behindBy[0], -gap);
    behindBy[1] = Math.max(behindBy[1], gap);
    const ahead: 0 | 1 | null = gap > 4 ? 0 : gap < -4 ? 1 : null;
    let comeback: 0 | 1 | undefined;
    if (ahead !== null && ahead !== leader) {
      if (leader !== null && behindBy[ahead] >= 8) comeback = ahead;
      leader = ahead;
      behindBy[ahead] = 0;
    }
    return { at, energy: tick.energy, hit: tick.hit, dash: tick.dash, comeback };
  });
}

const ease = (t: number) => t * t * (3 - 2 * t);

interface Props {
  beys: [Bey, Bey];
  names: [string, string];
  result: BattleResult;
  /** The match score before this round. */
  score: [number, number];
  round: number;
  onDone: () => void;
}

/** Plays a simulated round: countdown, the two Beys circling and clashing, then the finish. */
export function BattleArena({ beys, names, result, score, round, onDone }: Props) {
  const arena = useRef<HTMLDivElement>(null);
  const beyEls = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const trailEls = useRef<(HTMLSpanElement | null)[]>([]);
  const meters: [RefObject<HTMLSpanElement | null>, RefObject<HTMLSpanElement | null>] = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)];
  const spark = useRef<HTMLDivElement>(null);
  const pow = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const pieces = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const steps = useMemo(() => battlePath(beys, result), [beys, result]);

  useEffect(() => {
    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      done.current();
      return;
    }
    const loser = result.winner === null ? null : ((1 - result.winner) as 0 | 1);
    const spinDir = beys.map((bey) => (bey.spin === 'left' ? -1 : 1));
    // A harder launch looks faster too: a Super Launch spins about 40% quicker than a normal rip.
    const spinBoost = result.launch.map((launch) => 1 + (launch - 1) * 4);
    const turn = [0, 0];
    const history: Point[][] = [[], []];
    const dashing = [false, false];
    let lastHit = -1;
    let lastComeback = -1;
    let hits = 0;
    let lastCount = -1;
    let finishStarted = false;
    let last = performance.now();
    const start = last;
    let frame = 0;

    const place = (i: 0 | 1, [x, y]: Point, extra = '', opacity = 1) => {
      const el = beyEls[i].current;
      const box = arena.current;
      if (!el || !box) return;
      const R = box.clientWidth / 2;
      const size = box.clientWidth * BEY_SIZE;
      el.style.transform = `translate(${R + x * R - size / 2}px, ${R + y * R - size / 2}px) rotate(${turn[i]}deg) ${extra}`;
      el.style.opacity = String(opacity);
      // Glowing dots follow a few frames behind, so a fast Bey leaves a streak.
      const past = history[i];
      past.push([x, y]);
      if (past.length > TRAIL[TRAIL.length - 1] + 1) past.shift();
      TRAIL.forEach((back, k) => {
        const dot = trailEls.current[i * TRAIL.length + k];
        const at = past[Math.max(0, past.length - 1 - back)];
        if (!dot || !at) return;
        dot.style.transform = `translate(${R + at[0] * R - size / 2}px, ${R + at[1] * R - size / 2}px) scale(${0.9 - k * 0.15})`;
        dot.style.opacity = String(opacity * (0.55 - k * 0.15));
      });
    };
    const setDashing = (i: 0 | 1, on: boolean) => {
      if (dashing[i] === on) return;
      dashing[i] = on;
      beyEls[i].current?.classList.toggle('is-dashing', on);
      TRAIL.forEach((_, k) => trailEls.current[i * TRAIL.length + k]?.classList.toggle('is-hot', on));
    };
    const restart = (el: HTMLElement | null) => {
      if (!el) return;
      el.classList.remove('go');
      void el.offsetWidth;
      el.classList.add('go');
    };
    const flashAt = (el: HTMLElement | null, [x, y]: Point) => {
      const box = arena.current;
      if (!el || !box) return;
      const R = box.clientWidth / 2;
      el.style.left = `${R + x * R}px`;
      el.style.top = `${R + y * R}px`;
      restart(el);
    };
    // Big moments (a comeback, a super launch) stay up a little longer than everyday crash words.
    let holdUntil = 0;
    const say = (word: string, [x, y]: Point) => {
      if (!pow.current || performance.now() < holdUntil) return;
      pow.current.textContent = word;
      pow.current.classList.remove('is-big', 'side-0', 'side-1');
      // Keep the word inside the stadium.
      flashAt(pow.current, [Math.max(-0.45, Math.min(0.45, x)), Math.max(-0.6, Math.min(0.5, y - 0.28))]);
    };
    /** A big word across the middle of the stadium, in the color of the Bey it's about. */
    const shout = (word: string, side: 0 | 1) => {
      if (!pow.current) return;
      holdUntil = performance.now() + 900;
      pow.current.textContent = word;
      pow.current.classList.remove('side-0', 'side-1');
      pow.current.classList.add('is-big', `side-${side}`);
      flashAt(pow.current, [0, -0.38]);
    };

    const loop = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      const t = now - start;
      const countdownMs = COUNT_MS * COUNTDOWN.length;

      if (t < countdownMs) {
        const c = Math.floor(t / COUNT_MS);
        if (c !== lastCount) {
          lastCount = c;
          setCount(c);
          playCount(c === COUNTDOWN.length - 1);
        }
        place(0, [-0.55, 0]);
        place(1, [0.55, 0]);
        frame = requestAnimationFrame(loop);
        return;
      }
      if (lastCount < COUNTDOWN.length) {
        lastCount = COUNTDOWN.length;
        setCount(COUNTDOWN.length);
        const best: 0 | 1 = result.launch[0] >= result.launch[1] ? 0 : 1;
        if (result.launch[best] >= SUPER_LAUNCH) shout('SUPER LAUNCH!', best);
      }

      const k = (t - countdownMs) / TICK_MS;
      const lastStep = steps.length - 1;
      if (k < lastStep) {
        const i0 = Math.floor(k);
        const f = ease(k - i0);
        const a = steps[i0];
        const b = steps[i0 + 1];
        for (const i of [0, 1] as const) {
          const energy = a.energy[i] + (b.energy[i] - a.energy[i]) * f;
          turn[i] += spinDir[i] * dt * 1100 * spinBoost[i] * Math.max(0.1, Math.min(1.3, energy / 100));
          const nowDashing = a.dash === i || b.dash === i;
          if (nowDashing && !dashing[i]) say('X DASH!', a.at[i]);
          setDashing(i, nowDashing);
          place(i, [a.at[i][0] + (b.at[i][0] - a.at[i][0]) * f, a.at[i][1] + (b.at[i][1] - a.at[i][1]) * f]);
          if (meters[i].current) meters[i].current.style.width = `${Math.max(0, Math.min(100, energy))}%`;
        }
        if (b.comeback !== undefined && i0 + 1 !== lastComeback && f > 0.5) {
          lastComeback = i0 + 1;
          shout('COMEBACK!', b.comeback);
        }
        if (b.hit && i0 + 1 !== lastHit && f > 0.8) {
          lastHit = i0 + 1;
          const mid: Point = [(b.at[0][0] + b.at[1][0]) / 2, (b.at[0][1] + b.at[1][1]) / 2];
          flashAt(spark.current, mid);
          if (hits % 2 === 0 && b.comeback === undefined) say(POW_WORDS[Math.floor(Math.random() * POW_WORDS.length)], mid);
          hits++;
          restart(arena.current);
          playClack();
        }
        frame = requestAnimationFrame(loop);
        return;
      }

      // The finish.
      const ft = t - countdownMs - lastStep * TICK_MS;
      if (!finishStarted) {
        finishStarted = true;
        setFinished(true);
        setDashing(0, false);
        setDashing(1, false);
        playFinish();
        if (result.winner !== null) beyEls[result.winner].current?.classList.add('is-winner');
        if (result.finish && result.finish !== 'spin') restart(flash.current);
        if (result.finish === 'burst' && loser !== null) flashAt(pieces.current, steps[lastStep].at[loser]);
        else if (result.finish !== 'spin' && loser !== null) flashAt(spark.current, steps[lastStep].at[loser]);
      }
      const end = steps[lastStep];
      for (const i of [0, 1] as const) {
        const isLoser = i === loser || result.winner === null;
        const from = end.at[i];
        if (!isLoser) {
          turn[i] += spinDir[i] * dt * 900 * spinBoost[i];
          place(i, [from[0] * (1 - Math.min(1, ft / 900) * 0.6), from[1] * (1 - Math.min(1, ft / 900) * 0.6)]);
          continue;
        }
        if (result.finish === 'over' || result.finish === 'xtreme') {
          const p = Math.min(1, ft / (result.finish === 'xtreme' ? 380 : 550));
          const target: Point = result.finish === 'xtreme' ? [0, 1.45] : [from[0] >= 0 ? 1.45 : -1.45, from[1] * 0.4];
          turn[i] += spinDir[i] * dt * 700;
          place(i, [from[0] + (target[0] - from[0]) * p * p, from[1] + (target[1] - from[1]) * p * p], '', 1 - p);
        } else if (result.finish === 'burst') {
          place(i, from, '', 0);
        } else {
          // Spin finish (or a draw): slow down, wobble, and tip over.
          const slow = Math.max(0, 1 - ft / 1200);
          turn[i] += spinDir[i] * dt * 700 * slow;
          const wobble = Math.sin(ft / 55) * 0.035 * slow;
          place(i, [from[0] + wobble, from[1] + wobble * 0.6], slow === 0 ? 'scale(1, 0.82)' : '');
        }
      }
      if (ft < FINISH_MS) {
        frame = requestAnimationFrame(loop);
        return;
      }
      done.current();
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // The round plays once; a new round mounts a new arena.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loserBey = result.winner === null ? undefined : beys[1 - result.winner];
  const burstParts: ReactNode[] = loserBey
    ? [
        <BeyPicture key="blade" bey={loserBey} />,
        ...(loserBey.ratchet?.photo && PHOTOS[`parts/${loserBey.ratchet.photo}`] ? [<img key="ratchet" src={PHOTOS[`parts/${loserBey.ratchet.photo}`]} alt="" />] : []),
        ...(loserBey.bit.photo && PHOTOS[`parts/${loserBey.bit.photo}`] ? [<img key="bit" src={PHOTOS[`parts/${loserBey.bit.photo}`]} alt="" />] : []),
      ]
    : [];

  const after: [number, number] = [...score];
  if (finished && result.winner !== null && result.finish) after[result.winner] += FINISH_POINTS[result.finish];
  const winnerSide = result.winner === null ? undefined : result.winner;

  return (
    <div className="battle">
      <Scoreboard
        beys={beys}
        names={names}
        score={after}
        before={score}
        meters={meters}
        center={
          <>
            <span>Round</span>
            <b>{round}</b>
          </>
        }
      />
      <div className="arena" ref={arena}>
        <div className="arena-logo" />
        <div className="arena-glow" />
        <div className="arena-rail" />
        <div className="arena-lights" />
        <span className="pocket pocket-left" />
        <span className="pocket pocket-right" />
        <span className="pocket pocket-xtreme" />
        {finished && result.winner !== null && <div className="finish-rays" />}
        {[0, 1].flatMap((i) =>
          TRAIL.map((_, k) => (
            <span
              key={`trail-${i}-${k}`}
              className={`trail side-${i}`}
              ref={(el) => {
                trailEls.current[i * TRAIL.length + k] = el;
              }}
            />
          )),
        )}
        {[0, 1].map((i) => (
          <div key={i} className={`arena-bey side-${i}`} ref={beyEls[i]}>
            <BeyPicture bey={beys[i]} />
          </div>
        ))}
        <div className="spark" ref={spark}>
          {SPARK_ANGLES.map((angle) => (
            <i key={angle} style={{ '--a': `${angle}deg` } as CSSProperties} />
          ))}
        </div>
        <div className="pow" ref={pow} aria-hidden="true" />
        <div className="burst-pieces" ref={pieces}>
          {burstParts.map((part, i) => (
            <span key={i} className={`burst-piece piece-${i}`}>
              {part}
            </span>
          ))}
        </div>
        <div className="arena-flash" ref={flash} />
        {count < COUNTDOWN.length && (
          <div className={count === COUNTDOWN.length - 1 ? 'countdown is-go' : 'countdown'} key={count}>
            <span>{COUNTDOWN[count]}</span>
          </div>
        )}
        {finished && (
          <div className={winnerSide === undefined ? 'finish-banner' : `finish-banner side-${winnerSide}`} role="status">
            {result.finish && result.winner !== null ? (
              <>
                <span className="finish-icon">
                  <Icon name={FINISH_ICON[result.finish]} />
                </span>
                <b>{FINISH_LABELS[result.finish]}!</b>
                <span>
                  {names[result.winner]} +{FINISH_POINTS[result.finish]}
                </span>
              </>
            ) : (
              <b>Draw!</b>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
