import { useState } from 'react';
import { findBey } from './data';
import { useCollection } from './hooks/useCollection';
import { useSaved } from './hooks/useSaved';
import { hashFor, useHashRoute } from './hooks/useHashRoute';
import { BeyPage } from './pages/BeyPage';
import { BrowsePage } from './pages/BrowsePage';
import { BuildPage } from './pages/BuildPage';
import { BattlePage } from './pages/BattlePage';
import { TabBar } from './components/TabBar';
import type { TypeFilter } from './components/TypeChips';

export default function App() {
  const { route, backTo } = useHashRoute();
  const collection = useCollection();
  const saved = useSaved();
  const [filter, setFilter] = useState<TypeFilter>('all');
  const counts = { mine: collection.lists.mine.length, wish: collection.lists.wish.length };

  let page;
  if (route.name === 'bey') {
    const bey = findBey(route.id);
    page = bey ? (
      <BeyPage key={bey.id} bey={bey} backHref={hashFor(backTo)} collection={collection} />
    ) : (
      <main className="page">
        <div className="empty">
          <b>That Bey isn't here</b>
          <a className="chip" href="#/">
            See all Beys
          </a>
        </div>
      </main>
    );
  } else if (route.name === 'build') {
    page = <BuildPage collection={collection} saved={saved} />;
  } else if (route.name === 'battle') {
    page = <BattlePage collection={collection} saved={saved} />;
  } else {
    page = <BrowsePage list={route.name} filter={filter} onFilter={setFilter} collection={collection} saved={saved} />;
  }

  return (
    <>
      <div className="status-shim" aria-hidden="true" />
      {page}
      <TabBar current={route.name === 'bey' ? undefined : route.name} counts={counts} />
    </>
  );
}
