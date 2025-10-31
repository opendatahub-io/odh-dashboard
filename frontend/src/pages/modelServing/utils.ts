import * as _ from 'lodash-es';
import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import {
  isCpuResourceEqual,
  isCpuLimitLarger,
  isMemoryResourceEqual,
  isMemoryLimitLarger,
} from '#~/utilities/valueUnits';
import {
  assembleSecretSA,
  createRoleBinding,
  createSecret,
  deleteSecret,
  generateRoleInferenceService,
  generateRoleBindingServiceAccount,
  replaceSecret,
  assembleServiceAccount,
  createServiceAccount,
  getRoleBinding,
  addOwnerReference,
  getServiceAccount,
  getRole,
  createRole,
} from '#~/api';
import {
  SecretKind,
  K8sAPIOptions,
  RoleBindingKind,
  ServingRuntimeKind,
  InferenceServiceKind,
  ServiceAccountKind,
  RoleKind,
  ServingContainer,
  PersistentVolumeClaimKind,
} from '#~/k8sTypes';
import { ContainerResources } from '#~/types';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '#~/concepts/k8s/utils';
import {
  CreatingInferenceServiceObject,
  CreatingServingRuntimeObject,
  ServingRuntimeEditInfo,
  ModelServingSize,
  ServingRuntimeToken,
  ModelServingState,
} from '#~/pages/modelServing/screens/types';
import { ModelServingPodSpecOptionsState } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { ServingRuntimeVersionStatusLabel } from './screens/const';

type TokenNames = {
  serviceAccountName: string;
  roleName: string;
  roleBindingName: string;
};

export const getModelServingRuntimeName = (namespace: string): string =>
  `model-server-${namespace}`;

export const getModelServiceAccountName = (name: string): string => `${name}-sa`;

export const getModelRole = (name: string): string => `${name}-view-role`;
export const getModelRoleBinding = (name: string): string => `${name}-view`;

const isValidCpuOrMemoryValue = (value?: string | number) =>
  value === undefined ? true : parseInt(String(value)) > 0;

export const resourcesArePositive = (resources: ContainerResources): boolean =>
  isValidCpuOrMemoryValue(resources.limits?.cpu) &&
  isValidCpuOrMemoryValue(resources.limits?.memory) &&
  isValidCpuOrMemoryValue(resources.requests?.cpu) &&
  isValidCpuOrMemoryValue(resources.requests?.memory);

export const requestsUnderLimits = (resources: ContainerResources): boolean =>
  isCpuLimitLarger(resources.requests?.cpu, resources.limits?.cpu, true) &&
  isMemoryLimitLarger(resources.requests?.memory, resources.limits?.memory, true);

