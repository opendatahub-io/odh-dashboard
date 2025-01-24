import * as React from 'react';
import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { getServingRuntimeContext, listServingRuntimes, useAccessReview } from '~/api';
import { AccessReviewResourceAttributes, KnownLabels, ServingRuntimeKind } from '~/k8sTypes';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import useFetchState, {
  FetchOptions,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { FetchStateObject } from '~/types';
import { DEFAULT_VALUE_FETCH_STATE } from '~/utilities/const';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'serving.kserve.io',
  resource: 'servingruntimes',
  verb: 'list',
};

export type ServingRuntimesFetchData = {
  items: ServingRuntimeKind[];
  hasNonDashboardServingRuntimes: boolean; // TODO rename to hasNonDashboardItems? reuse types between here and useServingRuntimes?
};

export const DEFAULT_SERVING_RUNTIMES_FETCH_DATA: ServingRuntimesFetchData = {
  items: [],
  hasNonDashboardServingRuntimes: false,
};

export const DEFAULT_SERVING_RUNTIMES_FETCH_STATE: FetchStateObject<ServingRuntimesFetchData> = {
  ...DEFAULT_VALUE_FETCH_STATE,
  data: DEFAULT_SERVING_RUNTIMES_FETCH_DATA,
};

// TODO move to concepts/modelServing?
// TODO fix unit tests for the two hooks

const useServingRuntimes = (
  namespace?: string,
  notReady?: boolean,
  fetchOptions?: Partial<FetchOptions>,
): FetchState<ServingRuntimesFetchData> => {
  const modelServingEnabled = useModelServingEnabled();

  const [allowCreate, rbacLoaded] = useAccessReview({
    ...accessReviewResource,
  });

  const callback = React.useCallback<FetchStateCallbackPromise<ServingRuntimesFetchData>>(
    async (opts) => {
      if (!modelServingEnabled) {
        return Promise.reject(new NotReadyError('Model serving is not enabled'));
      }

      if (notReady || !rbacLoaded) {
        return Promise.reject(new NotReadyError('Fetch is not ready'));
      }

      const getServingRuntimes = allowCreate ? listServingRuntimes : getServingRuntimeContext;

      try {
        const servingRuntimeList = await getServingRuntimes(namespace, undefined, opts);
        const dashboardServingRuntimes = servingRuntimeList.filter(
          ({ metadata: { labels } }) => labels?.[KnownLabels.DASHBOARD_RESOURCE] === 'true',
        );
        return {
          items: dashboardServingRuntimes,
          hasNonDashboardServingRuntimes:
            servingRuntimeList.length > dashboardServingRuntimes.length,
        };
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        if ((e as { statusObject?: K8sStatus }).statusObject?.code === 404) {
          throw new Error('Model serving is not properly configured.');
        }
        throw e;
      }
    },
    [namespace, modelServingEnabled, notReady, rbacLoaded, allowCreate],
  );

  return useFetchState(callback, DEFAULT_SERVING_RUNTIMES_FETCH_DATA, {
    initialPromisePurity: true,
    ...fetchOptions,
  });
};

export default useServingRuntimes;
