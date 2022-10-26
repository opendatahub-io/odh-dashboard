import * as React from 'react';
import { UpdateObjectAtPropAndValue } from '../pages/projects/types';

const useGenericObjectState = <T>(
  defaultData: T,
): [data: T, setData: UpdateObjectAtPropAndValue<T>, resetDefault: () => void] => {
  const [value, setValue] = React.useState<T>(defaultData);

  const setPropValue = React.useCallback<UpdateObjectAtPropAndValue<T>>((propKey, propValue) => {
    setValue((oldValue) => ({ ...oldValue, [propKey]: propValue }));
  }, []);

  const defaultDataRef = React.useRef(defaultData);
  const resetToDefault = React.useCallback(() => {
    setValue(defaultDataRef.current);
  }, []);

  return [value, setPropValue, resetToDefault];
};

export default useGenericObjectState;
