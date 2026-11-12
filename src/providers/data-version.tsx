import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

interface DataVersionApi {
  version: number;
  /** Call after any write so focused screens re-read from SQLite. */
  invalidate: () => void;
}

const DataVersionContext = createContext<DataVersionApi | null>(null);

export function useDataVersion(): DataVersionApi {
  const context = useContext(DataVersionContext);
  if (!context) throw new Error('useDataVersion must be used inside <DataVersionProvider>');
  return context;
}

export function DataVersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const invalidate = useCallback(() => setVersion((value) => value + 1), []);
  const api = useMemo(() => ({ version, invalidate }), [version, invalidate]);
  return <DataVersionContext.Provider value={api}>{children}</DataVersionContext.Provider>;
}
