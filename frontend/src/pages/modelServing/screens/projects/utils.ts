import * as React from 'react';
import * as _ from 'lodash';
import { ModelServerKind } from 'k8sTypes';
import { UpdateObjectAtPropAndValue } from 'pages/projects/types';
import useGenericObjectState from 'utilities/useGenericObjectState';
import { CreatingModelServerObject, ModelServerSize } from '../types';
import { DashboardConfig } from 'types';
import { DEFAULT_MODEL_SERVER_SIZES } from '../const';
import { useAppContext } from 'app/AppContext';
import useNotification from 'utilities/useNotification';
import { useDeepCompareMemoize } from 'utilities/useDeepCompareMemoize';

export const getModelSizes = (config: DashboardConfig): ModelServerSize[] => {
  let sizes = config.spec.modelServerSizes || [];
  if (sizes.length === 0) {
    sizes = DEFAULT_MODEL_SERVER_SIZES;
  }
  return sizes;
};

export const useCreateModelServerObject = (
  existingData?: ModelServerKind,
): [
  data: CreatingModelServerObject,
  setData: UpdateObjectAtPropAndValue<CreatingModelServerObject>,
  resetDefaults: () => void,
  sizes: ModelServerSize[],
] => {
  const { dashboardConfig } = useAppContext();
  const notification = useNotification();
  const sizes = useDeepCompareMemoize(getModelSizes(dashboardConfig));

  const createModelState = useGenericObjectState<CreatingModelServerObject>({
    numReplicas: 1,
    modelSize: sizes[0],
    gpus: 0,
    externalRoute: false,
    tokenAuth: false,
    tokens: [],
  });

  const [, setCreateData] = createModelState;

  const existingNumReplicas = parseInt(
    existingData?.metadata.annotations?.maxLoadingConcurrency || '1',
  );
  const existingResources = existingData?.spec?.containers[0]?.resources || sizes[0].resources;

  //const existingGpus = existingData ? existingData.spec?.containers[0]?.resources?.limits.?["nvidia.com/gpu"] : 0;

  const existingExternalRoute = !!existingData?.metadata.annotations?.externalRoute;

  React.useEffect(
    () => () => {
      if (existingNumReplicas) {
        setCreateData('numReplicas', existingNumReplicas);
      }
      if (existingResources) {
        let foundSize = sizes.find((size) => !_.isEqual(size.resources, existingResources));
        if (!foundSize) {
          foundSize = sizes[0];
          notification.warning(
            'The size you select is no longer available, we have set the size to the default one.',
          );
        }
        setCreateData('modelSize', foundSize);
      }
      if (existingExternalRoute) {
        setCreateData('externalRoute', existingExternalRoute);
      }
    },
    [
      existingNumReplicas,
      existingResources,
      existingExternalRoute,
      setCreateData,
      notification,
      sizes,
    ],
  );

  return [...createModelState, sizes];
};
