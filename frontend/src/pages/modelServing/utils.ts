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
