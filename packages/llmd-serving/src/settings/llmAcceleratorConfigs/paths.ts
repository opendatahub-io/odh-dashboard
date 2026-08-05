/**
 * Base path of the standalone LLM accelerator configurations page, used when the
 * `modelDeploymentSettings` feature flag is off.
 *
 * Temporary. RHOAIENG-80077 removes the flag and the standalone pages, after
 * which this constant and everything reachable only through it should go too.
 * https://issues.redhat.com/browse/RHOAIENG-80077
 */
export const LLM_ACCELERATOR_CONFIGS_STANDALONE_PATH =
  '/settings/model-resources-operations/llm-accelerator-configs';

/**
 * Base path of the LLM accelerator configurations tab on the Model deployment
 * settings page, used when the `modelDeploymentSettings` feature flag is on.
 */
export const LLM_ACCELERATOR_CONFIGS_TAB_PATH =
  '/settings/model-resources-operations/model-deployment-settings/llm-accelerator-configurations';
