import * as React from 'react';
import { getServingRuntimeContext, listServingRuntimes, useAccessReview } from '~/api';
import { AccessReviewResourceAttributes, ServingRuntimeKind } from '~/k8sTypes';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'serving.kserve.io',
  resource: 'servingruntimes',
  verb: 'list',
};

const useServingRuntimes = (
  namespace?: string,
  notReady?: boolean,
): FetchState<ServingRuntimeKind[]> => {
  const modelServingEnabled = useModelServingEnabled();

  const [allowCreate, rbacLoaded] = useAccessReview({
    ...accessReviewResource,
  });

  const callback = React.useCallback<FetchStateCallbackPromise<ServingRuntimeKind[]>>(
    (opts) => {
      if (!modelServingEnabled) {
        return Promise.reject(new NotReadyError('Model serving is not enabled'));
      }

      if (notReady || !rbacLoaded) {
        return Promise.reject(new NotReadyError('Fetch is not ready'));
      }

      const getServingRuntimes = allowCreate ? listServingRuntimes : getServingRuntimeContext;

      return getServingRuntimes(namespace, LABEL_SELECTOR_DASHBOARD_RESOURCE, opts).catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('Model serving is not properly configured.');
        }
        throw e;
      });
    },
    [namespace, modelServingEnabled, notReady, rbacLoaded, allowCreate],
  );

  return useFetchState(callback, [], {
    initialPromisePurity: true,
  });
};

export default useServingRuntimes;
