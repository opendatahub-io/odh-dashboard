import type { CodeRef, Extension } from '@openshift/dynamic-plugin-sdk';
import type {
  CrPathConfig,
  useHardwareProfileConfig,
} from '@odh-dashboard/hardware-profiles/shared';
import type { SupportedModelFormats } from '@odh-dashboard/k8s-core';
import type { Deployment, ExtractionResult } from './index';
import type {
  InitialWizardFormData,
  WizardFormData,
  DeploymentWizardFieldOverride,
  WizardField,
  ModelLocationData,
} from '../src/shared/types/form-data';
import type { ModelTypeFieldData, ModelServerSelectFieldData } from '../src/shared/wizard-fields';
import type { ExternalDataMap } from '../src/components/deploymentWizard/ExternalDataLoader';

export type ModelServingDeploymentFormDataExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.deployment/form-data',
  {
    platform: D['modelServingPlatformId'];
    hardwareProfilePaths: CodeRef<CrPathConfig>;
    extractHardwareProfileConfig: CodeRef<
      (deployment: D) => ExtractionResult<Parameters<typeof useHardwareProfileConfig> | null>
    >;
    extractModelFormat?: CodeRef<(deployment: D) => SupportedModelFormats | null>;
    extractReplicas: CodeRef<(deployment: D) => ExtractionResult<number | null>>;
    extractRuntimeArgs: CodeRef<(deployment: D) => { enabled: boolean; args: string[] } | null>;
    extractEnvironmentVariables: CodeRef<
      (deployment: D) => { enabled: boolean; variables: { name: string; value: string }[] } | null
    >;
    extractModelAvailabilityData: CodeRef<
      (deployment: D) => { saveAsAiAsset: boolean; useCase?: string } | null
    >;
    extractModelLocationData: CodeRef<(deployment: D) => ModelLocationData | null>;
    extractDeploymentStrategy?: CodeRef<
      (deployment: D) => WizardFormData['state']['deploymentStrategy']['data'] | null
    >;
    extractModelType?: CodeRef<(deployment: D) => ModelTypeFieldData | null>;
    extractModelServerTemplate: CodeRef<
      (deployment: D, dashboardNamespace?: string) => { data: ModelServerSelectFieldData } | null
    >;
    validateExtraction?: CodeRef<(deployment: D) => string[]>;
  }
>;
export const isModelServingDeploymentFormDataExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingDeploymentFormDataExtension<D> =>
  extension.type === 'model-serving.deployment/form-data';

/**
 * A function that applies field data to a deployment during the assembly process.
 * This is used by WizardFieldApplyExtension to apply field-specific data to deployments.
 */
export type DeploymentAssemblyFn<D extends Deployment = Deployment> = (deployment: D) => D;
export type DeploymentAssemblyResources<D extends Deployment = Deployment> = {
  model?: D['model'];
  server?: D['server'];
};

export type ModelServingDeploy<D extends Deployment = Deployment> = Extension<
  'model-serving.deployment/deploy',
  {
    platform: D['modelServingPlatformId'];
    isActive:
      | CodeRef<
          (
            wizardData: WizardFormData['state'],
            resources?: DeploymentAssemblyResources<D>,
          ) => boolean
        >
      | true;
    priority: number | 0;
    supportsOverwrite?: boolean;
    deploy: CodeRef<
      (
        wizardData: WizardFormData['state'],
        externalData: ExternalDataMap,
        projectName: string,
        existingDeployment?: D,
        modelResource?: D['model'],
        serverResource?: D['server'],
        serverResourceTemplateName?: string,
        dryRun?: boolean,
        secretName?: string,
        overwrite?: boolean,
        initialWizardData?: InitialWizardFormData,
        applyFieldData?: DeploymentAssemblyFn<D>,
      ) => Promise<D>
    >;
  }
>;
export const isModelServingDeploy = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingDeploy<D> => extension.type === 'model-serving.deployment/deploy';

export type AssembleModelResourceFn<D extends Deployment = Deployment> = (
  wizardData: WizardFormData,
  existingDeployment?: D,
  applyFieldData?: DeploymentAssemblyFn<D>,
  connectionSecretName?: string, // todo remove
) => D;

