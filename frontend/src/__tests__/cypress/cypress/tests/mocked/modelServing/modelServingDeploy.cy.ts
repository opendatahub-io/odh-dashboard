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
import { mockGlobalScopedHardwareProfiles } from '#~/__mocks__/mockHardwareProfile';

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
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockGlobalScopedHardwareProfiles),
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

  it('Create a new generative deployment and submit', () => {
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
    hardwareProfileSection.findHardwareProfileSearchSelector().click();
    const globalScopedHardwareProfile = hardwareProfileSection.getGlobalScopedHardwareProfile();
    globalScopedHardwareProfile
      .find()
      .findByRole('menuitem', {
        name: /Medium/,
        hidden: true,
      })
      .click();
    hardwareProfileSection.findGlobalScopedLabel().should('exist');
    modelServingWizard.findModelFormatSelect().should('not.exist');
    modelServingWizard.findNextButton().should('be.enabled').click();
  });

  it('Create a new predictive deployment and submit', () => {
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
    modelServingWizard.findModelTypeSelectOption('Generative AI model (e.g. LLM)').should('exist');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist').click();
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizard.findModelDeploymentStep().should('be.enabled');
    modelServingWizard.findAdvancedOptionsStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    modelServingWizard.findAdvancedOptionsStep().should('be.disabled');
    hardwareProfileSection.findHardwareProfileSearchSelector().click();
    const globalScopedHardwareProfile = hardwareProfileSection.getGlobalScopedHardwareProfile();
    globalScopedHardwareProfile
      .find()
      .findByRole('menuitem', {
        name: /Medium/,
        hidden: true,
      })
      .click();
    hardwareProfileSection.findGlobalScopedLabel().should('exist');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelFormatSelect().should('exist');
    modelServingWizard.findModelFormatSelectOption('vLLM').should('not.exist');
    modelServingWizard.findModelFormatSelectOption('openvino_ir - opset1').should('exist').click();
    modelServingWizard.findNextButton().should('be.enabled').click();
  });

  it('Edit an existing deployment', () => {
    initIntercepts();
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([
        mockInferenceServiceK8sResource({
          modelType: ServingRuntimeModelType.PREDICTIVE,
          hardwareProfileName: 'large-profile',
          hardwareProfileNamespace: 'opendatahub',
          resources: {
            requests: {
              cpu: '4',
              memory: '8Gi',
            },
            limits: {
              cpu: '8',
              memory: '16Gi',
            },
          },
        }),
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
    modelServingWizardEdit.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizardEdit.findModelDeploymentStep().should('be.enabled');
    modelServingWizardEdit.findAdvancedOptionsStep().should('be.enabled');
    modelServingWizardEdit.findNextButton().should('be.enabled');

    modelServingWizardEdit
      .findModelDeploymentNameInput()
      .should('have.value', 'Test Inference Service');
    modelServingWizardEdit.findModelDeploymentNameInput().type('test-model');
    hardwareProfileSection.findHardwareProfileSearchSelector().should('be.visible');
    hardwareProfileSection
      .findHardwareProfileSearchSelector()
      .should('contain.text', 'Large Profile');
    hardwareProfileSection.findGlobalScopedLabel().should('exist');
    modelServingWizardEdit.findNextButton().should('be.enabled').click();
  });
});
