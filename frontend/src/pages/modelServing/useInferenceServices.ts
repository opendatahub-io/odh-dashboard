import * as React from 'react';
import { getInferenceServiceContext, listInferenceService, useAccessReview } from '~/api';
import { AccessReviewResourceAttributes, InferenceServiceKind, KnownLabels } from '~/k8sTypes';
import useFetchState, {
  FetchOptions,
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import { DEFAULT_VALUE_FETCH_STATE } from '~/utilities/const';
import { FetchStateObject } from '~/types';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'serving.kserve.io',
  resource: 'inferenceservices',
  verb: 'list',
};

export type InferenceServicesFetchData = {
  items: InferenceServiceKind[];
  hasNonDashboardInferenceServices: boolean;
};

export const DEFAULT_INFERENCE_SERVICES_FETCH_DATA: InferenceServicesFetchData = {
  items: [],
  hasNonDashboardInferenceServices: false,
};

export const DEFAULT_INFERENCE_SERVICES_FETCH_STATE: FetchStateObject<InferenceServicesFetchData> =
  {
    ...DEFAULT_VALUE_FETCH_STATE,
    data: DEFAULT_INFERENCE_SERVICES_FETCH_DATA,
  };

// TODO move to concepts/modelServing?

const useInferenceServices = (
  namespace?: string,
  registeredModelId?: string,
  modelVersionId?: string,
  mrName?: string,
  fetchOptions?: Partial<FetchOptions>,
): FetchState<InferenceServicesFetchData> => {
  const modelServingEnabled = useModelServingEnabled();

  const [allowCreate, rbacLoaded] = useAccessReview({
    ...accessReviewResource,
  });

  const callback = React.useCallback<FetchStateCallbackPromise<InferenceServicesFetchData>>(
    async (opts) => {
      if (!modelServingEnabled) {
        return Promise.reject(new NotReadyError('Model serving is not enabled'));
      }

      if (!rbacLoaded) {
        return Promise.reject(new NotReadyError('Fetch is not ready'));
      }

      const getInferenceServices = allowCreate ? listInferenceService : getInferenceServiceContext;

      let inferenceServiceList = await getInferenceServices(
        namespace,
        [
          ...(registeredModelId ? [`${KnownLabels.REGISTERED_MODEL_ID}=${registeredModelId}`] : []),
          ...(modelVersionId ? [`${KnownLabels.MODEL_VERSION_ID}=${modelVersionId}`] : []),
        ].join(','),
        opts,
      );

      if (mrName) {
        inferenceServiceList = inferenceServiceList.filter(
          (inferenceService) =>
            inferenceService.metadata.labels?.[KnownLabels.MODEL_REGISTRY_NAME] === mrName ||
            !inferenceService.metadata.labels?.[KnownLabels.MODEL_REGISTRY_NAME],
        );
      }

      const dashboardInferenceServices = inferenceServiceList.filter(
        ({ metadata: { labels } }) => labels?.[KnownLabels.DASHBOARD_RESOURCE] === 'true',
      );
      return {
        items: dashboardInferenceServices,
        hasNonDashboardInferenceServices:
          inferenceServiceList.length > dashboardInferenceServices.length,
      };
    },
    [
      modelServingEnabled,
      rbacLoaded,
      allowCreate,
      namespace,
      registeredModelId,
      modelVersionId,
      mrName,
    ],
  );

  return useFetchState(callback, DEFAULT_INFERENCE_SERVICES_FETCH_DATA, {
    initialPromisePurity: true,
    ...fetchOptions,
  });
};

export default useInferenceServices;
