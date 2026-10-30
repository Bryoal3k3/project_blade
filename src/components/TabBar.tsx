import type { ListName } from '../hooks/useHashRoute';
import { Icon, type IconName } from './Icon';

const TABS: { list: ListName; href: string; label: string; icon: IconName }[] = [
  { list: 'all', href: '#/', label: 'Beys', icon: 'grid' },
  { list: 'mine', href: '#/mine', label: 'My Beys', icon: 'star' },
  { list: 'wish', href: '#/wish', label: 'Wish list', icon: 'heart' },
];

export function TabBar({ current, counts }: { current?: ListName; counts: Record<'mine' | 'wish', number> }) {
  return (
    <nav className="tabbar" aria-label="Sections">
      {TABS.map((tab) => {
        const count = tab.list === 'all' ? 0 : counts[tab.list];
        return (
          <a key={tab.list} className="tab" href={tab.href} aria-current={current === tab.list ? 'page' : undefined}>
            <Icon name={tab.icon} />
            {tab.label}
            {count > 0 && <span className="tab-count">{count}</span>}
          </a>
        );
      })}
    </nav>
  );
}