export type AssembleModelResourceExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.deployment/assemble-model-resource',
  {
    platform: D['modelServingPlatformId'];
    isActive: CodeRef<(wizardData: WizardFormData['state']) => boolean> | true;
    priority: number | 0;
    assemble: CodeRef<AssembleModelResourceFn<D>>;
  }
>;
export const isAssembleModelResourceExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is AssembleModelResourceExtension<D> =>
  extension.type === 'model-serving.deployment/assemble-model-resource';

//// Deployment Wizard Field Extensions ////

// Specific overrides for a field with custom contracts and logic
export type DeploymentWizardFieldOverrideExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.deployment/wizard-field-override',
  {
    platform: D['modelServingPlatformId'];
    field: CodeRef<DeploymentWizardFieldOverride>;
  }
>;
export const isDeploymentWizardFieldOverrideExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is DeploymentWizardFieldOverrideExtension<D> =>
  extension.type === 'model-serving.deployment/wizard-field-override';

// A standalone and dynamic field that conforms to guardrails and validation rules
export type WizardFieldExtension<
  WizardFieldType = WizardField,
  D extends Deployment = Deployment,
> = Extension<
  'model-serving.deployment/wizard-field',
  {
    platform?: D['modelServingPlatformId'];
    field: CodeRef<WizardFieldType>;
  }
>;
export const isWizardFieldExtension = <
  WizardFieldType = WizardField,
  D extends Deployment = Deployment,
>(
  extension: Extension,
): extension is WizardFieldExtension<WizardFieldType, D> =>
  extension.type === 'model-serving.deployment/wizard-field';

export type ModelServingDeploymentTransformExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.deployment/transform',
  {
    platform: D['modelServingPlatformId'];
    transform: CodeRef<(deployment: D, initialWizardData: InitialWizardFormData) => D>;
  }
>;
export const isModelServingDeploymentTransformExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is ModelServingDeploymentTransformExtension<D> =>
  extension.type === 'model-serving.deployment/transform';

/**
 * Extension for applying a wizard field's data to a deployment resource during assembly.
 * This is executed as part of the deployment assembly process, allowing each field to
 * contribute its data to the final deployment resource.
 *
 * The `fieldId` links this apply extension to a specific WizardFieldExtension, ensuring
 * it is only executed when its associated field is active.
 */
export type WizardFieldApplyExtension<T = unknown, D extends Deployment = Deployment> = Extension<
  'model-serving.deployment/wizard-field-apply',
  {
    /** The ID of the WizardField this apply extension is associated with */
    fieldId: string;
    /** The platform this apply extension applies to, or 'all' for platform-agnostic fields */
    platform: D['modelServingPlatformId'] | 'all';
    /**
     * Apply function that modifies the deployment based on the field's data.
     * @param deployment - The deployment resource being assembled
     * @param fieldData - The current data from the associated wizard field
     * @param wizardState - The full wizard form state for context
     * @returns The modified deployment
     */
    apply: CodeRef<(deployment: D, fieldData: T, wizardState: WizardFormData['state']) => D>;
  }
>;
export const isWizardFieldApplyExtension = <T = unknown, D extends Deployment = Deployment>(
  extension: Extension,
): extension is WizardFieldApplyExtension<T, D> =>
  extension.type === 'model-serving.deployment/wizard-field-apply';

/**
 * Extension for extracting initial data from a deployment for a dynamic wizard field.
 * This is used when editing an existing deployment to populate the wizard field with
 * the current values from the deployment resource.
 *
 * The `fieldId` links this extractor to a specific WizardFieldExtension, ensuring the
 * extracted data is provided to the correct field.
 */
export type WizardFieldExtractorExtension<
  T = unknown,
  D extends Deployment = Deployment,
