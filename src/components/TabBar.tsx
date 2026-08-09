import { NavLink } from 'react-router';

/**
 * Bottom tabs.
 *
 * These were deliberately withheld while the app had one drill — a tab bar
 * over a single destination is chrome pretending to be an app. Now that
 * there are four pillars and several courses, hiding them was making a
 * seventeen-level app look like a one-trick toy, which is the opposite
 * problem. Three tabs, no more.
 */

const TABS = [
  { to: '/', label: 'Today', icon: <Diamond /> },
  { to: '/practice', label: 'Practice', icon: <Grid /> },
  { to: '/you', label: 'You', icon: <Circle /> },
];

export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="pad-bottom sticky bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 pt-2">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 transition ${
                isActive ? 'text-accent' : 'text-subtle hover:text-ink'
              }`
            }
          >
            {t.icon}
            <span className="label">{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Diamond() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 2.5l6.5 6.5L9 15.5 2.5 9 9 2.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Grid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="2.5" width="5.5" height="5.5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2.5" y="10" width="5.5" height="5.5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="10" width="5.5" height="5.5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Circle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="2" fill="currentColor" />
    </svg>
  );
}
