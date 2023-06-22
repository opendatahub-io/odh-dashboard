import * as React from 'react';
import { InferenceServiceKind, SecretKind, ServingRuntimeKind } from '~/k8sTypes';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import {
  CreatingInferenceServiceObject,
  CreatingServingRuntimeObject,
  InferenceServiceStorageType,
  ServingRuntimeSize,
} from '~/pages/modelServing/screens/types';
import { ContainerResourceAttributes, DashboardConfig } from '~/types';
import { DEFAULT_MODEL_SERVER_SIZES } from '~/pages/modelServing/screens/const';
import { useAppContext } from '~/app/AppContext';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import { EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
import { getDisplayNameFromK8sResource } from '~/pages/projects/utils';
import { getDisplayNameFromServingRuntimeTemplate } from '~/pages/modelServing/customServingRuntimes/utils';
import { isCpuLimitEqual, isMemoryLimitEqual } from '~/utilities/valueUnits';

export const getServingRuntimeSizes = (config: DashboardConfig): ServingRuntimeSize[] => {
  let sizes = config.spec.modelServerSizes || [];
  if (sizes.length === 0) {
    sizes = DEFAULT_MODEL_SERVER_SIZES;
  }
  return sizes;
};

export const isServingRuntimeTokenEnabled = (servingRuntime: ServingRuntimeKind): boolean =>
  servingRuntime.metadata.annotations?.['enable-auth'] === 'true';

export const isServingRuntimeRouteEnabled = (servingRuntime: ServingRuntimeKind): boolean =>
  servingRuntime.metadata.annotations?.['enable-route'] === 'true';

export const isGpuDisabled = (servingRuntime: ServingRuntimeKind): boolean =>
  servingRuntime.metadata.annotations?.['opendatahub.io/disable-gpu'] === 'true';

export const getInferenceServiceFromServingRuntime = (
  inferenceServices: InferenceServiceKind[],
  servingRuntime: ServingRuntimeKind,
): InferenceServiceKind[] =>
  inferenceServices.filter(
    (inferenceService) =>
      inferenceService.spec.predictor.model.runtime === servingRuntime.metadata.name,
  );

export const useCreateServingRuntimeObject = (existingData?: {
  servingRuntime?: ServingRuntimeKind;
  secrets: SecretKind[];
}): [
  data: CreatingServingRuntimeObject,
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>,
  resetDefaults: () => void,
  sizes: ServingRuntimeSize[],
] => {
  const { dashboardConfig } = useAppContext();

  const sizes = useDeepCompareMemoize(getServingRuntimeSizes(dashboardConfig));

  const createModelState = useGenericObjectState<CreatingServingRuntimeObject>({
    name: '',
    servingRuntimeTemplateName: '',
    numReplicas: 1,
    modelSize: sizes[0],
    gpus: 0,
    externalRoute: false,
    tokenAuth: false,
    tokens: [],
  });

  const [, setCreateData] = createModelState;

  const existingServingRuntimeName = existingData?.servingRuntime
    ? getDisplayNameFromK8sResource(existingData.servingRuntime)
    : '';

  const existingServingRuntimeTemplateName = existingData?.servingRuntime
    ? getDisplayNameFromServingRuntimeTemplate(existingData.servingRuntime)
    : '';

  const existingNumReplicas = existingData?.servingRuntime?.spec.replicas ?? 1;

  const existingResources =
    existingData?.servingRuntime?.spec?.containers[0]?.resources || sizes[0].resources;

  const existingGpus =
    existingData?.servingRuntime?.spec?.containers[0]?.resources?.requests?.[
      ContainerResourceAttributes.NVIDIA_GPU
    ] || 0;

  const existingExternalRoute =
    existingData?.servingRuntime?.metadata.annotations?.['enable-route'] === 'true';
  const existingTokenAuth =
    existingData?.servingRuntime?.metadata.annotations?.['enable-auth'] === 'true';

  const existingTokens = useDeepCompareMemoize(
    (existingData?.secrets || []).map((secret) => ({
      name: getDisplayNameFromK8sResource(secret) || secret.metadata.name,
      editName: secret.metadata.name,
      uuid: secret.metadata.name,
      error: '',
    })),
  );

  React.useEffect(() => {
    if (existingServingRuntimeName) {
      setCreateData('name', existingServingRuntimeName);
      setCreateData('servingRuntimeTemplateName', existingServingRuntimeTemplateName);
      setCreateData('numReplicas', existingNumReplicas);
      const size = sizes.find(
        (size) =>
          isCpuLimitEqual(size.resources.limits?.cpu, existingResources.limits?.cpu) &&
          isMemoryLimitEqual(size.resources.limits?.memory, existingResources.limits?.memory),
      );
      setCreateData(
        'modelSize',
        size || {
          name: 'Custom',
          resources: existingResources,
        },
      );
      setCreateData(
        'gpus',
        typeof existingGpus == 'string' ? parseInt(existingGpus) : existingGpus,
      );
      setCreateData('externalRoute', existingExternalRoute);
      setCreateData('tokenAuth', existingTokenAuth);
      setCreateData('tokens', existingTokens);
    }
  }, [
    existingServingRuntimeName,
    existingServingRuntimeTemplateName,
    existingNumReplicas,
    existingResources,
    existingGpus,
    existingExternalRoute,
    existingTokenAuth,
    existingTokens,
    setCreateData,
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
      setCreateData('servingRuntimeName', existingServingRuntime);
      setCreateData('project', existingProject);
      setCreateData('storage', {
        type: InferenceServiceStorageType.EXISTING_STORAGE,
        path: existingStorage?.path || '',
        dataConnection: existingStorage?.key || '',
        awsData: EMPTY_AWS_SECRET_DATA,
      });
      setCreateData(
        'format',
        existingFormat || {
          name: '',
        },
      );
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
