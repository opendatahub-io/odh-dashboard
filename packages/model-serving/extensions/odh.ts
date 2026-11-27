import type {
  OverviewSectionExtension,
  ProjectDetailsTab,
  RouteExtension,
  TabRoutePageExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type {
  WizardFieldExtension,
  WizardFieldApplyExtension,
  WizardFieldExtractorExtension,
} from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import type { ModelCapabilitiesFieldType } from '../src/components/deploymentWizard/fields/modelCapabilities/ModelCapabilitiesField';

const ADMIN_USER = 'ADMIN_USER';

// Base path of the Model deployment settings tabbed page.
const MODEL_DEPLOYMENT_SETTINGS_PATH =
  '/settings/model-resources-operations/model-deployment-settings';

const createRedirectComponent = (args: { from: string; to: string }) => () =>
  import('@odh-dashboard/plugin-core/routing').then((module) => ({
    default: () => module.buildV2RedirectElement(args),
  }));

const modelCapabilitiesFieldExtension: WizardFieldExtension<ModelCapabilitiesFieldType> = {
  type: 'model-serving.deployment/wizard-field',
  properties: {
    field: () =>
      import(
        '../src/components/deploymentWizard/fields/modelCapabilities/ModelCapabilitiesField'
      ).then((m) => m.ModelCapabilitiesFieldWizardField),
  },
  flags: {
    required: [SupportedArea.MODEL_CAPABILITIES],
  },
};

const modelCapabilitiesApply: WizardFieldApplyExtension<string[]> = {
  type: 'model-serving.deployment/wizard-field-apply',
  properties: {
    fieldId: 'modelCapabilities',
    platform: 'all',
    apply: () =>
      import(
        '../src/components/deploymentWizard/fields/modelCapabilities/modelCapabilitiesApplyExtract'
      ).then((m) => m.applyModelCapabilities),
  },
  flags: {
    required: [SupportedArea.MODEL_CAPABILITIES],
  },
};

const modelCapabilitiesExtract: WizardFieldExtractorExtension<string[]> = {
  type: 'model-serving.deployment/wizard-field-extractor',
  properties: {
    fieldId: 'modelCapabilities',
    platform: 'all',
    extract: () =>
      import(
        '../src/components/deploymentWizard/fields/modelCapabilities/modelCapabilitiesApplyExtract'
      ).then((m) => m.extractModelCapabilities),
  },
  flags: {
    required: [SupportedArea.MODEL_CAPABILITIES],
  },
};

export const projectExtensions: (ProjectDetailsTab | OverviewSectionExtension)[] = [
  {
    type: 'app.project-details/tab',
    properties: {
      id: 'model-server', // same value as ProjectSectionID.MODEL_SERVER
      title: 'Deployments',
      component: () => import('../src/ModelsProjectDetailsTab'),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
  {
    type: 'app.project-details/overview-section',
    properties: {
      id: 'model-server',
      title: 'Serve Models',
      component: () => import('../src/ServeModelsSection'),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
];

export const legacyRouteExtensions: RouteExtension[] = [
  // Redirects from old URLs
  {
    type: 'app.route',
    properties: {
      path: '/ai-hub/deployments/:namespace?/*',
      component: createRedirectComponent({
        from: '/ai-hub/deployments/:namespace?/*',
        to: '/ai-hub/models/deployments/:namespace?/*',
      }),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/modelServing/:namespace?/*',
      component: createRedirectComponent({
        from: '/modelServing/:namespace?/*',
        to: '/ai-hub/models/deployments/:namespace?/*',
      }),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
];

export const modelCapabilitiesExtensions: (
  | WizardFieldExtension<ModelCapabilitiesFieldType>
  | WizardFieldApplyExtension<string[]>
  | WizardFieldExtractorExtension<string[]>
)[] = [modelCapabilitiesFieldExtension, modelCapabilitiesApply, modelCapabilitiesExtract];

export const settingsExtensions: (TabRoutePageExtension | TabRouteTabExtension)[] = [
  // Model deployment settings tabbed page
  {
    type: 'app.tab-route/page',
    flags: {
      required: [SupportedArea.MODEL_SERVING, ADMIN_USER],
    },
    properties: {
      id: 'model-deployment-settings',
      title: 'Model deployment settings',
      href: MODEL_DEPLOYMENT_SETTINGS_PATH,
      breadcrumbTabId: 'general-settings',
      path: `${MODEL_DEPLOYMENT_SETTINGS_PATH}/*`,
      section: 'settings-model-resources-and-operations',
      group: '1_model-resources',
    },
  },
  // General settings tab in the Model deployment settings page
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [SupportedArea.MODEL_SERVING, ADMIN_USER],
    },
    properties: {
      pageId: 'model-deployment-settings',
      id: 'general-settings',
      title: 'General settings',
      component: () => import('../src/components/settings/GeneralSettingsTab'),
      group: '1_general',
    },
  },
];
