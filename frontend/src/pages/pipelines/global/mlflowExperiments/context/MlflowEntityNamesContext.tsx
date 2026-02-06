import * as React from 'react';

export type MlflowEntityType =
  | 'experiment'
  | 'run'
  | 'model'
  | 'loggedModel'
  | 'session'
  | 'prompt'
  | 'version';

interface MlflowEntityNamesContextType {
  getName: (type: MlflowEntityType, id: string) => string | undefined;
  setName: (type: MlflowEntityType, id: string, name: string) => void;
}

const MlflowEntityNamesContext = React.createContext<MlflowEntityNamesContextType>({
  getName: () => undefined,
  setName: () => undefined,
});

const STORAGE_KEY = 'odh.mlflow.entityNames';

const isValidEntries = (data: unknown): data is [string, string][] =>
  Array.isArray(data) &&
  data.every(
    (entry) =>
      Array.isArray(entry) &&
      entry.length === 2 &&
      typeof entry[0] === 'string' &&
      typeof entry[1] === 'string',
  );

const loadFromStorage = (): Map<string, string> => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isValidEntries(parsed)) {
        return new Map(parsed);
      }
    }
  } catch {
    // ignore
  }
  return new Map();
};

const saveToStorage = (cache: Map<string, string>): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...cache]));
  } catch {
    // ignore
  }
};

export const MlflowEntityNamesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cache, setCache] = React.useState<Map<string, string>>(loadFromStorage);

  const getName = React.useCallback(
    (type: MlflowEntityType, id: string): string | undefined => cache.get(`${type}:${id}`),
    [cache],
  );

  const setName = React.useCallback((type: MlflowEntityType, id: string, name: string): void => {
    setCache((prev) => {
      const key = `${type}:${id}`;
      if (prev.get(key) === name) {
        return prev;
      }
      const next = new Map(prev);
      next.set(key, name);
      saveToStorage(next);
      return next;
    });
  }, []);

  const value = React.useMemo(() => ({ getName, setName }), [getName, setName]);

  return (
    <MlflowEntityNamesContext.Provider value={value}>{children}</MlflowEntityNamesContext.Provider>
  );
};

export const useMlflowEntityNames = (): MlflowEntityNamesContextType =>
  React.useContext(MlflowEntityNamesContext);
