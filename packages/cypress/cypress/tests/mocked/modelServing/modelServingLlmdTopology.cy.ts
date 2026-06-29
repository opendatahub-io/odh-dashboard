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
import { ModelTypeLabel } from '@odh-dashboard/model-serving/components/deploymentWizard/types';
import {
  HardwareProfileModel,
  LLMInferenceServiceConfigModel,
  LLMInferenceServiceModel,
  ProjectModel,
  SecretModel,
  TemplateModel,
} from '../../../utils/models';
import { modelServingGlobal, modelServingWizard } from '../../../pages/modelServing';

const TOPOLOGY = {
  SINGLE_NODE: 'workload-single-node',
  MULTI_NODE: 'workload-multi-node-data-parallel',
  SINGLE_NODE_PD: 'workload-single-node-pd',
  MULTI_NODE_PD: 'workload-multi-node-data-parallel-pd',
};

const mockTopologyConfigs = [
  mockLLMInferenceServiceConfigK8sResource({
    name: 'single-node-config',
    displayName: 'Single Node Config',
    topologyType: TOPOLOGY.SINGLE_NODE,
  }),
  mockLLMInferenceServiceConfigK8sResource({
    name: 'multi-node-config',
    displayName: 'Multi-node Data Parallel',
    topologyType: TOPOLOGY.MULTI_NODE,
  }),
  mockLLMInferenceServiceConfigK8sResource({
    name: 'disabled-config',
    displayName: 'Disabled Config',
    topologyType: TOPOLOGY.MULTI_NODE,
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

const navigateToModelDeploymentStep = () => {
  modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
  modelServingWizard.findUrilocationInput().type('hf://test/model');
  modelServingWizard.findSaveConnectionCheckbox().click();
  modelServingWizard.findNextButton().click();
};

describe('Model Serving LLMD Topology', () => {
  describe('topology type field', () => {
    it('should show topology type dropdown when llmdTopologyConfigs flag is enabled and llm-d is active', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      modelServingWizard.findTopologyTypeSelect().should('exist').should('be.visible');
    });

    it('should hide topology type dropdown when llmdTopologyConfigs flag is disabled', () => {
      initIntercepts({ llmdTopologyConfigsEnabled: false });
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      modelServingWizard.findTopologyTypeSelect().should('not.exist');
    });

    it('should disable topology types that have no matching configs', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      modelServingWizard.findTopologyTypeSelect().click();

      modelServingWizard
        .findTopologyTypeOption(TOPOLOGY.SINGLE_NODE)
        .should('not.have.attr', 'aria-disabled', 'true');
      modelServingWizard
        .findTopologyTypeOption(TOPOLOGY.MULTI_NODE)
        .should('not.have.attr', 'aria-disabled', 'true');

      modelServingWizard
        .findTopologyTypeOption(TOPOLOGY.SINGLE_NODE_PD)
        .should('have.attr', 'aria-disabled', 'true');
      modelServingWizard
        .findTopologyTypeOption(TOPOLOGY.MULTI_NODE_PD)
        .should('have.attr', 'aria-disabled', 'true');
    });

    it('should always enable Single node even without configs', () => {
      initIntercepts({ topologyConfigs: [] });
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      modelServingWizard.findTopologyTypeSelect().click();

      modelServingWizard
        .findTopologyTypeOption(TOPOLOGY.SINGLE_NODE)
        .should('not.have.attr', 'aria-disabled', 'true');
    });
  });

  describe('custom topology config field', () => {
    it('should show configs matching the selected topology type', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      modelServingWizard.findTopologyTypeSelect().click();
      modelServingWizard.findTopologyTypeOption(TOPOLOGY.MULTI_NODE).click();

      modelServingWizard.findCustomTopologyConfigSelect().should('exist').click();
      modelServingWizard.findTopologyConfigOption('multi-node-config').should('exist');
      modelServingWizard.findTopologyConfigOption('single-node-config').should('not.exist');
      modelServingWizard.findTopologyConfigOption('disabled-config').should('not.exist');
    });

    it('should reset custom config when topology type changes', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      modelServingWizard.findTopologyTypeSelect().click();
      modelServingWizard.findTopologyTypeOption(TOPOLOGY.MULTI_NODE).click();
      modelServingWizard.findCustomTopologyConfigSelect().click();
      modelServingWizard.findTopologyConfigOption('multi-node-config').click();

      modelServingWizard
        .findCustomTopologyConfigSelect()
        .should('contain.text', 'Multi-node Data Parallel');

      modelServingWizard.findTopologyTypeSelect().click();
      modelServingWizard.findTopologyTypeOption(TOPOLOGY.SINGLE_NODE).click();

      modelServingWizard
        .findCustomTopologyConfigSelect()
        .should('not.contain.text', 'Multi-node Data Parallel');
    });

    it('should show disabled field with warning when no configs exist for the selected topology', () => {
      initIntercepts({ topologyConfigs: [] });
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      modelServingWizard.findCustomTopologyConfigSelect().should('exist').should('be.disabled');
    });
  });
});
