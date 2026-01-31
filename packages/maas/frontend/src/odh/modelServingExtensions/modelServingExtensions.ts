import type {
  WizardField2Extension,
  WizardFieldApplyExtension,
  WizardFieldExtractorExtension,
} from '@odh-dashboard/model-serving/extension-points';
import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import { LLMD_SERVING_ID } from '@odh-dashboard/llmd-serving/extensions';
import type {
  MaaSEndpointsExternalData,
  MaaSTierValue,
} from './modelDeploymentWizard/MaaSEndpointCheckbox';
import { MODEL_AS_SERVICE_ID } from '../odhExtensions/odhExtensions';

const MAAS_ENDPOINT_FIELD_ID = 'maas/save-as-maas-checkbox';

export type ModelServingExtensions =
  | WizardField2Extension<MaaSTierValue, MaaSEndpointsExternalData, LLMdDeployment>
  | WizardFieldApplyExtension<MaaSTierValue, LLMdDeployment>
  | WizardFieldExtractorExtension<MaaSTierValue, LLMdDeployment>;

const MODEL_SERVING_EXTENSIONS: ModelServingExtensions[] = [
  {
    type: 'model-serving.deployment/wizard-field2',
    flags: {
      required: [MODEL_AS_SERVICE_ID],
    },
    properties: {
      platform: MODEL_AS_SERVICE_ID,
      field: () =>
        import('./modelDeploymentWizard/MaaSEndpointCheckbox').then(
          (m) => m.MaaSEndpointFieldWizardField,
        ),
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-apply',
    flags: {
      required: [MODEL_AS_SERVICE_ID, LLMD_SERVING_ID],
    },
    properties: {
      fieldId: MAAS_ENDPOINT_FIELD_ID,
      platform: LLMD_SERVING_ID,
      apply: () =>
        import('./modelDeploymentWizard/maasDeploymentTransformer').then(
          (m) => m.applyMaaSEndpointData,
        ),
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-extractor',
    flags: {
      required: [MODEL_AS_SERVICE_ID, LLMD_SERVING_ID],
    },
    properties: {
      fieldId: MAAS_ENDPOINT_FIELD_ID,
      platform: LLMD_SERVING_ID,
      extract: () =>
        import('./modelDeploymentWizard/maasDeploymentTransformer').then(
          (m) => m.extractMaaSEndpointData,
        ),
    },
  },
];

export default MODEL_SERVING_EXTENSIONS;
