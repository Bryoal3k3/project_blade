import { useState } from 'react';
import { findBey } from './data';
import { useCollection } from './hooks/useCollection';
import { useHashRoute } from './hooks/useHashRoute';
import { BeyPage } from './pages/BeyPage';
import { BrowsePage } from './pages/BrowsePage';
import { TabBar } from './components/TabBar';
import type { TypeFilter } from './components/TypeChips';

export default function App() {
  const { route, lastList } = useHashRoute();
  const collection = useCollection();
  const [filter, setFilter] = useState<TypeFilter>('all');
  const backHref = lastList === 'all' ? '#/' : `#/${lastList}`;
  const counts = { mine: collection.lists.mine.length, wish: collection.lists.wish.length };

  let page;
  if (route.name === 'bey') {
    const bey = findBey(route.id);
    page = bey ? (
      <BeyPage key={bey.id} bey={bey} backHref={backHref} collection={collection} />
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
  } else {
    page = <BrowsePage list={route.name} filter={filter} onFilter={setFilter} collection={collection} />;
  }

  return (
    <>
      <div className="status-shim" aria-hidden="true" />
      {page}
      <TabBar current={route.name === 'bey' ? undefined : route.name} counts={counts} />
    </>
  );
}
