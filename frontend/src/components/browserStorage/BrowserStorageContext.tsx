import * as React from 'react';
import { useEventListener } from '../../utilities/useEventListener';

type ValueMap = { [storageKey: string]: unknown };
export type BrowserStorageContext = {
  /** Based on parseJSON it can be any jsonify-able item */
  getValue: (storageKey: string, parseJSON: boolean, isSessionStorage?: boolean) => unknown;
  /** Returns a boolean if it was able to json-ify it. */
  setJSONValue: (storageKey: string, value: unknown, isSessionStorage?: boolean) => boolean;
  setStringValue: (storageKey: string, value: string, isSessionStorage?: boolean) => void;
};

const BrowserStorageContext = React.createContext<BrowserStorageContext>({
  getValue: () => null,
  setJSONValue: () => false,
  setStringValue: () => undefined,
});

/**
 * @returns {boolean} if it was successful, false if it was not
 */
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
      } else if (typeof value === 'string') {
        setStringValue(storageKey, value, isSessionStorage);
        return true;
      } else {
        console.error('Was not a string value provided, cannot stringify');
        return false;
      }
    },
    [isSessionStorage, jsonify, setJSONValue, setStringValue, storageKey],
  );

  return [(getValue(storageKey, jsonify, isSessionStorage) as T) ?? defaultValue, setValue];
};

type BrowserStorageContextProviderProps = {
  children: React.ReactNode;
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
export const BrowserStorageContextProvider: React.FC<BrowserStorageContextProviderProps> = ({
  children,
}) => {
  const [values, setValues] = React.useState<ValueMap>({});

  /**
   * Only listen to other storage changes (windows/tabs) -- which are localStorage.
   * Session storage does not have cross instance storages.
   * See MDN for more: https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
   */
  useEventListener(window, 'storage', () => {
    // Another browser tab has updated storage, sync up the data
    const keys = Object.keys(values);
    setValues(
      keys.reduce((acc, key) => {
        const value = localStorage.getItem(key);
        return { ...acc, [key]: value };
      }, {}),
    );
  });

  const getValue = React.useCallback<BrowserStorageContext['getValue']>(
    (key, parseJSON, isSessionStorage = false) => {
      const value = getStorage(isSessionStorage).getItem(key);
      if (value === null) {
        return value;
      }

      if (parseJSON) {
        try {
          return JSON.parse(value);
        } catch (e) {
          console.warn(`Failed to parse storage value "${key}"`);
          return null;
        }
      } else {
        return value;
      }
    },
    [],
  );

  const setJSONValue = React.useCallback<BrowserStorageContext['setJSONValue']>(
    (storageKey, value, isSessionStorage = false) => {
      try {
        const storageValue = JSON.stringify(value);
        getStorage(isSessionStorage).setItem(storageKey, storageValue);
        setValues((oldValues) => ({ ...oldValues, [storageKey]: storageValue }));

        return true;
      } catch (e) {
        console.warn(
          'Could not store a value because it was requested to be stringified but was an invalid value for stringification.',
        );
        return false;
      }
    },
    [],
  );
  const setStringValue = React.useCallback<BrowserStorageContext['setStringValue']>(
    (storageKey, value, isSessionStorage = false) => {
      getStorage(isSessionStorage).setItem(storageKey, value);
      setValues((oldValues) => ({ ...oldValues, [storageKey]: value }));
    },
    [],
  );

  return (
    <BrowserStorageContext.Provider value={{ getValue, setJSONValue, setStringValue }}>
      {children}
    </BrowserStorageContext.Provider>
  );
};
