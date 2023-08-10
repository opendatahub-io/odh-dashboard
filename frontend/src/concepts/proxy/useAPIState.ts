import * as React from 'react';
import { APIState } from '~/concepts/proxy/types';

const useAPIState = <T>(
  hostPath: string | null,
  createAPI: (path: string) => T,
): [apiState: APIState<T>, refreshAPIState: () => void] => {
  const [internalAPIToggleState, setInternalAPIToggleState] = React.useState(false);

  const refreshAPIState = React.useCallback(() => {
    setInternalAPIToggleState((v) => !v);
  }, []);

  const apiState = React.useMemo<APIState<T>>(() => {
    // Note: This is a hack usage to get around the linter -- avoid copying this logic
    // eslint-disable-next-line no-console
    console.log('Computing API', internalAPIToggleState ? '' : '');

    let path = hostPath;
    if (!path) {
      // TODO: we need to figure out maybe a stopgap or something
      path = '';
    }
    const api = createAPI(path);

    return {
      apiAvailable: !!path,
      api,
    };
  }, [createAPI, hostPath, internalAPIToggleState]);

  return [apiState, refreshAPIState];
};

export default useAPIState;
