import * as React from 'react';
import * as _ from 'lodash';
import YAML from 'yaml';
import { ConfigMapKind, InferenceServiceKind, SecretKind, ServingRuntimeKind } from '~/k8sTypes';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import {
  CreatingInferenceServiceObject,
  CreatingServingRuntimeObject,
  InferenceServiceStorageType,
  ServingRuntimeSize,
} from '~/pages/modelServing/screens/types';
import { ContainerResourceAttributes, DashboardConfig, GpuSettingString } from '~/types';
import {
  DEFAULT_MODEL_SERVER_SIZES,
  DEFAULT_MODEL_SERVING_TEMPLATE,
} from '~/pages/modelServing/screens/const';
import { useAppContext } from '~/app/AppContext';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import { EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
import { getDisplayNameFromK8sResource } from '~/pages/projects/utils';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';

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

export const getDefaultServingRuntime = (
  servingRuntimesConfig?: ConfigMapKind,
): ServingRuntimeKind => {
  if (!servingRuntimesConfig) {
    return DEFAULT_MODEL_SERVING_TEMPLATE;
  }
  try {
    const overrideServingRuntime = YAML.parse(
      servingRuntimesConfig?.data?.['override-config'] || '',
    );
    if (overrideServingRuntime) {
      return overrideServingRuntime;
    }
    const defaultServingRuntime = YAML.parse(servingRuntimesConfig?.data?.['default-config'] || '');
    if (defaultServingRuntime) {
      return defaultServingRuntime;
    }
  } catch {
    return DEFAULT_MODEL_SERVING_TEMPLATE;
  }

  return DEFAULT_MODEL_SERVING_TEMPLATE;
};

export const useCreateServingRuntimeObject = (existingData?: {
  servingRuntime?: ServingRuntimeKind;
  secrets: SecretKind[];
}): [
  data: CreatingServingRuntimeObject,
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>,
  resetDefaults: () => void,
  sizes: ServingRuntimeSize[],
  gpuSetting: GpuSettingString,
] => {
  const { dashboardConfig } = useAppContext();
  const {
    servingRuntimesConfig: { servingRuntimesConfig },
  } = React.useContext(ProjectDetailsContext);
  const sizes = useDeepCompareMemoize(getServingRuntimeSizes(dashboardConfig));
  let gpuSetting: GpuSettingString = 'hidden';
  const defaultServingRuntime = getDefaultServingRuntime(servingRuntimesConfig);
  gpuSetting = defaultServingRuntime?.metadata?.annotations?.['opendatahub.io/gpu-setting'];

  const createModelState = useGenericObjectState<CreatingServingRuntimeObject>({
    numReplicas: 1,
    modelSize: sizes[0],
    gpus: 0,
    externalRoute: false,
    tokenAuth: false,
    tokens: [],
  });

  const [, setCreateData] = createModelState;

  const existingServingRuntimeName = existingData?.servingRuntime?.metadata.name || '';

  const existingNumReplicas = existingData?.servingRuntime?.spec.replicas ?? 1;

  const existingResources =
    existingData?.servingRuntime?.spec?.containers[0]?.resources || sizes[0].resources;

  const existingGpus =
    existingData?.servingRuntime?.spec?.containers[0]?.resources?.requests?.[
      ContainerResourceAttributes.NVIDIA_GPU
    ] || 0;

  const existingExternalRoute =
    !!existingData?.servingRuntime?.metadata.annotations?.['enable-route'];
  const existingTokenAuth = !!existingData?.servingRuntime?.metadata.annotations?.['enable-auth'];

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
      setCreateData('numReplicas', existingNumReplicas);
      let foundSize = sizes.find((size) => _.isEqual(size.resources, existingResources));
      if (!foundSize) {
        foundSize = {
          name: 'Custom',
          resources: existingResources,
        };
      }
      setCreateData('modelSize', foundSize);
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
    existingNumReplicas,
    existingResources,
    existingGpus,
    existingExternalRoute,
    existingTokenAuth,
    existingTokens,
    setCreateData,
    sizes,
  ]);
  return [...createModelState, sizes, gpuSetting];
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
