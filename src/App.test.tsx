import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { BEYS } from './data';
import { barPercent } from './components/PartSection';
import { isListRoute } from './hooks/useHashRoute';

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

  it('shows each Bey\'s line on its tile', () => {
    render(<App />);
    const tile = screen.getByRole('link', { name: /^Rudder Phoenix 4-70LF/ });
    expect(within(tile).getByText('UX')).toBeTruthy();
    const courage = screen.getByRole('link', { name: /^Courage Dran S 6-60V/ });
    expect(within(courage).getByText('CX')).toBeTruthy();
  });

  it('has a spin speed throttle that is remembered', () => {
    render(<App />);
    go('#/bey/rudder-phoenix-4-70lf');
    const throttle = screen.getByRole('slider', { name: /Spin speed/ }) as HTMLInputElement;
    expect(throttle.value).toBe('3');
    fireEvent.change(throttle, { target: { value: '0' } });
    expect(throttle.getAttribute('aria-valuetext')).toBe('Stopped');
    fireEvent.change(throttle, { target: { value: '8' } });
    expect(localStorage.getItem('project-blade:spin-level:v1')).toBe('8');

    go('#/bey/sword-dran-3-60f');
    expect((screen.getByRole('slider', { name: /Spin speed/ }) as HTMLInputElement).value).toBe('8');
  });

  it('says which pack a Bey comes in', () => {
    render(<App />);
    go('#/bey/spider-man-3-60f');
    expect(screen.getByText('Comes in the Spider-Man and Venom Multipack Set')).toBeTruthy();
    expect(screen.getByText('2 Beys + launchers')).toBeTruthy();
    go('#/bey/sword-dran-3-60f');
    expect(screen.getByText(/^Also in the Tail Viper and Sword Dran Dual Pack/)).toBeTruthy();
  });

  it('explains special letter ratchets', () => {
    render(<App />);
    go('#/bey/brace-triceratops-m-85bs');
    expect(screen.getByText(/M-85 is a special ratchet, 8\.5 mm tall\./)).toBeTruthy();
  });

  it('has no throttle when the photo is taken from the side', () => {
    render(<App />);
    go('#/bey/seize-jaguar-hn');
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('builds a Bey from three parts and says what to buy', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<App />);
    go('#/build');
    expect(screen.getByRole('heading', { name: 'Build a Bey!' })).toBeTruthy();

    // Rudder Phoenix's blade, then the 4-70 ratchet and the LF bit.
    fireEvent.click(screen.getByRole('heading', { name: 'Pick a blade' }).closest('section')!.querySelectorAll('button.pick')[0]);
    const pickByName = (name: string) => fireEvent.click(screen.getAllByRole('button').find((b) => b.classList.contains('pick') && b.querySelector('.pick-name')?.textContent === name)!);
    fireEvent.click(screen.getByRole('button', { name: /^Blade/ }));
    pickByName('Rudder Phoenix');
    expect(screen.getByRole('heading', { name: 'Pick a ratchet' })).toBeTruthy();
    pickByName('4-70');
    expect(screen.getByRole('heading', { name: 'Pick a bit' })).toBeTruthy();
    pickByName('LF');

    fireEvent.click(screen.getByRole('button', { name: 'Fuse!' }));
    expect(screen.getByRole('status', { name: 'Fusing your Bey' })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Your new Bey')).toBeTruthy();
    expect(screen.getByText('4-70LF')).toBeTruthy();
    const shop = screen.getByRole('region', { name: 'What you need' });
    expect(within(shop).getByText('Rudder Phoenix 4-70LF')).toBeTruthy();
    expect(within(shop).getByText('Gives you the blade, ratchet and bit')).toBeTruthy();

    fireEvent.click(within(shop).getByRole('button', { name: 'Add to my wish list' }));
    expect(within(shop).getByRole('button', { name: 'On your wish list' })).toBeTruthy();

    // Save it, start over, and find it on the My Builds shelf.
    fireEvent.change(screen.getByLabelText('Give it a name'), { target: { value: 'Fire Bird' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Fire Bird')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Build another' }));
    const shelf = screen.getByRole('region', { name: 'My Builds' });
    fireEvent.click(within(shelf).getByText('Fire Bird'));
    expect(screen.getByText('Your new Bey')).toBeTruthy();
  });

  it('skips the ratchet for a blade with one built in', () => {
    render(<App />);
    go('#/build');
    fireEvent.click(screen.getAllByRole('button').find((b) => b.classList.contains('pick') && b.querySelector('.pick-name')?.textContent === 'Valor Bison')!);
    expect(screen.getByRole('heading', { name: 'Pick a bit' })).toBeTruthy();
    expect(screen.getByText('Built in')).toBeTruthy();
  });

  it('plays a battle round and keeps the match score', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    render(<App />);
    go('#/battle');
    const pickFirst = (side: string) => {
      fireEvent.click(screen.getByRole('button', { name: `Pick the ${side} Bey` }));
      const grid = screen.getByRole('heading', { name: `Pick the ${side} Bey` }).closest('section')!.querySelector('.grid')!;
      fireEvent.click(grid.querySelectorAll('button.pick')[side === 'red' ? 0 : 1]);
    };
    pickFirst('red');
    pickFirst('blue');
    fireEvent.click(screen.getByRole('button', { name: 'Let it rip!' }));
    // Each side launches by pulling the ripcord; Enter stands in for a pull here.
    for (const side of ['red', 'blue']) {
      fireEvent.keyDown(screen.getByRole('button', { name: `Launch the ${side} Bey` }), { key: 'Enter' });
      expect(document.querySelector('.launch-result')?.textContent).toMatch(/Super Launch!|rip/);
      act(() => {
        vi.advanceTimersByTime(1200);
      });
    }
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(screen.getByText(/^Round 1$/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Next round|New match/ })).toBeTruthy();
  });

  it('keeps score for a real battle, first to 4', () => {
    render(<App />);
    go('#/battle');
    fireEvent.click(screen.getByRole('tab', { name: 'Keep score' }));
    const red = document.querySelector('.score-col.side-0') as HTMLElement;
    fireEvent.click(within(red).getByRole('button', { name: /Over/ }));
    expect(within(red).getByLabelText('2 points')).toBeTruthy();
    fireEvent.click(within(red).getByRole('button', { name: /Burst/ }));
    expect(screen.getByText('Player 1 wins!')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByText('Player 1 wins!')).toBeNull();
    expect(within(red).getByLabelText('2 points')).toBeTruthy();
  });

  it('shows collection progress and badges on My Beys', () => {
    render(<App />);
    go('#/bey/cobalt-dragoon-2-60c');
    fireEvent.click(screen.getByRole('button', { name: 'I have it' }));
    go('#/mine');
    const progress = screen.getByRole('region', { name: /1 of \d+ Beys/ });
    const earned = [...progress.querySelectorAll('.badge.is-earned .badge-label')].map((el) => el.textContent);
    expect(earned).toEqual(expect.arrayContaining(['First Bey', 'Left Spinner', 'Pack Opener']));
  });

  it('shows a friendly page for an unknown Bey', () => {
    render(<App />);
    go('#/bey/not-a-bey');
    expect(screen.getByText("That Bey isn't here")).toBeTruthy();
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('stat bars', () => {
  it('use the box scale for each part', () => {
    expect(barPercent('blade', 60)).toBe(60);
    expect(barPercent('bit', 80)).toBe(80);
    expect(barPercent('ratchet', 12)).toBe(37.5);
  });
});

describe('app updates', () => {
  it('only reloads for a new version on the list screens', () => {
    for (const hash of ['', '#', '#/', '#/mine', '#/wish']) expect(isListRoute(hash)).toBe(true);
    for (const hash of ['#/battle', '#/build', '#/bey/rudder-phoenix-4-70lf']) expect(isListRoute(hash)).toBe(false);
  });
});
