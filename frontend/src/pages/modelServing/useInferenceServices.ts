import * as React from 'react';
import { getInferenceServiceContext, listInferenceService, useAccessReview } from '~/api';
import { AccessReviewResourceAttributes, InferenceServiceKind, KnownLabels } from '~/k8sTypes';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'serving.kserve.io',
  resource: 'inferenceservices',
  verb: 'list',
};

export type InferenceServicesFetchData = {
  inferenceServices: InferenceServiceKind[];
  hasNonDashboardInferenceServices: boolean;
};

// TODO move to concepts/modelServing?

const useInferenceServices = (
  namespace?: string,
  registeredModelId?: string,
  modelVersionId?: string,
  mrName?: string,
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
        inferenceServices: dashboardInferenceServices,
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

  return useFetchState(
    callback,
    { inferenceServices: [], hasNonDashboardInferenceServices: false },
    { initialPromisePurity: true },
  );
};

export default useInferenceServices;
