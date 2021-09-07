import * as React from 'react';
import { useSelector } from 'react-redux';
import { State } from '../redux/types';
import { fetchComponents } from '../services/componentsServices';
import { OdhApplication } from '../types';
import { useFetchWatcher } from './useFetchWatcher';

export const useWatchComponents = (
  installed: boolean,
): {
  results: OdhApplication[] | null;
  loaded: boolean;
  loadError?: Error;
} => {
  const forceUpdate: number = useSelector<State, number>(
    (state) => state.appState.forceComponentsUpdate,
  );
  const getComponents = React.useCallback(() => {
    return fetchComponents(installed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installed, forceUpdate]);

  return useFetchWatcher<OdhApplication[]>(getComponents);
};
