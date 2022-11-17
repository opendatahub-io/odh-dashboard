import * as React from 'react';
import * as _ from 'lodash';
import { InferenceServiceKind, ServingRuntimeKind } from 'k8sTypes';
import { UpdateObjectAtPropAndValue } from 'pages/projects/types';
import useGenericObjectState from 'utilities/useGenericObjectState';
import {
  CreatingInferenceServiceObject,
  CreatingServingRuntimeObject,
  InferenceServiceStorageType,
  ServingRuntimeSize,
} from '../types';
import { DashboardConfig } from 'types';
import { DEFAULT_MODEL_SERVER_SIZES } from '../const';
import { useAppContext } from 'app/AppContext';
import useNotification from 'utilities/useNotification';
import { useDeepCompareMemoize } from 'utilities/useDeepCompareMemoize';
import { EMPTY_AWS_SECRET_DATA } from 'pages/projects/dataConnections/const';

export const getServingRuntimeSizes = (config: DashboardConfig): ServingRuntimeSize[] => {
  let sizes = config.spec.modelServerSizes || [];
  if (sizes.length === 0) {
    sizes = DEFAULT_MODEL_SERVER_SIZES;
  }
  return sizes;
};

export const useCreateServingRuntimeObject = (
  existingData?: ServingRuntimeKind,
): [
  data: CreatingServingRuntimeObject,
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>,
  resetDefaults: () => void,
  sizes: ServingRuntimeSize[],
] => {
  const { dashboardConfig } = useAppContext();
  const notification = useNotification();
  const sizes = useDeepCompareMemoize(getServingRuntimeSizes(dashboardConfig));

  const createModelState = useGenericObjectState<CreatingServingRuntimeObject>({
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

  React.useEffect(() => {
    if (existingNumReplicas) {
      setCreateData('numReplicas', existingNumReplicas);
    }
    if (existingResources) {
      let foundSize = sizes.find((size) => _.isEqual(size.resources, existingResources));
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
  }, [
    existingNumReplicas,
    existingResources,
    existingExternalRoute,
    setCreateData,
    notification,
    sizes,
  ]);

  return [...createModelState, sizes];
};

export const defaultInferenceService: CreatingInferenceServiceObject = {
  name: '',
  project: '',
  servingRuntimeName: '',
  storage: {
    type: InferenceServiceStorageType.EXISTING_STORAGE,
    path: '',
    dataConnection: '',
    awsData: EMPTY_AWS_SECRET_DATA,
  },
  format: {
    name: '',
  },
};

export const useCreateInferenceServiceObject = (
  existingData?: InferenceServiceKind,
): [
  data: CreatingInferenceServiceObject,
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>,
  resetDefaults: () => void,
] => {
  const createInferenceServiceState =
    useGenericObjectState<CreatingInferenceServiceObject>(defaultInferenceService);

  const [, setCreateData] = createInferenceServiceState;

  const existingName =
    existingData?.metadata.annotations?.['openshift.io/display-name'] ||
    existingData?.metadata.name ||
    '';
  const existingStorage = existingData?.spec?.predictor.model.storage || undefined;
  const existingServingRuntime = existingData?.spec?.predictor.model.runtime || '';
  const existingProject = existingData?.metadata.namespace || '';
  const existingFormat = existingData?.spec?.predictor.model.modelFormat || undefined;

  React.useEffect(() => {
    if (existingName) {
      setCreateData('name', existingName);
    }
    if (existingServingRuntime) {
      setCreateData('servingRuntimeName', existingServingRuntime);
    }
    if (existingProject) {
      setCreateData('project', existingProject);
    }
    if (existingStorage) {
      setCreateData('storage', {
        type: InferenceServiceStorageType.EXISTING_STORAGE,
        path: existingStorage.path,
        dataConnection: existingStorage.key,
        awsData: EMPTY_AWS_SECRET_DATA,
      });
    }
    if (existingFormat) {
      setCreateData('format', existingFormat);
    }
  }, [
    existingName,
    existingStorage,
    existingFormat,
    existingServingRuntime,
    existingProject,
    setCreateData,
  ]);

  return createInferenceServiceState;
};
