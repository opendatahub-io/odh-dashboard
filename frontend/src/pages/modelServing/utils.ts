import { isCpuLimitLarger, isMemoryLimitLarger } from '~/utilities/valueUnits';
import {
  assembleSecretSA,
  createRoleBinding,
  createSecret,
  deleteSecret,
  generateRoleBindingServingRuntime,
  replaceSecret,
  assembleServiceAccount,
  createServiceAccount,
  getServiceAccount,
  getRoleBinding,
} from '~/api';
import { SecretKind, K8sStatus, K8sAPIOptions, ServiceAccountKind, RoleBindingKind } from '~/k8sTypes';
import { ContainerResources } from '~/types';
import { allSettledPromises } from '~/utilities/allSettledPromises';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';

export const getModelServingRuntimeName = (namespace: string): string =>
  `model-server-${namespace}`;

export const getModelServiceAccountName = (name: string): string => `${name}-sa`;

export const getModelRoleBinding = (name: string): string => `${name}-view`;

const isValidCpuOrMemoryValue = (value?: string) =>
  value === undefined ? true : parseInt(value) > 0;

export const resourcesArePositive = (resources: ContainerResources): boolean =>
  isValidCpuOrMemoryValue(resources.limits?.cpu) &&
  isValidCpuOrMemoryValue(resources.limits?.memory) &&
  isValidCpuOrMemoryValue(resources.requests?.cpu) &&
  isValidCpuOrMemoryValue(resources.requests?.memory);

export const requestsUnderLimits = (resources: ContainerResources): boolean =>
  isCpuLimitLarger(resources.requests?.cpu, resources.limits?.cpu, true) &&
  isMemoryLimitLarger(resources.requests?.memory, resources.limits?.memory, true);

  
export const setUpTokenAuth = async (
  fillData: CreatingServingRuntimeObject,
  servingRuntimeName: string,
  namespace: string,
  oldSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> => {
  const { serviceAccountName, roleBindingName } = getTokenNames(servingRuntimeName, namespace);

  const serviceAccount = assembleServiceAccount(serviceAccountName, namespace);
  const tokenAuth = generateRoleBindingServingRuntime(
    roleBindingName,
    serviceAccountName,
    namespace,
  );
  return Promise.all([
    createServiceAccount(serviceAccount, opts),
    createRoleBinding(tokenAuth, opts),
  ])
    .then(() => createSecrets(fillData, servingRuntimeName, namespace, oldSecrets, opts))
    .catch((error) => Promise.reject(error));
};

export const isTokenAuthCreated = async (
  servingRuntimeName: string,
  namespace: string
): Promise<[ ServiceAccountKind , RoleBindingKind ]> => {
  const { serviceAccountName, roleBindingName } = getTokenNames(servingRuntimeName, namespace);
  return Promise.all([
    getServiceAccount(serviceAccountName, namespace),
    getRoleBinding(roleBindingName, namespace),
  ]);
}

export const createSecrets = async (
  fillData: CreatingServingRuntimeObject,
  servingRuntimeName: string,
  namespace: string,
  oldSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> => {
  const { serviceAccountName } = getTokenNames(servingRuntimeName, namespace);
  const deletedSecrets = oldSecrets ? oldSecrets
    .map((secret) => secret.metadata.name)
    .filter((token) => !fillData.tokens.some((tokenEdit) => tokenEdit.editName === token)) : [];

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

export const getTokenNames = (servingRuntimeName: string, namespace: string) => {
  const name =
    servingRuntimeName !== '' ? servingRuntimeName : getModelServingRuntimeName(namespace);

  const serviceAccountName = getModelServiceAccountName(name);
  const roleBindingName = getModelRoleBinding(name);

  return { serviceAccountName, roleBindingName };
};
