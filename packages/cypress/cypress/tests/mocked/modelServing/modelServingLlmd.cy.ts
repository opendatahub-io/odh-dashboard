// eslint-disable-next-line import/no-extraneous-dependencies
import { type LLMInferenceServiceKind } from '@odh-dashboard/llmd-serving/types';
import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceK8sResource';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mock200Status } from '@odh-dashboard/internal/__mocks__/mockK8sStatus';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/internal/__mocks__/mockServingRuntimeK8sResource';
import type { InferenceServiceKind, ServingRuntimeKind } from '@odh-dashboard/internal/k8sTypes';
import {
  mockGlobalScopedHardwareProfiles,
  mockHardwareProfile,
} from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import {
  mockServingRuntimeTemplateK8sResource,
  mockStandardModelServingTemplateK8sResources,
} from '@odh-dashboard/internal/__mocks__/mockServingRuntimeTemplateK8sResource';
import { IdentifierResourceType, ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
} from '@odh-dashboard/internal/__mocks__/mockConnectionType';
import {
  mockCustomSecretK8sResource,
  mockSecretK8sResource,
} from '@odh-dashboard/internal/__mocks__/mockSecretK8sResource';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import {
  ModelLocationSelectOption,
  ModelTypeLabel,
} from '@odh-dashboard/model-serving/components/deploymentWizard/types';
import { deleteModal } from '../../../pages/components/DeleteModal';
import { hardwareProfileSection } from '../../../pages/components/HardwareProfileSection';
import {
  initMockGatewayIntercepts,
  initMockModelAuthIntercepts,
} from '../../../utils/modelServingUtils';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  LLMInferenceServiceConfigModel,
  ProjectModel,
  ServingRuntimeModel,
  TemplateModel,
  SecretModel,
  LLMInferenceServiceModel,
} from '../../../utils/models';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
  modelServingWizardEdit,
} from '../../../pages/modelServing';
import { projectDetailsOverviewTab } from '../../../pages/projects';

const initIntercepts = ({
  llmInferenceServices = [],
  inferenceServices = [],
  servingRuntimes = [],
}: {
  llmInferenceServices?: LLMInferenceServiceKind[];
  inferenceServices?: InferenceServiceKind[];
  servingRuntimes?: ServingRuntimeKind[];
}) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableNIMModelServing: true,
      disableKServe: false,
      genAiStudio: true,
      modelAsService: true, // Enable MaaS for testing
      disableLLMd: false,
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
  ]).as('getConnectionTypes');
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
  cy.interceptK8sList(LLMInferenceServiceModel, mockK8sResourceList(llmInferenceServices));
  cy.interceptK8sList(
    { model: LLMInferenceServiceConfigModel, ns: 'test-project' },
    mockK8sResourceList([]),
  );
  cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList(inferenceServices));
  cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(servingRuntimes));

  cy.interceptK8s(
    'POST',
    {
      model: LLMInferenceServiceModel,
      ns: 'test-project',
    },
    {
      statusCode: 200,
      body: mockLLMInferenceServiceK8sResource({ name: 'test-llmd-model' }),
    },
  ).as('createLLMInferenceService');
  // MaaS is enabled so we need to intercept this for edit scenarios
  cy.interceptOdh(
    'DELETE /maas/api/v1/maasmodel/:namespace/:name',
    { path: { namespace: '*', name: '*' } },
    { data: { message: 'Deleted successfully' } },
  ).as('deleteMaaSModelRef');
};

