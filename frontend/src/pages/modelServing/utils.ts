import * as _ from 'lodash-es';
import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import {
  isCpuResourceEqual,
  isCpuLimitLarger,
  isMemoryResourceEqual,
  isMemoryLimitLarger,
} from '~/utilities/valueUnits';
import {
  assembleSecretSA,
  createRoleBinding,
  createSecret,
  deleteSecret,
  generateRoleBindingServingRuntime,
  replaceSecret,
  assembleServiceAccount,
  createServiceAccount,
  getRoleBinding,
  addOwnerReference,
  getServiceAccount,
} from '~/api';
import {
  SecretKind,
  K8sAPIOptions,
  RoleBindingKind,
  ServingRuntimeKind,
  DataScienceClusterKindStatus,
  InferenceServiceKind,
  ServiceAccountKind,
} from '~/k8sTypes';
import { ContainerResources } from '~/types';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import {
  CreatingInferenceServiceObject,
  CreatingServingRuntimeObject,
  ServingRuntimeEditInfo,
  ModelServingSize,
  ServingRuntimeToken,
} from '~/pages/modelServing/screens/types';
import { AcceleratorProfileState } from '~/utilities/useAcceleratorProfileState';
import { getAcceleratorProfileCount } from '~/utilities/utils';

type TokenNames = {
  serviceAccountName: string;
  roleBindingName: string;
};

export const getModelServingRuntimeName = (namespace: string): string =>
  `model-server-${namespace}`;

export const getModelServiceAccountName = (name: string): string => `${name}-sa`;

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
  existingSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> => {
  const { serviceAccountName, roleBindingName } = getTokenNames(deployedModelName, namespace);

  const serviceAccount = addOwnerReference(
    assembleServiceAccount(serviceAccountName, namespace),
    owner,
  );
  const roleBinding = addOwnerReference(
    generateRoleBindingServingRuntime(roleBindingName, serviceAccountName, namespace),
    owner,
  );
  return (
    createTokenAuth
      ? Promise.all([
          createServiceAccountIfMissing(serviceAccount, namespace, opts),
          createRoleBindingIfMissing(roleBinding, namespace, opts),
        ])
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

export const createRoleBindingIfMissing = async (
  rolebinding: RoleBindingKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<RoleBindingKind> =>
  getRoleBinding(namespace, rolebinding.metadata.name).catch((e) => {
    if (e.statusObject?.code === 404) {
      return createRoleBinding(rolebinding, opts);
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
  const roleBindingName = getModelRoleBinding(name);

  return { serviceAccountName, roleBindingName };
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
    inferenceService?.spec.predictor.model.resources &&
    Object.keys(inferenceService.spec.predictor.model.resources).length === 0
  ) {
    return undefined;
  }

  return inferenceService?.spec.predictor.model.resources;
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

const isAcceleratorProfileChanged = (
  acceleratorProfileState: AcceleratorProfileState,
  servingRuntime: ServingRuntimeKind,
) => {
  const { acceleratorProfile } = acceleratorProfileState;
  const { initialAcceleratorProfile } = acceleratorProfileState;

  // both are none, check if it's using existing
  if (!acceleratorProfile && !initialAcceleratorProfile) {
    if (acceleratorProfileState.additionalOptions?.useExisting) {
      return !acceleratorProfileState.useExisting;
    }
    return false;
  }

  // one is none, another is set, changed
  if (!acceleratorProfile || !initialAcceleratorProfile) {
    return true;
  }

  // compare the name, gpu count
  return (
    acceleratorProfile.metadata.name !== initialAcceleratorProfile.metadata.name ||
    acceleratorProfileState.count !==
      getAcceleratorProfileCount(
        initialAcceleratorProfile,
        servingRuntime.spec.containers[0].resources || {},
      )
  );
};

export const isModelServerEditInfoChanged = (
  createData: CreatingServingRuntimeObject,
  sizes: ModelServingSize[],
  acceleratorProfileState: AcceleratorProfileState,
  editInfo?: ServingRuntimeEditInfo,
): boolean =>
  editInfo?.servingRuntime
    ? getDisplayNameFromK8sResource(editInfo.servingRuntime) !== createData.name ||
      editInfo.servingRuntime.spec.replicas !== createData.numReplicas ||
      !_.isEqual(getServingRuntimeSize(sizes, editInfo.servingRuntime), createData.modelSize) ||
      editInfo.servingRuntime.metadata.annotations?.['enable-route'] !==
        String(createData.externalRoute) ||
      editInfo.servingRuntime.metadata.annotations['enable-auth'] !==
        String(createData.tokenAuth) ||
      isAcceleratorProfileChanged(acceleratorProfileState, editInfo.servingRuntime) ||
      (createData.tokenAuth &&
        !_.isEqual(
          getServingRuntimeTokens(editInfo.secrets)
            .map((token) => token.name)
            .sort(),
          createData.tokens.map((token) => token.name).sort(),
        ))
    : true;

export const checkModelMeshFailureStatus = (status: DataScienceClusterKindStatus): string =>
  status.conditions.find(
    (condition) => condition.type === 'model-meshReady' && condition.status === 'False',
  )?.message || '';

export const isModelMesh = (inferenceService: InferenceServiceKind): boolean =>
  inferenceService.metadata.annotations?.['serving.kserve.io/deploymentMode'] === 'ModelMesh';
