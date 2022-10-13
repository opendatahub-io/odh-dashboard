import * as React from 'react';
import { UpdateObjectAtPropAndValue } from './typeHelpers';

const useGenericObjectState = <T>(defaultData: T): [T, UpdateObjectAtPropAndValue<T>] => {
  const [value, setValue] = React.useState<T>(defaultData);

  const setPropValue = React.useCallback<UpdateObjectAtPropAndValue<T>>((propKey, propValue) => {
    setValue((oldValue) => ({ ...oldValue, [propKey]: propValue }));
  }, []);

  return [value, setPropValue];
};

export default useGenericObjectState;
