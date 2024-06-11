import * as React from 'react';
import {
  DashboardConfigKind,
  InferenceServiceKind,
  KnownLabels,
  ProjectKind,
  SecretKind,
  ServingRuntimeKind,
} from '~/k8sTypes';
import {
  DataConnection,
  NamespaceApplicationCase,
  UpdateObjectAtPropAndValue,
} from '~/pages/projects/types';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import {
  CreatingInferenceServiceObject,
  CreatingServingRuntimeObject,
  InferenceServiceStorageType,
  ServingPlatformStatuses,
  ServingRuntimeEditInfo,
  ModelServingSize,
} from '~/pages/modelServing/screens/types';
import { ServingRuntimePlatform } from '~/types';
import { DEFAULT_MODEL_SERVER_SIZES } from '~/pages/modelServing/screens/const';
import { useAppContext } from '~/app/AppContext';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import { EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import { getDisplayNameFromServingRuntimeTemplate } from '~/pages/modelServing/customServingRuntimes/utils';
import {
  getInferenceServiceSize,
  getServingRuntimeSize,
  getServingRuntimeTokens,
  setUpTokenAuth,
} from '~/pages/modelServing/utils';
import { AcceleratorProfileState } from '~/utilities/useAcceleratorProfileState';
import {
  addSupportServingPlatformProject,
  assembleSecret,
  createInferenceService,
  createSecret,
  createServingRuntime,
  updateInferenceService,
  updateServingRuntime,
} from '~/api';
import { isDataConnectionAWS } from '~/pages/projects/screens/detail/data-connections/utils';
import { removeLeadingSlash } from '~/utilities/string';

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

export const isInferenceServiceTokenEnabled = (inferenceService: InferenceServiceKind): boolean =>
  inferenceService.metadata.annotations?.['security.opendatahub.io/enable-auth'] === 'true';

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
  sizes: ModelServingSize[],
] => {
  const { dashboardConfig } = useAppContext();

  const sizes = useDeepCompareMemoize(getServingRuntimeSizes(dashboardConfig));

  const createModelState = useGenericObjectState<CreatingServingRuntimeObject>({
    name: '',
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

  React.useEffect(() => {
    if (existingServingRuntimeName) {
      setCreateData('name', existingServingRuntimeName);
      setCreateData('servingRuntimeTemplateName', existingServingRuntimeTemplateName);
      setCreateData('numReplicas', existingNumReplicas);
      setCreateData('modelSize', existingSize);
      setCreateData('externalRoute', existingExternalRoute);
      setCreateData('tokenAuth', existingTokenAuth);
      setCreateData('tokens', existingTokens);
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
  ]);
  return [...createModelState, sizes];
};

export const defaultInferenceService: CreatingInferenceServiceObject = {
  name: '',
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
  const existingStorage =
    useDeepCompareMemoize(existingData?.spec.predictor.model.storage) || undefined;
  const existingServingRuntime = existingData?.spec.predictor.model.runtime || '';
  const existingProject = existingData?.metadata.namespace || '';
  const existingFormat =
    useDeepCompareMemoize(existingData?.spec.predictor.model.modelFormat) || undefined;
  const existingMinReplicas =
    existingData?.spec.predictor.minReplicas || existingServingRuntimeData?.spec.replicas || 1;
  const existingMaxReplicas =
    existingData?.spec.predictor.maxReplicas || existingServingRuntimeData?.spec.replicas || 1;

  const existingExternalRoute = false; // TODO: Change this in the future in case we have an External Route
  const existingTokenAuth =
    existingData?.metadata.annotations?.['security.opendatahub.io/enable-auth'] === 'true';

  const existingTokens = useDeepCompareMemoize(getServingRuntimeTokens(secrets));
  const existingSize = useDeepCompareMemoize(
    getInferenceServiceSize(sizes, existingData, existingServingRuntimeData),
  );

  React.useEffect(() => {
    if (existingName) {
      setCreateData('name', existingName);
      setCreateData('servingRuntimeName', existingServingRuntime);
      setCreateData('project', existingProject);
      setCreateData('modelSize', existingSize);
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
      setCreateData('minReplicas', existingMinReplicas);
      setCreateData('maxReplicas', existingMaxReplicas);
      setCreateData('externalRoute', existingExternalRoute);
      setCreateData('tokenAuth', existingTokenAuth);
      setCreateData('tokens', existingTokens);
    }
  }, [
    existingName,
    existingStorage,
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
  ]);

  return [...createInferenceServiceState, sizes];
};

export const getModelServerDisplayName = (server: ServingRuntimeKind): string =>
  getDisplayNameFromK8sResource(server);
export const getProjectModelServingPlatform = (
  project: ProjectKind | null,
  platformStatuses: ServingPlatformStatuses,
): { platform?: ServingRuntimePlatform; error?: Error } => {
  const {
    kServe: { enabled: kServeEnabled, installed: kServeInstalled },
    modelMesh: { enabled: modelMeshEnabled, installed: modelMeshInstalled },
  } = platformStatuses;
  if (!project) {
    return {};
  }
  if (project.metadata.labels?.[KnownLabels.MODEL_SERVING_PROJECT] === undefined) {
    if ((kServeEnabled && modelMeshEnabled) || (!kServeEnabled && !modelMeshEnabled)) {
      return {};
    }
    if (modelMeshEnabled) {
      return { platform: ServingRuntimePlatform.MULTI };
    }
    if (kServeEnabled) {
      return { platform: ServingRuntimePlatform.SINGLE };
    }
  }
  if (project.metadata.labels?.[KnownLabels.MODEL_SERVING_PROJECT] === 'true') {
    return {
      platform: ServingRuntimePlatform.MULTI,
      error: modelMeshInstalled ? undefined : new Error('Multi-model platform is not installed'),
    };
  }
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

const createInferenceServiceAndDataConnection = (
  inferenceServiceData: CreatingInferenceServiceObject,
  existingStorage: boolean,
  editInfo?: InferenceServiceKind,
  isModelMesh?: boolean,
  acceleratorProfileState?: AcceleratorProfileState,
  dryRun = false,
) => {
  if (!existingStorage) {
    return createAWSSecret(inferenceServiceData, dryRun).then((secret) =>
      editInfo
        ? updateInferenceService(
            inferenceServiceData,
            editInfo,
            secret.metadata.name,
            isModelMesh,
            acceleratorProfileState,
            dryRun,
          )
        : createInferenceService(
            inferenceServiceData,
            secret.metadata.name,
            isModelMesh,
            acceleratorProfileState,
            dryRun,
          ),
    );
  }
  return editInfo !== undefined
    ? updateInferenceService(
        inferenceServiceData,
        editInfo,
        undefined,
        isModelMesh,
        acceleratorProfileState,
        dryRun,
      )
    : createInferenceService(
        inferenceServiceData,
        undefined,
        isModelMesh,
        acceleratorProfileState,
        dryRun,
      );
};

export const getSubmitInferenceServiceResourceFn = (
  createData: CreatingInferenceServiceObject,
  editInfo?: InferenceServiceKind,
  servingRuntimeName?: string,
  isModelMesh?: boolean,
  acceleratorProfileState?: AcceleratorProfileState,
  allowCreate?: boolean,
  secrets?: SecretKind[],
): ((opts: { dryRun?: boolean }) => Promise<void>) => {
  const inferenceServiceData = {
    ...createData,
    ...(servingRuntimeName !== undefined && {
      servingRuntimeName: translateDisplayNameForK8s(servingRuntimeName),
    }),
    ...{
      storage: {
        ...createData.storage,
        path: removeLeadingSlash(createData.storage.path),
      },
    },
  };

  const existingStorage =
    inferenceServiceData.storage.type === InferenceServiceStorageType.EXISTING_STORAGE;

  const createTokenAuth = createData.tokenAuth && !!allowCreate;
  const inferenceServiceName = translateDisplayNameForK8s(inferenceServiceData.name);

  return ({ dryRun = false }) =>
    createInferenceServiceAndDataConnection(
      inferenceServiceData,
      existingStorage,
      editInfo,
      isModelMesh,
      acceleratorProfileState,
      dryRun,
    ).then((inferenceService) =>
      setUpTokenAuth(
        createData,
        inferenceServiceName,
        createData.project,
        createTokenAuth,
        inferenceService,
        secrets || [],
        {
          dryRun,
        },
      ),
    );
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
  acceleratorProfileState: AcceleratorProfileState,
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
  const servingRuntimeName = translateDisplayNameForK8s(servingRuntimeData.name);
  const createTokenAuth = servingRuntimeData.tokenAuth && allowCreate;

  const controlledState = isGpuDisabled(servingRuntimeSelected)
    ? { count: 0, acceleratorProfiles: [], useExisting: false }
    : acceleratorProfileState;

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
              acceleratorProfileState: controlledState,
              isModelMesh,
            }),
            setUpTokenAuth(
              servingRuntimeData,
              servingRuntimeName,
              namespace,
              createTokenAuth,
              editInfo.servingRuntime,
              editInfo.secrets,
              {
                dryRun,
              },
            ),
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
              acceleratorProfileState: controlledState,
              isModelMesh,
            }).then((servingRuntime) =>
              setUpTokenAuth(
                servingRuntimeData,
                servingRuntimeName,
                namespace,
                createTokenAuth,
                servingRuntime,
                editInfo?.secrets,
                {
                  dryRun,
                },
              ),
            ),
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
): string | undefined => inferenceService.status?.url;

export const filterOutConnectionsWithoutBucket = (
  connections: DataConnection[],
): DataConnection[] =>
  connections.filter(
    (obj) => isDataConnectionAWS(obj) && obj.data.data.AWS_S3_BUCKET.trim() !== '',
  );
