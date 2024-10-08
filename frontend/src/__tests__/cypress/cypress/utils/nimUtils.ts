import type { MockDashboardConfigType } from '~/__mocks__';
import {
  mock200Status,
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockSecretK8sResource,
} from '~/__mocks__';
import {
  AcceleratorProfileModel,
  ConfigMapModel,
  InferenceServiceModel,
  ProjectModel,
  PVCModel,
  SecretModel,
  ServingRuntimeModel,
  TemplateModel,
} from '~/__tests__/cypress/cypress/utils/models';
import {
  mockNimImages,
  mockNimInferenceService,
  mockNimModelPVC,
  mockNimProject,
  mockNimServingResource,
  mockNimServingRuntime,
  mockNimServingRuntimeTemplate,
  mockNvidiaNimAccessSecret,
  mockNvidiaNimImagePullSecret,
} from '~/__mocks__/mockNimResource';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import type { InferenceServiceKind } from '~/k8sTypes';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';

export function findNimModelDeployButton(): Cypress.Chainable<JQuery> {
  return findNimModelServingPlatformCard().findByTestId('nim-serving-deploy-button');
}

export function findNimModelServingPlatformCard(): Cypress.Chainable<JQuery> {
  return cy.findByTestId('nvidia-nim-model-serving-platform-card');
}

export function findServingPlatformLabel(): Cypress.Chainable<JQuery> {
  return cy.findByTestId('serving-platform-label');
}

export const modalDialogTitle = 'Deploy model with NVIDIA NIM';

export function validateNvidiaNimModel(
  deployButtonElement: Cypress.Chainable<JQuery<HTMLElement>>,
): void {
  deployButtonElement.click();
  cy.contains(modalDialogTitle);
  cy.contains('Configure properties for deploying your model using an NVIDIA NIM.');

  //find the form label Project with value as the Test Project
  cy.contains('label', 'Project').parent().next().find('p').should('have.text', 'Test Project');

  //close the model window
  cy.get('div[role="dialog"]').get('button[aria-label="Close"]').click();

  // now the nvidia nim window should not be visible.
  cy.contains(modalDialogTitle).should('not.exist');

  deployButtonElement.click();
  //validate model submit button is disabled without entering form data
  cy.findByTestId('modal-submit-button').should('be.disabled');
  //validate nim modal cancel button
  cy.findByTestId('modal-cancel-button').click();
  cy.contains(modalDialogTitle).should('not.exist');
}

export function validateNimModelsTable(): void {
  // Table is visible and has 2 rows (2nd is the hidden expandable row)
  const kserveTable = projectDetails.findKserveModelsTable();
  kserveTable.find('tbody').find('tr').should('have.length', 2);

  // First row matches the NIM inference service details
  const kserveTableRow = projectDetails.getKserveTableRow('Test Name');
  kserveTableRow.findColumn('Name').should('have.text', 'Test Name');
  kserveTableRow.findColumn('Serving Runtime').should('have.text', 'NVIDIA NIM');
  kserveTableRow.findColumn('Inference endpoint').should('have.text', 'Internal Service');
  kserveTableRow.findColumn('API protocol').should('have.text', 'REST');

  // Validate Internal Service tooltip and close it
  kserveTableRow.findInternalServiceButton().click();
  kserveTableRow
    .findInternalServicePopover()
    .findByText('Internal Service can be accessed inside the cluster')
    .should('exist');
  kserveTableRow.findInternalServicePopoverCloseButton().click();

  // Open toggle to validate Model details
  kserveTableRow.findDetailsTriggerButton().click();
  const kserveDetailsTableRow = projectDetails.getKserveTableDetailsRow('Test Name');
  kserveDetailsTableRow.findValueFor('Framework').should('have.text', 'arctic-embed-l');
  kserveDetailsTableRow.findValueFor('Model server replicas').should('have.text', '1');
  kserveDetailsTableRow.findValueFor('Model server size').should('contain.text', 'Small');
  kserveDetailsTableRow
    .findValueFor('Model server size')
    .should('contain.text', '1 CPUs, 4Gi Memory requested');
  kserveDetailsTableRow
    .findValueFor('Model server size')
    .should('contain.text', '2 CPUs, 8Gi Memory limit');
  kserveDetailsTableRow.findValueFor('Accelerator').should('have.text', 'No accelerator selected');

  kserveTableRow.findDetailsTriggerButton().click();
}

