import type { PipelineRun } from '~/app/types';

/* eslint-disable camelcase */
const LEGACY_PARAM_RENAMES: Record<string, string> = {
  llama_stack_vector_io_provider_id: 'vector_io_provider_id',
  llama_stack_secret_name: 'maas_secret_name',
  // The OGX dependency was removed from AutoRAG (RHOAIENG-89370); older runs stored the
  // connection under `ogx_secret_name`, which is now the MaaS connection secret.
  ogx_secret_name: 'maas_secret_name',
  embeddings_models: 'embedding_models',
};

const MAAS_SECRET_PARAM_PRECEDENCE = [
  'maas_secret_name',
  'ogx_secret_name',
  'llama_stack_secret_name',
] as const;
/* eslint-enable camelcase */

const isMaasSecretParamKey = (key: string): boolean => {
  switch (key) {
    case 'maas_secret_name':
    case 'ogx_secret_name':
    case 'llama_stack_secret_name':
      return true;
    default:
      return false;
  }
};

/**
 * Normalizes legacy pipeline run parameter keys so that old and new runs
 * present a consistent shape to the rest of the UI.
 */
export const normalizePipelineRun = (run: PipelineRun): PipelineRun => {
  const params = run.runtime_config?.parameters;
  if (!params) {
    return run;
  }

  let changed = false;
  const normalized: Record<string, unknown> = Object.create(null);

  for (const [key, value] of Object.entries(params)) {
    if (isMaasSecretParamKey(key)) {
      continue;
    }
    const newKey = LEGACY_PARAM_RENAMES[key] ?? key;
    const isCanonical = key === newKey;
    if (!isCanonical) {
      changed = true;
    }
    if (!(newKey in normalized) || isCanonical) {
      normalized[newKey] = value;
    }
  }

  const maasSecretSource = MAAS_SECRET_PARAM_PRECEDENCE.find((key) => key in params);
  if (maasSecretSource !== undefined) {
    if (
      maasSecretSource !== 'maas_secret_name' ||
      'ogx_secret_name' in params ||
      'llama_stack_secret_name' in params
    ) {
      changed = true;
    }
    // eslint-disable-next-line camelcase
    normalized.maas_secret_name = params[maasSecretSource];
  }

  if (!changed) {
    return run;
  }

  return {
    ...run,
    // eslint-disable-next-line camelcase
    runtime_config: {
      ...run.runtime_config,
      parameters: normalized,
    },
  };
};