> = Extension<
  'model-serving.deployment/wizard-field-extractor',
  {
    /** The ID of the WizardField this extractor is associated with */
    fieldId: string;
    /** The platform this extractor applies to, or 'all' for platform-agnostic fields */
    platform: D['modelServingPlatformId'] | 'all';
    /**
     * Extract function that retrieves the field's initial data from a deployment.
     * @param deployment - The deployment resource to extract data from
     * @returns The extracted field data, or undefined if not present
     */
    extract: CodeRef<(deployment: D) => T | undefined>;
  }
>;
export const isWizardFieldExtractorExtension = <T = unknown, D extends Deployment = Deployment>(
  extension: Extension,
): extension is WizardFieldExtractorExtension<T, D> =>
  extension.type === 'model-serving.deployment/wizard-field-extractor';

/**
 * Extension for making side-effect resources before a deployment is saved.
 * This runs before the inference service is created, in the same phase as other dry runs,
 * allowing extensions to validate that their associated resources can be created without conflicts.
 *
 * The `fieldId` links this to a specific WizardFieldExtension so it is only
 * executed when that field is active.
 */
export type WizardFieldDeploymentFunctionsExtension<
  T = unknown,
  D extends Deployment = Deployment,
> = Extension<
  'model-serving.deployment/wizard-field-deployment-functions',
  {
    /** The ID of the WizardField this deployment functions extension is associated with */
    fieldId: string;
    /** The platform this deployment functions extension applies to, or 'all' for platform-agnostic fields */
    platform: D['modelServingPlatformId'] | 'all';
    /**
     * Async function that runs before the deployment is saved. Throw to block the deployment.
     *
     * Called twice: first with `dryRun === true` alongside the other dry runs to validate,
     * then again with `dryRun !== true` to perform the actual side effects before the
     * deployment is created.
     *
     * @param fieldData - The current data from the associated wizard field
     * @param wizardState - The full wizard form state for context (includes project name, etc.)
     * @param deployment - The assembled deployment (not yet created, may lack uid/namespace)
     * @param existingDeployment - The deployment before editing, or undefined for a create
     * @param dryRun - True for the validation pass, falsy for the real pass
     */
    preDeploy: null | CodeRef<
      (
        fieldData: T,
        wizardState: WizardFormData['state'],
        deployment: D,
        existingDeployment?: D,
        dryRun?: boolean,
      ) => Promise<D>
    >;
    /**
     * Async function that runs after the deployment is saved.
     *
     * Called twice: first with `dryRun === true` alongside the other dry runs to validate,
     * then again with `dryRun !== true` once the deployment has been created.
     *
     * @param fieldData - The current data from the associated wizard field
     * @param deployedModel - The full deployment resource. On the dry run pass this is the
     * assembled deployment; on the real pass it is the created deployment returned by the
     * deploy method.
     * @param existingDeployment - The deployment before editing, or undefined for a create
     * @param dryRun - True for the validation pass, falsy for the real pass
     */
    postDeploy: null | CodeRef<
      (fieldData: T, deployedModel: D, existingDeployment?: D, dryRun?: boolean) => Promise<void>
    >;
  }
>;
export const isWizardFieldDeploymentFunctionsExtension = <
  T = unknown,
  D extends Deployment = Deployment,
>(
  extension: Extension,
): extension is WizardFieldDeploymentFunctionsExtension<T, D> =>
  extension.type === 'model-serving.deployment/wizard-field-deployment-functions';

/**
 * Extension for contributing per-platform tracking properties to the Model Deployed event.
 * Spokes register this extension so the hub can collect platform-specific analytics data
 * without importing from spoke packages.
 */
export type WizardTrackingPropertiesExtension<D extends Deployment = Deployment> = Extension<
  'model-serving.deployment/tracking-properties',
  {
    platform: D['modelServingPlatformId'];
    /**
     * Extract platform-specific tracking properties from the wizard form state.
     * These are merged into the base Model Deployed / Model Updated event properties.
     */
    getProperties: CodeRef<
      (
        wizardState: WizardFormData['state'],
      ) => Record<string, string | number | boolean | undefined>
    >;
  }
>;
export const isWizardTrackingPropertiesExtension = <D extends Deployment = Deployment>(
  extension: Extension,
): extension is WizardTrackingPropertiesExtension<D> =>
  extension.type === 'model-serving.deployment/tracking-properties';
