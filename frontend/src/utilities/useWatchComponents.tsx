import * as React from 'react';
import * as _ from 'lodash';
import { fetchComponents } from '../services/componentsServices';
import { ODHApp } from '../types';
import { POLL_INTERVAL } from './const';

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
          if (!_.isEqual(components, updatedComponents)) {
            setComponents(updatedComponents);
          }
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

  const returnValues = React.useMemo(() => ({ components, loaded, loadError }), [
    components,
    loaded,
    loadError,
  ]);

  return returnValues;
};
