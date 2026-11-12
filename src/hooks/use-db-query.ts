import { useFocusEffect } from 'expo-router';
import { type SQLiteDatabase, useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDataVersion } from '@/providers/data-version';

export interface DbQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Runs a read against SQLite and re-runs it when the screen regains focus, when
 * any mutation bumps the global data version, or when `deps` change. Keeps
 * screens free of cache wiring while still showing fresh data after an edit
 * made elsewhere in the app.
 *
 * `deps` are joined into a scalar key, so the loader itself does not need to be
 * memoised by the caller.
 */
export function useDbQuery<T>(
  loader: (db: SQLiteDatabase) => Promise<T>,
  deps: readonly (string | number | boolean | null | undefined)[] = [],
): DbQueryResult<T> {
  const db = useSQLiteContext();
  const { version } = useDataVersion();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const depsKey = deps.map((value) => String(value)).join('\u0001');

  const loaderRef = useRef(loader);
  const mounted = useRef(true);

  // Writing the ref in an effect (never during render) keeps the latest loader
  // available to the focus effect below, which runs after this one.
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    try {
      const result = await loaderRef.current(db);
      if (!mounted.current) return;
      setData(result);
      setError(null);
    } catch (cause) {
      if (!mounted.current) return;
      setError(cause instanceof Error ? cause.message : 'Could not load data.');
    } finally {
      if (mounted.current) setLoading(false);
    }
    // version, tick and depsKey are deliberate re-run triggers rather than
    // values read inside the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, version, tick, depsKey]);

  useFocusEffect(
    useCallback(() => {
      void run();
    }, [run]),
  );

  const reload = useCallback(() => setTick((value) => value + 1), []);

  return { data, loading, error, reload };
}
