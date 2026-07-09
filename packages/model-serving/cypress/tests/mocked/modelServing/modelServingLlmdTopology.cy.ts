import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ConfigType, TopologyType } from '@odh-dashboard/llmd-serving/types';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockGlobalScopedHardwareProfiles } from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import { mockStandardModelServingTemplateK8sResources } from '@odh-dashboard/internal/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
} from '@odh-dashboard/internal/__mocks__/mockConnectionType';
import { mockSecretK8sResource } from '@odh-dashboard/internal/__mocks__/mockSecretK8sResource';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ModelTypeLabel } from '@odh-dashboard/cypress/cypress/utils/modelServingConstants';
import {
  HardwareProfileModel,
  LLMInferenceServiceConfigModel,
  LLMInferenceServiceModel,
  ProjectModel,
  SecretModel,
  TemplateModel,
} from '@odh-dashboard/cypress/cypress/utils/models';
import {
  modelServingGlobal,
  modelServingWizard,
} from '@odh-dashboard/cypress/cypress/pages/modelServing';

const buildTopologyConfig = (
  name: string,
  displayName: string,
  configType: TopologyType,
  disabled?: boolean,
) => mockLLMInferenceServiceConfigK8sResource({ name, displayName, configType, disabled });

const mockTopologyConfigs = [
  buildTopologyConfig('single-node-config', 'Single Node Config', TopologyType.SINGLE_NODE),
  buildTopologyConfig('multi-node-config', 'Multi-node Data Parallel', TopologyType.MULTI_NODE),
  buildTopologyConfig('disabled-config', 'Disabled Config', TopologyType.MULTI_NODE, true),
  buildTopologyConfig(
    'single-node-pd-config',
    'Single Node P/D',
    TopologyType.SINGLE_NODE_DISAGGREGATED,
  ),
  buildTopologyConfig(
    'multi-node-pd-config',
    'Multi-node P/D',
    TopologyType.MULTI_NODE_DISAGGREGATED,
  ),
];

const mockRouterConfigs = [
  mockLLMInferenceServiceConfigK8sResource({
    name: 'managed-scheduler-httproute',
    displayName: 'Managed scheduler with HTTPRoute',
    configType: ConfigType.ROUTER,
  }),
  mockLLMInferenceServiceConfigK8sResource({
    name: 'managed-scheduler',
    displayName: 'Managed scheduler',
    configType: ConfigType.ROUTER,
  }),
];

const initIntercepts = ({
  topologyConfigs = mockTopologyConfigs,
  routerConfigs = mockRouterConfigs,
  llmdTopologyConfigsEnabled = true,
}: {
  topologyConfigs?: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>[];
  routerConfigs?: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>[];
  llmdTopologyConfigsEnabled?: boolean;
} = {}) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
  );
  const config = mockDashboardConfig({
    disableNIMModelServing: true,
    disableKServe: false,
    genAiStudio: true,
    modelAsService: true,
    disableLLMd: false,
    vLLMDeploymentOnMaaS: true,
  });
  config.spec.dashboardConfig.llmdTopologyConfigs = llmdTopologyConfigsEnabled;
  cy.interceptOdh('GET /api/config', config);
  cy.interceptOdh('GET /api/components', null, []);
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockGlobalScopedHardwareProfiles),
  );
  cy.interceptK8sList(
    { model: SecretModel, ns: 'test-project' },
    mockK8sResourceList([
      mockSecretK8sResource({ name: 'test-s3-secret', displayName: 'test-s3-secret' }),
    ]),
  );
  cy.interceptOdh('GET /api/connection-types', [
    mockConnectionTypeConfigMap({
      displayName: 'URI - v1',
      name: 'uri-v1',
      category: ['existing-category'],
      fields: [
        {
          type: 'uri',
          name: 'URI',
          envVar: 'URI',
          required: true,
          properties: {},
        },
      ],
    }),
    mockConnectionTypeConfigMap({
      displayName: 'S3',
      name: 's3',
      category: ['existing-category'],
      fields: mockModelServingFields,
    }),
  ]);
  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(mockStandardModelServingTemplateK8sResources(), {
      namespace: 'opendatahub',
    }),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableKServe: true })]),
  );
  cy.interceptK8sList(LLMInferenceServiceModel, mockK8sResourceList([]));
  cy.interceptK8sList(
    { model: LLMInferenceServiceConfigModel, ns: 'opendatahub' },
    mockK8sResourceList([...topologyConfigs, ...routerConfigs]),
  );
  cy.interceptK8sList(
    { model: LLMInferenceServiceConfigModel, ns: 'test-project' },
    mockK8sResourceList([]),
  );
};

