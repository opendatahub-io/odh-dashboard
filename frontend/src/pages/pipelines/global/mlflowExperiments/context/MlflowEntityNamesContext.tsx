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

export const MlflowEntityNamesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cache, setCache] = React.useState<Map<string, string>>(new Map());

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
