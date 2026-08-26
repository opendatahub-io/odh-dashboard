import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
} from '@odh-dashboard/k8s-core';
import type { DeploymentHookPayloadFor } from '@odh-dashboard/model-serving/extension-points';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import { CONFIG_TYPE_LABEL, type LLMdDeployment, LLMInferenceServiceConfigKind } from '../types';
import {
  createLLMInferenceServiceConfig,
  deleteLLMInferenceServiceConfig,
} from '../api/LLMInferenceServiceConfigs';
import { cleanlyDuplicateConfig } from '../utils';

/** K8s DNS subdomain limit for resource names */
const MAX_K8S_NAME_LENGTH = 253;

/**
 * Name for a deployment-local copy of an admin config: `{deployment}-{config}`, truncated to the
 * k8s name limit. Idempotent if the config name is already prefixed.
 */
export const createLocalConfigName = (
  deployment: LLMdDeployment,
  config: LLMInferenceServiceConfigKind,
): string => {
  const prefix = `${deployment.model.metadata.name}-`;
  if (config.metadata.name.startsWith(prefix)) {
    return config.metadata.name;
  }
  // Truncate the config portion so the prefixed name stays creatable; a trailing hyphen left
  // behind by the cut is not a valid k8s name, so strip it
  return `${prefix}${config.metadata.name}`.slice(0, MAX_K8S_NAME_LENGTH).replace(/-+$/, '');
};

/**
 * Metadata for a deployment-local copy of an admin config. Carries over the config-type label
 * (so the copy's topology type is still discoverable) and marks the display name as a local copy.
 */
export const createLocalConfigMetadata = (
  config: LLMInferenceServiceConfigKind,
): { annotations: Record<string, string>; labels: Record<string, string> } => {
  const configType = config.metadata.labels?.[CONFIG_TYPE_LABEL];
  return {
    annotations: {
      'openshift.io/display-name': `${getDisplayNameFromK8sResource(config)} (Local Copy)`,
      'openshift.io/description': getDescriptionFromK8sResource(config),
    },
    labels: {
      ...(configType && { [CONFIG_TYPE_LABEL]: configType }),
    },
  };
};

// ─── Apply: Config Ref ──────────────────────────────────────────────────────

type ConfigRefFieldData = {
  selectedConfig?: LLMInferenceServiceConfigKind | string;
  configRef?: string;
};

export type ApplyConfigRefOptions = {
  /** The annotation used to track which baseRef belongs to this config kind. */
  annotationKey: string;
  /** Produces the baseRef name for the selected config (usually createLocalConfigName). */
  configName: (deployment: LLMdDeployment, config: LLMInferenceServiceConfigKind) => string;
  /** True when the selection is a "no config" placeholder (e.g. topology default / built-in image). */
  isDefaultPlaceholder?: (config: LLMInferenceServiceConfigKind | string) => boolean;
};

/**
 * Swap the baseRef + tracking annotation for one kind of config on a deployment.
 * - Removes any previously tracked ref for this annotation.
 * - If a real (non-placeholder) config is selected, pushes its ref to the END of baseRefs and records
 *   the annotation. baseRef ordering across config kinds is a registration-order concern (the
 *   accelerator apply is registered after topology so its image wins).
 * - Never touches spec.router.scheduler.
 */
export const applyConfigRef = (
  deployment: LLMdDeployment,
  fieldData: ConfigRefFieldData | undefined,
  options: ApplyConfigRefOptions,
): LLMdDeployment => {
  // If a ref was extracted (edit) but not yet resolved to a config object, leave things alone to
  // avoid dropping the existing ref.
  if (fieldData?.configRef && !fieldData.selectedConfig) {
    return deployment;
  }

  const result = structuredClone(deployment);
  const annotations = { ...result.model.metadata.annotations };

  const prevRef = annotations[options.annotationKey];
  if (prevRef && result.model.spec.baseRefs) {
    result.model.spec.baseRefs = result.model.spec.baseRefs.filter((r) => r.name !== prevRef);
  }
  delete annotations[options.annotationKey];

  const config = fieldData?.selectedConfig;
  const isRealConfig =
    config !== undefined && typeof config !== 'string' && !options.isDefaultPlaceholder?.(config);
  if (isRealConfig) {
    const name = options.configName(result, config);
    annotations[options.annotationKey] = name;
    if (!result.model.spec.baseRefs) {
      result.model.spec.baseRefs = [];
    }
    if (!result.model.spec.baseRefs.some((r) => r.name === name)) {
      result.model.spec.baseRefs.push({ name });
    }
  }

  result.model.metadata.annotations = annotations;
  return result;
};

// ─── PreDeploy: Config Copy ─────────────────────────────────────────────────

export type PreDeployConfigCopyOptions = {
  /** The annotation used to track which deployment-local copy belongs to this config kind. */
  annotationKey: string;
  /** True when the selection is a "no config" placeholder (e.g. topology default / built-in image). */
  isDefaultPlaceholder?: (config: LLMInferenceServiceConfigKind | string) => boolean;
};

/**
 * Create/replace the deployment-local copy of one config kind.
 * - Deletes the previously tracked copy when switching (404 ignored).
 * - Clones the selected config into the deployment namespace (409 ignored).
 * - No-op for a placeholder selection.
 * Called twice by the wizard: first with dryRun=true, then for real.
 */
export const preDeployConfigCopy = async (
  options: PreDeployConfigCopyOptions,
  fieldData: { selectedConfig?: LLMInferenceServiceConfigKind | string },
  deployment: DeploymentHookPayloadFor<LLMdDeployment>,
  existingDeployment?: LLMdDeployment,
  dryRun?: boolean,
): Promise<DeploymentHookPayloadFor<LLMdDeployment>> => {
  // The model resource may not be assembled yet on the pre-deploy hook payload; nothing to copy.
  if (!deployment.model) {
    return deployment;
  }
  const { namespace } = deployment.model.metadata;

  const prevName = existingDeployment?.model.metadata.annotations?.[options.annotationKey];
  const newName = deployment.model.metadata.annotations?.[options.annotationKey];

  const config = fieldData.selectedConfig;
  const isRealConfig =
    config !== undefined && typeof config !== 'string' && !options.isDefaultPlaceholder?.(config);

  // Create the new local copy BEFORE deleting the previous one, so a failed create never leaves the
  // deployment referencing a config we already removed. Delete-on-switch happens only after the new
  // copy exists (or when switching to a placeholder, which has nothing to create).
  if (isRealConfig && newName) {
    const copy = cleanlyDuplicateConfig(config, {
      name: newName,
      namespace,
      ...createLocalConfigMetadata(config),
    });
    await createLLMInferenceServiceConfig(copy, { dryRun }).catch((e: unknown) => {
      // Don't block if it already exists
      if (getGenericErrorCode(e) !== 409) {
        throw e;
      }
    });
  }

  if (prevName && prevName !== newName) {
    await deleteLLMInferenceServiceConfig(prevName, namespace, { dryRun }).catch((e: unknown) => {
      // Don't block if not found. It could be in the global namespace by accident
      if (getGenericErrorCode(e) !== 404) {
        throw e;
      }
    });
  }

  return deployment;
};
