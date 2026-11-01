import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FAST_PULL, Ripcord, SLOW_PULL, launchLabel, peakSpeed, pullPower, spinSeconds } from './Ripcord';
import { SUPER_LAUNCH } from '../data/battle';
import { findBey } from '../data';
import type { Bey } from '../data/types';

const beys = [findBey('rudder-phoenix-4-70lf')!, findBey('cobalt-dragoon-2-60c')!] as [Bey, Bey];

describe('ripcord maths', () => {
  it('turns pull speed into launch power', () => {
    expect(pullPower(0)).toBe(0.9);
    expect(pullPower(SLOW_PULL)).toBe(0.9);
    expect(pullPower((SLOW_PULL + FAST_PULL) / 2)).toBe(1);
    expect(pullPower(FAST_PULL)).toBe(1.1);
    expect(pullPower(FAST_PULL * 3)).toBe(1.1);
    expect(pullPower(FAST_PULL * 0.8)).toBeGreaterThanOrEqual(SUPER_LAUNCH);
  });

  it('measures the fastest stretch of the pull, not one jumpy sample', () => {
    const steady = [0, 25, 50, 100].map((t) => ({ t, x: t, y: 0 }));
    expect(peakSpeed(steady)).toBe(1);
    const burstAtEnd = [
      { t: 0, x: 0, y: 0 },
      { t: 100, x: 10, y: 0 },
      { t: 150, x: 110, y: 0 },
    ];
    expect(peakSpeed(burstAtEnd)).toBe(2);
    const jumpy = [
      { t: 0, x: 0, y: 0 },
      { t: 8, x: 60, y: 0 },
      { t: 60, x: 70, y: 0 },
    ];
    expect(peakSpeed(jumpy)).toBeLessThan(2);
    expect(peakSpeed([{ t: 0, x: 0, y: 0 }])).toBe(0);
  });

  it('measures a very quick flick end to end', () => {
    expect(peakSpeed([{ t: 0, x: 0, y: 0 }, { t: 20, x: 60, y: 80 }])).toBe(5);
  });

  it('names the launch and spins faster for a harder one', () => {
    expect(launchLabel(1.1)).toBe('Super Launch!');
    expect(launchLabel(1.02)).toBe('Great rip!');
    expect(launchLabel(0.97)).toBe('Good rip');
    expect(launchLabel(0.9)).toBe('Weak rip...');
    expect(spinSeconds(1.1)).toBeLessThan(spinSeconds(0.9));
  });
});

describe('ripcord', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Drag across the panel at a steady speed, in 16ms frames. */
  function pull(el: Element, pxPerFrame: number, frames: number) {
    fireEvent.pointerDown(el, { clientX: 10, clientY: 100, pointerId: 1 });
    for (let i = 1; i <= frames; i++) {
      act(() => {
        vi.advanceTimersByTime(16);
      });
      fireEvent.pointerMove(el, { clientX: 10 + pxPerFrame * i, clientY: 100, pointerId: 1 });
    }
    fireEvent.pointerUp(el, { clientX: 10 + pxPerFrame * frames, clientY: 100, pointerId: 1 });
  }

  it('launches both Beys from two pulls, fast then slow', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    const onDone = vi.fn();
    render(<Ripcord beys={beys} names={['Phoenix', 'Dragoon']} onDone={onDone} />);
    pull(screen.getByRole('button', { name: 'Launch the red Bey' }), 90, 8);
    expect(screen.getByText('Super Launch!')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    pull(screen.getByRole('button', { name: 'Launch the blue Bey' }), 8, 24);
    expect(screen.getByText('Weak rip...')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDone).toHaveBeenCalledWith([1.1, 0.9]);
  });

  it('asks for a longer pull when the swipe is tiny, and launches from the keyboard', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    const onDone = vi.fn();
    render(<Ripcord beys={beys} names={['Phoenix', 'Dragoon']} onDone={onDone} />);
    const panel = screen.getByRole('button', { name: 'Launch the red Bey' });
    pull(panel, 10, 2);
    expect(screen.getByText('Pull it further!')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.keyDown(panel, { key: 'Enter' });
    expect(screen.getByText('Great rip!')).toBeTruthy();
  });
});
