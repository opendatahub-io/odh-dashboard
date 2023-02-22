import { isCpuLimitLarger, isMemoryLimitLarger } from '~/utilities/valueUnits';
import { ContainerResources } from '~/types';

export const getModelServingRuntimeName = (namespace: string): string =>
  `model-server-${namespace}`;
export const getModelServiceAccountName = (name: string): string => {
  const servingRuntimeName = getModelServingRuntimeName(name);
  return `${servingRuntimeName}-sa`;
};
export const getModelRoleBinding = (name: string): string => {
  const servingRuntimeName = getModelServingRuntimeName(name);
  return `${servingRuntimeName}-view`;
};

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
