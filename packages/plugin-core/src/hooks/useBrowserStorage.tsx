import * as React from 'react';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';
import { useEventListener } from './useEventListener';

type ValueMap = { [storageKey: string]: unknown };
export type BrowserStorageContextType = {
  getValue: (storageKey: string, parseJSON: boolean, isSessionStorage?: boolean) => unknown;
  setJSONValue: (storageKey: string, value: unknown, isSessionStorage?: boolean) => boolean;
  setStringValue: (storageKey: string, value: string, isSessionStorage?: boolean) => void;
};

export const BrowserStorageContext = React.createContext<BrowserStorageContextType>({
  getValue: () => null,
  setJSONValue: () => false,
  setStringValue: () => undefined,
});

export type SetBrowserStorageHook<T> = (value: T) => boolean;

/**
 * useBrowserStorage will handle all the effort behind managing localStorage or sessionStorage.
 */
export const useBrowserStorage = <T,>(
  storageKey: string,
  defaultValue: T,
  jsonify = true,
  isSessionStorage = false,
): [T, SetBrowserStorageHook<T>] => {
  const { getValue, setJSONValue, setStringValue } = React.useContext(BrowserStorageContext);

  const setValue = React.useCallback<SetBrowserStorageHook<T>>(
    (value) => {
      if (jsonify) {
        return setJSONValue(storageKey, value, isSessionStorage);
      }
      if (typeof value === 'string') {
        setStringValue(storageKey, value, isSessionStorage);
        return true;
      }
      /* eslint-disable-next-line no-console */
      console.error('Was not a string value provided, cannot stringify');
      return false;
    },
    [isSessionStorage, jsonify, setJSONValue, setStringValue, storageKey],
  );

  const value = useDeepCompareMemoize(
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    (getValue(storageKey, jsonify, isSessionStorage) as T) ?? defaultValue,
  );
  return [value, setValue];
};

const getStorage = (isSessionStorage: boolean): Storage => {
  if (isSessionStorage) {
    return sessionStorage;
  }

  return localStorage;
};

/**
 * @see useBrowserStorage
 */
export const BrowserStorageContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [values, setValues] = React.useState<ValueMap>({});

  useEventListener(window, 'storage', () => {
    const keys = Object.keys(values);
    setValues(
      keys.reduce((acc, key) => {
        const value = localStorage.getItem(key);
        return { ...acc, [key]: value };
      }, {}),
    );
  });

  const getValue = React.useCallback<BrowserStorageContextType['getValue']>(
    (key, parseJSON, isSessionStorage = false) => {
      const value = getStorage(isSessionStorage).getItem(key);
      if (value === null) {
        return value;
      }

      if (parseJSON) {
        try {
          return JSON.parse(value);
        } catch (e) {
          /* eslint-disable-next-line no-console */
          console.warn(`Failed to parse storage value "${key}"`);
          return null;
        }
      } else {
        return value;
      }
    },
    [],
  );

  const setJSONValue = React.useCallback<BrowserStorageContextType['setJSONValue']>(
    (storageKey, value, isSessionStorage = false) => {
      try {
        const storageValue = JSON.stringify(value);
        getStorage(isSessionStorage).setItem(storageKey, storageValue);
        setValues((oldValues) => ({ ...oldValues, [storageKey]: storageValue }));

        return true;
      } catch (e) {
        /* eslint-disable-next-line no-console */
        console.warn(
          'Could not store a value because it was requested to be stringified but was an invalid value for stringification.',
        );
        return false;
      }
    },
    [],
  );
  const setStringValue = React.useCallback<BrowserStorageContextType['setStringValue']>(
    (storageKey, value, isSessionStorage = false) => {
      getStorage(isSessionStorage).setItem(storageKey, value);
      setValues((oldValues) => ({ ...oldValues, [storageKey]: value }));
    },
    [],
  );

  const contextValue = React.useMemo(
    () => ({ getValue, setJSONValue, setStringValue }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getValue, setJSONValue, setStringValue, values],
  );

  return (
    <BrowserStorageContext.Provider value={contextValue}>{children}</BrowserStorageContext.Provider>
  );
};
