import * as React from 'react';

import { useEventListener } from './useEventListener';

export const useLocalStorage = (key: string): [string | null, React.Dispatch<string>] => {
  const [value, setValue] = React.useState<string | null>(window.localStorage.getItem(key));

  useEventListener(window, 'storage', () => {
    setValue(window.localStorage.getItem(key));
  });

  const updateValue = React.useCallback(
    (val) => {
      window.localStorage.setItem(key, val);
      setValue(val);
    },
    [key],
  );

  return [value, updateValue];
};
