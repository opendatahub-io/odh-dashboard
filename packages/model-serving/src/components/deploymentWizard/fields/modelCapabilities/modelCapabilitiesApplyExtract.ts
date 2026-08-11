import type { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { MODEL_CAPABILITIES_ANNOTATION } from '../../../../shared/modelCapabilities';

export const applyModelCapabilities = (deployment: Deployment, fieldData: string[]): Deployment => {
  const result = structuredClone(deployment);

  if (!result.model.metadata.annotations) {
    result.model.metadata.annotations = {};
  }

  if (fieldData.length === 0) {
    delete result.model.metadata.annotations[MODEL_CAPABILITIES_ANNOTATION];
  } else {
    result.model.metadata.annotations[MODEL_CAPABILITIES_ANNOTATION] = JSON.stringify(fieldData);
  }

  return result;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string');

export const extractModelCapabilities = (deployment: Deployment): string[] | undefined => {
  const raw = deployment.model.metadata.annotations?.[MODEL_CAPABILITIES_ANNOTATION];
  if (!raw) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isStringArray(parsed)) {
      return parsed;
    }
    return undefined;
  } catch {
    return undefined;
  }
};
