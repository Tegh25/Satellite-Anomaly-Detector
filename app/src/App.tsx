import { useEffect, useRef } from 'react';
import { copy } from './copy';
import { DataContext, useLoadData } from './data/load';
import type { AppData } from './data/types';
import { Layout } from './components/Layout';
import { About } from './pages/About';
import { BlindTest, CompareDetail, CompareList, TallyProvider } from './pages/Compare';
import { Explorer } from './pages/Explorer';
import { NotFound } from './pages/NotFound';
import { Results } from './pages/Results';
import { SegmentPage } from './pages/Segment';
import { Tricky } from './pages/Tricky';
import { useRoute, type Route } from './router';

const TITLES: Record<string, string> = {
  tricky: 'Tricky cases', compare: 'Compare', results: 'Results', about: 'About',
};

function Page({ route }: { route: Route }) {
  const parts = route.path.split('/').filter(Boolean);
  const [head, arg] = parts;
  if (!head) return <Explorer params={route.params} />;
  if (head === 'segment' && arg && /^\d+$/.test(arg) && parts.length === 2) {
    return <SegmentPage id={Number(arg)} params={route.params} />;
  }
  if (head === 'tricky' && !arg) return <Tricky />;
  if (head === 'compare') {
    if (!arg) return <CompareList />;
    if (arg === 'blind') return <BlindTest />;
    if (/^\d+$/.test(arg)) return <CompareDetail id={Number(arg)} />;
  }
  if (head === 'results' && parts.length <= 2) return <Results section={arg} />;
  if (head === 'about' && !arg) return <About />;
  return <NotFound />;
}

function Skeleton() {
  return (
    <div className="skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading data</span>
      <div className="sk sk--h1" />
      <div className="sk sk--line" />
      <div className="sk sk--line sk--short" />
      <div className="sk sk--block" />
    </div>
  );
}

function documentTitle(route: Route): string {
  const [head, arg] = route.path.split('/').filter(Boolean);
  if (head === 'segment' && arg) return `Segment ${arg} | ${copy.title}`;
  return head && TITLES[head] ? `${TITLES[head]} | ${copy.title}` : copy.title;
}

export function AppView({ data, route }: { data: AppData; route: Route }) {
  return (
    <DataContext.Provider value={data}>
      <Page route={route} />
    </DataContext.Provider>
  );
}

export default function App() {
  const route = useRoute();
  const state = useLoadData();
  const first = useRef(true);
  const title = documentTitle(route);

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!route.path.startsWith('/results/')) window.scrollTo(0, 0);
  }, [route.path]);

  return (
    <TallyProvider>
      <Layout path={route.path}>
        {state.status === 'loading' && <Skeleton />}
        {state.status === 'error' && (
          <div className="empty empty--page" role="alert">
            <h1>Data could not be loaded</h1>
            <p>{state.error}</p>
          </div>
        )}
        {state.status === 'ready' && <AppView data={state.data} route={route} />}
      </Layout>
    </TallyProvider>
  );
}
