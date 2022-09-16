import * as React from 'react';
import { useEventListener } from '../../utilities/useEventListener';

type ValueMap = { [storageKey: string]: unknown };
export type LocalStorageContext = {
  /** Based on parseJSON it can be any jsonify-able item */
  getValue: (storageKey: string, parseJSON: boolean) => unknown;
  /** Returns a boolean if it was able to json-ify it. */
  setJSONValue: (storageKey: string, value: unknown) => boolean;
  setStringValue: (storageKey: string, value: string) => void;
};

const LocalStorageContext = React.createContext<LocalStorageContext>({
  getValue: () => null,
  setJSONValue: () => false,
  setStringValue: () => undefined,
});

/**
 * @returns {boolean} if it was successful, false if it was not
 */
export type SetLocalStorageHook<T> = (value: T) => boolean;

/**
 * useLocalStorage will handle all the effort behind managing localStorage.
 */
export const useLocalStorage = <T,>(
  storageKey: string,
  defaultValue: T,
  jsonify = true,
): [T, SetLocalStorageHook<T>] => {
  const { getValue, setJSONValue, setStringValue } = React.useContext(LocalStorageContext);

  const setValue = React.useCallback<SetLocalStorageHook<T>>(
    (value) => {
      if (jsonify) {
        return setJSONValue(storageKey, value);
      } else if (typeof value === 'string') {
        setStringValue(storageKey, value);
        return true;
      } else {
        console.error('Was not a string value provided, cannot stringify');
        return false;
      }
    },
    [jsonify, setJSONValue, setStringValue, storageKey],
  );

  return [(getValue(storageKey, jsonify) as T) ?? defaultValue, setValue];
};

/**
 * @see useLocalStorage
 */
export const LocalStorageContextProvider: React.FC = ({ children }) => {
  const [values, setValues] = React.useState<ValueMap>({});

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

  const getValue = React.useCallback<LocalStorageContext['getValue']>((key, parseJSON) => {
    const value = localStorage.getItem(key);
    if (value === null) {
      return value;
    }

    if (parseJSON) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.warn(`Failed to parse localStorage value "${key}"`);
        return null;
      }
    } else {
      return value;
    }
  }, []);

  const setJSONValue = React.useCallback<LocalStorageContext['setJSONValue']>(
    (storageKey, value) => {
      try {
        const storageValue = JSON.stringify(value);
        localStorage.setItem(storageKey, storageValue);
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
  const setStringValue = React.useCallback<LocalStorageContext['setStringValue']>(
    (storageKey, value) => {
      localStorage.setItem(storageKey, value);
      setValues((oldValues) => ({ ...oldValues, [storageKey]: value }));
    },
    [],
  );

  return (
    <LocalStorageContext.Provider value={{ getValue, setJSONValue, setStringValue }}>
      {children}
    </LocalStorageContext.Provider>
  );
};
