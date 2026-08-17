import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mock404Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import { mockStandardModelServingTemplateK8sResources } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { IdentifierResourceType } from '@odh-dashboard/k8s-core';
import { ServingRuntimeModelType } from '@odh-dashboard/model-serving/shared/types';
import {
  mockGlobalScopedHardwareProfiles,
  mockHardwareProfile,
} from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
  mockOciConnectionTypeConfigMap,
} from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { mockURISecretK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  PVCModel,
  ProjectModel,
  RoleBindingModel,
  RoleModel,
  SecretModel,
  ServiceAccountModel,
  ServingRuntimeModel,
  TemplateModel,
} from '@odh-dashboard/cypress/cypress/utils/models';
import {
  modelServingGlobal,
  modelServingWizard,
} from '@odh-dashboard/cypress/cypress/pages/modelServing';
import {
  ModelLocationSelectOption,
  ModelTypeLabel,
} from '@odh-dashboard/cypress/cypress/utils/modelServingConstants';

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' },
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableNIMModelServing: true,
      disableKServe: false,
      deploymentWizardYAMLViewer: true,
      genAiStudio: true,
    }),
  );
  cy.interceptOdh(
    'GET /api/namespaces/:namespace/:context',
    { path: { namespace: 'test-project', context: '*' } },
    { applied: true },
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
    mockConnectionTypeConfigMap({
      displayName: 'S3',
      name: 's3',
      category: ['existing-category'],
      fields: mockModelServingFields,
    }),
    mockOciConnectionTypeConfigMap(),
  ]);

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList([
      mockGlobalScopedHardwareProfiles[0],
      mockGlobalScopedHardwareProfiles[1],
      mockHardwareProfile({
        name: 'nvidia-profile',
        displayName: 'NVIDIA GPU Profile',
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
        ],
      }),
    ]),
  );

  cy.interceptK8sList(
    { model: SecretModel, ns: 'test-project' },
    mockK8sResourceList([
      mockURISecretK8sResource({ namespace: 'test-project' }),
      mockURISecretK8sResource({
        namespace: 'test-project',
        name: 'test-uri-secret-2',
        displayName: 'Test URI Secret 2',
      }),
    ]),
  );

  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(mockStandardModelServingTemplateK8sResources(), {
      namespace: 'opendatahub',
    }),
  );

  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8sList(PVCModel, mockK8sResourceList([mockPVCK8sResource({})]));

  cy.interceptK8s(
    'POST',
    { model: InferenceServiceModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: mockInferenceServiceK8sResource({
        name: 'test-model',
        modelType: ServingRuntimeModelType.GENERATIVE,
      }),
    },
  ).as('createInferenceService');

  cy.interceptK8s(
    'POST',
    { model: ServingRuntimeModel, ns: 'test-project' },
    { statusCode: 200, body: mockServingRuntimeK8sResource({}) },
  ).as('createServingRuntime');

  cy.interceptK8s(
    'POST',
    { model: ServiceAccountModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: {
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        metadata: { name: 'test-model-sa', namespace: 'test-project' },
      },
    },
  ).as('createServiceAccount');

  cy.interceptK8s(
    'POST',
    { model: RoleModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'Role',
        metadata: { name: 'test-model-view-role', namespace: 'test-project' },
      },
    },
  ).as('createRole');

  cy.interceptK8s(
    'POST',
    { model: RoleBindingModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'RoleBinding',
        metadata: { name: 'test-model-view', namespace: 'test-project' },
      },
    },
  ).as('createRoleBinding');

  cy.interceptK8s(
    'POST',
    { model: SecretModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: { name: 'test-model-token', namespace: 'test-project' },
      },
    },
  ).as('createSecret');

  cy.interceptK8s(
    'GET',
    { model: ServiceAccountModel, ns: 'test-project', name: 'test-model-sa' },
    { statusCode: 404, body: mock404Error({}) },
  ).as('getServiceAccount');

  cy.interceptK8s(
    'GET',
    { model: RoleModel, ns: 'test-project', name: 'test-model-view-role' },
    { statusCode: 404, body: mock404Error({}) },
  ).as('getRole');

  cy.interceptK8s(
    'GET',
    { model: RoleBindingModel, ns: 'test-project', name: 'test-model-view' },
    { statusCode: 404, body: mock404Error({}) },
  ).as('getRoleBinding');
};

