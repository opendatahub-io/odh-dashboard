import { cleanResourceForYAMLViewer, isConfigObject } from '../utils';
import type { LLMInferenceServiceConfigKind } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseLlmInferenceServiceConfig = (json: string): LLMInferenceServiceConfigKind => {
  let resource: unknown;
  try {
    resource = JSON.parse(json);
  } catch {
    throw new Error(
      'The LLM accelerator configuration is not valid JSON. Return to the Runtime image and try again.',
    );
  }
  if (
    !isConfigObject(resource) ||
    !isRecord(resource.metadata) ||
    typeof resource.metadata.name !== 'string'
  ) {
    throw new Error(
      'The Runtime image must contain an LLM accelerator configuration with metadata.name.',
    );
  }
  const { annotations } = resource.metadata;
  if (annotations !== undefined && !isRecord(annotations)) {
    throw new Error('The LLM accelerator configuration annotations must be an object.');
  }
  // Annotation values must be strings before the existing name/version helpers consume them.
  const safeAnnotations = Object.fromEntries(
    Object.entries(isRecord(annotations) ? annotations : {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
  return {
    ...resource,
    metadata: {
      ...cleanResourceForYAMLViewer(resource.metadata),
      annotations: safeAnnotations,
    },
  };
};
