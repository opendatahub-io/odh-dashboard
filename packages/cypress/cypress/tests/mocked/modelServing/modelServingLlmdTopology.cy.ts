// Type-only import avoids webpack bundling the full module (which triggers scss/svg resolution)
// eslint-disable-next-line import/no-extraneous-dependencies
import { type TopologyType } from '@odh-dashboard/llmd-serving/types';

// Runtime values inlined to avoid value import from llmd-serving/types
const TOPOLOGY_TYPES = {
  SINGLE_NODE: 'workload-single-node' as TopologyType,
  MULTI_NODE: 'workload-multi-node-data-parallel' as TopologyType,
  SINGLE_NODE_DISAGGREGATED: 'workload-single-node-pd' as TopologyType,
  MULTI_NODE_DISAGGREGATED: 'workload-multi-node-data-parallel-pd' as TopologyType,
};
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
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
import {
  HardwareProfileModel,
  LLMInferenceServiceConfigModel,
  LLMInferenceServiceModel,
  ProjectModel,
  SecretModel,
  TemplateModel,
} from '../../../utils/models';
import { modelServingGlobal, modelServingWizard } from '../../../pages/modelServing';

const mockTopologyConfigs = [
  mockLLMInferenceServiceConfigK8sResource({
    name: 'single-node-config',
    displayName: 'Single Node Config',
    topologyType: TOPOLOGY_TYPES.SINGLE_NODE,
  }),
  mockLLMInferenceServiceConfigK8sResource({
    name: 'multi-node-config',
    displayName: 'Multi-node Data Parallel',
    topologyType: TOPOLOGY_TYPES.MULTI_NODE,
  }),
  mockLLMInferenceServiceConfigK8sResource({
    name: 'disabled-config',
    displayName: 'Disabled Config',
    topologyType: TOPOLOGY_TYPES.MULTI_NODE,
    disabled: true,
  }),
];

const initIntercepts = ({
  topologyConfigs = mockTopologyConfigs,
  llmdTopologyConfigsEnabled = true,
}: {
  topologyConfigs?: typeof mockTopologyConfigs;
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
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableNIMModelServing: true,
      disableKServe: false,
      genAiStudio: true,
      modelAsService: true,
      disableLLMd: false,
      llmdTopologyConfigs: llmdTopologyConfigsEnabled,
      vLLMDeploymentOnMaaS: true,
    }),
  );
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
    mockK8sResourceList(topologyConfigs),
  );
  cy.interceptK8sList(
    { model: LLMInferenceServiceConfigModel, ns: 'test-project' },
    mockK8sResourceList([]),
  );
};

