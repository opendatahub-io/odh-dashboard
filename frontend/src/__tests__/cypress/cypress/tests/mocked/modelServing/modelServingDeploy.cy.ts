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
  InferenceServiceModel,
  ProjectModel,
  ServingRuntimeModel,
  TemplateModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { ServingRuntimePlatform } from '#~/types';

const initIntercepts = () => {
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
    }),
  );
  cy.interceptOdh('GET /api/components', null, []);

  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(
      [
        mockServingRuntimeTemplateK8sResource({
          name: 'template-2',
          displayName: 'OpenVINO',
          platforms: [ServingRuntimePlatform.SINGLE],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-3',
          displayName: 'Caikit',
          platforms: [ServingRuntimePlatform.SINGLE],
          supportedModelFormats: [
            {
              autoSelect: true,
              name: 'openvino_ir',
              version: 'opset1',
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
};

describe('Model Serving Deploy Wizard', () => {
  it('Navigate into and out of the wizard', () => {
    initIntercepts();
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

  it('Create a new deployment and submit', () => {
    initIntercepts();
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
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizard.findModelDeploymentStep().should('be.enabled');
    modelServingWizard.findAdvancedOptionsStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    modelServingWizard.findAdvancedOptionsStep().should('be.enabled');
    modelServingWizard.findNextButton().should('be.enabled').click();
  });

  it('Edit an existing deployment', () => {
    initIntercepts();
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
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();

    // Step 1: Model source
    modelServingWizardEdit.findModelSourceStep().should('be.enabled');
    modelServingWizardEdit.findNextButton().should('be.disabled');

    // Need to update this when you extract model type from deployment
    modelServingWizardEdit.findModelTypeSelectOption('Predictive model').should('exist');
    modelServingWizardEdit
      .findModelTypeSelectOption('Generative AI model (e.g. LLM)')
      .should('exist')
      .click();
    modelServingWizardEdit.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizardEdit.findModelDeploymentStep().should('be.enabled');
    modelServingWizardEdit.findAdvancedOptionsStep().should('be.enabled');
    modelServingWizardEdit.findNextButton().should('be.enabled');

    modelServingWizardEdit
      .findModelDeploymentNameInput()
      .should('have.value', 'Test Inference Service');
    modelServingWizardEdit.findModelDeploymentNameInput().type('test-model');
    modelServingWizardEdit.findNextButton().should('be.enabled').click();
  });
});
