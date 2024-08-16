import * as React from 'react';
import { getInferenceServiceContext, listInferenceService, useAccessReview } from '~/api';
import { AccessReviewResourceAttributes, InferenceServiceKind, KnownLabels } from '~/k8sTypes';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import { LABEL_SELECTOR_DASHBOARD_RESOURCE } from '~/const';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'serving.kserve.io',
  resource: 'inferenceservices',
  verb: 'list',
};

const useInferenceServices = (
  namespace?: string,
  registeredModelId?: string,
  modelVersionId?: string,
): FetchState<InferenceServiceKind[]> => {
  const modelServingEnabled = useModelServingEnabled();

  const [allowCreate, rbacLoaded] = useAccessReview({
    ...accessReviewResource,
  });

  const callback = React.useCallback<FetchStateCallbackPromise<InferenceServiceKind[]>>(
    (opts) => {
      if (!modelServingEnabled) {
        return Promise.reject(new NotReadyError('Model serving is not enabled'));
      }

      if (!rbacLoaded) {
        return Promise.reject(new NotReadyError('Fetch is not ready'));
      }

      const getInferenceServices = allowCreate ? listInferenceService : getInferenceServiceContext;

      return getInferenceServices(
        namespace,
        [
          LABEL_SELECTOR_DASHBOARD_RESOURCE,
          ...(registeredModelId ? [`${KnownLabels.REGISTERED_MODEL_ID}=${registeredModelId}`] : []),
          ...(modelVersionId ? [`${KnownLabels.MODEL_VERSION_ID}=${modelVersionId}`] : []),
        ].join(','),
        opts,
      );
    },
    [modelServingEnabled, rbacLoaded, allowCreate, namespace, registeredModelId, modelVersionId],
  );

  return useFetchState(callback, [], {
    initialPromisePurity: true,
  });
};

export default useInferenceServices;