describe('Model Serving LLMD Topology', () => {
  describe('topology type field', () => {
    it('should show topology type dropdown when llmdTopologyConfigs flag is enabled and llm-d is active', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      // Select Generative model type
      modelServingWizard.findModelTypeSelect().findSelectOption('Generative AI model').click();
      modelServingWizard.findNextButton().click();

      // Step 2: Model deployment - select llm-d deployment method
      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      // Topology type dropdown should be visible
      modelServingWizard.findTopologyTypeSelect().should('exist').should('be.visible');
    });

    it('should hide topology type dropdown when llmdTopologyConfigs flag is disabled', () => {
      initIntercepts({ llmdTopologyConfigsEnabled: false });
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      modelServingWizard.findModelTypeSelect().findSelectOption('Generative AI model').click();
      modelServingWizard.findNextButton().click();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      // Topology type dropdown should NOT be visible
      modelServingWizard.findTopologyTypeSelect().should('not.exist');
    });

    it('should disable topology types that have no matching configs', () => {
      // Only single-node and multi-node have configs; disaggregated types should be disabled
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      modelServingWizard.findModelTypeSelect().findSelectOption('Generative AI model').click();
      modelServingWizard.findNextButton().click();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      // Open the topology type dropdown
      modelServingWizard.findTopologyTypeSelect().click();

      // Single node and Multi-node should be enabled
      modelServingWizard
        .findTopologyTypeOption(TOPOLOGY_TYPES.SINGLE_NODE)
        .should('not.have.attr', 'aria-disabled', 'true');
      modelServingWizard
        .findTopologyTypeOption(TOPOLOGY_TYPES.MULTI_NODE)
        .should('not.have.attr', 'aria-disabled', 'true');

      // Disaggregated types should be disabled (no configs)
      modelServingWizard
        .findTopologyTypeOption(TOPOLOGY_TYPES.SINGLE_NODE_DISAGGREGATED)
        .should('have.attr', 'aria-disabled', 'true');
      modelServingWizard
        .findTopologyTypeOption(TOPOLOGY_TYPES.MULTI_NODE_DISAGGREGATED)
        .should('have.attr', 'aria-disabled', 'true');
    });

    it('should always enable Single node even without configs', () => {
      initIntercepts({ topologyConfigs: [] });
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      modelServingWizard.findModelTypeSelect().findSelectOption('Generative AI model').click();
      modelServingWizard.findNextButton().click();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      modelServingWizard.findTopologyTypeSelect().click();

      // Single node should always be enabled
      modelServingWizard
        .findTopologyTypeOption(TOPOLOGY_TYPES.SINGLE_NODE)
        .should('not.have.attr', 'aria-disabled', 'true');
    });
  });

  describe('custom topology config field', () => {
    it('should show configs matching the selected topology type', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      modelServingWizard.findModelTypeSelect().findSelectOption('Generative AI model').click();
      modelServingWizard.findNextButton().click();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      // Select Multi-node topology
      modelServingWizard.findTopologyTypeSelect().click();
      modelServingWizard.findTopologyTypeOption(TOPOLOGY_TYPES.MULTI_NODE).click();

      // Custom config dropdown should show only multi-node configs (not disabled ones)
      modelServingWizard.findCustomTopologyConfigSelect().should('exist').click();
      modelServingWizard.findTopologyConfigOption('multi-node-config').should('exist');
      modelServingWizard.findTopologyConfigOption('single-node-config').should('not.exist');
      modelServingWizard.findTopologyConfigOption('disabled-config').should('not.exist');
    });

    it('should reset custom config when topology type changes', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      modelServingWizard.findModelTypeSelect().findSelectOption('Generative AI model').click();
      modelServingWizard.findNextButton().click();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      // Select Multi-node and pick a config
      modelServingWizard.findTopologyTypeSelect().click();
      modelServingWizard.findTopologyTypeOption(TOPOLOGY_TYPES.MULTI_NODE).click();
      modelServingWizard.findCustomTopologyConfigSelect().click();
      modelServingWizard.findTopologyConfigOption('multi-node-config').click();

      // Verify config is selected
      modelServingWizard
        .findCustomTopologyConfigSelect()
        .should('contain.text', 'Multi-node Data Parallel');

      // Change topology type back to Single node
      modelServingWizard.findTopologyTypeSelect().click();
      modelServingWizard.findTopologyTypeOption(TOPOLOGY_TYPES.SINGLE_NODE).click();

      // Config should be reset (single-node has its own configs)
      modelServingWizard
        .findCustomTopologyConfigSelect()
        .should('not.contain.text', 'Multi-node Data Parallel');
    });

    it('should not show custom config dropdown when no configs exist for the selected topology', () => {
      // Only provide single-node configs
      initIntercepts({
        topologyConfigs: [
          mockLLMInferenceServiceConfigK8sResource({
            name: 'single-node-only',
            displayName: 'Single Node Only',
            topologyType: TOPOLOGY_TYPES.SINGLE_NODE,
          }),
        ],
      });
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      modelServingWizard.findModelTypeSelect().findSelectOption('Generative AI model').click();
      modelServingWizard.findNextButton().click();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      // Single node is selected by default and has configs
      modelServingWizard.findCustomTopologyConfigSelect().should('exist');
    });
  });
});
