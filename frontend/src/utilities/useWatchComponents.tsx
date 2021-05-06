import * as React from 'react';
import { fetchComponents } from '../services/componentsServices';
import { ODHApp } from '@common/types';
import { POLL_INTERVAL } from './const';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';

export const useWatchComponents = (
  installed: boolean,
): { components: ODHApp[]; loaded: boolean; loadError: Error | undefined } => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [components, setComponents] = React.useState<ODHApp[]>([]);

  React.useEffect(() => {
    let watchHandle;
    const watchComponents = () => {
      fetchComponents(installed)
        .then((updatedComponents: ODHApp[]) => {
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

  const retComponents = useDeepCompareMemoize<ODHApp[]>(components);

  return { components: retComponents || [], loaded, loadError };
};
