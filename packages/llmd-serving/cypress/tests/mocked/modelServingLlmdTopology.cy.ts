import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceK8sResource';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  ConfigType,
  TopologyType,
  TOPOLOGY_TYPE_ANNOTATION,
  TOPOLOGY_CONFIG_REF_ANNOTATION,
  ROUTING_CONFIG_REF_ANNOTATION,
} from '@odh-dashboard/llmd-serving/types';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mock200Status } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockGlobalScopedHardwareProfiles } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockStandardModelServingTemplateK8sResources } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
} from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
import {
  mockSecretK8sResource,
  mockURISecretK8sResource,
} from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
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
  modelServingWizardEdit,
} from '@odh-dashboard/cypress/cypress/pages/modelServing';
import { deleteModal } from '@odh-dashboard/cypress/cypress/pages/components/DeleteModal';

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
}: {
  topologyConfigs?: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>[];
  routerConfigs?: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>[];
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
    llmdTemplates: true,
    vLLMDeploymentOnMaaS: true,
  });
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
    it('hardware profile visibility', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      cy.step('should show hardware profile for single node topology');
      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('hardware-profile-select').should('exist');

      cy.step('should hide hardware profile for multi-node topology');
      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('topology-type-select').click();
      cy.findByTestId(`topology-type-${TopologyType.MULTI_NODE}`).click();

      cy.findByTestId('hardware-profile-select').should('not.exist');

      cy.step('should hide hardware profile for single node disaggregated topology');
      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('topology-type-select').click();
      cy.findByTestId(`topology-type-${TopologyType.SINGLE_NODE_DISAGGREGATED}`).click();

      cy.findByTestId('hardware-profile-select').should('not.exist');

      cy.step('should hide hardware profile for multi-node disaggregated topology');
      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('topology-type-select').click();
      cy.findByTestId(`topology-type-${TopologyType.MULTI_NODE_DISAGGREGATED}`).click();

      cy.findByTestId('hardware-profile-select').should('not.exist');

      cy.step('should show hardware profile again when switching back to single node topology');
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

  describe('routing field (step 2 - model deployment)', () => {
    it('should show routing dropdown with default selected when llm-d active', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('routing-config-select').should('exist');
      cy.findByTestId('routing-config-select').should('contain.text', 'Default optimized routing');
    });

    it('should disable routing dropdown when no router configs exist', () => {
      initIntercepts({ topologyConfigs: [], routerConfigs: [] });
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      cy.findByTestId('routing-config-select').should('exist');
      cy.findByTestId('routing-config-select').should('contain.text', 'Default optimized routing');
      cy.findByTestId('routing-config-select').should('be.disabled');
    });

    it('should show router configs alongside default option in dropdown', () => {
      initIntercepts();
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
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

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
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

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      cy.findByTestId('routing-config-select').click();
      cy.findByTestId('routing-config-option-managed-scheduler-httproute').click();
      cy.findByTestId('routing-config-select').should(
        'contain.text',
        'Managed scheduler with HTTPRoute',
      );

      cy.findByTestId('routing-config-select').click();
      cy.findByTestId('routing-config-option-default').click();
      cy.findByTestId('routing-config-select').should('contain.text', 'Default optimized routing');
    });
  });

  describe('edit flow — config resolution', () => {
    const initEditIntercepts = ({
      topologyConfigs = mockTopologyConfigs,
      routerConfigs = mockRouterConfigs,
      existingDeployment,
    }: {
      topologyConfigs?: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>[];
      routerConfigs?: ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>[];
      existingDeployment: ReturnType<typeof mockLLMInferenceServiceK8sResource>;
    }) => {
      initIntercepts({ topologyConfigs, routerConfigs });
      cy.interceptK8sList(
        { model: SecretModel, ns: 'test-project' },
        mockK8sResourceList([mockURISecretK8sResource({ namespace: 'test-project' })]),
      );
      cy.interceptK8sList(
        { model: LLMInferenceServiceModel, ns: 'test-project' },
        mockK8sResourceList([
          {
            ...existingDeployment,
            metadata: {
              ...existingDeployment.metadata,
              annotations: {
                ...existingDeployment.metadata.annotations,
                'opendatahub.io/connections': 'test-uri-secret',
              },
            },
          },
        ]),
      );
      cy.intercept('PUT', '**/llminferenceservices/**', (req) => {
        req.reply({ statusCode: 200, body: req.body });
      }).as('updateLLMInferenceService');
    };

    const openEditWizardModelDeploymentStep = (displayName: string) => {
      modelServingGlobal.visit('test-project');
      modelServingGlobal.getModelRow(displayName).findKebabAction('Edit').click();
      modelServingWizardEdit.findNextButton().should('be.enabled').click();
    };

    it('should pre-select topology config and routing config from existing deployment', () => {
      initEditIntercepts({
        existingDeployment: mockLLMInferenceServiceK8sResource({
          additionalAnnotations: {
            [TOPOLOGY_TYPE_ANNOTATION]: TopologyType.MULTI_NODE,
            [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'multi-node-config',
            [ROUTING_CONFIG_REF_ANNOTATION]: 'managed-scheduler',
          },
          baseRefs: [{ name: 'multi-node-config' }, { name: 'managed-scheduler' }],
        }),
      });

      openEditWizardModelDeploymentStep('Test LLM Inference Service');

      cy.findByTestId('topology-type-select').should('contain.text', 'Multi-node');
      cy.findByTestId('custom-topology-config-select').should(
        'contain.text',
        'Multi-node Data Parallel',
      );
      cy.findByTestId('routing-config-select').should('contain.text', 'Managed scheduler');
      modelServingWizardEdit.findNextButton().should('be.enabled');
    });

    it('should fall back to default routing when routing config has been deleted', () => {
      initEditIntercepts({
        existingDeployment: mockLLMInferenceServiceK8sResource({
          additionalAnnotations: {
            [TOPOLOGY_TYPE_ANNOTATION]: TopologyType.SINGLE_NODE,
            [ROUTING_CONFIG_REF_ANNOTATION]: 'deleted-router',
          },
          baseRefs: [{ name: 'deleted-router' }],
        }),
      });

      openEditWizardModelDeploymentStep('Test LLM Inference Service');

      cy.findByTestId('routing-config-select').should('contain.text', 'Default optimized routing');
      modelServingWizardEdit.findNextButton().should('be.enabled');
    });

    it('should show warning when routing config is incompatible with topology type', () => {
      const incompatibleRouterConfig = mockLLMInferenceServiceConfigK8sResource({
        name: 'multi-only-router',
        displayName: 'Multi-only Router',
        configType: ConfigType.ROUTER,
        supportedTopologies: [TopologyType.MULTI_NODE],
      });

      initEditIntercepts({
        routerConfigs: [...mockRouterConfigs, incompatibleRouterConfig],
        existingDeployment: mockLLMInferenceServiceK8sResource({
          additionalAnnotations: {
            [TOPOLOGY_TYPE_ANNOTATION]: TopologyType.SINGLE_NODE,
            [ROUTING_CONFIG_REF_ANNOTATION]: 'multi-only-router',
          },
          baseRefs: [{ name: 'multi-only-router' }],
        }),
      });

      openEditWizardModelDeploymentStep('Test LLM Inference Service');

      cy.findByTestId('routing-config-select').should('contain.text', 'Multi-only Router');
      cy.findByText(/is not compatible with the current topology type/).should('exist');
      modelServingWizardEdit.findNextButton().should('be.enabled');
    });

    it('should retain selection of topology config on edit if it is incompatible with topology type', () => {
      initEditIntercepts({
        existingDeployment: mockLLMInferenceServiceK8sResource({
          additionalAnnotations: {
            [TOPOLOGY_TYPE_ANNOTATION]: TopologyType.SINGLE_NODE,
            [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'multi-node-config',
          },
          baseRefs: [{ name: 'multi-node-config' }],
        }),
      });

      openEditWizardModelDeploymentStep('Test LLM Inference Service');

      cy.findByTestId('custom-topology-config-select').should(
        'contain.text',
        'Multi-node Data Parallel',
      );
      modelServingWizardEdit.findNextButton().should('be.enabled');
    });

    it('should auto-select another config when topology config has been deleted', () => {
      initEditIntercepts({
        existingDeployment: mockLLMInferenceServiceK8sResource({
          additionalAnnotations: {
            [TOPOLOGY_TYPE_ANNOTATION]: TopologyType.MULTI_NODE,
            [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'deleted-topo-config',
          },
          baseRefs: [{ name: 'deleted-topo-config' }],
        }),
      });

      openEditWizardModelDeploymentStep('Test LLM Inference Service');

      cy.findByTestId('topology-type-select').should('contain.text', 'Multi-node');
      cy.findByTestId('custom-topology-config-select').should(
        'contain.text',
        'Multi-node Data Parallel',
      );
      modelServingWizardEdit.findNextButton().should('be.enabled');
    });

    it('should allow switching to single-node after deleted topology config is resolved', () => {
      initEditIntercepts({
        existingDeployment: mockLLMInferenceServiceK8sResource({
          additionalAnnotations: {
            [TOPOLOGY_TYPE_ANNOTATION]: TopologyType.MULTI_NODE,
            [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'deleted-topo-config',
          },
          baseRefs: [{ name: 'deleted-topo-config' }],
        }),
      });

      openEditWizardModelDeploymentStep('Test LLM Inference Service');

      cy.findByTestId('topology-type-select').click();
      cy.findByTestId('topology-type-workload-single-node').click();
      cy.findByTestId('topology-type-select').should('contain.text', 'Single node');
      cy.findByTestId('custom-topology-config-select').should(
        'contain.text',
        'Single node (default)',
      );
      modelServingWizardEdit.findNextButton().should('be.enabled');
    });
  });

  describe('Deploy configs', () => {
    const initDeployIntercepts = (deploymentName: string) => {
      cy.interceptK8s(
        'POST',
        { model: LLMInferenceServiceConfigModel, ns: 'test-project' },
        (req) => {
          req.reply({ statusCode: 200, body: req.body });
        },
      ).as('createLLMInferenceServiceConfig');
      cy.interceptK8s(
        'POST',
        { model: LLMInferenceServiceModel, ns: 'test-project' },
        {
          statusCode: 200,
          body: mockLLMInferenceServiceK8sResource({ name: deploymentName }),
        },
      ).as('createLLMInferenceService');
    };

    // Step 3 (advanced options) — disable token auth to avoid needing auth resource intercepts
    const completeWizard = () => {
      modelServingWizard.findTokenAuthenticationCheckbox().click();
      modelServingWizard.findNextButton().should('be.enabled').click();
      modelServingWizard.findSubmitButton().should('be.enabled').click();
    };

    it('should not create new resources when using "Single node (default) selection', () => {
      const deploymentName = 'test-single-node-default';
      initIntercepts();
      initDeployIntercepts(deploymentName);

      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      modelServingWizard.findModelDeploymentNameInput().type(deploymentName);

      // Defaults: Single node topology with the pre-installed "Single node (default)" config
      cy.findByTestId('topology-type-select').should('contain.text', 'Single node');
      cy.findByTestId('custom-topology-config-select').should(
        'contain.text',
        'Single node (default)',
      );
      modelServingWizard.findNextButton().should('be.enabled').click();

      completeWizard();

      // Dry run — no topology config ref is recorded on the deployment
      cy.wait('@createLLMInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body.metadata.annotations).to.have.property(
          TOPOLOGY_TYPE_ANNOTATION,
          TopologyType.SINGLE_NODE,
        );
        expect(interception.request.body.metadata.annotations).to.not.have.property(
          TOPOLOGY_CONFIG_REF_ANNOTATION,
        );
        expect(interception.request.body.spec.baseRefs ?? []).to.have.length(0);
      });

      // Actual request
      cy.wait('@createLLMInferenceService').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
        expect(interception.request.body.metadata.annotations).to.not.have.property(
          TOPOLOGY_CONFIG_REF_ANNOTATION,
        );
        expect(interception.request.body.spec.baseRefs ?? []).to.have.length(0);
      });

      cy.get('@createLLMInferenceService.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });
      // No local config copy is created for the default single node configuration
      cy.get('@createLLMInferenceServiceConfig.all').should('have.length', 0);
    });

    it('should create new resources when selecting custom topology', () => {
      const deploymentName = 'test-custom-topology';
      const localConfigName = `${deploymentName}-multi-node-config`;
      initIntercepts();
      initDeployIntercepts(deploymentName);

      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      navigateToModelDeploymentStep();

      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      modelServingWizard.findModelDeploymentNameInput().type(deploymentName);

      cy.findByTestId('topology-type-select').click();
      cy.findByTestId(`topology-type-${TopologyType.MULTI_NODE}`).click();
      cy.findByTestId('custom-topology-config-select').click();
      cy.findByTestId('topology-config-option-multi-node-config').click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      completeWizard();

      // Dry run — a local copy of the selected config is created in the project namespace first
      cy.wait('@createLLMInferenceServiceConfig').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body.metadata.name).to.equal(localConfigName);
        expect(interception.request.body.metadata.namespace).to.equal('test-project');
        expect(interception.request.body.metadata.annotations).to.include({
          'openshift.io/display-name': 'Multi-node Data Parallel (Local Copy)',
        });
        expect(interception.request.body.metadata.labels).to.include({
          'opendatahub.io/config-type': TopologyType.MULTI_NODE,
        });
        expect(interception.request.body.metadata.labels).to.not.have.property(
          'opendatahub.io/dashboard',
        );
      });
      cy.wait('@createLLMInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body.metadata.annotations).to.include({
          [TOPOLOGY_TYPE_ANNOTATION]: TopologyType.MULTI_NODE,
          [TOPOLOGY_CONFIG_REF_ANNOTATION]: localConfigName,
        });
        expect(interception.request.body.spec.baseRefs).to.deep.include({ name: localConfigName });
      });

      // Actual requests
      cy.wait('@createLLMInferenceServiceConfig').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
        expect(interception.request.body.metadata.name).to.equal(localConfigName);
      });
      cy.wait('@createLLMInferenceService').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
        expect(interception.request.body.metadata.annotations).to.include({
          [TOPOLOGY_CONFIG_REF_ANNOTATION]: localConfigName,
        });
        expect(interception.request.body.spec.baseRefs).to.deep.include({ name: localConfigName });
      });

      cy.get('@createLLMInferenceServiceConfig.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });
      cy.get('@createLLMInferenceService.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });
    });

    it('should clean old resource when changing to "Single node (default)" ', () => {
      initIntercepts();
      cy.interceptK8sList(
        { model: SecretModel, ns: 'test-project' },
        mockK8sResourceList([mockURISecretK8sResource({ namespace: 'test-project' })]),
      );
      cy.interceptK8s(
        'GET',
        { model: LLMInferenceServiceConfigModel, ns: 'test-project' },
        mockLLMInferenceServiceConfigK8sResource({
          name: 'test-llm-inference-service-multi-node-config',
          displayName: 'Multi-node Data Parallel (Local Copy)',
          namespace: 'test-project',
          configType: TopologyType.MULTI_NODE,
        }),
      );
      cy.interceptK8sList(
        { model: LLMInferenceServiceModel, ns: 'test-project' },
        mockK8sResourceList([
          mockLLMInferenceServiceK8sResource({
            additionalAnnotations: {
              'opendatahub.io/connections': 'test-uri-secret',
              // Auth is off so the update doesn't need auth resource intercepts
              'security.opendatahub.io/enable-auth': 'false',
              [TOPOLOGY_TYPE_ANNOTATION]: TopologyType.MULTI_NODE,
              [TOPOLOGY_CONFIG_REF_ANNOTATION]: 'test-llm-inference-service-multi-node-config',
            },
            baseRefs: [{ name: 'test-llm-inference-service-multi-node-config' }],
          }),
        ]),
      );
      cy.intercept('PUT', '**/llminferenceservices/**', (req) => {
        req.reply({ statusCode: 200, body: req.body });
      }).as('updateLLMInferenceService');
      cy.interceptK8s(
        'POST',
        { model: LLMInferenceServiceConfigModel, ns: 'test-project' },
        (req) => {
          req.reply({ statusCode: 200, body: req.body });
        },
      ).as('createLLMInferenceServiceConfig');
      cy.interceptK8s(
        'DELETE',
        {
          model: LLMInferenceServiceConfigModel,
          ns: 'test-project',
          name: 'test-llm-inference-service-multi-node-config',
        },
        mock200Status({}),
      ).as('deleteLLMInferenceServiceConfig');

      modelServingGlobal.visit('test-project');
      modelServingGlobal.getModelRow('Test LLM Inference Service').findKebabAction('Edit').click();

      // Step 1: Model source
      modelServingWizardEdit.findNextButton().should('be.enabled').click();

      // Step 2: Model deployment — switch back to the default single node configuration
      cy.findByTestId('custom-topology-config-select').should(
        'contain.text',
        'Multi-node Data Parallel (Local Copy)',
      );
      cy.findByTestId('topology-type-select').click();
      cy.findByTestId(`topology-type-${TopologyType.SINGLE_NODE}`).click();
      // The existing config stays selected until it is explicitly swapped for the default
      cy.findByTestId('custom-topology-config-select').click();
      cy.findByTestId('topology-config-option-single-node-default').click();
      cy.findByTestId('custom-topology-config-select').should(
        'contain.text',
        'Single node (default)',
      );
      modelServingWizardEdit.findNextButton().should('be.enabled').click();

      // Step 3: Advanced options
      modelServingWizardEdit.findNextButton().should('be.enabled').click();

      // Step 4: Summary
      modelServingWizardEdit.findSubmitButton().should('be.enabled').click();

      // Dry run — the previously referenced config is deleted, no new copy is created
      cy.wait('@deleteLLMInferenceServiceConfig').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
      });
      cy.wait('@updateLLMInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body.metadata.annotations).to.have.property(
          TOPOLOGY_TYPE_ANNOTATION,
          TopologyType.SINGLE_NODE,
        );
        expect(interception.request.body.metadata.annotations).to.not.have.property(
          TOPOLOGY_CONFIG_REF_ANNOTATION,
        );
        expect(interception.request.body.spec.baseRefs ?? []).to.not.deep.include({
          name: 'test-llm-inference-service-multi-node-config',
        });
      });

      // Actual requests
      cy.wait('@deleteLLMInferenceServiceConfig').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });
      cy.wait('@updateLLMInferenceService').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
        expect(interception.request.body.metadata.annotations).to.not.have.property(
          TOPOLOGY_CONFIG_REF_ANNOTATION,
        );
        expect(interception.request.body.spec.baseRefs ?? []).to.not.deep.include({
          name: 'test-llm-inference-service-multi-node-config',
        });
      });

      cy.get('@deleteLLMInferenceServiceConfig.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });
      cy.get('@createLLMInferenceServiceConfig.all').should('have.length', 0);
    });
  });

  // The branch matrix (no config ref, accelerator config, 404 handling) is covered by the unit
  // tests in llmd-serving/src/api/__tests__/LLMdDeployment.spec.ts. This covers the wiring: the
  // deployment reaching the delete handler still carries the annotation naming its local copy.
  describe('Delete deployment', () => {
    it('should delete the local topology config copy referenced by the deployment', () => {
      const deploymentName = 'test-llm-inference-service';
      const localConfigName = `${deploymentName}-multi-node-config`;

      initIntercepts();
      cy.interceptK8sList(
        { model: LLMInferenceServiceModel, ns: 'test-project' },
        mockK8sResourceList([
          mockLLMInferenceServiceK8sResource({
            additionalAnnotations: {
              [TOPOLOGY_TYPE_ANNOTATION]: TopologyType.MULTI_NODE,
              [TOPOLOGY_CONFIG_REF_ANNOTATION]: localConfigName,
            },
            baseRefs: [{ name: localConfigName }],
          }),
        ]),
      );
      cy.intercept('DELETE', '**/llminferenceserviceconfigs/**', mock200Status({})).as(
        'deleteLLMInferenceServiceConfig',
      );
      cy.interceptK8s(
        'DELETE',
        { model: LLMInferenceServiceModel, ns: 'test-project', name: deploymentName },
        mock200Status({}),
      ).as('deleteLLMInferenceService');

      modelServingGlobal.visit('test-project');
      modelServingGlobal
        .getModelRow('Test LLM Inference Service')
        .findKebabAction(/^Delete/)
        .click();

      deleteModal.shouldBeOpen();
      deleteModal.findInput().type('Test LLM Inference Service');
      deleteModal.findSubmitButton().should('be.enabled').click();

      cy.wait('@deleteLLMInferenceServiceConfig').then((interception) => {
        expect(interception.request.url).to.include(
          `/namespaces/test-project/llminferenceserviceconfigs/${localConfigName}`,
        );
      });
      cy.wait('@deleteLLMInferenceService');
      cy.get('@deleteLLMInferenceServiceConfig.all').should('have.length', 1);
    });
  });
});
