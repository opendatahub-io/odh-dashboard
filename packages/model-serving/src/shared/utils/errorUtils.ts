import { K8sStatusError } from '@odh-dashboard/k8s-core';

// Single map used for both resource type detection (409 AlreadyExists)
// and error message text replacement in general errors
const K8S_RESOURCE_TYPE_MAP: Record<string, string> = {
  inferenceservices: 'model deployment',
  servingruntimes: 'serving runtime',
  llminferenceservices: 'model deployment',
};

// Regex patterns derived from the type map for replacing K8s resource group
// references (e.g. "inferenceservices.serving.kserve.io") in error messages
const K8S_RESOURCE_PATTERNS: [RegExp, string][] = Object.entries(K8S_RESOURCE_TYPE_MAP).map(
  ([kind, typeName]) => [new RegExp(`${kind}\\.\\S+`, 'i'), typeName],
);

const getResourceTypeName = (kind?: string): string =>
  (kind && K8S_RESOURCE_TYPE_MAP[kind]) || 'resource';

export const translateModelServingError = (error: unknown, displayName?: string): string => {
  if (
    error instanceof K8sStatusError &&
    error.statusObject.code === 409 &&
    error.statusObject.reason === 'AlreadyExists'
  ) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const details = error.statusObject.details as { name?: string; kind?: string } | undefined;
    const name = displayName || details?.name;
    const resourceType = getResourceTypeName(details?.kind);
    return name
      ? `A ${resourceType} with the name "${name}" already exists. Please choose a different ${resourceType} name.`
      : `A ${resourceType} with this name already exists. Please choose a different ${resourceType} name.`;
  }

  let message = error instanceof Error ? error.message : String(error || 'Unknown error');
  for (const [pattern, replacement] of K8S_RESOURCE_PATTERNS) {
    message = message.replace(pattern, replacement);
  }
  return message;
};
