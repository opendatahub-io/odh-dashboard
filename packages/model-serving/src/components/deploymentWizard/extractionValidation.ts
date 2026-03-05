import type { InitialWizardFormData } from './types';
import type { Deployment } from '../../../extension-points';

export enum ExtractionIncompleteReason {
  MISSING_MODEL_TYPE = 'missing-model-type',
  MISSING_CONNECTION = 'missing-connection',
  AUTOSCALING_NOT_SUPPORTED = 'autoscaling-not-supported',
  TOLERATIONS_NOT_SUPPORTED = 'tolerations-not-supported',
  NODE_SELECTOR_NOT_SUPPORTED = 'node-selector-not-supported',
  MULTIPLE_CONTAINERS_NOT_SUPPORTED = 'multiple-containers-not-supported',
  CUSTOM_ROUTER_NOT_SUPPORTED = 'custom-router-not-supported',
  MISSING_CRITICAL_FIELD = 'missing-critical-field',
  EXTRACTION_ERROR = 'extraction-error',
}

export type ExtractionIncompleteDetail = {
  reason: ExtractionIncompleteReason;
  message: string;
  fieldName?: string;
};

export type ExtractionValidationResult = {
  isComplete: boolean;
  details: ExtractionIncompleteDetail[];
};

/**
 * Validates whether a deployment's extracted form data is complete and parseable.
 * Returns details about any missing or unsupported configurations that would prevent
 * proper form display.
 *
 * @param deployment - The deployment being edited
 * @param extractedFormData - The form data extracted from the deployment
 * @param extractionError - Any error that occurred during extraction
 * @returns Validation result with completeness status and details
 */
