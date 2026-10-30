import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { BEYS } from './data';
import { spokenText } from './pages/BeyPage';

function go(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

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

  it('opens a Bey page with its parts', () => {
    render(<App />);
    go('#/bey/dran-sword');
    expect(screen.getByRole('heading', { name: 'Dran Sword' })).toBeTruthy();
    expect(screen.getByText('3-60F')).toBeTruthy();
    expect(screen.getByText('On Hasbro boxes: Sword Dran')).toBeTruthy();
    expect(screen.getByText('Stats coming soon')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Bit' }));
    expect(screen.getByRole('tab', { name: 'Bit' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('F · Flat')).toBeTruthy();
  });

  it('adds a Bey to My Beys and takes it off the wish list', () => {
    render(<App />);
    go('#/bey/wizard-rod');
    fireEvent.click(screen.getByRole('button', { name: 'I want it' }));
    fireEvent.click(screen.getByRole('button', { name: 'I have it' }));
    expect(screen.getByRole('button', { name: 'I have it' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'I want it' }).getAttribute('aria-pressed')).toBe('false');

    go('#/mine');
    const grid = document.querySelector('.grid') as HTMLElement;
    expect(within(grid).getAllByRole('link')).toHaveLength(1);
    expect(within(grid).getByRole('link', { name: /Wizard Rod/ })).toBeTruthy();

    go('#/wish');
    expect(screen.getByText('Your wish list is empty')).toBeTruthy();
  });

  it('shows a friendly page for an unknown Bey', () => {
    render(<App />);
    go('#/bey/not-a-bey');
    expect(screen.getByText("That Bey isn't here")).toBeTruthy();
  });
});

describe('read aloud', () => {
  it('says the stats for the part on screen', () => {
    const bey = {
      ...BEYS[0],
      bit: { ...BEYS[0].bit, stats: { attack: 40, defense: 15, stamina: 10, dash: 35, burstResistance: 30 } },
    };
    expect(spokenText(bey, 'bit')).toBe(
      'Dran Sword, 3 60 Flat. Attack type. Bit stats: Attack 40, Defense 15, Stamina 10, Dash 35, Burst resistance 30.',
    );
    expect(spokenText(bey, 'blade')).toBe('Dran Sword, 3 60 Flat. Attack type. Stats coming soon.');
  });
});
