import { useLayoutEffect } from 'react';
import { BEYS, findBey } from '../data';
import checked from '../data/checked.json';
import { TYPE_INFO } from '../data/meta';
import type { Collection } from '../hooks/useCollection';
import type { Saved } from '../hooks/useSaved';
import { CollectionProgress } from '../components/CollectionProgress';
import type { ListName } from '../hooks/useHashRoute';
import { BeyTile } from '../components/BeyTile';
import { Icon } from '../components/Icon';
import { TypeChips, type TypeFilter } from '../components/TypeChips';

const TITLES: Record<ListName, string> = { all: 'Pick a Bey!', mine: 'My Beys', wish: 'Wish list' };

// Where each list was scrolled to, so coming back from a Bey lands in the same spot.
const savedScroll = new Map<ListName, number>();

interface Props {
  list: ListName;
  filter: TypeFilter;
  onFilter: (next: TypeFilter) => void;
  collection: Collection;
  saved: Saved;
}

function checkedLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function BrowsePage({ list, filter, onFilter, collection, saved }: Props) {
  const inList = list === 'all' ? BEYS : BEYS.filter((bey) => collection.has(list, bey.id));
  const shown = filter === 'all' ? inList : inList.filter((bey) => bey.type === filter);

  useLayoutEffect(() => {
    window.scrollTo(0, savedScroll.get(list) ?? 0);
  }, [list]);

  const remember = () => savedScroll.set(list, window.scrollY);

  return (
    <main className="page">
      <header className="list-head">
        <span className="app-label">Project Blade</span>
        <h1 className="list-title">{TITLES[list]}</h1>
        <span className="list-count">
          {shown.length} {shown.length === 1 ? 'Bey' : 'Beys'}
        </span>
      </header>
      {list === 'mine' && (
        <CollectionProgress
          mine={collection.lists.mine.flatMap((id) => findBey(id) ?? [])}
          builds={saved.builds.length}
          matches={saved.matches}
        />
      )}
      <TypeChips value={filter} onChange={onFilter} />
      {shown.length > 0 ? (
        <div className="grid">
          {shown.map((bey) => (
            <BeyTile
              key={bey.id}
              bey={bey}
              have={collection.has('mine', bey.id)}
              want={collection.has('wish', bey.id)}
              onOpen={remember}
            />
          ))}
        </div>
      ) : (
        <EmptyState list={list} filter={filter} listIsEmpty={inList.length === 0} />
      )}
      {list === 'all' && <p className="checked-note">New Beys last checked {checkedLabel(checked.date)}.</p>}
    </main>
  );
}

function EmptyState({ list, filter, listIsEmpty }: { list: ListName; filter: TypeFilter; listIsEmpty: boolean }) {
  if (listIsEmpty && list === 'mine') {
    return (
      <div className="empty">
        <Icon name="star" />
        <b>No Beys here yet</b>
        <span>Open a Bey you have and tap the star.</span>
      </div>
    );
  }
  if (listIsEmpty && list === 'wish') {
    return (
      <div className="empty">
        <Icon name="heart" />
        <b>Your wish list is empty</b>
        <span>Open a Bey you want and tap the heart.</span>
      </div>
    );
  }
  const label = filter === 'all' ? '' : `${TYPE_INFO[filter].label} `;
  return (
    <div className="empty">
      <Icon name={filter === 'all' ? 'grid' : TYPE_INFO[filter].icon} />
      <b>No {label}Beys here yet</b>
    </div>
  );
}
