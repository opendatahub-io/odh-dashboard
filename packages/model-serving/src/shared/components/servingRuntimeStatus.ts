export const SERVING_RUNTIME_SCOPE = {
  Global: 'global',
  Project: 'project',
};

export enum ServingRuntimeVersionStatusLabel {
  LATEST = 'Latest',
  OUTDATED = 'Outdated',
}

export enum ServingRuntimeTemplateStatusLabel {
  TEMPLATE_REMOVED = 'Template removed',
}

export const getServingRuntimeVersionStatus = (
  servingRuntimeVersion: string | undefined,
  templateVersion: string | undefined,
): ServingRuntimeVersionStatusLabel | undefined => {
  if (!servingRuntimeVersion || !templateVersion) {
    return undefined;
  }
  return servingRuntimeVersion === templateVersion
    ? ServingRuntimeVersionStatusLabel.LATEST
    : ServingRuntimeVersionStatusLabel.OUTDATED;
};
