import * as React from 'react';
import {
  ConfigMapKind,
  InferenceServiceKind,
  PersistentVolumeClaimKind,
  ProjectKind,
  SecretKind,
  ServingContainer,
  ServingRuntimeKind,
} from '#~/k8sTypes';
import { NamespaceApplicationCase, UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import useGenericObjectState from '#~/utilities/useGenericObjectState';
import {
  CreatingInferenceServiceObject,
  CreatingServingRuntimeObject,
  InferenceServiceStorageType,
  ServingPlatformStatuses,
  ServingRuntimeEditInfo,
} from '#~/pages/modelServing/screens/types';
import { ServingRuntimePlatform } from '#~/types';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';
import { EMPTY_AWS_SECRET_DATA } from '#~/pages/projects/dataConnections/const';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { getDisplayNameFromServingRuntimeTemplate } from '#~/pages/modelServing/customServingRuntimes/utils';
import { getServingRuntimeTokens, setUpTokenAuth } from '#~/pages/modelServing/utils';
import {
  addSupportServingPlatformProject,
  createInferenceService,
  createPvc,
  createSecret,
  createServingRuntime,
  getInferenceServiceContext,
  updateInferenceService,
  updateServingRuntime,
} from '#~/api';
import { containsOnlySlashes, isS3PathValid, removeLeadingSlash } from '#~/utilities/string';
import { getNIMData, getNIMResource } from '#~/pages/modelServing/screens/projects/nim/nimUtils';
import { Connection } from '#~/concepts/connectionTypes/types';
import {
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '#~/concepts/connectionTypes/utils';
import { HardwarePodSpecOptions } from '#~/concepts/hardwareProfiles/types';
import { useDashboardNamespace } from '#~/redux/selectors';
import { ModelDeployPrefillInfo } from './usePrefillModelDeployModal';

export const isServingRuntimeTokenEnabled = (servingRuntime: ServingRuntimeKind): boolean =>
  servingRuntime.metadata.annotations?.['enable-auth'] === 'true';

export const isServingRuntimeRouteEnabled = (servingRuntime: ServingRuntimeKind): boolean =>
  servingRuntime.metadata.annotations?.['enable-route'] === 'true';

export const isInferenceServiceTokenEnabled = (inferenceService: InferenceServiceKind): boolean =>
  inferenceService.metadata.annotations?.['security.opendatahub.io/enable-auth'] === 'true';

export const isInferenceServiceRouteEnabled = (inferenceService: InferenceServiceKind): boolean =>
  inferenceService.metadata.labels?.['networking.kserve.io/visibility'] === 'exposed';

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
] => {
  const createModelState = useGenericObjectState<CreatingServingRuntimeObject>({
    name: '',
    k8sName: '',
    servingRuntimeTemplateName: '',
    numReplicas: 1,
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

  const existingExternalRoute =
    existingData?.servingRuntime?.metadata.annotations?.['enable-route'] === 'true';
  const existingTokenAuth =
    existingData?.servingRuntime?.metadata.annotations?.['enable-auth'] === 'true';

  const existingTokens = useDeepCompareMemoize(getServingRuntimeTokens(existingData?.secrets));

  const existingImageName = existingData?.servingRuntime?.spec.containers[0].image;
  const servingRuntimeScope =
    existingData?.servingRuntime?.metadata.annotations?.['opendatahub.io/serving-runtime-scope'];

  React.useEffect(() => {
    if (existingServingRuntimeName) {
      setCreateData('name', existingServingRuntimeName);
      setCreateData('servingRuntimeTemplateName', existingServingRuntimeTemplateName);
      setCreateData('numReplicas', existingNumReplicas);
      setCreateData('externalRoute', existingExternalRoute);
      setCreateData('tokenAuth', existingTokenAuth);
      setCreateData('tokens', existingTokens);
      setCreateData('imageName', existingImageName);
      setCreateData('scope', servingRuntimeScope);
    }
  }, [
    existingServingRuntimeName,
    existingServingRuntimeTemplateName,
    existingNumReplicas,
    existingExternalRoute,
    existingTokenAuth,
    existingTokens,
    setCreateData,
    existingImageName,
    servingRuntimeScope,
  ]);

  return [...createModelState];
};

export const defaultInferenceService: CreatingInferenceServiceObject = {
  name: '',
  k8sName: '',
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
] => {
  const { dashboardNamespace } = useDashboardNamespace();

  const createInferenceServiceState = useGenericObjectState<CreatingInferenceServiceObject>({
    ...defaultInferenceService,
    dashboardNamespace,
  });

  const [, setCreateData] = createInferenceServiceState;

  const existingName =
    existingData?.metadata.annotations?.['openshift.io/display-name'] ||
    existingData?.metadata.name ||
    '';
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
  const existingImagePullSecrets = existingData?.spec.predictor.imagePullSecrets || undefined;
  const existingPvcConnection = existingUri ? getPVCNameFromURI(existingUri) : undefined;
  const existingExternalRoute = !!existingData && isInferenceServiceRouteEnabled(existingData);
  const existingTokenAuth = !!existingData && isInferenceServiceTokenEnabled(existingData);

  const existingTokens = useDeepCompareMemoize(getServingRuntimeTokens(secrets));

  const existingServingRuntimeArgs = existingData?.spec.predictor.model?.args;

  const existingServingRuntimeEnvVars = existingData?.spec.predictor.model?.env;

  React.useEffect(() => {
    if (existingName) {
      setCreateData('name', existingName);
      setCreateData('servingRuntimeName', existingServingRuntime);
      setCreateData('project', existingProject);
      setCreateData('storage', {
        type:
          existingUri && !existingImagePullSecrets
            ? InferenceServiceStorageType.EXISTING_URI
            : InferenceServiceStorageType.EXISTING_STORAGE,
        path: existingStorage?.path || '',
        dataConnection: existingImagePullSecrets
          ? existingImagePullSecrets[0].name
          : existingStorage?.key || '',
        uri: existingUri || '',
        awsData: EMPTY_AWS_SECRET_DATA,
        pvcConnection: isPVCUri(existingUri || '') ? existingPvcConnection : undefined,
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
      setCreateData('imagePullSecrets', existingImagePullSecrets);
    }
  }, [
    existingName,
    existingStorage,
    existingUri,
    existingFormat,
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
    existingImagePullSecrets,
    existingPvcConnection,
  ]);

  return [...createInferenceServiceState];
};

export const getProjectModelServingPlatform = (
  project: ProjectKind | null,
  platformStatuses: ServingPlatformStatuses,
): { platform?: ServingRuntimePlatform; error?: Error } => {
  const {
    kServe: { enabled: kServeEnabled, installed: kServeInstalled },
    kServeNIM: { enabled: nimEnabled },
  } = platformStatuses;

  if (!project) {
    // Likely temporary or a bad usage of the hook
    return {};
  }

  // Check if NIM is already selected on the project
  const hasNIMAnnotation = project.metadata.annotations?.['opendatahub.io/nim-support'] === 'true';

  if (hasNIMAnnotation) {
    // NIM platform is already selected
    return {
      platform: ServingRuntimePlatform.SINGLE,
      error: kServeInstalled ? undefined : new Error('Single-model platform is not installed'),
    };
  }

  // If both platforms are available and no platform is selected, let user choose
  if (kServeEnabled && nimEnabled) {
    return {};
  }

  // If only one platform is available, auto-select it
  if (kServeEnabled || nimEnabled) {
    return {
      platform: ServingRuntimePlatform.SINGLE,
      error: kServeInstalled ? undefined : new Error('Single-model platform is not installed'),
    };
  }

  // No platforms available
  return {};
};

const createInferenceServiceAndDataConnection = async (
  inferenceServiceData: CreatingInferenceServiceObject,
  editInfo?: InferenceServiceKind,
  applyHardwareProfile?: (resource: InferenceServiceKind) => InferenceServiceKind,
  dryRun = false,
  isStorageNeeded?: boolean,
  connection?: Connection,
) => {
  let secret;
  let storageUri;
  let imagePullSecrets;
  if (inferenceServiceData.storage.type === InferenceServiceStorageType.NEW_STORAGE && connection) {
    secret = await createSecret(connection, { dryRun });
    if (connection.stringData?.URI) {
      storageUri = connection.stringData.URI;
    } else if (inferenceServiceData.storage.uri) {
      storageUri = inferenceServiceData.storage.uri;
    }
  }
  if (inferenceServiceData.storage.type === InferenceServiceStorageType.EXISTING_STORAGE) {
    if (connection?.data?.URI) {
      storageUri = window.atob(connection.data.URI);
    } else if (inferenceServiceData.storage.uri) {
      storageUri = inferenceServiceData.storage.uri;
    }
  }
  if (inferenceServiceData.storage.type === InferenceServiceStorageType.EXISTING_URI) {
    storageUri = inferenceServiceData.storage.uri;
  }

  if (connection?.type === 'kubernetes.io/dockerconfigjson') {
    imagePullSecrets = [{ name: connection.metadata.name }];
  }
  if (inferenceServiceData.storage.type === InferenceServiceStorageType.PVC_STORAGE) {
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
        imagePullSecrets,
      },
      editInfo,
      secret?.metadata.name,
      applyHardwareProfile,
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
        imagePullSecrets,
      },
      secret?.metadata.name,
      applyHardwareProfile,
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
  applyHardwareProfile?: (resource: InferenceServiceKind) => InferenceServiceKind,
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
      applyHardwareProfile,
      dryRun,
      isStorageNeeded,
      connection,
    ).then((inferenceService) => {
      return setUpTokenAuth(
        createData,
        inferenceServiceName,
        createData.project,
        createTokenAuth,
        inferenceService,
        secrets || [],
        {
          dryRun,
        },
      );
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
  podSpecOptions: HardwarePodSpecOptions,
  servingPlatformEnablement: NamespaceApplicationCase,
  currentProject?: ProjectKind,
  name?: string,
  imagePullSecret?: string,
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

  if (!editInfo && !currentProject) {
    // This should be impossible to hit on resource creation, current project is undefined only on edit
    return () => Promise.reject(new Error('Cannot update project with no project selected'));
  }

  return ({ dryRun = false }) =>
    Promise.all([
      ...(currentProject &&
      currentProject.metadata.labels?.['modelmesh-enabled'] === undefined &&
      currentProject.metadata.annotations?.['opendatahub.io/nim-support'] === undefined
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
              opts: { dryRun },
            }),
          ]
        : [
            createServingRuntime({
              data: servingRuntimeData,
              namespace,
              servingRuntime: servingRuntimeSelected,
              isCustomServingRuntimesEnabled: customServingRuntimesEnabled,
              opts: { dryRun },
              imagePullSecret,
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

export interface ModelInfo {
  name: string;
  displayName: string;
  shortDescription: string;
  namespace: string;
  tags: string[];
  latestTag: string;
  updatedDate: string;
  registry?: string; // Optional custom registry for air-gapped deployments
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
          registry: modelData.registry, // Optional custom registry
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
  isAirGapped = false,
): Promise<SecretKind> => {
  try {
    let data;

    if (isAirGapped) {
      // Air-gapped mode: Use dummy values to satisfy controller expectations
      // The actual image pulling uses the custom imagePullSecret from ConfigMap
      if (isNGC) {
        // Dummy dockerconfigjson for ngc-secret
        data = {
          '.dockerconfigjson': btoa(
            JSON.stringify({
              auths: {
                'nvcr.io': {
                  username: '$oauthtoken',
                  password: 'air-gapped-placeholder',
                  auth: btoa('$oauthtoken:air-gapped-placeholder'),
                },
              },
            }),
          ),
        };
      } else {
        // Dummy API key for nvidia-nim-secrets
        data = {
          NGC_API_KEY: btoa('air-gapped-placeholder-key'),
        };
      }
    } else {
      // Normal mode: Fetch real NGC credentials from ConfigMap
      data = await getNIMData(secretKey, isNGC);
    }

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
  storageClassName: string,
): Promise<PersistentVolumeClaimKind> =>
  createPvc(
    {
      name: pvcName,
      description: '',
      size: pvcSize,
      storageClassName,
    },
    projectName,
    { dryRun },
    true,
    undefined,
    {
      'opendatahub.io/managed': 'true',
    },
  );

export const getCreateInferenceServiceLabels = (
  data: Pick<ModelDeployPrefillInfo, 'modelRegistryInfo'> | undefined,
): { labels: Record<string, string> } | undefined => {
  const { registeredModelId, modelVersionId, mrName } = data?.modelRegistryInfo || {};
  if (registeredModelId || modelVersionId || mrName) {
    return {
      labels: {
        ...(registeredModelId && {
          'modelregistry.opendatahub.io/registered-model-id': registeredModelId,
        }),
        ...(modelVersionId && {
          'modelregistry.opendatahub.io/model-version-id': modelVersionId,
        }),
        ...(mrName && {
          'modelregistry.opendatahub.io/name': mrName,
        }),
      },
    };
  }
  return undefined;
};

export const isModelPathValid = (connection: Connection, path: string, uri?: string): boolean => {
  if (isModelServingCompatible(connection, ModelServingCompatibleTypes.URI)) {
    return true;
  }
  if (containsOnlySlashes(path)) {
    return false;
  }
  if (
    isModelServingCompatible(connection, ModelServingCompatibleTypes.S3ObjectStorage) &&
    !isS3PathValid(path)
  ) {
    return false;
  }
  if (
    isModelServingCompatible(connection, ModelServingCompatibleTypes.OCI) &&
    (!uri || uri.length <= 'oci://'.length)
  ) {
    return false;
  }
  return true;
};

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

export function isCurrentServingPlatformEnabled(
  currentPlatform: ServingRuntimePlatform | undefined,
  statuses: ServingPlatformStatuses,
): boolean {
  // Only single-model serving (KServe) is supported
  return !!currentPlatform && statuses.kServe.enabled;
}

export const VALID_ENV_VARNAME_REGEX = /^[A-Za-z_][A-Za-z0-9_\-.]*$/;
export const STARTS_WITH_DIGIT_REGEX = /^\d/;

export const validateEnvVarName = (name: string): string | undefined => {
  if (!name) {
    return undefined;
  }
  if (STARTS_WITH_DIGIT_REGEX.test(name)) {
    return 'Must not start with a digit.';
  }
  if (!VALID_ENV_VARNAME_REGEX.test(name)) {
    return "Must consist of alphabetic characters, digits, '_', '-', or '.'";
  }
  return undefined;
};

export const isValueFromEnvVar = (envVar: NonNullable<ServingContainer['env']>[number]): boolean =>
  envVar.valueFrom !== undefined;

export const getPVCFromURI = (
  uri: string,
  pvcs?: PersistentVolumeClaimKind[],
): PersistentVolumeClaimKind | undefined => {
  try {
    const url = new URL(uri);
    const pvcName = url.hostname;
    return pvcs?.find((pvc) => pvc.metadata.name === pvcName);
  } catch {
    return undefined;
  }
};

export const getPVCNameFromURI = (uri: string): string => {
  try {
    const url = new URL(uri);
    if (url.protocol !== 'pvc:') {
      return '';
    }
    return url.hostname;
  } catch {
    return '';
  }
};

export const isPVCUri = (uri: string): boolean => {
  try {
    const url = new URL(uri);
    return url.protocol === 'pvc:';
  } catch {
    return false;
  }
};

export const getModelPathFromUri = (uri: string): string => {
  try {
    const url = new URL(uri);
    return url.pathname.replace(/^\//, '');
  } catch {
    return '';
  }
};
