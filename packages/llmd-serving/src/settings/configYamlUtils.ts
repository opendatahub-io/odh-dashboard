import type { LLMInferenceServiceConfigKind } from '../types';

export type ConfigFormFields = {
  name?: string;
  displayName?: string;
  description?: string;
  version?: string;
};

export const overrideLlmConfigFields = (
  config: LLMInferenceServiceConfigKind,
  fields: ConfigFormFields,
): LLMInferenceServiceConfigKind => {
  const annotations = { ...config.metadata.annotations };
  if (fields.displayName !== undefined) {
    annotations['openshift.io/display-name'] = fields.displayName;
  }
  if (fields.description !== undefined) {
    annotations['openshift.io/description'] = fields.description;
  }
  if (fields.version !== undefined) {
    if (fields.version) {
      annotations['opendatahub.io/runtime-version'] = fields.version;
    } else {
      delete annotations['opendatahub.io/runtime-version'];
    }
  }
  return {
    ...config,
    metadata: {
      ...config.metadata,
      ...(fields.name ? { name: fields.name } : {}),
      annotations,
    },
  };
};
