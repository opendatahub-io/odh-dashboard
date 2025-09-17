import { hardwareProfileSection } from '#~/__tests__/cypress/cypress/pages/components/HardwareProfileSection';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeK8sResource } from '#~/__mocks__/mockServingRuntimeK8sResource';
import {
  mockInvalidTemplateK8sResource,
  mockServingRuntimeTemplateK8sResource,
} from '#~/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
  modelServingWizardEdit,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  ProjectModel,
  ServingRuntimeModel,
  TemplateModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { ServingRuntimeModelType, ServingRuntimePlatform } from '#~/types';
import { mockNewHardwareProfilesGreek } from '#~/__mocks__/mockHardwareProfile';
import { mockConnectionTypeConfigMap } from '../../../../../../__mocks__/mockConnectionType';

const initIntercepts = ({ modelType }: { modelType?: ServingRuntimeModelType }) => {
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
      disableHardwareProfiles: false,
    }),
  );
  cy.interceptOdh('GET /api/components', null, []);
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
  ]).as('getConnectionTypes');

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockNewHardwareProfilesGreek),
  );

  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(
      [
        mockServingRuntimeTemplateK8sResource({
          name: 'template-2',
          displayName: 'OpenVINO',
          platforms: [ServingRuntimePlatform.SINGLE],
          modelTypes: [ServingRuntimeModelType.PREDICTIVE],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-3',
          displayName: 'Caikit',
          platforms: [ServingRuntimePlatform.SINGLE],
          modelTypes: [ServingRuntimeModelType.PREDICTIVE],
          supportedModelFormats: [
            {
              name: 'openvino_ir',
              version: 'opset1',
            },
          ],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-4',
          displayName: 'vLLM AMD',
          platforms: [ServingRuntimePlatform.SINGLE],
          modelTypes: [ServingRuntimeModelType.GENERATIVE],
          supportedModelFormats: [
            {
              name: 'vLLM',
            },
          ],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-5',
          displayName: 'vLLM NVIDIA',
          platforms: [ServingRuntimePlatform.SINGLE],
          modelTypes: [ServingRuntimeModelType.GENERATIVE],
          supportedModelFormats: [
            {
              name: 'vLLM',
            },
          ],
        }),
        mockInvalidTemplateK8sResource({}),
      ],
      { namespace: 'opendatahub' },
    ),
  );

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: false })]),
  );

  cy.interceptK8s(
    'POST',
    {
      model: InferenceServiceModel,
      ns: 'test-project',
    },
    {
      statusCode: 200,
      body: mockInferenceServiceK8sResource({ name: 'test-model', modelType }),
    },
  ).as('createInferenceService');
};