describe('Model Deployment Tracking Events', () => {
  it('should fire Model Deployed event on successful deployment', () => {
    initIntercepts();
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();

    // Step 1: Model source — select generative model with existing connection
    modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).should('exist').click();
    modelServingWizard
      .findModelLocationSelectOption(ModelLocationSelectOption.EXISTING)
      .should('exist')
      .click();
    modelServingWizard.findExistingConnectionSelect().click();
    modelServingWizard
      .findExistingConnectionSelectOption('Test URI Secret')
      .should('exist')
      .click();
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment — mirrors the passing pattern from modelServingDeploy.cy.ts
    modelServingWizard.findModelDeploymentStep().should('be.enabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    modelServingWizard.selectDeploymentMethodByKey('legacy');
    modelServingWizard.findModelServerAutoSelectRadio().should('not.be.checked');
    modelServingWizard
      .findServingRuntimeTemplateSearchSelector()
      .should('contain.text', 'Select a serving runtime template');
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.selectGlobalScopedTemplateOption('vLLM NVIDIA');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 3: Advanced options — enable external route for token auth
    modelServingWizard.findExternalRouteCheckbox().click();
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 4: Review & Deploy

    // Step 4: Review — stub window.analytics.track to capture tracking events in non-dev builds
    cy.window().then((win) => {
      Object.defineProperty(win, 'analytics', {
        value: { track: cy.stub().as('analyticsTrack') },
        writable: true,
        configurable: true,
      });
    });

    modelServingWizard.findSubmitButton().click();

    // Two InferenceService POSTs: first is a dry-run validation, second is the actual create
    cy.wait('@createInferenceService');
    cy.wait('@createInferenceService');

    cy.get('@analyticsTrack').should('be.calledWithMatch', 'Model Deployed');
  });

  it('should fire Model Deployed cancel event when user exits via ExitDeploymentModal', () => {
    initIntercepts();
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();

    // Start filling out the form so it's dirty
    modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();

    // Stub window.analytics.track before triggering the cancel event
    cy.window().then((win) => {
      Object.defineProperty(win, 'analytics', {
        value: { track: cy.stub().as('analyticsTrack') },
        writable: true,
        configurable: true,
      });
    });

    // Cancel from wizard — click Cancel button then confirm discard
    cy.findByRole('button', { name: 'Cancel' }).click();
    modelServingWizard.findDiscardButton().click();

    cy.get('@analyticsTrack').should(
      'be.calledWithMatch',
      'Model Deployed',
      Cypress.sinon.match.has('outcome', 'cancel'),
    );
  });

  it('should fire Model Deployed error event when deploy fails', () => {
    initIntercepts();
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    // Override the POST to fail
    cy.interceptK8s(
      'POST',
      { model: InferenceServiceModel, ns: 'test-project' },
      {
        statusCode: 500,
        body: {
          kind: 'Status',
          apiVersion: 'v1',
          status: 'Failure',
          message: 'Internal server error',
          reason: 'InternalError',
          code: 500,
        },
      },
    ).as('createInferenceServiceFail');

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();

    // Step 1: Model source — select generative model with existing connection
    modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).should('exist').click();
    modelServingWizard
      .findModelLocationSelectOption(ModelLocationSelectOption.EXISTING)
      .should('exist')
      .click();
    modelServingWizard.findExistingConnectionSelect().click();
    modelServingWizard
      .findExistingConnectionSelectOption('Test URI Secret')
      .should('exist')
      .click();
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment — mirrors the passing pattern from modelServingDeploy.cy.ts
    modelServingWizard.findModelDeploymentStep().should('be.enabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    modelServingWizard.selectDeploymentMethodByKey('legacy');
    modelServingWizard.findModelServerAutoSelectRadio().should('not.be.checked');
    modelServingWizard
      .findServingRuntimeTemplateSearchSelector()
      .should('contain.text', 'Select a serving runtime template');
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.selectGlobalScopedTemplateOption('vLLM NVIDIA');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 3: Advanced options
    modelServingWizard.findExternalRouteCheckbox().click();
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 4: Review — stub window.analytics.track to capture tracking events in non-dev builds
    cy.window().then((win) => {
      Object.defineProperty(win, 'analytics', {
        value: { track: cy.stub().as('analyticsTrack') },
        writable: true,
        configurable: true,
      });
    });

    modelServingWizard.findSubmitButton().click();

    cy.wait('@createInferenceServiceFail');

    cy.get('@analyticsTrack').should(
      'be.calledWithMatch',
      'Model Deployed',
      Cypress.sinon.match.has('success', false),
    );
  });
});
