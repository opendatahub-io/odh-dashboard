import * as React from 'react';
import {
  DashboardConfigKind,
  InferenceServiceKind,
  KnownLabels,
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
  ServingPlatformStatuses,
  ServingRuntimeEditInfo,
  ServingRuntimeSize,
} from '~/pages/modelServing/screens/types';
import { ServingRuntimePlatform } from '~/types';
import { DEFAULT_MODEL_SERVER_SIZES } from '~/pages/modelServing/screens/const';
import { useAppContext } from '~/app/AppContext';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import { EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '~/pages/projects/utils';
import { getDisplayNameFromServingRuntimeTemplate } from '~/pages/modelServing/customServingRuntimes/utils';
import {
  getServingRuntimeSize,
  getServingRuntimeTokens,
  setUpTokenAuth,
} from '~/pages/modelServing/utils';
import { AcceleratorState } from '~/utilities/useAcceleratorState';
import {
  addSupportServingPlatformProject,
  assembleSecret,
  createInferenceService,
  createSecret,
  createServingRuntime,
  updateInferenceService,
  updateServingRuntime,
} from '~/api';

export const getServingRuntimeSizes = (config: DashboardConfigKind): ServingRuntimeSize[] => {
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

  const existingSize = getServingRuntimeSize(sizes, existingData?.servingRuntime);

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
  if (project.metadata.labels[KnownLabels.MODEL_SERVING_PROJECT] === undefined) {
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
  if (project.metadata.labels[KnownLabels.MODEL_SERVING_PROJECT] === 'true') {
    return {
      platform: ServingRuntimePlatform.MULTI,
      error: modelMeshInstalled ? undefined : new Error('Multi-model platform is not installed'),
    };
  }
  return {
    platform: ServingRuntimePlatform.SINGLE,
    error: kServeInstalled ? undefined : new Error('Single model platform is not installed'),
  };
};

export const createAWSSecret = (createData: CreatingInferenceServiceObject): Promise<SecretKind> =>
  createSecret(
    assembleSecret(
      createData.project,
      createData.storage.awsData.reduce<Record<string, string>>(
        (acc, { key, value }) => ({ ...acc, [key]: value }),
        {},
      ),
      'aws',
    ),
  );

const createInferenceServiceAndDataConnection = (
  inferenceServiceData: CreatingInferenceServiceObject,
  existingStorage: boolean,
  editInfo?: InferenceServiceKind,
  isModelMesh?: boolean,
  acceleratorState?: AcceleratorState,
) => {
  if (!existingStorage) {
    return createAWSSecret(inferenceServiceData).then((secret) =>
      editInfo
        ? updateInferenceService(
            inferenceServiceData,
            editInfo,
            secret.metadata.name,
            isModelMesh,
            acceleratorState,
          )
        : createInferenceService(
            inferenceServiceData,
            secret.metadata.name,
            isModelMesh,
            acceleratorState,
          ),
    );
  }
  return editInfo !== undefined
    ? updateInferenceService(
        inferenceServiceData,
        editInfo,
        undefined,
        isModelMesh,
        acceleratorState,
      )
    : createInferenceService(inferenceServiceData, undefined, isModelMesh, acceleratorState);
};

export const submitInferenceServiceResource = (
  createData: CreatingInferenceServiceObject,
  editInfo?: InferenceServiceKind,
  servingRuntimeName?: string,
  isModelMesh?: boolean,
  acceleratorState?: AcceleratorState,
): Promise<InferenceServiceKind> => {
  const inferenceServiceData = {
    ...createData,
    ...(servingRuntimeName !== undefined && {
      servingRuntimeName: translateDisplayNameForK8s(servingRuntimeName),
    }),
  };

  const existingStorage =
    inferenceServiceData.storage.type === InferenceServiceStorageType.EXISTING_STORAGE;

  return createInferenceServiceAndDataConnection(
    inferenceServiceData,
    existingStorage,
    editInfo,
    isModelMesh,
    acceleratorState,
  );
};

export const submitServingRuntimeResources = (
  servingRuntimeSelected: ServingRuntimeKind | undefined,
  createData: CreatingServingRuntimeObject,
  customServingRuntimesEnabled: boolean,
  namespace: string,
  editInfo: ServingRuntimeEditInfo | undefined,
  allowCreate: boolean,
  acceleratorState: AcceleratorState,
  servingPlatformEnablement: NamespaceApplicationCase,
  currentProject?: ProjectKind,
  name?: string,
  isModelMesh?: boolean,
): Promise<void | (string | void | ServingRuntimeKind)[]> => {
  if (!servingRuntimeSelected) {
    return Promise.reject(
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
  const createRolebinding = servingRuntimeData.tokenAuth && allowCreate;

  const accelerator = isGpuDisabled(servingRuntimeSelected)
    ? { count: 0, accelerators: [], useExisting: false }
    : acceleratorState;

  const getUpdatePromises = (dryRun = false) => [
    ...(!dryRun &&
    currentProject &&
    currentProject.metadata.labels?.['modelmesh-enabled'] === undefined &&
    allowCreate
      ? [addSupportServingPlatformProject(currentProject.metadata.name, servingPlatformEnablement)]
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
            acceleratorState: accelerator,
            isModelMesh,
          }),
          setUpTokenAuth(
            servingRuntimeData,
            servingRuntimeName,
            namespace,
            createRolebinding,
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
            acceleratorState: accelerator,
            isModelMesh,
          }).then((servingRuntime) =>
            setUpTokenAuth(
              servingRuntimeData,
              servingRuntimeName,
              namespace,
              createRolebinding,
              servingRuntime,
              editInfo?.secrets,
              {
                dryRun,
              },
            ),
          ),
        ]),
  ];

  return Promise.all<ServingRuntimeKind | string | void>(getUpdatePromises(true)).then(() =>
    Promise.all<ServingRuntimeKind | string | void>(getUpdatePromises()),
  );
};

export const getUrlFromKserveInferenceService = (
  inferenceService: InferenceServiceKind,
): string | undefined => inferenceService.status?.url;