describe('Model Serving Deploy Wizard', () => {
  it('Navigate into and out of the wizard', () => {
    initIntercepts({});
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    // TODO: visit directly when plugin is enabled
    cy.visitWithLogin('/modelServing/test-project?devFeatureFlags=Model+Serving+Plugin%3Dtrue');
    modelServingGlobal.findDeployModelButton().click();
    cy.findByRole('heading', { name: 'Deploy a model' }).should('exist');
    cy.findByRole('button', { name: 'Cancel' }).click();
    cy.url().should('include', '/modelServing/test-project');

    cy.visitWithLogin(
      '/projects/test-project?section=model-server&devFeatureFlags=Model+Serving+Plugin%3Dtrue',
    );
    modelServingSection.findDeployModelButton().click();
    cy.findByRole('heading', { name: 'Deploy a model' }).should('exist');
    cy.findByRole('button', { name: 'Cancel' }).click();
    cy.url().should('include', '/projects/test-project');
  });

  it('Create a new generative deployment and submit', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.GENERATIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    // TODO: visit directly when plugin is enabled
    cy.visitWithLogin('/modelServing/test-project?devFeatureFlags=Model+Serving+Plugin%3Dtrue');
    modelServingGlobal.findDeployModelButton().click();

    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist');
    modelServingWizard
      .findModelTypeSelectOption('Generative AI model (e.g. LLM)')
      .should('exist')
      .click();
    modelServingWizard.findModelLocationSelect().should('exist');
    modelServingWizard.findModelLocationSelectOption('URI - v1').should('exist').click();
    modelServingWizard.findUrilocationInput().should('exist').type('https://test');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizard.findModelDeploymentStep().should('be.enabled');
    modelServingWizard.findAdvancedOptionsStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    modelServingWizard.findAdvancedOptionsStep().should('be.enabled');
    console.log('hi there 77ab');

    // Open the dropdown and debug what options are available
    hardwareProfileSection.findNewHardwareProfileSelector().click();

    // Debug what's actually in the dropdown
    cy.get('[role="option"]').then(($options) => {
      console.log('Available options count:', $options.length);
      $options.each((index, option) => {
        console.log(`Option ${index}:`, option.textContent);
      });
    });

    // Try to click on the alpha option - try multiple variations
    cy.get('[role="option"]').contains('alpha', { matchCase: false }).click();

    // hardwareProfileSection.findGlobalScopedLabel().should('exist');
    modelServingWizard.findModelFormatSelect().should('not.exist');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // // Step 3: Advanced Options
    // // Model access & Token authentication
    modelServingWizard.findAdvancedOptionsStep().should('be.enabled');
    modelServingWizard.findExternalRouteCheckbox().click();
    modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
    modelServingWizard.findTokenAuthenticationCheckbox().click();
    modelServingWizard.findTokenWarningAlert().should('exist');
    modelServingWizard.findTokenAuthenticationCheckbox().click();
    modelServingWizard.findServiceAccountByIndex(0).should('have.value', 'default-name');
    modelServingWizard.findAddServiceAccountButton().click();
    modelServingWizard.findServiceAccountByIndex(1).should('have.value', 'default-name');
    modelServingWizard.findServiceNameAlert().should('exist');
    modelServingWizard.findServiceAccountByIndex(1).clear().type('new-name');
    modelServingWizard.findServiceNameAlert().should('not.exist');
    modelServingWizard.findRemoveServiceAccountByIndex(1).click();
    modelServingWizard.findServiceAccountByIndex(0).clear();
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findServiceAccountByIndex(0).clear().type('new-name');
    modelServingWizard.findNextButton().should('be.enabled');
    modelServingWizard.findRemoveServiceAccountByIndex(0).click();
    modelServingWizard.findTokenWarningAlert().should('exist');
    modelServingWizard.findTokenAuthenticationCheckbox().click();
    modelServingWizard.findExternalRouteCheckbox().click();

    modelServingWizard.findNextButton().should('be.enabled').click();

    // // Step 4: Summary
    modelServingWizard.findSubmitButton().should('be.enabled').click();

    // // dry run request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');

      const bodyActual = interception.request.body;
      console.log('got bodyActual:', bodyActual);
      console.log('spec???', bodyActual.spec);

      expect(interception.request.body).to.containSubset({
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: 'test-model',
          namespace: 'test-project',
          annotations: {
            'openshift.io/display-name': 'test-model',
            'opendatahub.io/model-type': 'generative',
            'opendatahub.io/hardware-profile-name': 'alpha',
            'opendatahub.io/hardware-profile-namespace': 'opendatahub',
            'security.opendatahub.io/enable-auth': 'true',
          },
          labels: { 'opendatahub.io/dashboard': 'true' },
        },
      });

      // Validate spec separately to avoid containSubset issues with complex nested objects
      const requestBody = interception.request.body;
      expect(requestBody.spec).to.exist;
      expect(requestBody.spec.predictor).to.exist;
      expect(requestBody.spec.predictor.model).to.exist;

      // Validate model format (generative uses vLLM)
      expect(requestBody.spec.predictor.model.modelFormat).to.deep.equal({
        name: 'vLLM',
      });

      // Validate resources (from alpha hardware profile)
      const { resources } = requestBody.spec.predictor.model;
      expect(resources.requests).to.deep.equal({
        cpu: 2,
        memory: '4Gi',
      });
      expect(resources.limits).to.deep.equal({
        cpu: 2,
        memory: '4Gi',
      });
    });

    // // Actual request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });
  });

  it('Create a new predictive deployment and submit', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.PREDICTIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    // TODO: visit directly when plugin is enabled
    cy.visitWithLogin('/modelServing/test-project?devFeatureFlags=Model+Serving+Plugin%3Dtrue');
    modelServingGlobal.findDeployModelButton().click();

    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelTypeSelectOption('Generative AI model (e.g. LLM)').should('exist');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist').click();
    modelServingWizard.findModelLocationSelect().should('exist');
    modelServingWizard.findModelLocationSelectOption('URI - v1').should('exist').click();
    modelServingWizard.findUrilocationInput().should('exist').type('https://test');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizard.findModelDeploymentStep().should('be.enabled');
    modelServingWizard.findAdvancedOptionsStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    modelServingWizard.findAdvancedOptionsStep().should('be.disabled');
    hardwareProfileSection.findNewHardwareProfileSelector().click();
    cy.get('[role="option"]').contains('gamma', { matchCase: false }).click();

    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelFormatSelect().should('exist');
    modelServingWizard.findModelFormatSelectOption('vLLM').should('not.exist');
    modelServingWizard.findModelFormatSelectOption('openvino_ir - opset1').should('exist').click();
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 3: Advanced Options
    // Model access & Token authentication
    modelServingWizard.findAdvancedOptionsStep().should('be.enabled');
    modelServingWizard.findExternalRouteCheckbox().click();
    modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
    modelServingWizard.findTokenAuthenticationCheckbox().click();
    modelServingWizard.findTokenWarningAlert().should('exist');

    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 4: Summary
    modelServingWizard.findSubmitButton().should('be.enabled').click();

    // dry run request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      console.log('actual:  ack ack 44', interception.request.body);
      expect(interception.request.body).to.containSubset({
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: 'test-model',
          namespace: 'test-project',
          annotations: {
            'openshift.io/display-name': 'test-model',
            'opendatahub.io/model-type': 'predictive',
            'opendatahub.io/hardware-profile-name': 'gamma',
            'opendatahub.io/hardware-profile-namespace': 'opendatahub',
          },
          labels: {
            'networking.kserve.io/visibility': 'exposed',
            'opendatahub.io/dashboard': 'true',
          },
        },
      });

      // Validate spec separately to avoid containSubset issues with complex nested objects
      const requestBody = interception.request.body;
      expect(requestBody.spec).to.exist;
      expect(requestBody.spec.predictor).to.exist;
      expect(requestBody.spec.predictor.model).to.exist;

      // Validate model format
      expect(requestBody.spec.predictor.model.modelFormat).to.deep.equal({
        name: 'openvino_ir',
        version: 'opset1',
      });

      // Validate resources (from gamma hardware profile)
      const { resources } = requestBody.spec.predictor.model;
      expect(resources.requests).to.deep.equal({
        cpu: 8,
        memory: '16Gi',
        'nvidia.com/gpu': 1,
      });
      expect(resources.limits).to.deep.equal({
        cpu: 8,
        memory: '16Gi',
        'nvidia.com/gpu': 1,
      });
    });

    // Actual request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });
  });

  it('Edit an existing deployment', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.PREDICTIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([
        mockInferenceServiceK8sResource({
          modelType: ServingRuntimeModelType.PREDICTIVE,
          hardwareProfileName: 'alpha',
          hardwareProfileNamespace: 'opendatahub',
          resources: {
            requests: {
              cpu: '4',
              memory: '8Gi',
            },
            limits: {
              cpu: '4',
              memory: '8Gi',
            },
          },
        }),
        mockInferenceServiceK8sResource({ storageUri: 'https://test' }),
      ]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    // TODO: visit directly when plugin is enabled
    cy.visitWithLogin('/modelServing/test-project?devFeatureFlags=Model+Serving+Plugin%3Dtrue');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();

    // Step 1: Model source
    modelServingWizardEdit.findModelSourceStep().should('be.enabled');
    modelServingWizardEdit.findNextButton().should('be.enabled');

    // Need to update this when you extract model type from deployment
    modelServingWizardEdit
      .findModelTypeSelectOption('Predictive model')
      .should('have.attr', 'aria-selected', 'true');

    modelServingWizardEdit.findModelLocationSelect().should('exist');
    modelServingWizardEdit.findUrilocationInput().should('have.value', 'https://test');

    modelServingWizardEdit.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizardEdit.findModelDeploymentStep().should('be.enabled');
    modelServingWizardEdit.findAdvancedOptionsStep().should('be.enabled');
    modelServingWizardEdit.findNextButton().should('be.enabled');

    modelServingWizardEdit
      .findModelDeploymentNameInput()
      .should('have.value', 'Test Inference Service');
    modelServingWizardEdit.findModelDeploymentNameInput().type('test-model');
    hardwareProfileSection.findNewHardwareProfileSelector().should('be.visible');
    hardwareProfileSection.findNewHardwareProfileSelector().should('contain.text', 'alpha');
    modelServingWizardEdit.findNextButton().should('be.enabled').click();

    // Step 3: Advanced options
    modelServingWizardEdit.findAdvancedOptionsStep().should('be.enabled');
    modelServingWizardEdit.findExternalRouteCheckbox().should('be.checked');
    modelServingWizardEdit.findTokenAuthenticationCheckbox().click();
    modelServingWizardEdit.findServiceAccountByIndex(0).should('have.value', 'default-name');
    modelServingWizardEdit.findNextButton().should('be.enabled').click();
  });
});
