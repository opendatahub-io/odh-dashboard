import * as React from 'react';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';

export type GenericObjectState<T> = [
  data: T,
  setData: UpdateObjectAtPropAndValue<T>,
  resetDefault: () => void,
];

const useLMGenericObjectState = <T>(defaultData: T | (() => T)): GenericObjectState<T> => {
  const [value, setValue] = React.useState<T>(defaultData);

  const setPropValue = React.useCallback<UpdateObjectAtPropAndValue<T>>((propKey, propValue) => {
    setValue((oldValue) => {
      if (oldValue[propKey] !== propValue) {
        return { ...oldValue, [propKey]: propValue };
      }
      return oldValue;
    });
  }, []);

  const defaultDataRef = React.useRef(value);
  const resetToDefault = React.useCallback(() => {
    setValue(defaultDataRef.current);
  }, []);

  return [value, setPropValue, resetToDefault];
};

export default useLMGenericObjectState;
