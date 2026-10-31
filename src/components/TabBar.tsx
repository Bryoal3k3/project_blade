import type { BackName } from '../hooks/useHashRoute';
import { hashFor } from '../hooks/useHashRoute';
import { Icon, type IconName } from './Icon';

const TABS: { name: BackName; label: string; icon: IconName }[] = [
  { name: 'all', label: 'Beys', icon: 'grid' },
  { name: 'build', label: 'Build', icon: 'build' },
  { name: 'mine', label: 'My Beys', icon: 'star' },
  { name: 'wish', label: 'Wish list', icon: 'heart' },
];

export function TabBar({ current, counts }: { current?: BackName; counts: Record<'mine' | 'wish', number> }) {
  return (
    <nav className="tabbar" aria-label="Sections">
      {TABS.map((tab) => {
        const count = tab.name === 'mine' || tab.name === 'wish' ? counts[tab.name] : 0;
        return (
          <a key={tab.name} className="tab" href={hashFor(tab.name)} aria-current={current === tab.name ? 'page' : undefined}>
            <Icon name={tab.icon} />
            {tab.label}
            {count > 0 && <span className="tab-count">{count}</span>}
          </a>
        );
      })}
    </nav>
  );
}
