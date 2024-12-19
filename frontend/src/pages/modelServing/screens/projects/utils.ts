import * as React from 'react';
import {
  ConfigMapKind,
  DashboardConfigKind,
  InferenceServiceKind,
  KnownLabels,
  PersistentVolumeClaimKind,
  ProjectKind,
  SecretKind,
  ServingRuntimeKind,
} from '~/k8sTypes';
import { NamespaceApplicationCase, UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import {
  CreatingInferenceServiceObject,
  CreatingServingRuntimeObject,
  InferenceServiceStorageType,
  LabeledDataConnection,
  ModelServingSize,
  ServingPlatformStatuses,
  ServingRuntimeEditInfo,
} from '~/pages/modelServing/screens/types';
import { ServingRuntimePlatform } from '~/types';
import { DEFAULT_MODEL_SERVER_SIZES } from '~/pages/modelServing/screens/const';
import { useAppContext } from '~/app/AppContext';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import { EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { getDisplayNameFromServingRuntimeTemplate } from '~/pages/modelServing/customServingRuntimes/utils';
import {
  getInferenceServiceSize,
  getServingRuntimeSize,
  getServingRuntimeTokens,
  setUpTokenAuth,
} from '~/pages/modelServing/utils';
import { AcceleratorProfileState } from '~/utilities/useReadAcceleratorState';
import {
  addSupportServingPlatformProject,
  assembleSecret,
  createInferenceService,
  createPvc,
  createSecret,
  createServingRuntime,
  getInferenceServiceContext,
  updateInferenceService,
  updateServingRuntime,
} from '~/api';
import { isDataConnectionAWS } from '~/pages/projects/screens/detail/data-connections/utils';
import { containsOnlySlashes, isS3PathValid, removeLeadingSlash } from '~/utilities/string';
import { RegisteredModelDeployInfo } from '~/pages/modelRegistry/screens/RegisteredModels/useRegisteredModelDeployInfo';
import { getNIMData, getNIMResource } from '~/pages/modelServing/screens/projects/nimUtils';
import { AcceleratorProfileFormData } from '~/utilities/useAcceleratorProfileFormState';
import { Connection } from '~/concepts/connectionTypes/types';

export const getServingRuntimeSizes = (config: DashboardConfigKind): ModelServingSize[] => {
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

const isInferenceServiceKServeRaw = (inferenceService: InferenceServiceKind): boolean =>
  inferenceService.metadata.annotations?.['serving.kserve.io/deploymentMode'] === 'RawDeployment';

export const isInferenceServiceTokenEnabled = (inferenceService: InferenceServiceKind): boolean =>
  isInferenceServiceKServeRaw(inferenceService)
    ? inferenceService.metadata.labels?.['security.opendatahub.io/enable-auth'] === 'true'
    : inferenceService.metadata.annotations?.['security.opendatahub.io/enable-auth'] === 'true';

export const isInferenceServiceRouteEnabled = (inferenceService: InferenceServiceKind): boolean =>
  isInferenceServiceKServeRaw(inferenceService)
    ? inferenceService.metadata.labels?.['networking.kserve.io/visibility'] === 'exposed'
    : inferenceService.metadata.labels?.['networking.knative.dev/visibility'] !== 'cluster-local';

export const isGpuDisabled = (servingRuntime: ServingRuntimeKind): boolean =>
  servingRuntime.metadata.annotations?.['opendatahub.io/disable-gpu'] === 'true';

export const getInferenceServiceFromServingRuntime = (
  inferenceServices: InferenceServiceKind[],
  servingRuntime: ServingRuntimeKind,
): InferenceServiceKind[] =>
  inferenceServices.filter(
    (inferenceService) =>
      inferenceService.spec.predictor.model?.runtime === servingRuntime.metadata.name,
  );

export const useCreateServingRuntimeObject = (existingData?: {
  servingRuntime?: ServingRuntimeKind;
  secrets: SecretKind[];
}): [
  data: CreatingServingRuntimeObject,
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>,
  resetDefaults: () => void,
  sizes: ModelServingSize[],
] => {
  const { dashboardConfig } = useAppContext();

  const sizes = useDeepCompareMemoize(getServingRuntimeSizes(dashboardConfig));

  const createModelState = useGenericObjectState<CreatingServingRuntimeObject>({
    name: '',
    k8sName: '',
    servingRuntimeTemplateName: '',
    numReplicas: 1,
    modelSize: sizes[0],
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

  const existingSize = useDeepCompareMemoize(
    getServingRuntimeSize(sizes, existingData?.servingRuntime),
  );

  const existingExternalRoute =
    existingData?.servingRuntime?.metadata.annotations?.['enable-route'] === 'true';
  const existingTokenAuth =
    existingData?.servingRuntime?.metadata.annotations?.['enable-auth'] === 'true';

  const existingTokens = useDeepCompareMemoize(getServingRuntimeTokens(existingData?.secrets));

  const existingImageName = existingData?.servingRuntime?.spec.containers[0].image;

  React.useEffect(() => {
    if (existingServingRuntimeName) {
      setCreateData('name', existingServingRuntimeName);
      setCreateData('servingRuntimeTemplateName', existingServingRuntimeTemplateName);
      setCreateData('numReplicas', existingNumReplicas);
      setCreateData('modelSize', existingSize);
      setCreateData('externalRoute', existingExternalRoute);
      setCreateData('tokenAuth', existingTokenAuth);
      setCreateData('tokens', existingTokens);
      setCreateData('imageName', existingImageName);
    }
  }, [
    existingServingRuntimeName,
    existingServingRuntimeTemplateName,
    existingNumReplicas,
    existingSize,
    existingExternalRoute,
    existingTokenAuth,
    existingTokens,
    setCreateData,
    sizes,
    existingImageName,
  ]);
  return [...createModelState, sizes];
};

export const defaultInferenceService: CreatingInferenceServiceObject = {
  name: '',
  k8sName: '',
  project: '',
  servingRuntimeName: '',
  modelSize: {
    name: '',
    resources: {},
  },
  storage: {
    type: InferenceServiceStorageType.EXISTING_STORAGE,
    path: '',
    dataConnection: '',
    awsData: EMPTY_AWS_SECRET_DATA,
  },
  format: {
    name: '',
  },
  minReplicas: 1,
  maxReplicas: 1,
  externalRoute: false,
  tokenAuth: false,
  tokens: [],
  servingRuntimeArgs: [],
  servingRuntimeEnvVars: [],
};

export const useCreateInferenceServiceObject = (
  existingData?: InferenceServiceKind,
  existingServingRuntimeData?: ServingRuntimeKind, // upgrade path to already KServe models
  secrets?: SecretKind[],
): [
  data: CreatingInferenceServiceObject,
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>,
  resetDefaults: () => void,
  sizes: ModelServingSize[],
] => {
  const { dashboardConfig } = useAppContext();

  const sizes = useDeepCompareMemoize(getServingRuntimeSizes(dashboardConfig));

  const createInferenceServiceState = useGenericObjectState<CreatingInferenceServiceObject>({
    ...defaultInferenceService,
    modelSize: sizes[0],
  });

  const [, setCreateData] = createInferenceServiceState;

  const existingName =
    existingData?.metadata.annotations?.['openshift.io/display-name'] ||
    existingData?.metadata.name ||
    '';
  const existingIsKServeRaw = !!existingData && isInferenceServiceKServeRaw(existingData);
  const existingStorage =
    useDeepCompareMemoize(existingData?.spec.predictor.model?.storage) || undefined;
  const existingUri =
    useDeepCompareMemoize(existingData?.spec.predictor.model?.storageUri) || undefined;
  const existingServingRuntime = existingData?.spec.predictor.model?.runtime || '';
  const existingProject = existingData?.metadata.namespace || '';
  const existingFormat =
    useDeepCompareMemoize(existingData?.spec.predictor.model?.modelFormat) || undefined;
  const existingMinReplicas =
    existingData?.spec.predictor.minReplicas ?? existingServingRuntimeData?.spec.replicas ?? 1;
  const existingMaxReplicas =
    existingData?.spec.predictor.maxReplicas ?? existingServingRuntimeData?.spec.replicas ?? 1;

  const existingExternalRoute = !!existingData && isInferenceServiceRouteEnabled(existingData);
  const existingTokenAuth = !!existingData && isInferenceServiceTokenEnabled(existingData);

  const existingTokens = useDeepCompareMemoize(getServingRuntimeTokens(secrets));
  const existingSize = useDeepCompareMemoize(
    getInferenceServiceSize(sizes, existingData, existingServingRuntimeData),
  );

  const existingServingRuntimeArgs = existingData?.spec.predictor.model?.args;

  const existingServingRuntimeEnvVars = existingData?.spec.predictor.model?.env;

  React.useEffect(() => {
    if (existingName) {
      setCreateData('name', existingName);
      setCreateData('servingRuntimeName', existingServingRuntime);
      setCreateData('project', existingProject);
      setCreateData('isKServeRawDeployment', existingIsKServeRaw);
      setCreateData('modelSize', existingSize);
      setCreateData('storage', {
        type: existingUri
          ? InferenceServiceStorageType.EXISTING_URI
          : InferenceServiceStorageType.EXISTING_STORAGE,
        path: existingStorage?.path || '',
        dataConnection: existingStorage?.key || '',
        uri: existingUri || '',
        awsData: EMPTY_AWS_SECRET_DATA,
      });
      setCreateData(
        'format',
        existingFormat || {
          name: '',
        },
      );
      setCreateData('minReplicas', existingMinReplicas);
      setCreateData('maxReplicas', existingMaxReplicas);
      setCreateData('externalRoute', existingExternalRoute);
      setCreateData('tokenAuth', existingTokenAuth);
      setCreateData('tokens', existingTokens);
      setCreateData('servingRuntimeArgs', existingServingRuntimeArgs);
      setCreateData('servingRuntimeEnvVars', existingServingRuntimeEnvVars);
    }
  }, [
    existingName,
    existingStorage,
    existingUri,
    existingFormat,
    existingSize,
    existingServingRuntime,
    existingProject,
    existingMinReplicas,
    existingMaxReplicas,
    setCreateData,
    existingExternalRoute,
    existingTokenAuth,
    existingTokens,
    existingServingRuntimeArgs,
    existingServingRuntimeEnvVars,
    existingIsKServeRaw,
  ]);

  return [...createInferenceServiceState, sizes];
};

export const getProjectModelServingPlatform = (
  project: ProjectKind | null,
  platformStatuses: ServingPlatformStatuses,
): { platform?: ServingRuntimePlatform; error?: Error } => {
  const {
    kServe: { enabled: kServeEnabled, installed: kServeInstalled },
    kServeNIM: { enabled: nimEnabled },
    modelMesh: { enabled: modelMeshEnabled, installed: modelMeshInstalled },
    platformEnabledCount,
  } = platformStatuses;

  if (!project) {
    // Likely temporary or a bad usage of the hook
    return {};
  }

  if (project.metadata.labels?.[KnownLabels.MODEL_SERVING_PROJECT] === undefined) {
    // Auto-select logic
    if (platformEnabledCount !== 1) {
      return {};
    }
    if (modelMeshEnabled) {
      return { platform: ServingRuntimePlatform.MULTI };
    }
    if (kServeEnabled) {
      return { platform: ServingRuntimePlatform.SINGLE };
    }
    if (nimEnabled) {
      // TODO: this is weird, it relies on KServe today... so it's never "only installed"
      return { platform: ServingRuntimePlatform.SINGLE };
    }

    // TODO: unreachable code unless adding a new platform? probably should throw an error
  } else if (project.metadata.labels[KnownLabels.MODEL_SERVING_PROJECT] === 'true') {
    // Model mesh logic
    return {
      platform: ServingRuntimePlatform.MULTI,
      error: modelMeshInstalled ? undefined : new Error('Multi-model platform is not installed'),
    };
  }

  // KServe logic
  return {
    platform: ServingRuntimePlatform.SINGLE,
    error: kServeInstalled ? undefined : new Error('Single-model platform is not installed'),
  };
};

export const createAWSSecret = (
  createData: CreatingInferenceServiceObject,
  dryRun: boolean,
): Promise<SecretKind> =>
  createSecret(
    assembleSecret(
      createData.project,
      createData.storage.awsData.reduce<Record<string, string>>(
        (acc, { key, value }) => ({ ...acc, [key]: value }),
        {},
      ),
      'aws',
    ),
    { dryRun },
  );

const createInferenceServiceAndDataConnection = async (
  inferenceServiceData: CreatingInferenceServiceObject,
  editInfo?: InferenceServiceKind,
  isModelMesh?: boolean,
  initialAcceleratorProfile?: AcceleratorProfileState,
  selectedAcceleratorProfile?: AcceleratorProfileFormData,
  dryRun = false,
  isStorageNeeded?: boolean,
  connection?: Connection,
) => {
  let secret;
  let storageUri;
  if (inferenceServiceData.storage.type === InferenceServiceStorageType.NEW_STORAGE) {
    if (connection) {
      secret = await createSecret(connection, { dryRun });
      if (connection.stringData?.URI) {
        storageUri = connection.stringData.URI;
      }
    } else {
      secret = await createAWSSecret(inferenceServiceData, dryRun);
    }
  }
  if (inferenceServiceData.storage.type === InferenceServiceStorageType.EXISTING_STORAGE) {
    if (connection?.data?.URI) {
      storageUri = window.atob(connection.data.URI);
    }
  }
  if (inferenceServiceData.storage.type === InferenceServiceStorageType.EXISTING_URI) {
    storageUri = inferenceServiceData.storage.uri;
  }

  let inferenceService;
  if (editInfo) {
    inferenceService = await updateInferenceService(
      {
        ...inferenceServiceData,
        storage: {
          ...inferenceServiceData.storage,
          uri: storageUri,
        },
      },
      editInfo,
      secret?.metadata.name,
      isModelMesh,
      initialAcceleratorProfile,
      selectedAcceleratorProfile,
      dryRun,
      isStorageNeeded,
    );
  } else {
    inferenceService = await createInferenceService(
      {
        ...inferenceServiceData,
        storage: {
          ...inferenceServiceData.storage,
          uri: storageUri,
        },
      },
      secret?.metadata.name,
      isModelMesh,
      initialAcceleratorProfile,
      selectedAcceleratorProfile,
      dryRun,
      isStorageNeeded,
    );
  }
  return inferenceService;
};

export const getSubmitInferenceServiceResourceFn = (
  createData: CreatingInferenceServiceObject,
  editInfo: InferenceServiceKind | undefined,
  servingRuntimeName: string,
  inferenceServiceName: string,
  isModelMesh?: boolean,
  initialAcceleratorProfile?: AcceleratorProfileState,
  selectedAcceleratorProfile?: AcceleratorProfileFormData,
  allowCreate?: boolean,
  secrets?: SecretKind[],
  isStorageNeeded?: boolean,
  connection?: Connection,
): ((opts: { dryRun?: boolean }) => Promise<void>) => {
  const inferenceServiceData = {
    ...createData,
    servingRuntimeName,
    ...{
      storage: {
        ...createData.storage,
        path: removeLeadingSlash(createData.storage.path),
      },
    },
  };

  const createTokenAuth = createData.tokenAuth && !!allowCreate;

  return ({ dryRun = false }) =>
    createInferenceServiceAndDataConnection(
      inferenceServiceData,
      editInfo,
      isModelMesh,
      initialAcceleratorProfile,
      selectedAcceleratorProfile,
      dryRun,
      isStorageNeeded,
      connection,
    ).then((inferenceService) => {
      if (!isModelMesh) {
        return setUpTokenAuth(
          createData,
          inferenceServiceName,
          createData.project,
          createTokenAuth,
          inferenceService,
          isModelMesh,
          secrets || [],
          {
            dryRun,
          },
        );
      }
      return Promise.resolve();
    });
};

export const submitInferenceServiceResourceWithDryRun = async (
  ...params: Parameters<typeof getSubmitInferenceServiceResourceFn>
): Promise<void> => {
  const submitInferenceServiceResource = getSubmitInferenceServiceResourceFn(...params);
  await submitInferenceServiceResource({ dryRun: true });
  return submitInferenceServiceResource({ dryRun: false });
};

export const getSubmitServingRuntimeResourcesFn = (
  servingRuntimeSelected: ServingRuntimeKind | undefined,
  createData: CreatingServingRuntimeObject,
  customServingRuntimesEnabled: boolean,
  namespace: string,
  editInfo: ServingRuntimeEditInfo | undefined,
  allowCreate: boolean,
  initialAcceleratorProfile: AcceleratorProfileState,
  selectedAcceleratorProfile: AcceleratorProfileFormData,
  servingPlatformEnablement: NamespaceApplicationCase,
  currentProject?: ProjectKind,
  name?: string,
  isModelMesh?: boolean,
): ((opts: { dryRun?: boolean }) => Promise<void | (string | void | ServingRuntimeKind)[]>) => {
  if (!servingRuntimeSelected) {
    return () =>
      Promise.reject(
        new Error(
          'Error, the Serving Runtime selected might be malformed or could not have been retrieved.',
        ),
      );
  }
  const servingRuntimeData = {
    ...createData,
    existingTolerations: servingRuntimeSelected.spec.tolerations || [],
    ...(name !== undefined && { name }),
  };

  const createTokenAuth = servingRuntimeData.tokenAuth && allowCreate;

  const controlledState: AcceleratorProfileFormData = isGpuDisabled(servingRuntimeSelected)
    ? { count: 0, useExistingSettings: false }
    : selectedAcceleratorProfile;

  if (!editInfo && !currentProject) {
    // This should be impossible to hit on resource creation, current project is undefined only on edit
    return () => Promise.reject(new Error('Cannot update project with no project selected'));
  }

  return ({ dryRun = false }) =>
    Promise.all([
      ...(currentProject && currentProject.metadata.labels?.['modelmesh-enabled'] === undefined
        ? [
            addSupportServingPlatformProject(
              currentProject.metadata.name,
              servingPlatformEnablement,
              dryRun,
            ),
          ]
        : []),
      ...(editInfo?.servingRuntime
        ? [
            updateServingRuntime({
              data: servingRuntimeData,
              existingData: editInfo.servingRuntime,
              isCustomServingRuntimesEnabled: customServingRuntimesEnabled,
              opts: {
                dryRun,
              },
              selectedAcceleratorProfile: controlledState,
              initialAcceleratorProfile,
              isModelMesh,
            }),
            ...(isModelMesh
              ? [
                  setUpTokenAuth(
                    servingRuntimeData,
                    createData.k8sName,
                    namespace,
                    createTokenAuth,
                    editInfo.servingRuntime,
                    isModelMesh,
                    editInfo.secrets,
                    {
                      dryRun,
                    },
                  ),
                ]
              : []),
          ]
        : [
            createServingRuntime({
              data: servingRuntimeData,
              namespace,
              servingRuntime: servingRuntimeSelected,
              isCustomServingRuntimesEnabled: customServingRuntimesEnabled,
              opts: {
                dryRun,
              },
              selectedAcceleratorProfile: controlledState,
              initialAcceleratorProfile,
              isModelMesh,
            }).then((servingRuntime) => {
              if (isModelMesh) {
                return setUpTokenAuth(
                  servingRuntimeData,
                  createData.k8sName,
                  namespace,
                  createTokenAuth,
                  servingRuntime,
                  isModelMesh,
                  [],
                  {
                    dryRun,
                  },
                );
              }
              return Promise.resolve();
            }),
          ]),
    ]);
};

export const submitServingRuntimeResourcesWithDryRun = async (
  ...params: Parameters<typeof getSubmitServingRuntimeResourcesFn>
): Promise<void | (string | void | ServingRuntimeKind)[]> => {
  const submitServingRuntimeResources = getSubmitServingRuntimeResourcesFn(...params);
  await submitServingRuntimeResources({ dryRun: true });
  return submitServingRuntimeResources({ dryRun: false });
};

export const getUrlFromKserveInferenceService = (
  inferenceService: InferenceServiceKind,
): string | undefined =>
  isUrlInternalService(inferenceService.status?.url) || !inferenceService.status?.url
    ? undefined
    : inferenceService.status.url;

export const isUrlInternalService = (url: string | undefined): boolean =>
  url !== undefined && url.endsWith('.svc.cluster.local');

export const filterOutConnectionsWithoutBucket = (
  connections: LabeledDataConnection[],
): LabeledDataConnection[] =>
  connections.filter(
    (obj) =>
      isDataConnectionAWS(obj.dataConnection) &&
      obj.dataConnection.data.data.AWS_S3_BUCKET.trim() !== '',
  );

export interface ModelInfo {
  name: string;
  displayName: string;
  shortDescription: string;
  namespace: string;
  tags: string[];
  latestTag: string;
  updatedDate: string;
}

export const fetchNIMModelNames = async (): Promise<ModelInfo[] | undefined> => {
  const configMap = await getNIMResource<ConfigMapKind>('nimConfig');
  if (configMap.data && Object.keys(configMap.data).length > 0) {
    const modelInfos: ModelInfo[] = [];
    for (const [key, value] of Object.entries(configMap.data)) {
      try {
        const modelData = JSON.parse(value);
        modelInfos.push({
          name: key,
          displayName: modelData.displayName,
          shortDescription: modelData.shortDescription,
          namespace: modelData.namespace,
          tags: modelData.tags,
          latestTag: modelData.latestTag,
          updatedDate: modelData.updatedDate,
        });
      } catch (error) {
        throw new Error(`Failed to parse model data for key "${key}".`);
      }
    }

    return modelInfos.length > 0 ? modelInfos : undefined;
  }
  return undefined;
};

export const createNIMSecret = async (
  projectName: string,
  secretKey: string,
  isNGC: boolean,
  dryRun: boolean,
): Promise<SecretKind> => {
  try {
    const data = await getNIMData(secretKey, isNGC);

    const newSecret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: isNGC ? 'ngc-secret' : 'nvidia-nim-secrets',
        namespace: projectName,
      },
      data,
      type: isNGC ? 'kubernetes.io/dockerconfigjson' : 'Opaque',
    };

    return await createSecret(newSecret, { dryRun });
  } catch (e) {
    return Promise.reject(new Error(`Error creating ${isNGC ? 'NGC' : 'NIM'} secret`));
  }
};

export const createNIMPVC = (
  projectName: string,
  pvcName: string,
  pvcSize: string,
  dryRun: boolean,
): Promise<PersistentVolumeClaimKind> =>
  createPvc(
    {
      name: pvcName,
      description: '',
      size: pvcSize,
    },
    projectName,
    {
      dryRun,
    },
    true,
  );

export const getCreateInferenceServiceLabels = (
  data: Pick<RegisteredModelDeployInfo, 'registeredModelId' | 'modelVersionId'> | undefined,
): { labels: Record<string, string> } | undefined => {
  if (data?.registeredModelId || data?.modelVersionId) {
    const { registeredModelId, modelVersionId } = data;

    return {
      labels: {
        ...(registeredModelId && {
          'modelregistry.opendatahub.io/registered-model-id': registeredModelId,
        }),
        ...(modelVersionId && {
          'modelregistry.opendatahub.io/model-version-id': modelVersionId,
        }),
      },
    };
  }
  return undefined;
};

export const isConnectionPathValid = (path: string): boolean =>
  !(containsOnlySlashes(path) || !isS3PathValid(path) || path === '');

export const fetchInferenceServiceCount = async (namespace: string): Promise<number> => {
  try {
    const inferenceServices = await getInferenceServiceContext(namespace);
    return inferenceServices.length;
  } catch (error) {
    throw new Error(
      `Failed to fetch inference services for namespace "${namespace}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};
