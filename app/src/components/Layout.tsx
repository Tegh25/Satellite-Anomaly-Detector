import { useEffect, useState, type ReactNode } from 'react';
import { config } from '../config';
import { copy } from '../copy';

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Session-only: the site stores nothing, so the choice resets on reload.
function ThemeToggle() {
  const [dark, setDark] = useState(systemPrefersDark);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  return (
    <button type="button" className="btn btn--ghost btn--small" aria-pressed={dark} onClick={() => setDark((d) => !d)}>
      Dark mode
    </button>
  );
}

function navActive(href: string, path: string): boolean {
  const target = href.replace(/^#/, '');
  if (target === '/') return path === '/' || path.startsWith('/segment');
  return path === target || path.startsWith(`${target}/`);
}

const FOOTER_LINKS: { key: keyof typeof config.links; label: string }[] = [
  { key: 'github', label: 'GitHub' },
  { key: 'modelCard', label: 'Model card' },
  { key: 'writeup', label: 'Write-up' },
  { key: 'dataset', label: 'Dataset' },
];

export function Layout({ path, children }: { path: string; children: ReactNode }) {
  return (
    <>
      <a className="skip" href="#main" onClick={(e) => {
        e.preventDefault();
        document.getElementById('main')?.focus();
      }}>Skip to content</a>
      <header className="site-header">
        <div className="wrap site-header__inner">
          <a href="#/" className="brand">{copy.title}</a>
          <nav aria-label="Main">
            <ul className="nav">
              {copy.nav.map((n) => (
                <li key={n.href}>
                  <a href={n.href} aria-current={navActive(n.href, path) ? 'page' : undefined}>{n.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <ThemeToggle />
        </div>
        <div className="wrap">
          <p className="pill">{copy.pill}</p>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="wrap">
        {children}
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <ul className="footer-links">
            {FOOTER_LINKS.map(({ key, label }) => {
              const href = config.links[key];
              return href ? <li key={key}><a href={href} rel="noopener noreferrer">{label}</a></li> : null;
            })}
          </ul>
          <p className="small">
            {copy.credits.teacher} {copy.credits.baseModel} Dataset: OPSSAT-AD ({config.dataset.licence}).
          </p>
          <p className="small">{copy.footerBuiltBy(config.ownerName)}</p>
        </div>
      </footer>
    </>
  );
}