export const validateExtractionCompleteness = (
  deployment: Deployment | undefined | null,
  extractedFormData: InitialWizardFormData | undefined,
  extractionError: Error | undefined,
): ExtractionValidationResult => {
  const details: ExtractionIncompleteDetail[] = [];

  // If there's no deployment, extraction is "complete" (new deployment)
  if (!deployment) {
    return { isComplete: true, details: [] };
  }

  // If there was an extraction error, mark as incomplete
  if (extractionError) {
    details.push({
      reason: ExtractionIncompleteReason.EXTRACTION_ERROR,
      message: `Failed to extract deployment data: ${extractionError.message}`,
    });
    return { isComplete: false, details };
  }

  // If extraction produced no data, mark as incomplete
  if (!extractedFormData) {
    details.push({
      reason: ExtractionIncompleteReason.EXTRACTION_ERROR,
      message: 'No form data could be extracted from deployment',
    });
    return { isComplete: false, details };
  }

  // Check for missing model type annotation
  if (!extractedFormData.modelTypeField) {
    details.push({
      reason: ExtractionIncompleteReason.MISSING_MODEL_TYPE,
      message:
        'Missing model type annotation (opendatahub.io/model-type). The wizard requires this to determine if the model is predictive or generative.',
      fieldName: 'modelTypeField',
    });
  }

  // Check for missing connection when model location type is EXISTING
  if (
    extractedFormData.modelLocationData?.type === 'existing' &&
    !extractedFormData.modelLocationData.connection
  ) {
    details.push({
      reason: ExtractionIncompleteReason.MISSING_CONNECTION,
      message:
        'Missing connection annotation. The deployment references an existing connection but the annotation is missing.',
      fieldName: 'modelLocationData.connection',
    });
  }

  // Check for KServe autoscaling (minReplicas !== maxReplicas)
  // For KServe deployments, check if the deployment has different min/max replicas
  if (deployment.model.kind === 'InferenceService' && 'spec' in deployment.model) {
    const { spec } = deployment.model;
    if (
      spec &&
      typeof spec === 'object' &&
      'predictor' in spec &&
      spec.predictor &&
      typeof spec.predictor === 'object'
    ) {
      const { predictor } = spec;
      const minReplicas = 'minReplicas' in predictor ? predictor.minReplicas : undefined;
      const maxReplicas = 'maxReplicas' in predictor ? predictor.maxReplicas : undefined;

      if (
        typeof minReplicas === 'number' &&
        typeof maxReplicas === 'number' &&
        minReplicas !== maxReplicas
      ) {
        details.push({
          reason: ExtractionIncompleteReason.AUTOSCALING_NOT_SUPPORTED,
          message: `Autoscaling is configured (minReplicas: ${minReplicas}, maxReplicas: ${maxReplicas}) but is not supported in the wizard form.`,
          fieldName: 'numReplicas',
        });
      }

      // Check for KServe tolerations
      if (
        'tolerations' in predictor &&
        Array.isArray(predictor.tolerations) &&
        predictor.tolerations.length > 0
      ) {
        details.push({
          reason: ExtractionIncompleteReason.TOLERATIONS_NOT_SUPPORTED,
          message: `Tolerations are configured (${predictor.tolerations.length} toleration(s)) but are not supported in the wizard form.`,
          fieldName: 'hardwareProfile',
        });
      }

      // Check for KServe node selectors
      if (
        'nodeSelector' in predictor &&
        predictor.nodeSelector &&
        typeof predictor.nodeSelector === 'object' &&
        Object.keys(predictor.nodeSelector).length > 0
      ) {
        details.push({
          reason: ExtractionIncompleteReason.NODE_SELECTOR_NOT_SUPPORTED,
          message: `Node selectors are configured but are not supported in the wizard form.`,
          fieldName: 'hardwareProfile',
        });
      }
    }
  }

  // Check for LLMD-specific unsupported configurations
  if (deployment.model.kind === 'LLMInferenceService' && 'spec' in deployment.model) {
    const { spec } = deployment.model;
    if (spec && typeof spec === 'object') {
      // Check for multiple containers
      if ('template' in spec && spec.template && typeof spec.template === 'object') {
        const { template } = spec;
        if (
          'containers' in template &&
          Array.isArray(template.containers) &&
          template.containers.length > 1
        ) {
          details.push({
            reason: ExtractionIncompleteReason.MULTIPLE_CONTAINERS_NOT_SUPPORTED,
            message: `Multiple containers (${template.containers.length}) are configured. The wizard form only supports a single main container.`,
            fieldName: 'template.containers',
          });
        }

        // Check for LLMD tolerations
        if (
          'tolerations' in template &&
          Array.isArray(template.tolerations) &&
          template.tolerations.length > 0
        ) {
          details.push({
            reason: ExtractionIncompleteReason.TOLERATIONS_NOT_SUPPORTED,
            message: `Tolerations are configured (${template.tolerations.length} toleration(s)) but are not supported in the wizard form.`,
            fieldName: 'hardwareProfile',
          });
        }

        // Check for LLMD node selectors
        if (
          'nodeSelector' in template &&
          template.nodeSelector &&
          typeof template.nodeSelector === 'object' &&
          Object.keys(template.nodeSelector).length > 0
        ) {
          details.push({
            reason: ExtractionIncompleteReason.NODE_SELECTOR_NOT_SUPPORTED,
            message: `Node selectors are configured but are not supported in the wizard form.`,
            fieldName: 'hardwareProfile',
          });
        }
      }

      // Check for custom router configuration
      if ('router' in spec && spec.router && typeof spec.router === 'object') {
        // Check if router has any non-empty configuration
        const hasCustomRouter = Object.entries(spec.router).some(([, value]) => {
          // Check if the value is not undefined, null, or an empty object
          if (value == null) {
            return false;
          }
          if (typeof value === 'object' && Object.keys(value).length === 0) {
            return false;
          }
          return true;
        });

        if (hasCustomRouter) {
          details.push({
            reason: ExtractionIncompleteReason.CUSTOM_ROUTER_NOT_SUPPORTED,
            message:
              'Custom router configuration is present but is not supported in the wizard form.',
            fieldName: 'router',
          });
        }
      }
    }
  }

  return {
    isComplete: details.length === 0,
    details,
  };
};
