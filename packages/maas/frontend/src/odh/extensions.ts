import type {
  WizardField2Extension,
  WizardFieldApplyExtension,
  WizardFieldExtractorExtension,
} from '@odh-dashboard/model-serving/extension-points';
import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { LLMD_SERVING_ID } from '@odh-dashboard/llmd-serving/extensions';
import type { MaaSTierValue } from './modelDeploymentWizard/MaaSEndpointCheckbox';

const MODEL_AS_SERVICE = 'modelAsService';
const MAAS_ENDPOINT_FIELD_ID = 'maas/save-as-maas-checkbox';

const extensions: (
  | NavExtension
  | RouteExtension
  | AreaExtension
  | WizardField2Extension<MaaSTierValue>
  | WizardFieldApplyExtension<MaaSTierValue, LLMdDeployment>
  | WizardFieldExtractorExtension<MaaSTierValue, LLMdDeployment>
)[] = [
  {
    type: 'app.area',
    properties: {
      id: MODEL_AS_SERVICE,
      featureFlags: ['modelAsService'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [MODEL_AS_SERVICE],
    },
    properties: {
      id: 'maas-tiers-view',
      title: 'Tiers',
      href: '/maas/tiers',
      section: 'settings',
      path: '/maas/tiers/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [MODEL_AS_SERVICE],
    },
    properties: {
      path: '/maas/*',
      component: () => import('./MaaSWrapper'),
    },
  },
  {
    type: 'model-serving.deployment/wizard-field2',
    flags: {
      required: [MODEL_AS_SERVICE],
    },
    properties: {
      platform: MODEL_AS_SERVICE,
      field: () =>
        import('./modelDeploymentWizard/MaaSEndpointCheckbox').then(
          (m) => m.MaaSEndpointFieldWizardField,
        ),
    },
  },
  {
    type: 'model-serving.deployment/wizard-field-apply',
    flags: {
      required: [MODEL_AS_SERVICE, LLMD_SERVING_ID],
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
      required: [MODEL_AS_SERVICE, LLMD_SERVING_ID],
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

export default extensions;
