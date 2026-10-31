import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { BEYS, findBey } from './data';
import { spokenIntro, spokenPart } from './pages/BeyPage';
import { barPercent } from './components/PartSection';

function go(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

const values = (part: HTMLElement) => within(part).getAllByText(/^\d+(\.\d+)?$/).map((el) => Number(el.textContent));

describe('App', () => {
  it('lists every Bey and filters by type', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Pick a Bey!' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /type$/ })).toHaveLength(BEYS.length);

    fireEvent.click(screen.getByRole('button', { name: 'Defense' }));
    const tiles = screen.getAllByRole('link', { name: /type$/ });
    expect(tiles.length).toBe(BEYS.filter((bey) => bey.type === 'defense').length);
    tiles.forEach((tile) => expect(tile.getAttribute('aria-label')).toMatch(/Defense type$/));
  });

  it('shows all three parts with the stats from the box', () => {
    render(<App />);
    go('#/bey/rudder-phoenix-4-70lf');
    expect(screen.getByRole('heading', { level: 1, name: 'Rudder Phoenix' })).toBeTruthy();
    expect(screen.getByText('4-70LF')).toBeTruthy();
    expect(screen.getByText('Takara Tomy name: PhoenixRudder')).toBeTruthy();

    expect(values(screen.getByRole('region', { name: 'Rudder Phoenix' }))).toEqual([15, 40, 60]);
    expect(values(screen.getByRole('region', { name: '4-70' }))).toEqual([11, 12, 7, 70]);
    const bit = screen.getByRole('region', { name: /LF/ });
    expect(values(bit)).toEqual([45, 5, 10, 40, 80]);
    expect(within(bit).getByText('Burst')).toBeTruthy();
    expect(screen.queryByText('Stats coming soon')).toBeNull();
  });

  it('shows the pieces of a Custom Line blade', () => {
    render(<App />);
    go('#/bey/courage-dran-s-6-60v');
    const blade = screen.getByRole('region', { name: 'Courage Dran S' });
    expect(values(blade)).toEqual([60, 20, 20]);
    const pieces = within(blade).getByRole('list', { name: 'Blade pieces' });
    expect(within(pieces).getByText('Courage')).toBeTruthy();
    expect(within(pieces).getByText('Primary Blade')).toBeTruthy();
  });

  it('skips the ratchet panel when the ratchet is built into the blade', () => {
    render(<App />);
    go('#/bey/valor-bison-fb');
    expect(screen.getByText('Ratchet-Integrated Blade')).toBeTruthy();
    expect(screen.getAllByRole('region')).toHaveLength(2);
  });

  it('adds a Bey to My Beys and takes it off the wish list', () => {
    render(<App />);
    go('#/bey/wand-wizard-5-70db');
    fireEvent.click(screen.getByRole('button', { name: 'I want it' }));
    fireEvent.click(screen.getByRole('button', { name: 'I have it' }));
    expect(screen.getByRole('button', { name: 'I have it' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'I want it' }).getAttribute('aria-pressed')).toBe('false');

    go('#/mine');
    const grid = document.querySelector('.grid') as HTMLElement;
    expect(within(grid).getAllByRole('link')).toHaveLength(1);
    expect(within(grid).getByRole('link', { name: /Wand Wizard 5-70DB/ })).toBeTruthy();

    go('#/wish');
    expect(screen.getByText('Your wish list is empty')).toBeTruthy();
  });

  it('shows a friendly page for an unknown Bey', () => {
    render(<App />);
    go('#/bey/not-a-bey');
    expect(screen.getByText("That Bey isn't here")).toBeTruthy();
  });
});

describe('stat bars', () => {
  it('use the box scale for each part', () => {
    expect(barPercent('blade', 60)).toBe(60);
    expect(barPercent('bit', 80)).toBe(80);
    expect(barPercent('ratchet', 12)).toBe(37.5);
  });
});

describe('read aloud', () => {
  const bey = findBey('rudder-phoenix-4-70lf')!;

  it('says the name, combo, type and spin', () => {
    expect(spokenIntro(bey)).toBe('Rudder Phoenix, 4 70 Low Flat. Attack type. Spins right.');
    expect(spokenIntro(findBey('valor-bison-fb')!)).toBe('Valor Bison, Free Ball. Stamina type. Spins right.');
  });

  it('says each part like the box', () => {
    expect(spokenPart(bey, 'blade')).toBe('Blade, Rudder Phoenix. Attack 15, Defense 40, Stamina 60.');
    expect(spokenPart(bey, 'ratchet')).toBe('Ratchet, 4 70. Attack 11, Defense 12, Stamina 7, Height 70.');
    expect(spokenPart(bey, 'bit')).toBe('Bit, Low Flat. Attack 45, Defense 5, Stamina 10, Dash 40, Burst 80.');
    expect(spokenPart(findBey('seize-jaguar-hn')!, 'blade')).toBe('Ratchet-Integrated Blade, Seize Jaguar. Stats coming soon.');
  });
});
