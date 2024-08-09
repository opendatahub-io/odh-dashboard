import * as React from 'react';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { fetchConnectionTypes } from '~/services/connectionTypesService';
import { POLL_INTERVAL } from './const';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';

export const useWatchConnectionTypes = (): {
  connectionTypes: ConnectionTypeConfigMapObj[];
  loaded: boolean;
  loadError: Error | undefined;
  forceRefresh: (usernames?: string[]) => void;
} => {
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [connectionTypes, setConnectionTypes] = React.useState<ConnectionTypeConfigMapObj[]>([]);

  const getConnectionTypes = React.useCallback(() => {
    fetchConnectionTypes()
      .then((updatedConnectionTypes: ConnectionTypeConfigMapObj[]) => {
        setLoaded(true);
        setLoadError(undefined);
        setConnectionTypes(updatedConnectionTypes);
      })
      .catch((e) => {
        setLoadError(e);
      });
  }, []);

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;

    const watchConnectionTypes = () => {
      getConnectionTypes();
      watchHandle = setTimeout(watchConnectionTypes, POLL_INTERVAL);
    };
    watchConnectionTypes();

    return () => {
      clearTimeout(watchHandle);
    };
  }, [getConnectionTypes]);

  const forceRefresh = React.useCallback(() => {
    getConnectionTypes();
  }, [getConnectionTypes]);

  const retConnectionTypes = useDeepCompareMemoize<ConnectionTypeConfigMapObj[]>(connectionTypes);

  return { connectionTypes: retConnectionTypes, loaded, loadError, forceRefresh };
};
