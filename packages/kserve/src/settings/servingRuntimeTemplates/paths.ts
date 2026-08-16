/**
 * Base path of the standalone serving runtimes page, used when the
 * `modelDeploymentSettings` feature flag is off.
 *
 * Temporary. RHOAIENG-80077 removes the flag and the standalone page, after
 * which this constant and everything reachable only through it should go too.
 * https://issues.redhat.com/browse/RHOAIENG-80077
 */
export const SERVING_RUNTIME_TEMPLATES_STANDALONE_PATH =
  '/settings/model-resources-operations/serving-runtimes';

/**
 * Base path of the serving runtime templates tab on the Model deployment
 * settings page, used when the `modelDeploymentSettings` feature flag is on.
 */
export const SERVING_RUNTIME_TEMPLATES_TAB_PATH =
  '/settings/model-resources-operations/model-deployment-settings/serving-runtime-templates';
