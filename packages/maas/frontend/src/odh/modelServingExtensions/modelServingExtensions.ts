import type {
  WizardField2Extension,
  WizardFieldApplyExtension,
  WizardFieldExtractorExtension,
  WizardFieldDeploymentFunctionsExtension,
} from '@odh-dashboard/model-serving/extension-points';
import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import { LLMD_SERVING_ID } from '@odh-dashboard/llmd-serving/extensions';
import { MODEL_AS_SERVICE_ID } from '~/odh/odhExtensions/odhExtensions';
import type { MaaSFieldType, MaaSFieldValue } from './modelDeploymentWizard/MaaSEndpointCheckbox';

const MAAS_ENDPOINT_FIELD_ID = 'maas/save-as-maas-checkbox';

export type ModelServingExtensions =
  | WizardField2Extension<MaaSFieldType, LLMdDeployment>
  | WizardFieldApplyExtension<MaaSFieldValue, LLMdDeployment>
  | WizardFieldExtractorExtension<MaaSFieldValue, LLMdDeployment>
  | WizardFieldDeploymentFunctionsExtension<MaaSFieldValue, LLMdDeployment>;

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
  {
    type: 'model-serving.deployment/wizard-field-deployment-functions',
    flags: {
      required: [MODEL_AS_SERVICE_ID, LLMD_SERVING_ID],
    },
    properties: {
      fieldId: MAAS_ENDPOINT_FIELD_ID,
      platform: LLMD_SERVING_ID,
      preDeploy: () =>
        import('./modelDeploymentWizard/maas-model-ref').then((m) => m.preDeployMaaSModelRef),
      postDeploy: () =>
        import('./modelDeploymentWizard/maas-model-ref').then((m) => m.postDeployMaaSModelRef),
    },
  },
];

export default MODEL_SERVING_EXTENSIONS;
