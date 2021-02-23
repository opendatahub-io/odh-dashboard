import * as React from 'react';
import * as _ from 'lodash';
import { fetchComponents } from '../services/componentsServices';
import { ODHAppType } from '../types';
import { POLL_INTERVAL } from './const';

export const useWatchComponents = (
  installed: boolean,
): { components: ODHAppType[]; loaded: boolean; loadError: Error | undefined } => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [components, setComponents] = React.useState<ODHAppType[]>([]);

  React.useEffect(() => {
    let watchHandle;
    const watchComponents = () => {
      fetchComponents(installed)
        .then((updatedComponents: ODHAppType[]) => {
          setLoaded(true);
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
