import type {
  WizardField2Extension,
  WizardFieldApplyExtension,
  WizardFieldExtractorExtension,
} from '@odh-dashboard/model-serving/extension-points';
import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import { LLMD_SERVING_ID } from '@odh-dashboard/llmd-serving/extensions';
import type { AiAssetFieldValue } from './modelDeploymentWizard/AiAssetEndpointCheckbox';

// Fix for RHOAIENG-37896: PLUGIN_GEN_AI area ID gates AAA checkbox on genAiStudio feature flag
const PLUGIN_GEN_AI = 'plugin-gen-ai';
const AI_ASSET_ENDPOINT_FIELD_ID = 'gen-ai/save-as-ai-asset-checkbox';

export type ModelServingExtensions =
  | WizardField2Extension<AiAssetFieldValue, undefined, LLMdDeployment>
  | WizardFieldApplyExtension<AiAssetFieldValue, LLMdDeployment>
  | WizardFieldExtractorExtension<AiAssetFieldValue, LLMdDeployment>;

const MODEL_SERVING_EXTENSIONS: ModelServingExtensions[] = [
  {
    type: 'model-serving.deployment/wizard-field2',
    flags: {
      required: [PLUGIN_GEN_AI], // Only show when genAiStudio feature flag is enabled
    },
    properties: {
      platform: PLUGIN_GEN_AI,
      field: () =>
        import('./modelDeploymentWizard/AiAssetEndpointCheckbox').then(
          (m) => m.AiAssetEndpointFieldWizardField,
        ),
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-apply',
    flags: {
      required: [PLUGIN_GEN_AI, LLMD_SERVING_ID],
    },
    properties: {
      fieldId: AI_ASSET_ENDPOINT_FIELD_ID,
      platform: LLMD_SERVING_ID,
      apply: () =>
        import('./modelDeploymentWizard/aiAssetDeploymentTransformer').then(
          (m) => m.applyAiAssetEndpointData,
        ),
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-extractor',
    flags: {
      required: [PLUGIN_GEN_AI, LLMD_SERVING_ID],
    },
    properties: {
      fieldId: AI_ASSET_ENDPOINT_FIELD_ID,
      platform: LLMD_SERVING_ID,
      extract: () =>
        import('./modelDeploymentWizard/aiAssetDeploymentTransformer').then(
          (m) => m.extractAiAssetEndpointData,
        ),
    },
  },
];

export default MODEL_SERVING_EXTENSIONS;