export const setUpTokenAuth = async (
  fillData: CreatingServingRuntimeObject | CreatingInferenceServiceObject,
  deployedModelName: string,
  namespace: string,
  createTokenAuth: boolean,
  owner: ServingRuntimeKind | InferenceServiceKind,
  isModelMesh?: boolean,
  existingSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> => {
  const { serviceAccountName, roleName, roleBindingName } = getTokenNames(
    deployedModelName,
    namespace,
  );

  const serviceAccount = addOwnerReference(
    assembleServiceAccount(serviceAccountName, namespace),
    owner,
  );

  // We only need the inferenceservice view role for KServe, not ModelMesh
  const role = !isModelMesh
    ? addOwnerReference(generateRoleInferenceService(roleName, deployedModelName, namespace), owner)
    : null;

  const roleBinding = addOwnerReference(
    generateRoleBindingServiceAccount(
      roleBindingName,
      serviceAccountName,
      role
        ? {
            kind: 'Role',
            name: roleName,
          }
        : {
            // Fallback to insecure ClusterRole for ModelMesh
            // This is a security issue we will not fix for now, this may change in the future.
            // See https://issues.redhat.com/browse/RHOAIENG-12314
            kind: 'ClusterRole',
            name: 'view',
          },
      namespace,
    ),
    owner,
  );
  return (
    createTokenAuth
      ? Promise.all([
          createServiceAccountIfMissing(serviceAccount, namespace, opts),
          ...(role ? [createRoleIfMissing(role, namespace, opts)] : []),
        ]).then(() => createRoleBindingIfMissing(roleBinding, namespace, opts))
      : Promise.resolve()
  )
    .then(() => createSecrets(fillData, deployedModelName, namespace, existingSecrets, opts))
    .catch((error) => Promise.reject(error));
};

export const createServiceAccountIfMissing = async (
  serviceAccount: ServiceAccountKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<ServiceAccountKind> =>
  getServiceAccount(serviceAccount.metadata.name, namespace).catch((e) => {
    if (e.statusObject?.code === 404) {
      return createServiceAccount(serviceAccount, opts);
    }
    return Promise.reject(e);
  });

export const createRoleIfMissing = async (
  role: RoleKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RoleKind> =>
  getRole(namespace, role.metadata.name).catch((e) => {
    if (e.statusObject?.code === 404) {
      return createRole(role, opts);
    }
    return Promise.reject(e);
  });

export const createRoleBindingIfMissing = async (
  rolebinding: RoleBindingKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RoleBindingKind> =>
  getRoleBinding(namespace, rolebinding.metadata.name).catch((e) => {
    if (e.statusObject?.code === 404) {
      return createRoleBinding(rolebinding, opts).catch((error) => {
        if (error.statusObject?.code === 404 && opts?.dryRun) {
          // If dryRun is enabled and the user is not Cluster Admin it seems that there's a k8s error
          // that raises a 404 trying to find the role, which is missing since it's a dryRun.
          return Promise.resolve(rolebinding);
        }
        return Promise.reject(error);
      });
    }
    return Promise.reject(e);
  });

export const createSecrets = async (
  fillData: CreatingServingRuntimeObject | CreatingInferenceServiceObject,
  deployedModelName: string,
  namespace: string,
  existingSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> => {
  const { serviceAccountName } = getTokenNames(deployedModelName, namespace);
  const deletedSecrets =
    existingSecrets
      ?.map((secret) => secret.metadata.name)
      .filter((token) => !fillData.tokens.some((tokenEdit) => tokenEdit.editName === token)) || [];

  return Promise.all<K8sStatus | SecretKind>([
    ...fillData.tokens
      .filter((token) => translateDisplayNameForK8s(token.name) !== token.editName)
      .map((token) => {
        const secretToken = assembleSecretSA(
          token.name,
          serviceAccountName,
          namespace,
          token.editName,
        );
        if (token.editName) {
          return replaceSecret(secretToken, opts);
        }
        return createSecret(secretToken, opts);
      }),
    ...deletedSecrets.map((secret) => deleteSecret(namespace, secret, opts)),
  ])
    .then(() => Promise.resolve())
    .catch((error) => Promise.reject(error));
};

export const getTokenNames = (servingRuntimeName: string, namespace: string): TokenNames => {
  const name =
    servingRuntimeName !== '' ? servingRuntimeName : getModelServingRuntimeName(namespace);

  const serviceAccountName = getModelServiceAccountName(name);
  const roleName = getModelRole(name);
  const roleBindingName = getModelRoleBinding(name);

  return { serviceAccountName, roleName, roleBindingName };
};

export const getResourceSize = (
  sizes: ModelServingSize[],
  existingResources: ContainerResources,
): ModelServingSize => {
  const size = sizes.find(
    (currentSize) =>
      isCpuResourceEqual(currentSize.resources.limits?.cpu, existingResources.limits?.cpu) &&
      isMemoryResourceEqual(
        currentSize.resources.limits?.memory,
        existingResources.limits?.memory,
      ) &&
      isCpuResourceEqual(currentSize.resources.requests?.cpu, existingResources.requests?.cpu) &&
      isMemoryResourceEqual(
        currentSize.resources.requests?.memory,
        existingResources.requests?.memory,
      ),
  );
  return (
    size || {
      name: 'Custom',
      resources: existingResources,
    }
  );
};

export const getInferenceServiceSizeOrReturnEmpty = (
  inferenceService?: InferenceServiceKind,
): ContainerResources | undefined => {
  if (
    inferenceService?.spec.predictor.model?.resources &&
    Object.keys(inferenceService.spec.predictor.model.resources).length === 0
  ) {
    return undefined;
  }

  return inferenceService?.spec.predictor.model?.resources;
};

export const getServingRuntimeOrReturnEmpty = (
  servingRuntime?: ServingRuntimeKind,
): ContainerResources | undefined => {
  if (
    servingRuntime?.spec.containers[0]?.resources &&
    Object.keys(servingRuntime.spec.containers[0]?.resources).length === 0
  ) {
    return undefined;
  }

  return servingRuntime?.spec.containers[0]?.resources;
};

export const getKServeContainer = (
  servingRuntime?: ServingRuntimeKind,
): ServingContainer | undefined =>
  servingRuntime?.spec.containers.find((container) => container.name === 'kserve-container');

// will return `undefined` if no kserve container, force empty array if there is kserve with no args
export const getKServeContainerArgs = (
  servingRuntime?: ServingRuntimeKind,
): string[] | undefined => {
  const kserveContainer = getKServeContainer(servingRuntime);
  return kserveContainer ? kserveContainer.args ?? [] : undefined;
};

// will return `undefined` if no kserve container, force empty array if there is kserve with no vars
export const getKServeContainerEnvVarStrs = (
  servingRuntime?: ServingRuntimeKind,
): string[] | undefined => {
  const kserveContainer = getKServeContainer(servingRuntime);
  if (!kserveContainer) {
    return undefined;
  }
  return kserveContainer.env?.map((ev) => `${ev.name}=${ev.value ?? ''}`) || [];
};

export const getServingRuntimeSize = (
  sizes: ModelServingSize[],
  servingRuntime?: ServingRuntimeKind,
): ModelServingSize => {
  const existingResources = getServingRuntimeOrReturnEmpty(servingRuntime) || sizes[0].resources;
  return getResourceSize(sizes, existingResources);
};

export const getInferenceServiceSize = (
  sizes: ModelServingSize[],
  inferenceService?: InferenceServiceKind,
  servingRuntime?: ServingRuntimeKind,
): ModelServingSize => {
  const existingResources =
    getInferenceServiceSizeOrReturnEmpty(inferenceService) ||
    getServingRuntimeOrReturnEmpty(servingRuntime) ||
    sizes[0].resources;
  return getResourceSize(sizes, existingResources);
};

export const getServingRuntimeTokens = (tokens?: SecretKind[]): ServingRuntimeToken[] =>
  (tokens || []).map((secret) => ({
    name: getDisplayNameFromK8sResource(secret) || secret.metadata.name,
    editName: secret.metadata.name,
    uuid: secret.metadata.name,
    error: '',
  }));

const isPodSpecOptionsChanged = (
  currentPodSpecOptionsState: ModelServingPodSpecOptionsState,
  existingServingRuntime?: ServingRuntimeKind,
): boolean => {
  const initialSize = currentPodSpecOptionsState.podSpecOptions.resources;
  const currentSize = getServingRuntimeOrReturnEmpty(existingServingRuntime);

  const initialTolerations = currentPodSpecOptionsState.podSpecOptions.tolerations;
  const currentTolerations = existingServingRuntime?.spec.tolerations;

  const currentNodeSelector = existingServingRuntime?.spec.nodeSelector;
  const initialNodeSelector = currentPodSpecOptionsState.podSpecOptions.nodeSelector;

  return (
    !_.isEqual(initialSize, currentSize) ||
    !_.isEqual(initialTolerations, currentTolerations) ||
    !_.isEqual(initialNodeSelector, currentNodeSelector)
  );
};

export const isModelServerEditInfoChanged = (
  createData: CreatingServingRuntimeObject,
  podSpecOptionsState: ModelServingPodSpecOptionsState,
  editInfo?: ServingRuntimeEditInfo,
): boolean =>
  editInfo?.servingRuntime
    ? getDisplayNameFromK8sResource(editInfo.servingRuntime) !== createData.name ||
      editInfo.servingRuntime.spec.replicas !== createData.numReplicas ||
      editInfo.servingRuntime.metadata.annotations?.['enable-route'] !==
        String(createData.externalRoute) ||
      editInfo.servingRuntime.metadata.annotations['enable-auth'] !==
        String(createData.tokenAuth) ||
      isPodSpecOptionsChanged(podSpecOptionsState, editInfo.servingRuntime) ||
      (createData.tokenAuth &&
        !_.isEqual(
          getServingRuntimeTokens(editInfo.secrets)
            .map((token) => token.name)
            .toSorted(),
          createData.tokens.map((token) => token.name).toSorted(),
        ))
    : true;

export const isModelServingStopped = (inferenceService?: InferenceServiceKind): boolean =>
  inferenceService?.metadata.annotations?.['serving.kserve.io/stop'] === 'true';

export const isOciModelUri = (modelUri?: string): boolean => !!modelUri?.includes('oci://');

export const getInferenceServiceStoppedStatus = (
  inferenceService: InferenceServiceKind,
): ModelServingState => {
  const status = isModelServingStopped(inferenceService);
  return {
    inferenceService,
    isStopped: status,
    isRunning: !status,
  };
};

export const getServingRuntimeVersionStatus = (
  servingRuntimeVersion: string | undefined,
  templateVersion: string | undefined,
): string | undefined => {
  if (!servingRuntimeVersion || !templateVersion) {
    return undefined;
  }
  return servingRuntimeVersion === templateVersion
    ? ServingRuntimeVersionStatusLabel.LATEST
    : ServingRuntimeVersionStatusLabel.OUTDATED;
};

export const getModelServingPVCAnnotations = (
  pvc: PersistentVolumeClaimKind,
): { modelName: string | null; modelPath: string | null } => {
  const modelName = pvc.metadata.annotations?.['dashboard.opendatahub.io/model-name'] || null;
  const modelPath = pvc.metadata.annotations?.['dashboard.opendatahub.io/model-path'] || null;

  return { modelName, modelPath };
};
