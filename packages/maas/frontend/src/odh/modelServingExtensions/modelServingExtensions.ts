import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import {
  WizardFieldApplyExtension,
  WizardFieldDeploymentFunctionsExtension,
  WizardFieldExtension,
  WizardFieldExtractorExtension,
} from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import { ModelServingDeploymentsBannerExtension } from '@odh-dashboard/model-serving/extension-points';
import { MODEL_AS_SERVICE_ID } from '~/odh/odhExtensions/odhExtensions';
import type { MaaSFieldType, MaaSFieldValue } from './modelDeploymentWizard/MaaSEndpointCheckbox';

const MAAS_ENDPOINT_FIELD_ID = 'maas/save-as-maas-checkbox';

export type ModelServingExtensions =
  | WizardFieldExtension<MaaSFieldType, LLMdDeployment>
  | WizardFieldApplyExtension<MaaSFieldValue, LLMdDeployment>
  | WizardFieldExtractorExtension<MaaSFieldValue, LLMdDeployment>
  | WizardFieldDeploymentFunctionsExtension<MaaSFieldValue, LLMdDeployment>
  | ModelServingDeploymentsBannerExtension;

const MODEL_SERVING_EXTENSIONS: ModelServingExtensions[] = [
  {
    type: 'model-serving.deployment/wizard-field',
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
      required: [MODEL_AS_SERVICE_ID, SupportedArea.LLMD_SERVING],
    },
    properties: {
      fieldId: MAAS_ENDPOINT_FIELD_ID,
      platform: SupportedArea.LLMD_SERVING,
      apply: () =>
        import('./modelDeploymentWizard/maasDeploymentTransformer').then(
          (m) => m.applyMaaSEndpointData,
        ),
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-extractor',
    flags: {
      required: [MODEL_AS_SERVICE_ID, SupportedArea.LLMD_SERVING],
    },
    properties: {
      fieldId: MAAS_ENDPOINT_FIELD_ID,
      platform: SupportedArea.LLMD_SERVING,
      extract: () =>
        import('./modelDeploymentWizard/maasDeploymentTransformer').then(
          (m) => m.extractMaaSEndpointData,
        ),
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-deployment-functions',
    flags: {
      required: [MODEL_AS_SERVICE_ID, SupportedArea.LLMD_SERVING],
    },
    properties: {
      fieldId: MAAS_ENDPOINT_FIELD_ID,
      platform: SupportedArea.LLMD_SERVING,
      preDeploy: () =>
        import('./modelDeploymentWizard/maas-model-ref').then((m) => m.preDeployMaaSModelRef),
      postDeploy: () =>
        import('./modelDeploymentWizard/maas-model-ref').then((m) => m.postDeployMaaSModelRef),
    },
  },
  {
    type: 'model-serving.deployments/banner',
    flags: {
      required: [MODEL_AS_SERVICE_ID],
    },
    properties: {
      id: 'maas-published-post-deploy-alert',
      component: () =>
        import('./MaaSPublishedPostDeployAlert').then(
          (m) => m.MaaSPublishedInternalPostDeployAlert,
        ),
    },
  },
];

export default MODEL_SERVING_EXTENSIONS;
