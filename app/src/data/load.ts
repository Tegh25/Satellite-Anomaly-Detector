import { createContext, useContext, useEffect, useState } from 'react';
import type { AppData, Meta, Results, Segment } from './types';

const SUFFIX: string = import.meta.env.VITE_DATA_SUFFIX ?? '';

async function getJson<T>(name: string): Promise<T> {
  const res = await fetch(`./data/${name}`);
  if (!res.ok) throw new Error(`Could not load data/${name} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

export function buildAppData(segments: Segment[], meta: Meta, results: Results): AppData {
  const sorted = [...segments].sort((a, b) => a.segment - b.segment);
  return { segments: sorted, meta, results, byId: new Map(sorted.map((s) => [s.segment, s])) };
}

let cache: Promise<AppData> | null = null;

export function loadData(): Promise<AppData> {
  if (!cache) {
    cache = Promise.all([
      getJson<Segment[]>(`segments${SUFFIX}.json`),
      getJson<Meta>(`meta${SUFFIX}.json`),
      getJson<Results>('results.json'),
    ]).then(([s, m, r]) => buildAppData(s, m, r));
    cache.catch(() => {
      cache = null;
    });
  }
  return cache;
}

export type DataState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: AppData };

export function useLoadData(): DataState {
  const [state, setState] = useState<DataState>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    loadData().then(
      (data) => alive && setState({ status: 'ready', data }),
      (e: unknown) => alive && setState({ status: 'error', error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export const DataContext = createContext<AppData | null>(null);

export function useData(): AppData {
  const d = useContext(DataContext);
  if (!d) throw new Error('useData must be used inside a loaded DataContext');
  return d;
}
