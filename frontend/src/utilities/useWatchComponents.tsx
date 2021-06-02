import * as React from 'react';
import { useSelector } from 'react-redux';
import { State } from '../redux/types';
import { fetchComponents } from '../services/componentsServices';
import { OdhApplication } from '../types';
import { POLL_INTERVAL } from './const';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';

export const useWatchComponents = (
  installed: boolean,
): { components: OdhApplication[]; loaded: boolean; loadError: Error | undefined } => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [components, setComponents] = React.useState<OdhApplication[]>([]);
  const forceUpdate: number = useSelector<State, number>(
    (state) => state.appState.forceComponentsUpdate,
  );
  const initForce = React.useRef<number>(forceUpdate);

  React.useEffect(() => {
    let watchHandle;
    const watchComponents = () => {
      fetchComponents(installed)
        .then((updatedComponents: OdhApplication[]) => {
          setLoaded(true);
          setLoadError(undefined);
          setComponents(updatedComponents);
        })
        .catch((e) => {
          setLoadError(e);
        });
      watchHandle = setTimeout(watchComponents, POLL_INTERVAL);
    };
    watchComponents();

    return () => {
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
    // Don't update when components are updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installed]);

  React.useEffect(() => {
    if (initForce.current !== forceUpdate) {
      initForce.current = forceUpdate;
      fetchComponents(installed)
        .then((updatedComponents: OdhApplication[]) => {
          setLoaded(true);
          setLoadError(undefined);
          setComponents(updatedComponents);
        })
        .catch((e) => {
          setLoadError(e);
        });
    }
  }, [forceUpdate, installed]);

  const retComponents = useDeepCompareMemoize<OdhApplication[]>(components);

  return { components: retComponents || [], loaded, loadError };
};
