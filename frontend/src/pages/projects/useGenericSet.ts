import * as React from 'react';
import { ToggleValueInSet } from './types';

const useGenericSet = <T>(defaultData: Array<T>): [Set<T>, ToggleValueInSet<T>] => {
  const [value, setValue] = React.useState<Set<T>>(new Set<T>(defaultData));

  const toggleValue = React.useCallback<ToggleValueInSet<T>>((value, operation) => {
    if (operation) {
      setValue((oldSet) => new Set<T>(oldSet.add(value)));
    } else {
      setValue((oldSet) => {
        const copySet = new Set<T>(oldSet);
        copySet.delete(value);
        return copySet;
      });
    }
  }, []);

  return [value, toggleValue];
};

export default useGenericSet;
