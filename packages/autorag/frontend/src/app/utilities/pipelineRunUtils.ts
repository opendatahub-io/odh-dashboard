import type { PipelineRun } from '~/app/types';

/* eslint-disable camelcase */
const LEGACY_PARAM_RENAMES: Record<string, string> = {
  llama_stack_vector_io_provider_id: 'vector_io_provider_id',
  llama_stack_secret_name: 'ogx_secret_name',
  embeddings_models: 'embedding_models',
};
/* eslint-enable camelcase */

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
    const newKey = LEGACY_PARAM_RENAMES[key] ?? key;
    const isCanonical = key === newKey;
    if (!isCanonical) {
      changed = true;
    }
    if (!(newKey in normalized) || isCanonical) {
      normalized[newKey] = value;
    }
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
