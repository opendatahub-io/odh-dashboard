import * as React from 'react';
import {
  useFetchState,
  FetchStateObject,
  FetchStateCallbackPromise,
  APIOptions,
  NotReadyError,
} from 'mod-arch-core';
import type { MaaSModel } from '~/odh/extension-points/maas';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchMaaSModels = (): FetchStateObject<MaaSModel[]> => {
  const { api, apiAvailable } = useGenAiAPI();

  // TODO: Uncomment when extension is ready to be used
  // const getMaaSModelsExtension = useExtensions(isMaaSModelsExtension);

  const fetchMaaSModels = React.useCallback<FetchStateCallbackPromise<MaaSModel[]>>(
    async (opts: APIOptions) => {
      // if (getMaaSModelsExtension.length > 0) {
      //   const extensionFn = getMaaSModelsExtension[0].properties.getMaaSModels;
      //   return extensionFn().then((fn) => fn(opts));
      // }
      // Promise.reject(new Error('MaaS models extension not found'));

      if (!apiAvailable) {
        return Promise.reject(new NotReadyError('API not yet available'));
      }
      const rawData = await api.getMaaSModels(opts);
      // Ensure we always return an array, even if API returns null
      return Array.isArray(rawData) ? rawData : [];
    },
    [api, apiAvailable],
  );

  const [data, loaded, error, refresh] = useFetchState(fetchMaaSModels, [], {
    initialPromisePurity: true,
  });

  return { data, loaded, error, refresh };
};

export default useFetchMaaSModels;