describe('Model Serving LLMD', () => {
  describe('showing existing LLMD deployments', () => {
    it('should display LLMD deployment in deployments table (projects)', () => {
      initIntercepts({
        llmInferenceServices: [
          mockLLMInferenceServiceK8sResource({
            name: 'facebook-opt-125m-single',
            namespace: 'test-project',
            displayName: 'Facebook OPT 125M',
            modelName: 'facebook/opt-125m',
            modelUri: 'hf://facebook/opt-125m',
            isReady: true,
            replicas: 2,
          }),
        ],
      });
      cy.interceptK8s(
        { model: HardwareProfileModel, ns: 'opendatahub', name: 'small-profile' },
        mockGlobalScopedHardwareProfiles[0],
      );

      // Visit the model serving page
      modelServingSection.visit('test-project');

      // Verify deployment details
      const row = modelServingSection.getKServeRow('Facebook OPT 125M');
      row.shouldHaveServingRuntime('Distributed inference with llm-d');
      row.findExternalServiceButton().click();
      row.findExternalServicePopover().findByText('External').should('exist');
      row
        .findExternalServicePopover()
        .findByText('http://us-east-1.elb.amazonaws.com/test-project/facebook-opt-125m-single')
        .should('exist');
      row
        .findExternalServicePopover()
        .findByTestId('api-protocol-label')
        .should('have.text', 'REST');
      row.findLastDeployed().should('have.text', '17 Mar 2023');
      row.findStatusLabel('Ready');

      // expanded section of the row
      row.findToggleButton('llmd-serving').click();
      row.findDescriptionListItem('Model server replicas').next('dd').should('have.text', '2');
      row
        .findDescriptionListItem('Model server size')
        .next('dd')
        .should('contain.text', '1 CPUs, 4GiB Memory requested');
      row
        .findDescriptionListItem('Model server size')
        .next('dd')
        .should('contain.text', '2 CPUs, 8GiB Memory limit');
      row
        .findDescriptionListItem('Hardware profile')
        .next('dd')
        .should('have.text', 'Small Profile');
    });

    it('should display both KServe and LLMD deployments in the same project (global)', () => {
      initIntercepts({
        llmInferenceServices: [
          mockLLMInferenceServiceK8sResource({
            name: 'llmd-deployment',
            namespace: 'test-project',
            displayName: 'LLMD Test Model',
            modelName: 'facebook/opt-125m',
            modelUri: 'hf://facebook/opt-125m',
            isReady: true,
          }),
        ],
        inferenceServices: [
          mockInferenceServiceK8sResource({
            name: 'kserve-deployment',
            namespace: 'test-project',
            displayName: 'KServe Test Model',
            isReady: true,
          }),
        ],
        servingRuntimes: [
          mockServingRuntimeK8sResource({
            name: 'test-runtime',
            namespace: 'test-project',
          }),
        ],
      });

      // Visit the model serving page
      modelServingGlobal.visit('test-project');

      // Verify both deployments are displayed in the table
      modelServingGlobal.getModelRow('LLMD Test Model').should('exist');
      modelServingGlobal.getModelRow('KServe Test Model').should('exist');

      // Verify both are visible
      modelServingGlobal.getModelRow('LLMD Test Model').should('be.visible');
      modelServingGlobal.getModelRow('KServe Test Model').should('be.visible');

      // Verify we have exactly 2 deployments
      modelServingGlobal.findRows().should('have.length', 2);

      // Check deployment names
      modelServingGlobal
        .getModelRow('LLMD Test Model')
        .findByTestId('deployed-model-name')
        .should('contain', 'LLMD Test Model');

      modelServingGlobal
        .getModelRow('KServe Test Model')
        .findByTestId('deployed-model-name')
        .should('contain', 'KServe Test Model');
    });

    it('should show LLMD deployments and runtime options when LLMD is enabled but not when disabled', () => {
      initIntercepts({
        llmInferenceServices: [
          mockLLMInferenceServiceK8sResource({
            name: 'test-llmd-model',
            displayName: 'Test LLM Inference Service',
            replicas: 2,
            modelType: ServingRuntimeModelType.GENERATIVE,
          }),
        ],
      });
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableLLMd: true,
        }),
      );
      modelServingSection.visit('test-project');

      cy.step('Verify LLMD deployment is not displayed');
      modelServingSection.findKServeTable().should('have.length', 0);
      modelServingSection.findDeployModelButton().should('exist');
      modelServingSection.findDeployModelButton().click();

      modelServingWizard.findModelLocationSelectOption('URI').click();
      modelServingWizard.findUrilocationInput().type('hf://coolmodel/coolmodel');
      modelServingWizard.findSaveConnectionCheckbox().click(); // Uncheck to simplify
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findNextButton().click();

      cy.step('Verify LLMD runtime option is not displayed');
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard
        .findGlobalScopedTemplateOption('Distributed inference with llm-d')
        .should('not.exist');

      //Just to close the runtime template search selector
      modelServingWizard.findModelDeploymentNameInput().click();
      modelServingWizard.findCancelButton().click();
      modelServingWizard.findDiscardButton().click();

      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableLLMd: false,
        }),
      );
      cy.reload();
      cy.step('Verify LLMD deployment is displayed when LLMD is enabled');
      modelServingSection.findKServeTable().should('have.length', 1);
      modelServingSection.findDeployModelButton().should('exist');
      modelServingSection.findDeployModelButton().click();

      modelServingWizard.findModelLocationSelectOption('URI').click();
      modelServingWizard.findUrilocationInput().type('hf://coolmodel/coolmodel');
      modelServingWizard.findSaveConnectionCheckbox().click(); // Uncheck to simplify
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findNextButton().click();

      cy.step('Verify LLMD runtime option is displayed when LLMD is enabled');
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard
        .findGlobalScopedTemplateOption('Distributed inference with llm-d')
        .should('exist');
    });

    it('should handle LLMD deployment with error status', () => {
      initIntercepts({
        llmInferenceServices: [
          mockLLMInferenceServiceK8sResource({
            name: 'error-llmd-deployment',
            namespace: 'test-project',
            displayName: 'Error LLMD Model',
            modelName: 'facebook/opt-125m',
            modelUri: 'hf://facebook/opt-125m',
            isReady: false, // Set to error state
          }),
        ],
      });

      // Visit the model serving page
      modelServingGlobal.visit('test-project');

      // Verify LLMD deployment is displayed even with error status
      modelServingGlobal.getModelRow('Error LLMD Model').should('exist');
      modelServingGlobal.getModelRow('Error LLMD Model').should('be.visible');
    });

    it('should display LLMD serving runtime details on the project overview tab', () => {
      initIntercepts({
        llmInferenceServices: [
          mockLLMInferenceServiceK8sResource({
            name: 'facebook-opt-125m-single',
            namespace: 'test-project',
            displayName: 'Facebook OPT 125M',
            modelName: 'facebook/opt-125m',
            modelUri: 'hf://facebook/opt-125m',
            isReady: true,
          }),
        ],
      });

      projectDetailsOverviewTab.visit('test-project');

      projectDetailsOverviewTab
        .findDeployedModelCard('facebook-opt-125m-single')
        .should('be.visible');
      projectDetailsOverviewTab
        .findCardServingRuntime('facebook-opt-125m-single')
        .should('contain.text', 'Distributed inference with llm-d');
    });
  });

  describe('creating an LLMD deployment', () => {
    it('should create an LLMD deployment', () => {
      initIntercepts({});

      // Visit the model serving page
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      // Step 1: Model source
      modelServingWizard
        .findModelLocationSelectOption(ModelLocationSelectOption.EXISTING)
        .should('exist')
        .click();
      modelServingWizard.findExistingConnectionValue().should('have.value', 'test-s3-secret');
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findLocationPathInput().should('exist').type('test-model/');
      modelServingWizard.findNextButton().should('be.enabled').click();

      // Step 2: Model deployment
      modelServingWizard.findNextButton().should('be.disabled');
      modelServingWizard.findModelDeploymentNameInput().type('test-llmd-model');
      modelServingWizard.findModelDeploymentDescriptionInput().type('test-llmd-description');

      hardwareProfileSection.findSelect().should('contain.text', 'Small');
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard
        .findGlobalScopedTemplateOption('Distributed inference with llm-d')
        .should('exist')
        .click();

      modelServingWizard.findNumReplicasInputField().should('have.value', '1');
      modelServingWizard.findNumReplicasPlusButton().click();
      modelServingWizard.findNumReplicasInputField().should('have.value', '2');
      modelServingWizard.findNextButton().should('be.enabled').click();

      // Step 3: Advanced Options
      modelServingWizard.findNextButton().should('be.enabled');
      modelServingWizard.findExternalRouteCheckbox().should('not.exist');
      modelServingWizard.findTokenAuthenticationCheckbox().should('be.enabled');
      modelServingWizard.findTokenAuthenticationCheckbox().click();
      modelServingWizard.findTokenWarningAlert().should('exist');
      modelServingWizard.findRuntimeArgsCheckbox().click();
      modelServingWizard.findRuntimeArgsTextBox().type('--arg=value1');
      modelServingWizard.findEnvVariablesCheckbox().click();
      modelServingWizard.findAddVariableButton().click();
      modelServingWizard.findEnvVariableName('0').clear().type('MY_ENV');
      modelServingWizard.findEnvVariableValue('0').type('MY_VALUE');
      modelServingWizard.findNextButton().should('be.enabled').click();

      // Step 4: Summary
      modelServingWizard.findSubmitButton().should('be.enabled').click();

      cy.wait('@createLLMInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');

        // Check metadata separately
        expect(interception.request.body.kind).to.equal('LLMInferenceService');
        expect(interception.request.body.metadata.name).to.equal('test-llmd-model');
        expect(interception.request.body.metadata.namespace).to.equal('test-project');
        expect(interception.request.body.metadata.annotations).to.containSubset({
          'openshift.io/display-name': 'test-llmd-model',
          'openshift.io/description': 'test-llmd-description',
          'opendatahub.io/hardware-profile-namespace': 'opendatahub',
          'opendatahub.io/model-type': 'generative',
          'security.opendatahub.io/enable-auth': 'false',
          'opendatahub.io/connection-path': 'test-model/', // Connection name is only added in the actual request to avoid dry run failures
        });
        expect(interception.request.body.spec.model.uri).to.equal(''); // here, it will be filled in by the backend
        expect(interception.request.body.spec.model.name).to.equal('test-llmd-model');
        expect(interception.request.body.spec.replicas).to.equal(2);
        expect(interception.request.body.spec.router).to.containSubset({
          scheduler: {},
          route: {},
          gateway: {},
        });
        expect(interception.request.body.spec.template.containers).to.containSubset([
          {
            name: 'main',
            env: [
              { name: 'MY_ENV', value: 'MY_VALUE' },
              { name: 'VLLM_ADDITIONAL_ARGS', value: '--arg=value1' },
            ],
          },
        ]);
      });

      // Actual request
      cy.wait('@createLLMInferenceService').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
        expect(interception.request.body.metadata.annotations).to.containSubset({
          'opendatahub.io/connections': 'test-s3-secret', // Connection name is only added in the actual request to avoid dry run failures
          'opendatahub.io/connection-path': 'test-model/',
        });
      });

      cy.get('@createLLMInferenceService.all').then((interceptions) => {
        expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
      });
    });

    it('should edit an LLMD deployment', () => {
      initIntercepts({
        llmInferenceServices: [
          mockLLMInferenceServiceK8sResource({
            name: 'test-llmd-model',
            displayName: 'Test LLM Inference Service',
            replicas: 2,
            modelType: ServingRuntimeModelType.GENERATIVE,
          }),
        ],
      });
      // Mock the default token secret since auth is enabled on the deployment
      cy.interceptK8sList(
        { model: SecretModel, ns: 'test-project' },
        mockK8sResourceList([
          mockCustomSecretK8sResource({
            name: 'default-token-test-llmd-model-sa',
            namespace: 'test-project',
            annotations: {
              'openshift.io/display-name': 'default-token',
              'kubernetes.io/service-account.name': 'test-llmd-model-sa',
            },
            type: 'kubernetes.io/service-account-token',
            data: {
              token: 'test-token',
            },
          }),
        ]),
      );
      // Force the serving runtimelist to show llmd as an option
      cy.interceptK8sList(
        TemplateModel,
        mockK8sResourceList([
          mockServingRuntimeTemplateK8sResource({
            name: 'llmd-serving',
            displayName: 'Distributed inference with llm-d',
            modelTypes: [ServingRuntimeModelType.GENERATIVE],
          }),
        ]),
      );
      cy.intercept('DELETE', '**/secrets/default-token-test-llmd-model-sa*', (req) => {
        req.reply({
          statusCode: 200,
          body: {
            kind: 'Status',
            apiVersion: 'v1',
            status: 'Success',
            message: 'Secret deleted',
            reason: 'OK',
            code: 200,
          },
        });
      }).as('deleteDefaultTokenSecret');
      cy.intercept('PUT', '**/llminferenceservices/test-llmd-model*', (req) => {
        req.reply({ statusCode: 200, body: req.body });
      }).as('updateLLMInferenceService');

      // Visit the model serving page
      modelServingGlobal.visit('test-project');
      modelServingGlobal.getModelRow('Test LLM Inference Service').findKebabAction('Edit').click();

      // Step 1: Model source
      modelServingWizardEdit.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizardEdit.findUrilocationInput().clear().type('hf://updated-uri');

      modelServingWizardEdit
        .findModelTypeSelect()
        .should('be.disabled')
        .should('have.text', ModelTypeLabel.GENERATIVE);
      modelServingWizardEdit.findSaveConnectionCheckbox().should('be.checked');
      modelServingWizardEdit.findSaveConnectionCheckbox().click();
      modelServingWizardEdit.findSaveConnectionCheckbox().should('not.be.checked');
      modelServingWizardEdit.findNextButton().should('be.enabled').click();

      // Step 2: Model deployment
      modelServingWizardEdit.findNextButton().should('be.disabled');
      modelServingWizardEdit.findModelDeploymentNameInput().clear().type('test-llmd-model-2');
      modelServingWizardEdit.findModelDeploymentDescriptionInput().type('test-llmd-description-2');

      hardwareProfileSection.findSelect().should('exist');
      hardwareProfileSection.findSelect().should('contain.text', 'Small');
      hardwareProfileSection.selectProfile(
        'Large Profile Compatible CPU: Request = 4 Cores; Limit = 4 Cores; Memory: Request = 8 GiB; Limit = 8 GiB',
      );
      modelServingWizardEdit
        .findServingRuntimeTemplateSearchSelector()
        .should('be.disabled')
        .should('contain.text', 'Distributed inference with llm-d');

      modelServingWizardEdit.findNumReplicasInputField().should('have.value', '2');
      modelServingWizardEdit.findNumReplicasPlusButton().click();
      modelServingWizardEdit.findNumReplicasInputField().should('have.value', '3');
      modelServingWizardEdit.findNextButton().should('be.enabled').click();

      // Step 3: Advanced Options
      modelServingWizardEdit.findNextButton().should('be.enabled');
      modelServingWizardEdit.findTokenAuthenticationCheckbox().should('be.checked');
      modelServingWizardEdit.findTokenAuthenticationCheckbox().click();
      modelServingWizardEdit.findTokenAuthenticationCheckbox().should('not.be.checked');
      modelServingWizardEdit.findRuntimeArgsCheckbox().click();
      modelServingWizardEdit.findRuntimeArgsTextBox().type('--arg=value1');
      modelServingWizardEdit.findEnvVariableName('0').clear().type('MY_ENV');
      modelServingWizardEdit.findEnvVariableValue('0').clear().type('MY_VALUE');
      modelServingWizardEdit.findNextButton().should('be.enabled').click();

      // Step 4: Summary
      modelServingWizardEdit.findSubmitButton().should('be.enabled').click();

      cy.wait('@updateLLMInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body.metadata.annotations).to.containSubset({
          'openshift.io/display-name': 'test-llmd-model-2',
          'openshift.io/description': 'test-llmd-description-2',
        });
        expect(interception.request.body.spec.replicas).to.equal(3);
        expect(interception.request.body.spec.template.containers).to.containSubset([
          {
            name: 'main',
            env: [
              { name: 'MY_ENV', value: 'MY_VALUE' },
              { name: 'VLLM_ADDITIONAL_ARGS', value: '--arg=value1' },
            ],
          },
        ]);
      });

      cy.wait('@updateLLMInferenceService').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@updateLLMInferenceService.all').then((interceptions) => {
        expect(interceptions).to.have.length(2);
      });
    });
    it('should stop/start an LLMD deployment', () => {
      initIntercepts({
        llmInferenceServices: [
          mockLLMInferenceServiceK8sResource({
            name: 'test-llmd-model',
            displayName: 'Test LLM Inference Service',
            replicas: 2,
            modelType: ServingRuntimeModelType.GENERATIVE,
            isStopped: true,
          }),
          mockLLMInferenceServiceK8sResource({
            name: 'test-llmd-model-2',
            displayName: 'Test LLM Inference Service 2',
            replicas: 2,
            modelType: ServingRuntimeModelType.GENERATIVE,
            isStopped: false,
          }),
        ],
      });
      cy.intercept(
        'PATCH',
        '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/llminferenceservices/test-llmd-model',
        (req) => {
          req.reply({
            statusCode: 200,
            body: { llmInferenceService: mockLLMInferenceServiceK8sResource({ isStopped: false }) },
          });
        },
      ).as('startLLMInferenceService1');
      cy.intercept(
        'PATCH',
        '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/llminferenceservices/test-llmd-model-2',
        (req) => {
          req.reply({
            statusCode: 200,
            body: { llmInferenceService: mockLLMInferenceServiceK8sResource({ isStopped: true }) },
          });
        },
      ).as('stopLLMInferenceService2');

      modelServingSection.visit('test-project');
      const row1 = modelServingSection.getKServeRow('Test LLM Inference Service');
      const row2 = modelServingSection.getKServeRow('Test LLM Inference Service 2');
      const startButton = row1.findStateActionToggle();
      startButton.should('have.text', 'Start').click();

      cy.wait('@startLLMInferenceService1');
      cy.get('@startLLMInferenceService1.all').should('have.length', 1);

      const stopButton = row2.findStateActionToggle();
      stopButton.should('have.text', 'Stop').click();
      row2.findConfirmStopModalButton().should('exist');
      row2.findConfirmStopModalCheckbox().click();
      row2.findConfirmStopModalCheckbox().should('be.checked');
      row2.findConfirmStopModalButton().click();

      cy.wait('@stopLLMInferenceService2');
      cy.get('@stopLLMInferenceService2.all').should('have.length', 1);
    });

    it('should create an LLMD deployment with a gateway selection', () => {
      initIntercepts({});

      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableNIMModelServing: true,
          disableKServe: false,
          genAiStudio: true,
          modelAsService: true,
          disableLLMd: false,
          llmGatewayField: true,
        }),
      );

      initMockGatewayIntercepts({
        gateways: [
          { name: 'test-gateway', namespace: 'gateway-ns', listener: 'http', status: 'Ready' },
          { name: 'other-gateway', namespace: 'gateway-ns-2', listener: 'http', status: 'Ready' },
        ],
      });

      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      // Step 1: Model source
      modelServingWizard
        .findModelLocationSelectOption(ModelLocationSelectOption.EXISTING)
        .should('exist')
        .click();
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findLocationPathInput().should('exist').type('test-model/');
      modelServingWizard.findNextButton().should('be.enabled').click();

      // Step 2: Model deployment
      modelServingWizard.findModelDeploymentNameInput().type('test-gateway-model');
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard
        .findGlobalScopedTemplateOption('Distributed inference with llm-d')
        .should('exist')
        .click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      // Step 3: Advanced Options — gateway select should be visible
      modelServingWizard.findGatewaySelect().should('exist');
      modelServingWizard.findGatewaySelectOption('test-gateway | gateway-ns').click();

      // Disable token auth to simplify (avoid needing auth resource intercepts)
      modelServingWizard.findTokenAuthenticationCheckbox().click();

      modelServingWizard.findNextButton().should('be.enabled').click();

      // Step 4: Summary — submit
      modelServingWizard.findSubmitButton().should('be.enabled').click();

      cy.wait('@createLLMInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body.spec.router.gateway).to.containSubset({
          refs: [{ name: 'test-gateway', namespace: 'gateway-ns' }],
        });
      });

      cy.wait('@createLLMInferenceService').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
        expect(interception.request.body.spec.router.gateway).to.containSubset({
          refs: [{ name: 'test-gateway', namespace: 'gateway-ns' }],
        });
      });

      cy.get('@createLLMInferenceService.all').then((interceptions) => {
        expect(interceptions).to.have.length(2);
      });
    });

    it('should edit an LLMD deployment and show pre-populated gateway', () => {
      initIntercepts({
        llmInferenceServices: [
          mockLLMInferenceServiceK8sResource({
            name: 'test-gw-model',
            displayName: 'Gateway Test Model',
            replicas: 1,
            modelType: ServingRuntimeModelType.GENERATIVE,
            gatewayRefs: [{ name: 'existing-gw', namespace: 'gw-ns' }],
          }),
        ],
      });

      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableNIMModelServing: true,
          disableKServe: false,
          genAiStudio: true,
          modelAsService: true,
          disableLLMd: false,
          llmGatewayField: true,
        }),
      );

      initMockGatewayIntercepts({
        gateways: [
          { name: 'existing-gw', namespace: 'gw-ns', listener: 'http', status: 'Ready' },
          { name: 'new-gateway', namespace: 'gw-ns-2', listener: 'http', status: 'Ready' },
        ],
      });

      // Force the serving runtime list for editing
      cy.interceptK8sList(
        TemplateModel,
        mockK8sResourceList([
          mockServingRuntimeTemplateK8sResource({
            name: 'llmd-serving',
            displayName: 'Distributed inference with llm-d',
            modelTypes: [ServingRuntimeModelType.GENERATIVE],
          }),
        ]),
      );

      cy.intercept('PUT', '**/llminferenceservices/test-gw-model*', (req) => {
        req.reply({ statusCode: 200, body: req.body });
      }).as('updateLLMInferenceService');

      modelServingGlobal.visit('test-project');
      modelServingGlobal.getModelRow('Gateway Test Model').findKebabAction('Edit').click();

      // Step 1: Model source — switch to URI
      modelServingWizardEdit.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizardEdit.findUrilocationInput().clear().type('hf://updated-uri');
      modelServingWizardEdit.findSaveConnectionCheckbox().click();
      modelServingWizardEdit.findNextButton().should('be.enabled').click();

      // Step 2: Model deployment — select a compatible hardware profile for the deployment's resources
      hardwareProfileSection.selectProfile(
        'Large Profile Compatible CPU: Request = 4 Cores; Limit = 4 Cores; Memory: Request = 8 GiB; Limit = 8 GiB',
      );
      modelServingWizardEdit.findNextButton().should('be.enabled').click();

      // Step 3: Advanced Options — verify gateway is pre-populated with existing value
      modelServingWizardEdit.findGatewaySelect().should('contain.text', 'existing-gw | gw-ns');

      // Change to a different gateway
      modelServingWizardEdit.findGatewaySelectOption('new-gateway | gw-ns-2').click();

      modelServingWizardEdit.findNextButton().should('be.enabled').click();

      // Step 4: Summary — submit
      modelServingWizardEdit.findSubmitButton().should('be.enabled').click();

      cy.wait('@updateLLMInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body.spec.router.gateway).to.containSubset({
          refs: [{ name: 'new-gateway', namespace: 'gw-ns-2' }],
        });
      });

      cy.wait('@updateLLMInferenceService').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
      });

      cy.get('@updateLLMInferenceService.all').then((interceptions) => {
        expect(interceptions).to.have.length(2);
      });
    });
  });

  describe('vLLM using LLMInferenceServiceConfig', () => {
    const initVLLMOnMaaSIntercepts = () => {
      initIntercepts({
        llmInferenceServices: [
          mockLLMInferenceServiceK8sResource({
            name: 'test-vllm-gpu',
            displayName: 'GPU vLLM Deployment',
            baseRefs: [{ name: 'test-vllm-gpu' }],
            modelType: ServingRuntimeModelType.GENERATIVE,
          }),
        ],
      });

      // Override config to enable vLLMDeploymentOnMaaS
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableNIMModelServing: true,
          disableKServe: false,
          genAiStudio: true,
          modelAsService: true,
          disableLLMd: false,
          vLLMDeploymentOnMaaS: true,
        }),
      );

      // Override hardware profiles to include a GPU profile that matches vllm-gpu-config.
      // The small-profile is also given wider memory bounds to accommodate the test
      // deployment's actual resource values (8Gi memory limit > default max of 4Gi).
      const gpuProfile = mockHardwareProfile({
        name: 'gpu-profile',
        displayName: 'GPU Profile',
        identifiers: [
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: '4',
            maxCount: '8',
            defaultCount: '4',
            resourceType: IdentifierResourceType.CPU,
          },
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: '8Gi',
            maxCount: '16Gi',
            defaultCount: '8Gi',
            resourceType: IdentifierResourceType.MEMORY,
          },
          {
            displayName: 'NVIDIA GPU',
            identifier: 'nvidia.com/gpu',
            minCount: 1,
            maxCount: 4,
            defaultCount: 1,
            resourceType: IdentifierResourceType.ACCELERATOR,
          },
        ],
      });
      const wideSmallProfile = mockHardwareProfile({
        name: 'small-profile',
        displayName: 'Small Profile',
        identifiers: [
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: '1',
            maxCount: '4',
            defaultCount: '1',
            resourceType: IdentifierResourceType.CPU,
          },
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: '2Gi',
            maxCount: '16Gi',
            defaultCount: '4Gi',
            resourceType: IdentifierResourceType.MEMORY,
          },
        ],
      });
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([wideSmallProfile, mockGlobalScopedHardwareProfiles[1], gpuProfile]),
      );

      // Override secrets to empty — simplifies token auth handling in edit scenarios
      cy.interceptK8sList({ model: SecretModel, ns: 'test-project' }, mockK8sResourceList([]));

      cy.interceptK8sList(
        { model: LLMInferenceServiceConfigModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockLLMInferenceServiceConfigK8sResource({
            name: 'vllm-gaudi-config',
            displayName: 'vLLM on Gaudi LLMInferenceServiceConfig',
            runtimeVersion: 'v0.9.1',
            recommendedAccelerators: '["intel.com/gaudi"]',
          }),
          mockLLMInferenceServiceConfigK8sResource({
            name: 'vllm-gpu-config',
            displayName: 'vLLM on GPU LLMInferenceServiceConfig',
            runtimeVersion: 'v0.8.2',
            recommendedAccelerators: '["nvidia.com/gpu"]',
          }),
        ]),
      );

      // Child config in project namespace — linked to the IS via matching name
      cy.interceptK8sList(
        { model: LLMInferenceServiceConfigModel, ns: 'test-project' },
        mockK8sResourceList([
          mockLLMInferenceServiceConfigK8sResource({
            name: 'test-vllm-gpu',
            namespace: 'test-project',
            displayName: 'vLLM on GPU LLMInferenceServiceConfig',
            runtimeVersion: 'v0.8.2',
            templateName: 'vllm-gpu-config',
          }),
        ]),
      );

      // GET by name for the hardware profile referenced in the existing deployment.
      cy.interceptK8s(
        { model: HardwareProfileModel, ns: 'opendatahub', name: 'small-profile' },
        wideSmallProfile,
      );

      cy.intercept('PUT', '**/llminferenceservices/test-vllm-gpu*', (req) => {
        req.reply({ statusCode: 200, body: req.body });
      }).as('updateLLMInferenceService');

      cy.intercept('PUT', '**/llminferenceserviceconfigs/test-vllm-gpu*', (req) => {
        req.reply({ statusCode: 200, body: req.body });
      }).as('updateLLMInferenceServiceConfig');
      // MaaS is enabled so we need to intercept this for edit scenarios
      cy.interceptOdh(
        'DELETE /maas/api/v1/maasmodel/:namespace/:name',
        { path: { namespace: '*', name: '*' } },
        { data: { message: 'Deleted successfully' } },
      ).as('deleteMaaSModelRef');
    };

    it('should display serving runtime name and version, then pre-fill when editing', () => {
      initVLLMOnMaaSIntercepts();

      modelServingGlobal.visit('test-project');

      // Verify the table shows the serving runtime name and version label
      const row = modelServingGlobal.getDeploymentRow('GPU vLLM Deployment');
      row.findServingRuntime().should('contain.text', 'vLLM on GPU LLMInferenceServiceConfig');
      row.findServingRuntimeVersionLabel().should('contain.text', 'v0.8.2');

      // Open the edit wizard and verify the Serving runtime field is pre-filled on step 2
      modelServingGlobal.getModelRow('GPU vLLM Deployment').findKebabAction('Edit').click();

      // Step 1: Model source — select URI, enter the model location, and proceed
      modelServingWizardEdit.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizardEdit.findUrilocationInput().type('hf://facebook/opt-125m');
      modelServingWizardEdit.findSaveConnectionCheckbox().click();
      modelServingWizardEdit.findNextButton().should('be.enabled').click();

      // Step 2: Verify the Serving runtime selector is pre-filled with the vLLM config name
      modelServingWizardEdit
        .findServingRuntimeTemplateSearchSelector()
        .should('be.disabled')
        .should('contain.text', 'vLLM on GPU LLMInferenceServiceConfig');
    });

    it('Deploy vLLM using LLMInferenceServiceConfig', () => {
      const deploymentName = 'test-vllm-config-deploy';

      initVLLMOnMaaSIntercepts();

      cy.interceptK8s(
        'POST',
        { model: LLMInferenceServiceConfigModel, ns: 'test-project' },
        {
          statusCode: 200,
          body: mockLLMInferenceServiceConfigK8sResource({
            name: deploymentName,
            namespace: 'test-project',
          }),
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

      initMockModelAuthIntercepts({ modelName: deploymentName, getResponse: 404 });

      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      // Step 1: Model source - select URI, enter URI, uncheck save connection, select Generative
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizard.findUrilocationInput().type('hf://test/model');
      modelServingWizard.findSaveConnectionCheckbox().click();
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      // Step 2: Model deployment
      modelServingWizard.findModelDeploymentNameInput().type(deploymentName);

      // Open template dropdown and verify all deployment configuration options are available
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard
        .findGlobalScopedTemplateOption('Distributed inference with llm-d')
        .should('exist');
      modelServingWizard
        .findGlobalScopedTemplateOption('vLLM on Gaudi LLMInferenceServiceConfig')
        .should('exist');
      modelServingWizard
        .findGlobalScopedTemplateOption('vLLM on GPU LLMInferenceServiceConfig')
        .should('exist');
      // Close the dropdown without selecting
      modelServingWizard.findModelDeploymentNameInput().click();

      // Select the GPU hardware profile — this triggers auto-suggestion for vLLM on GPU
      modelServingWizard.selectProfileContaining('GPU Profile');

      // Verify the auto-select suggestion shows the GPU config (matched via recommendedAccelerators)
      // and displays the version label confirming the correct config was matched
      modelServingWizard
        .findModelServerAutoSelectSuggestion()
        .should('contain.text', 'vLLM on GPU LLMInferenceServiceConfig');
      modelServingWizard.findServingRuntimeVersionLabel().should('contain.text', 'v0.8.2');

      modelServingWizard.findNextButton().should('be.enabled').click();

      // Step 3: Advanced options
      modelServingWizard.findNextButton().should('be.enabled').click();

      // Step 4: Review - Deploy
      modelServingWizard.findSubmitButton().should('be.enabled').click();

      // Dry run: config created first, then inference service
      cy.wait('@createLLMInferenceServiceConfig').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body.metadata.name).to.equal(deploymentName);
        expect(interception.request.body.metadata.namespace).to.equal('test-project');
      });
      cy.wait('@createLLMInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body.spec.baseRefs).to.have.length(1);
        expect(interception.request.body.spec.baseRefs).to.deep.include({ name: deploymentName });
        expect(interception.request.body.spec.router).to.not.have.property('scheduler');
      });

      // Actual: config created with same resource name as deployment, cloned from the selected template
      cy.wait('@createLLMInferenceServiceConfig').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
        expect(interception.request.body.metadata.name).to.equal(deploymentName);
        // Verify the config records its source template via annotation
        expect(interception.request.body.metadata.annotations).to.include({
          'opendatahub.io/template-name': 'vllm-gpu-config',
        });
      });
      // Actual: inference service has exactly one baseRef pointing to the config
      cy.wait('@createLLMInferenceService').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
        expect(interception.request.body.spec.baseRefs).to.have.length(1);
        expect(interception.request.body.spec.baseRefs).to.deep.include({ name: deploymentName });
        expect(interception.request.body.spec.router).to.not.have.property('scheduler');
      });
    });

    it('should hide disabled LLMInferenceServiceConfigs from the deploy wizard options', () => {
      initVLLMOnMaaSIntercepts();

      // Override configs: Gaudi is disabled, GPU is enabled
      cy.interceptK8sList(
        { model: LLMInferenceServiceConfigModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockLLMInferenceServiceConfigK8sResource({
            name: 'vllm-gaudi-config',
            displayName: 'vLLM on Gaudi LLMInferenceServiceConfig',
            runtimeVersion: 'v0.9.1',
            disabled: true,
          }),
          mockLLMInferenceServiceConfigK8sResource({
            name: 'vllm-gpu-config',
            displayName: 'vLLM on GPU LLMInferenceServiceConfig',
            runtimeVersion: 'v0.8.2',
          }),
        ]),
      );

      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      // Step 1: Model source
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizard.findUrilocationInput().type('hf://test/model');
      modelServingWizard.findSaveConnectionCheckbox().click();
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      // Step 2: Model deployment — open the config dropdown
      modelServingWizard.findModelDeploymentNameInput().type('test-disabled-config');
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();

      // Enabled config should be visible
      modelServingWizard
        .findGlobalScopedTemplateOption('vLLM on GPU LLMInferenceServiceConfig')
        .should('exist');

      // Disabled config should not appear
      modelServingWizard
        .findGlobalScopedTemplateOption('vLLM on Gaudi LLMInferenceServiceConfig')
        .should('not.exist');

      // The default llm-d option should still be available
      modelServingWizard
        .findGlobalScopedTemplateOption('Distributed inference with llm-d')
        .should('exist');
    });

    it('Edit existing LLMInferenceService preserves LLMInferenceServiceConfig and baseRef', () => {
      initVLLMOnMaaSIntercepts();

      modelServingGlobal.visit('test-project');

      // Open edit wizard for the existing deployment that already has a linked config
      modelServingGlobal.getModelRow('GPU vLLM Deployment').findKebabAction('Edit').click();

      // Step 1: Model source
      modelServingWizardEdit.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizardEdit.findUrilocationInput().type('hf://updated/model');
      modelServingWizardEdit.findSaveConnectionCheckbox().click();
      modelServingWizardEdit.findNextButton().should('be.enabled').click();

      // Step 2: Verify the config selector is pre-filled with the existing config and disabled
      modelServingWizardEdit
        .findServingRuntimeTemplateSearchSelector()
        .should('be.disabled')
        .should('contain.text', 'vLLM on GPU LLMInferenceServiceConfig');
      modelServingWizardEdit.findNextButton().should('be.enabled').click();

      // Step 3: Advanced options
      modelServingWizardEdit.findNextButton().should('be.enabled').click();

      // Step 4: Review - Update deployment
      modelServingWizardEdit.findSubmitButton().should('be.enabled').click();

      // Dry run: config updated first (unchanged), then IS updated
      cy.wait('@updateLLMInferenceServiceConfig').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body.metadata.name).to.equal('test-vllm-gpu');
      });
      cy.wait('@updateLLMInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');
        expect(interception.request.body.spec.baseRefs).to.have.length(1);
        expect(interception.request.body.spec.baseRefs).to.deep.include({ name: 'test-vllm-gpu' });
        expect(interception.request.body.spec.router).to.not.have.property('scheduler');
      });

      // Actual: config updated (preserved), IS updated with exactly one baseRef preserved
      cy.wait('@updateLLMInferenceServiceConfig').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
        expect(interception.request.body.metadata.name).to.equal('test-vllm-gpu');
      });
      cy.wait('@updateLLMInferenceService').then((interception) => {
        expect(interception.request.url).not.to.include('?dryRun=All');
        expect(interception.request.body.spec.baseRefs).to.have.length(1);
        expect(interception.request.body.spec.baseRefs).to.deep.include({ name: 'test-vllm-gpu' });
        expect(interception.request.body.spec.router).to.not.have.property('scheduler');
      });
    });

    it('should delete the matching LLMInferenceServiceConfig when deleting an LLMInferenceService', () => {
      initVLLMOnMaaSIntercepts();

      cy.interceptK8s(
        'DELETE',
        { model: LLMInferenceServiceConfigModel, ns: 'test-project', name: 'test-vllm-gpu' },
        mock200Status({}),
      ).as('deleteLLMInferenceServiceConfig');

      cy.interceptK8s(
        'DELETE',
        { model: LLMInferenceServiceModel, ns: 'test-project', name: 'test-vllm-gpu' },
        mock200Status({}),
      ).as('deleteLLMInferenceService');

      modelServingGlobal.visit('test-project');

      modelServingGlobal
        .getModelRow('GPU vLLM Deployment')
        .findKebabAction(/^Delete/)
        .click();

      deleteModal.shouldBeOpen();
      deleteModal.findInput().type('GPU vLLM Deployment');
      deleteModal.findSubmitButton().should('be.enabled').click();

      cy.wait('@deleteLLMInferenceServiceConfig');
      cy.wait('@deleteLLMInferenceService');
    });

    it('should NOT delete the LLMInferenceServiceConfig when names do not match', () => {
      initIntercepts({
        llmInferenceServices: [
          mockLLMInferenceServiceK8sResource({
            name: 'test-deployment',
            displayName: 'Test Deployment',
            baseRefs: [{ name: 'shared-config' }],
            modelType: ServingRuntimeModelType.GENERATIVE,
          }),
        ],
      });

      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          vLLMDeploymentOnMaaS: true,
        }),
      );

      cy.intercept('DELETE', '**/llminferenceserviceconfigs/**', mock200Status({})).as(
        'deleteLLMInferenceServiceConfig',
      );

      cy.interceptK8s(
        'DELETE',
        { model: LLMInferenceServiceModel, ns: 'test-project', name: 'test-deployment' },
        mock200Status({}),
      ).as('deleteLLMInferenceService');

      modelServingGlobal.visit('test-project');

      modelServingGlobal
        .getModelRow('Test Deployment')
        .findKebabAction(/^Delete/)
        .click();

      deleteModal.shouldBeOpen();
      deleteModal.findInput().type('Test Deployment');
      deleteModal.findSubmitButton().should('be.enabled').click();

      cy.wait('@deleteLLMInferenceService');
      cy.get('@deleteLLMInferenceServiceConfig.all').should('have.length', 0);
    });

    it('should display vLLM serving runtime details on the project overview tab', () => {
      initVLLMOnMaaSIntercepts();

      projectDetailsOverviewTab.visit('test-project');

      projectDetailsOverviewTab.findDeployedModelCard('test-vllm-gpu').should('be.visible');
      projectDetailsOverviewTab
        .findCardServingRuntime('test-vllm-gpu')
        .should('contain.text', 'vLLM on GPU LLMInferenceServiceConfig');
      projectDetailsOverviewTab
        .findCardServingRuntime('test-vllm-gpu')
        .findByTestId('serving-runtime-version-label')
        .should('contain.text', 'v0.8.2');
    });
  });
});