const navigateToModelDeploymentStep = () => {
  modelServingWizard.findModelLocationSelectOption('URI').click();
  modelServingWizard.findUrilocationInput().type('hf://test/model');
  modelServingWizard.findSaveConnectionCheckbox().click();
  modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
  modelServingWizard.findNextButton().click();
};

describe('Model Serving LLMD Topology & Routing', () => {
  describe('topology type field', () => {
    it('should show topology type dropdown when flag enabled and llm-d active', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('topology-type-select').should('exist').should('be.visible');
    });

    it('should hide topology type dropdown when flag disabled', () => {
      initIntercepts({ llmdTopologyConfigsEnabled: false });
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('topology-type-select').should('not.exist');
    });

    it('should disable topology types without configs via aria-disabled', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('topology-type-select').click();

      cy.findByTestId(`topology-type-${TopologyType.SINGLE_NODE}`).should(
        'not.have.class',
        'pf-m-aria-disabled',
      );
      cy.findByTestId(`topology-type-${TopologyType.MULTI_NODE}`).should(
        'not.have.class',
        'pf-m-aria-disabled',
      );
      cy.findByTestId(`topology-type-${TopologyType.SINGLE_NODE_DISAGGREGATED}`).should(
        'not.have.class',
        'pf-m-aria-disabled',
      );
      cy.findByTestId(`topology-type-${TopologyType.MULTI_NODE_DISAGGREGATED}`).should(
        'not.have.class',
        'pf-m-aria-disabled',
      );
    });

    it('should always enable Single node even without configs', () => {
      initIntercepts({ topologyConfigs: [] });
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('topology-type-select').click();

      cy.findByTestId(`topology-type-${TopologyType.SINGLE_NODE}`).should(
        'not.have.class',
        'pf-m-aria-disabled',
      );
    });
  });

  describe('hardware profile visibility', () => {
    it('should show hardware profile for single node topology', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('hardware-profile-select').should('exist');
    });

    it('should hide hardware profile for multi-node topology', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('topology-type-select').click();
      cy.findByTestId(`topology-type-${TopologyType.MULTI_NODE}`).click();

      cy.findByTestId('hardware-profile-select').should('not.exist');
    });

    it('should hide hardware profile for single node disaggregated topology', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('topology-type-select').click();
      cy.findByTestId(`topology-type-${TopologyType.SINGLE_NODE_DISAGGREGATED}`).click();

      cy.findByTestId('hardware-profile-select').should('not.exist');
    });

    it('should hide hardware profile for multi-node disaggregated topology', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('topology-type-select').click();
      cy.findByTestId(`topology-type-${TopologyType.MULTI_NODE_DISAGGREGATED}`).click();

      cy.findByTestId('hardware-profile-select').should('not.exist');
    });

    it('should show hardware profile when switching back to single node', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      cy.findByTestId('topology-type-select').click();
      cy.findByTestId(`topology-type-${TopologyType.MULTI_NODE}`).click();
      cy.findByTestId('hardware-profile-select').should('not.exist');

      cy.findByTestId('topology-type-select').click();
      cy.findByTestId(`topology-type-${TopologyType.SINGLE_NODE}`).click();
      cy.findByTestId('hardware-profile-select').should('exist');
    });
  });

  describe('custom topology config field', () => {
    it('should show configs matching the selected topology type', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      cy.findByTestId('topology-type-select').click();
      cy.findByTestId(`topology-type-${TopologyType.MULTI_NODE}`).click();

      cy.findByTestId('custom-topology-config-select').should('exist').click();
      cy.findByTestId('topology-config-option-multi-node-config').should('exist');
      cy.findByTestId('topology-config-option-single-node-config').should('not.exist');
      cy.findByTestId('topology-config-option-disabled-config').should('not.exist');
    });

    it('should reset custom config when topology type changes', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      // Select Multi-node and pick a config
      cy.findByTestId('topology-type-select').click();
      cy.findByTestId(`topology-type-${TopologyType.MULTI_NODE}`).click();
      cy.findByTestId('custom-topology-config-select').click();
      cy.findByTestId('topology-config-option-multi-node-config').click();

      cy.findByTestId('custom-topology-config-select').should(
        'contain.text',
        'Multi-node Data Parallel',
      );

      // Switch to Single node — config should reset
      cy.findByTestId('topology-type-select').click();
      cy.findByTestId(`topology-type-${TopologyType.SINGLE_NODE}`).click();

      cy.findByTestId('custom-topology-config-select').should(
        'not.contain.text',
        'Multi-node Data Parallel',
      );
    });
  });

  describe('advanced routing field', () => {
    it('should show routing dropdown with default selected when llm-d active and flag enabled', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();
      modelServingWizard.navigateToAdvancedSettings();

      cy.findByTestId('routing-config-select').should('exist');
      cy.findByTestId('routing-config-select').should('contain.text', 'Default optimized routing');
    });

    it('should hide routing dropdown when flag disabled', () => {
      initIntercepts({ llmdTopologyConfigsEnabled: false });
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.findModelDeploymentNameInput().type('test-model');
      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.findByTestId('routing-config-select').should('not.exist');
    });

    it('should disable routing dropdown when no router configs exist', () => {
      initIntercepts({ topologyConfigs: [], routerConfigs: [] });
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.findModelDeploymentNameInput().type('test-model');
      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.findByTestId('routing-config-select').should('exist');
      cy.findByTestId('routing-config-select').should('contain.text', 'Default optimized routing');
      cy.findByTestId('routing-config-select').should('be.disabled');
    });

    it('should show router configs alongside default option in dropdown', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();
      modelServingWizard.navigateToAdvancedSettings();

      cy.findByTestId('routing-config-select').click();
      cy.findByTestId('routing-config-option-default').should('exist');
      cy.findByTestId('routing-config-option-managed-scheduler-httproute').should('exist');
      cy.findByTestId('routing-config-option-managed-scheduler').should('exist');
    });

    it('should allow selecting a custom routing config', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();
      modelServingWizard.navigateToAdvancedSettings();

      cy.findByTestId('routing-config-select').click();
      cy.findByTestId('routing-config-option-managed-scheduler-httproute').click();
      cy.findByTestId('routing-config-select').should(
        'contain.text',
        'Managed scheduler with HTTPRoute',
      );
    });

    it('should revert to default when default option is re-selected', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();
      modelServingWizard.navigateToAdvancedSettings();

      // Select a custom config
      cy.findByTestId('routing-config-select').click();
      cy.findByTestId('routing-config-option-managed-scheduler-httproute').click();
      cy.findByTestId('routing-config-select').should(
        'contain.text',
        'Managed scheduler with HTTPRoute',
      );

      // Switch back to default
      cy.findByTestId('routing-config-select').click();
      cy.findByTestId('routing-config-option-default').click();
      cy.findByTestId('routing-config-select').should('contain.text', 'Default optimized routing');
    });
  });
});