/* ###################################################
   ###### Interception Initialization Utilities ######
   ################################################### */

type EnableNimConfigType = {
  hasAllModels?: boolean;
};

// intercept all APIs required for enabling NIM
export const initInterceptsToEnableNim = ({ hasAllModels = false }: EnableNimConfigType): void => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        kserve: true,
        'model-mesh': true,
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe: false,
      disableModelMesh: false,
      disableNIMModelServing: false,
    }),
  );

  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockNimProject(hasAllModels)]));

  const templateMock = mockNimServingRuntimeTemplate();
  cy.interceptK8sList(TemplateModel, mockK8sResourceList([templateMock]));
  cy.interceptK8s(TemplateModel, templateMock);

  cy.interceptK8sList(
    AcceleratorProfileModel,
    mockK8sResourceList([mockAcceleratorProfile({ namespace: 'opendatahub' })]),
  );

  cy.interceptOdh('GET /api/accelerators', {
    configured: true,
    available: { 'nvidia.com/gpu': 1 },
    total: { 'nvidia.com/gpu': 1 },
    allocated: { 'nvidia.com/gpu': 1 },
  });
};

// intercept all APIs required for deploying new NIM models in existing projects
export const initInterceptsToDeployModel = (nimInferenceService: InferenceServiceKind): void => {
  cy.interceptK8s(ConfigMapModel, mockNimImages());
  cy.interceptK8s('POST', SecretModel, mockSecretK8sResource({}));
  cy.interceptK8s('POST', InferenceServiceModel, nimInferenceService).as('createInferenceService');

  cy.interceptK8s('POST', ServingRuntimeModel, mockNimServingRuntime()).as('createServingRuntime');

  cy.interceptOdh(
    `GET /api/nim-serving/:resource`,
    { path: { resource: 'nvidia-nim-images-data' } },
    mockNimServingResource(mockNimImages()),
  );

  cy.interceptOdh(
    `GET /api/nim-serving/:resource`,
    { path: { resource: 'nvidia-nim-access' } },
    mockNimServingResource(mockNvidiaNimAccessSecret()),
  );

  cy.interceptOdh(
    `GET /api/nim-serving/:resource`,
    { path: { resource: 'nvidia-nim-image-pull' } },
    mockNimServingResource(mockNvidiaNimImagePullSecret()),
  );

  cy.interceptK8s('POST', PVCModel, mockNimModelPVC());
};

// intercept all APIs required for deleting an existing NIM models
export const initInterceptsForDeleteModel = (): void => {
  // create initial inference and runtime
  cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
  cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

  // intercept delete inference request
  cy.interceptK8s(
    'DELETE',
    {
      model: InferenceServiceModel,
      ns: 'test-project',
      name: 'test-name',
    },
    mock200Status({}),
  ).as('deleteInference');

  // intercept delete runtime request
  cy.interceptK8s(
    'DELETE',
    {
      model: ServingRuntimeModel,
      ns: 'test-project',
      name: 'test-name',
    },
    mock200Status({}),
  ).as('deleteRuntime');
};

// intercept all APIs required for verifying NIM enablement
export const initInterceptorsValidatingNimEnablement = (
  dashboardConfig: MockDashboardConfigType,
  disableServingRuntime = false,
): void => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig(dashboardConfig));

  if (!disableServingRuntime) {
    const templateMock = mockNimServingRuntimeTemplate();
    cy.interceptK8sList(TemplateModel, mockK8sResourceList([templateMock]));
    cy.interceptK8s(TemplateModel, templateMock);
  }

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ hasAnnotations: true })]),
  );
};
