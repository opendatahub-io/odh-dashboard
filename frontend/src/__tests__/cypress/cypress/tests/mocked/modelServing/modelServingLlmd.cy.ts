// eslint-disable-next-line import/no-extraneous-dependencies
import { type LLMInferenceServiceKind } from '@odh-dashboard/llmd-serving/types';
import { mockLLMInferenceServiceK8sResource } from '#~/__mocks__/mockLLMInferenceServiceK8sResource';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeK8sResource } from '#~/__mocks__/mockServingRuntimeK8sResource';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  ProjectModel,
  ServingRuntimeModel,
  TemplateModel,
  SecretModel,
  LLMInferenceServiceModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import type { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { mockGlobalScopedHardwareProfiles } from '#~/__mocks__/mockHardwareProfile';
import { mockServingRuntimeTemplateK8sResource } from '#~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { ServingRuntimeModelType } from '#~/types';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
} from '#~/__mocks__/mockConnectionType';
import { hardwareProfileSection } from '#~/__tests__/cypress/cypress/pages/components/HardwareProfileSection';
import { mockSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';

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
      installedComponents: {
        kserve: true,
        'model-mesh': false,
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelMesh: true,
      disableNIMModelServing: true,
      disableKServe: false,
      disableDeploymentWizard: false,
      disableModelAsService: false, // Enable MaaS for testing
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
    mockK8sResourceList(
      [
        mockServingRuntimeTemplateK8sResource({
          name: 'template-2',
          displayName: 'OpenVINO',
          modelTypes: [ServingRuntimeModelType.PREDICTIVE],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-5',
          displayName: 'vLLM NVIDIA',
          modelTypes: [ServingRuntimeModelType.GENERATIVE],
          supportedModelFormats: [
            {
              name: 'vLLM',
            },
          ],
        }),
      ],
      { namespace: 'opendatahub' },
    ),
  );

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: false })]),
  );
  cy.interceptK8sList(LLMInferenceServiceModel, mockK8sResourceList(llmInferenceServices));
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
      row.shouldHaveServingRuntime('Distributed Inference Server with llm-d');
      row.findExternalServiceButton().click();
      row.findExternalServicePopover().findByText('External').should('exist');
      row
        .findExternalServicePopover()
        .findByText('http://us-east-1.elb.amazonaws.com/test-project/facebook-opt-125m-single')
        .should('exist');
      row.findAPIProtocol().should('have.text', 'REST');
      row.findLastDeployed().should('have.text', '17 Mar 2023');
      row.findStatusLabel('Started');

      // expanded section of the row
      row.findToggleButton('llmd-serving').click();
      row.findDescriptionListItem('Model server replicas').next('dd').should('have.text', '2');
      row.findDescriptionListItem('Model server size').next('dd').should('contain.text', 'Small');
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
  });

  describe('creating an LLMD deployment', () => {
    it('should create an LLMD deployment', () => {
      initIntercepts({});

      // Visit the model serving page
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      // Step 1: Model source
      modelServingWizard
        .findModelLocationSelectOption('Existing connection')
        .should('exist')
        .click();
      modelServingWizard.findExistingConnectionValue().should('have.value', 'test-s3-secret');
      modelServingWizard.findModelTypeSelectOption('Generative AI model (e.g. LLM)').click();
      modelServingWizard.findLocationPathInput().should('exist').type('test-model/');
      modelServingWizard.findNextButton().should('be.enabled').click();

      // Step 2: Model deployment
      modelServingWizard.findNextButton().should('be.disabled');
      modelServingWizard.findModelDeploymentNameInput().type('test-llmd-model');
      modelServingWizard.findModelDeploymentDescriptionInput().type('test-llmd-description');

      hardwareProfileSection.findSelect().should('contain.text', 'Small');
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard
        .findGlobalScopedTemplateOption('Distributed Inference Server with llm-d')
        .should('exist')
        .click();

      modelServingWizard.findNumReplicasInputField().should('have.value', '1');
      modelServingWizard.findNumReplicasPlusButton().click();
      modelServingWizard.findNumReplicasInputField().should('have.value', '2');
      modelServingWizard.findNextButton().should('be.enabled').click();

      // Step 3: Advanced Options
      modelServingWizard.findNextButton().should('be.enabled');
      modelServingWizard.findExternalRouteCheckbox().should('not.exist');
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
            args: ['--arg=value1'],
            env: [{ name: 'MY_ENV', value: 'MY_VALUE' }],
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
  });

  describe('Deploy LLMD with MaaS enabled', () => {
    it('should create an LLMD deployment with MaaS enabled', () => {
      initIntercepts({});

      // Navigate to wizard and set up basic deployment
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();

      // Quick setup: Model source and deployment
      modelServingWizard.findModelLocationSelectOption('URI - v1').click();
      modelServingWizard.findUrilocationInput().type('hf://coolmodel/coolmodel');
      modelServingWizard.findSaveConnectionCheckbox().click(); // Uncheck to simplify
      modelServingWizard.findModelTypeSelectOption('Generative AI model (e.g. LLM)').click();
      modelServingWizard.findNextButton().click();

      modelServingWizard.findModelDeploymentNameInput().type('test-maas-llmd-model');
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard
        .findGlobalScopedTemplateOption('Distributed Inference Server with llm-d')
        .click();
      modelServingWizard.findNextButton().click();

      // Focus on MaaS feature testing
      // uncheck token auth to simplify test
      modelServingWizard.findTokenAuthenticationCheckbox().click();
      modelServingWizard.findSaveAsMaaSCheckbox().should('exist').should('not.be.checked');
      modelServingWizard.findSaveAsMaaSCheckbox().click();
      modelServingWizard.findSaveAsMaaSCheckbox().should('be.checked');
      modelServingWizard.findUseCaseInput().should('be.visible').type('Test MaaS use case');
      modelServingWizard.findNextButton().click();

      // Submit and verify MaaS-specific annotations and gateway refs
      modelServingWizard.findSubmitButton().click();

      cy.wait('@createLLMInferenceService').then((interception) => {
        expect(interception.request.url).to.include('?dryRun=All');

        // Verify MaaS-specific configuration
        expect(interception.request.body.metadata.annotations).to.containSubset({
          'alpha.maas.opendatahub.io/tiers': '[]',
          'opendatahub.io/genai-use-case': 'Test MaaS use case',
        });

        expect(interception.request.body.spec.router.gateway.refs).to.deep.equal([
          {
            name: 'maas-default-gateway',
            namespace: 'openshift-ingress',
          },
        ]);
      });

      cy.wait('@createLLMInferenceService'); // Actual request
      cy.get('@createLLMInferenceService.all').should('have.length', 2);
    });
  });
});
