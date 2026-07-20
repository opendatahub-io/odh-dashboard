import { DASHBOARD_RESOURCE_LABEL } from '../const';
import { LLMInferenceServiceConfigModel } from '../types';
import type { LLMInferenceServiceConfigKind } from '../types';

export type ConfigFieldOverrides = {
  name?: string;
  namespace: string;
  displayName?: string;
  description?: string;
  version?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
};

export const overrideLlmConfigFields = (
  config: LLMInferenceServiceConfigKind,
  overrides: ConfigFieldOverrides,
): LLMInferenceServiceConfigKind => {
  const { apiGroup, apiVersion: apiVer } = LLMInferenceServiceConfigModel;

  const annotations = { ...config.metadata.annotations, ...overrides.annotations };
  if (overrides.displayName !== undefined) {
    annotations['openshift.io/display-name'] = overrides.displayName;
  }
  if (overrides.description !== undefined) {
    annotations['openshift.io/description'] = overrides.description;
  }
  if (overrides.version !== undefined) {
    if (overrides.version) {
      annotations['opendatahub.io/runtime-version'] = overrides.version;
    } else {
      delete annotations['opendatahub.io/runtime-version'];
    }
  }

  return {
    ...config,
    apiVersion: `${apiGroup}/${apiVer}`,
    kind: 'LLMInferenceServiceConfig',
    metadata: {
      ...config.metadata,
      ...(overrides.name ? { name: overrides.name } : {}),
      namespace: overrides.namespace,
      labels: {
        ...config.metadata.labels,
        ...overrides.labels,
        [DASHBOARD_RESOURCE_LABEL]: 'true',
      },
      annotations,
    },
  };
};
