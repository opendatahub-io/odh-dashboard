import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mock200Status } from '~/__mocks__/mockK8sStatus';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import {
  mockInvalidTemplateK8sResource,
  mockServingRuntimeTemplateK8sResource,
} from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  inferenceServiceModal,
  modelServingGlobal,
} from '~/__tests__/cypress/cypress/pages/modelServing';
import {
  InferenceServiceModel,
  ProjectModel,
  SecretModel,
  ServingRuntimeModel,
  TemplateModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { ServingRuntimePlatform } from '~/types';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { asClusterAdminUser } from '~/__tests__/cypress/cypress/utils/users';
import { testPagination } from '~/__tests__/cypress/cypress/utils/pagination';

type HandlersProps = {
  disableKServeConfig?: boolean;
  disableModelMeshConfig?: boolean;
  projectEnableModelMesh?: boolean;
  servingRuntimes?: ServingRuntimeKind[];
  inferenceServices?: InferenceServiceKind[];
  delayInferenceServices?: boolean;
  delayServingRuntimes?: boolean;
};

const initIntercepts = ({
  disableKServeConfig,
  disableModelMeshConfig,
  projectEnableModelMesh,
  servingRuntimes = [mockServingRuntimeK8sResource({})],
  inferenceServices = [mockInferenceServiceK8sResource({})],
  delayInferenceServices,
  delayServingRuntimes,
}: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: { kserve: true, 'model-mesh': true },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe: disableKServeConfig,
      disableModelMesh: disableModelMeshConfig,
    }),
  );
  cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(servingRuntimes));
  cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList(inferenceServices));
  cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));
  cy.interceptK8sList(
    ServingRuntimeModel,
    mockK8sResourceList(servingRuntimes, { namespace: 'modelServing' }),
  );
  cy.interceptK8sList(
    { model: ServingRuntimeModel, ns: undefined },
    {
      delay: delayServingRuntimes ? 500 : 0, //TODO: Remove the delay when we add support for loading states
      body: mockK8sResourceList(servingRuntimes),
    },
  ).as('getServingRuntimes');
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: 'modelServing' },
    mockK8sResourceList(inferenceServices),
  );
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: undefined },
    {
      delay: delayInferenceServices ? 500 : 0, //TODO: Remove the delay when we add support for loading states
      body: mockK8sResourceList(inferenceServices),
    },
  ).as('getInferenceServices');
  cy.interceptK8s(
    'POST',
    { model: InferenceServiceModel, ns: 'test-project' },
    { statusCode: 500 },
  ).as('inferenceServicesError');
  cy.interceptK8sList(
    SecretModel,
    mockK8sResourceList([mockSecretK8sResource({ namespace: 'modelServing' })]),
  );
  cy.interceptK8s(ServingRuntimeModel, mockServingRuntimeK8sResource({}));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: projectEnableModelMesh })]),
  );
  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(
      [
        mockServingRuntimeTemplateK8sResource({
          name: 'template-1',
          displayName: 'Multi Platform',
          platforms: [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-2',
          displayName: 'Caikit',
          platforms: [ServingRuntimePlatform.SINGLE],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-3',
          displayName: 'New OVMS Server',
          platforms: [ServingRuntimePlatform.MULTI],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-4',
          displayName: 'Serving Runtime with No Annotations',
        }),
        mockInvalidTemplateK8sResource({}),
      ],
      { namespace: 'opendatahub' },
    ),
  );
};

describe('Model Serving Global', () => {
  it('Empty State No Serving Runtime', () => {
    initIntercepts({
      disableKServeConfig: false,
      disableModelMeshConfig: false,
      projectEnableModelMesh: true,
      servingRuntimes: [],
      inferenceServices: [],
    });

    modelServingGlobal.visit('test-project');

    modelServingGlobal.shouldBeEmpty();

    // Test that the button is enabled
    modelServingGlobal.findGoToProjectButton().should('be.enabled');
  });

  it('Empty State No Inference Service', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      inferenceServices: [],
    });

    modelServingGlobal.visit('test-project');

    modelServingGlobal.shouldBeEmpty();

    modelServingGlobal.findDeployModelButton().click();

    // test that you can not submit on empty
    inferenceServiceModal.shouldBeOpen();
    inferenceServiceModal.findSubmitButton().should('be.disabled');
  });

  it('All projects loading and cancel', () => {
    asClusterAdminUser();
    initIntercepts({
      delayInferenceServices: true,
      delayServingRuntimes: true,
      servingRuntimes: [],
      inferenceServices: [],
    });

    // Visit the all-projects view (no project name passed here)
    modelServingGlobal.visit();

    modelServingGlobal.shouldWaitAndCancel();

    modelServingGlobal.shouldBeEmpty();

    cy.wait('@getServingRuntimes').then((response) => {
      expect(response.error?.message).to.eq('Socket closed before finished writing response');
    });

    cy.wait('@getInferenceServices').then((response) => {
      expect(response.error?.message).to.eq('Socket closed before finished writing response');
    });
  });

  it('Empty State No Project Selected', () => {
    initIntercepts({ inferenceServices: [] });

    // Visit the all-projects view (no project name passed here)
    modelServingGlobal.visit();

    modelServingGlobal.shouldBeEmpty();

    // Test that the button is disabled
    modelServingGlobal.findDeployModelButton().should('have.attr', 'aria-disabled');

    // Test that the tooltip appears on hover of the disabled button
    modelServingGlobal.findDeployModelButton().trigger('mouseenter');
    modelServingGlobal.findNoProjectSelectedTooltip().should('be.visible');
  });

  it('Delete model', () => {
    initIntercepts({});

    cy.interceptK8s(
      'DELETE',
      {
        model: InferenceServiceModel,
        ns: 'test-project',
        name: 'test-inference-service',
      },
      mock200Status({}),
    ).as('deleteModel');

    modelServingGlobal.visit('test-project');

    // user flow for deleting a project
    modelServingGlobal
      .getModelRow('Test Inference Service')
      .findKebabAction(/^Delete/)
      .click();

    // Test that can submit on valid form
    deleteModal.shouldBeOpen();
    deleteModal.findSubmitButton().should('be.disabled');

    deleteModal.findInput().type('Test Inference Service');
    deleteModal.findSubmitButton().should('be.enabled');

    // add trailing space
    deleteModal.findInput().type('x');
    deleteModal.findSubmitButton().should('be.disabled');

    deleteModal.findInput().clear().type('Test Inference Service');
    deleteModal.findSubmitButton().should('be.enabled');

    deleteModal.findSubmitButton().click();

    cy.wait('@deleteModel');
  });

  it('Edit model', () => {
    initIntercepts({});

    cy.interceptK8s(
      'PUT',
      ServingRuntimeModel,
      mockServingRuntimeK8sResource({ name: 'test-model' }),
    ).as('editModel');

    modelServingGlobal.visit('test-project');

    // user flow for editing a project
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();

    // test that you can not submit on empty
    inferenceServiceModal.shouldBeOpen();
    inferenceServiceModal.findModelNameInput().clear();
    inferenceServiceModal.findLocationPathInput().clear();
    inferenceServiceModal.findSubmitButton().should('be.disabled');

    // test with invalid path name
    inferenceServiceModal.findLocationPathInput().type('/');
    inferenceServiceModal
      .findLocationPathInputError()
      .should('be.visible')
      .contains('The path must not point to a root folder');
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findLocationPathInput().clear();
    inferenceServiceModal.findLocationPathInput().type('test//path');
    inferenceServiceModal
      .findLocationPathInputError()
      .should('be.visible')
      .contains('Invalid path format');
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findLocationPathInput().clear();

    // test that you can update the name to a different name
    inferenceServiceModal.findModelNameInput().type('Updated Model Name');
    inferenceServiceModal.findLocationPathInput().type('test-model/');
    inferenceServiceModal.findSubmitButton().should('be.enabled');

    // test that user cant upload on an empty new secret
    inferenceServiceModal.findNewDataConnectionOption().click();
    inferenceServiceModal.findLocationPathInput().clear();
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findLocationPathInput().type('/');
    inferenceServiceModal.findSubmitButton().should('be.disabled');

    // test that adding required values validates submit
    inferenceServiceModal.findLocationNameInput().type('Test Name');
    inferenceServiceModal.findLocationAccessKeyInput().type('test-key');
    inferenceServiceModal.findLocationSecretKeyInput().type('test-secret-key');
    inferenceServiceModal.findLocationEndpointInput().type('test-endpoint');
    inferenceServiceModal.findLocationBucketInput().type('test-bucket');
    inferenceServiceModal.findLocationPathInput().clear();
    inferenceServiceModal.findLocationPathInput().type('test-model/');
    inferenceServiceModal.findSubmitButton().should('be.enabled');

    inferenceServiceModal.findSubmitButton().click();

    cy.wait('@editModel').then((interception) => {
      const servingRuntimeMock = mockServingRuntimeK8sResource({ displayName: 'test-model' });
      const servingRuntimeMockNoResources = mockServingRuntimeK8sResource({
        displayName: 'test-model',
        disableResources: true,
        disableReplicas: true,
        disableModelMeshAnnotations: true,
      }); // KServe should send resources in ServingRuntime after migration
      delete servingRuntimeMock.metadata.annotations?.['enable-auth'];
      delete servingRuntimeMock.metadata.annotations?.['enable-route'];
      delete servingRuntimeMock.spec.replicas;
      expect(interception.request.url).to.include('?dryRun=All'); //dry run request
      expect(interception.request.body).to.eql(servingRuntimeMockNoResources);
    });
  });

  it('Create model', () => {
    initIntercepts({
      projectEnableModelMesh: true,
    });

    cy.interceptK8s('POST', SecretModel, mockSecretK8sResource({}));
    cy.interceptK8s(
      'POST',
      InferenceServiceModel,
      mockInferenceServiceK8sResource({
        name: 'test-name',
        path: 'test-model/',
        displayName: 'Test Name',
        isModelMesh: true,
      }),
    ).as('createInferenceService');

    modelServingGlobal.visit('test-project');

    modelServingGlobal.findDeployModelButton().click();

    // test that you can not submit on empty
    inferenceServiceModal.shouldBeOpen();
    inferenceServiceModal.findSubmitButton().should('be.disabled');

    // test filling in minimum required fields
    inferenceServiceModal.findModelNameInput().type('Test Name');
    inferenceServiceModal.findServingRuntimeSelect().findSelectOption('OVMS Model Serving').click();
    inferenceServiceModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findExistingConnectionSelect().findSelectOption('Test Secret').click();
    inferenceServiceModal.findLocationPathInput().type('test-model/');
    inferenceServiceModal.findSubmitButton().should('be.enabled');
    inferenceServiceModal.findNewDataConnectionOption().click();
    inferenceServiceModal.findLocationPathInput().clear();
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findLocationPathInput().type('/');
    inferenceServiceModal
      .findLocationPathInputError()
      .should('be.visible')
      .contains('The path must not point to a root folder');
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findLocationPathInput().clear();
    inferenceServiceModal.findLocationPathInput().type('test//path');
    inferenceServiceModal
      .findLocationPathInputError()
      .should('be.visible')
      .contains('Invalid path format');
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findLocationPathInput().clear();
    inferenceServiceModal.findLocationNameInput().type('Test Name');
    inferenceServiceModal.findLocationAccessKeyInput().type('test-key');
    inferenceServiceModal.findLocationSecretKeyInput().type('test-secret-key');
    inferenceServiceModal.findLocationEndpointInput().type('test-endpoint');
    inferenceServiceModal.findLocationBucketInput().type('test-bucket');
    inferenceServiceModal.findLocationPathInput().type('test-model/');
    inferenceServiceModal.findSubmitButton().should('be.enabled');

    inferenceServiceModal.findSubmitButton().click();

    //dry run request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.eql({
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: 'test-name',
          namespace: 'test-project',
          labels: { 'opendatahub.io/dashboard': 'true' },
          annotations: {
            'openshift.io/display-name': 'Test Name',
            'serving.kserve.io/deploymentMode': 'ModelMesh',
          },
        },
        spec: {
          predictor: {
            model: {
              modelFormat: { name: 'onnx', version: '1' },
              runtime: 'test-model',
              storage: { key: 'test-secret', path: 'test-model/' },
            },
          },
        },
      });
    });

    // Actaul request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry run request and 1 actaul request
    });
  });

  it('Create model error', () => {
    initIntercepts({
      projectEnableModelMesh: true,
    });
    modelServingGlobal.visit('test-project');

    modelServingGlobal.findDeployModelButton().click();

    // test that you can not submit on empty
    inferenceServiceModal.shouldBeOpen();
    inferenceServiceModal.findSubmitButton().should('be.disabled');

    // test filling in minimum required fields
    inferenceServiceModal.findModelNameInput().type('trigger-error');
    inferenceServiceModal.findServingRuntimeSelect().findSelectOption('OVMS Model Serving').click();
    inferenceServiceModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findExistingConnectionSelect().findSelectOption('Test Secret').click();
    inferenceServiceModal.findLocationPathInput().type('test-model/');
    inferenceServiceModal.findSubmitButton().should('be.enabled');
    inferenceServiceModal.findLocationPathInput().type('test-model/');
    inferenceServiceModal.findSubmitButton().should('be.enabled');

    // Submit and check the invalid error message
    inferenceServiceModal.findSubmitButton().click();

    cy.wait('@inferenceServicesError').then((interception) => {
      expect(interception.request.body).to.eql({
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: 'trigger-error',
          namespace: 'test-project',
          labels: { 'opendatahub.io/dashboard': 'true' },
          annotations: {
            'openshift.io/display-name': 'trigger-error',
            'serving.kserve.io/deploymentMode': 'ModelMesh',
          },
        },
        spec: {
          predictor: {
            model: {
              modelFormat: { name: 'onnx', version: '1' },
              runtime: 'test-model',
              storage: { key: 'test-secret', path: 'test-model/test-model/' },
            },
          },
        },
      });
    });

    cy.findByText('Error creating model server');

    // Close the modal
    inferenceServiceModal.findCancelButton().click();

    // Check that the error message is gone
    modelServingGlobal.findDeployModelButton().click();
    cy.findByText('Error creating model server').should('not.exist');
  });

  describe('Table filter and pagination', () => {
    it('filter by name', () => {
      initIntercepts({});
      modelServingGlobal.visit('test-project');

      // Verify initial run rows exist
      modelServingGlobal.getModelRow('Test Inference Service').should('have.length', 1);

      // Select the "Name" filter
      const modelServingGlobalToolbar = modelServingGlobal.getTableToolbar();
      modelServingGlobalToolbar.findFilterMenuOption('filter-dropdown-select', 'Name').click();
      modelServingGlobalToolbar.findSearchInput().type('Test Inference Service');
      // Verify only rows with the typed run name exist
      modelServingGlobal.getModelRow('Test Inference Service').should('exist');
      // Verify sort button works
      modelServingGlobal.findSortButton('Model name').click();
      modelServingGlobal.findSortButton('Model name').should(be.sortDescending);
      modelServingGlobal.findSortButton('Model name').click();
      modelServingGlobal.findSortButton('Model name').should(be.sortAscending);

      // Search for non-existent run name
      modelServingGlobalToolbar.findSearchInput().clear().type('Test Service');

      // Verify no results were found
      modelServingGlobal.findEmptyResults().should('exist');
    });

    it('filter by project', () => {
      initIntercepts({
        projectEnableModelMesh: true,
      });
      modelServingGlobal.visit('test-project');

      // Verify initial run rows exist
      modelServingGlobal.getModelRow('Test Inference Service').should('have.length', 1);

      // Select the "Project" filter
      const modelServingGlobalToolbar = modelServingGlobal.getTableToolbar();
      modelServingGlobalToolbar.findFilterMenuOption('filter-dropdown-select', 'Project').click();
      modelServingGlobalToolbar.findSearchInput().type('test project');
      // Verify only rows with the typed run name exist
      modelServingGlobal.getModelRow('Test Inference Service').should('exist');
      // Verify sort button works
      modelServingGlobal.findSortButton('Project').click();
      modelServingGlobal.findSortButton('Project').should(be.sortAscending);
      modelServingGlobal.findSortButton('Project').click();
      modelServingGlobal.findSortButton('Project').should(be.sortDescending);

      // Search for non-existent run name
      modelServingGlobalToolbar.findSearchInput().clear().type('Test Service');

      // Verify no results were found
      modelServingGlobal.findEmptyResults().should('exist');
    });

    it('Validate pagination', () => {
      const totalItems = 50;
      const mockInferenceService: InferenceServiceKind[] = Array.from(
        { length: totalItems },
        (_, i) =>
          mockInferenceServiceK8sResource({
            displayName: `Test Inference Service-${i}`,
          }),
      );
      initIntercepts({ inferenceServices: mockInferenceService });
      modelServingGlobal.visit('test-project');

      // top pagination
      testPagination({
        totalItems,
        firstElement: 'Test Inference Service-0',
        paginationVariant: 'top',
      });

      // bottom pagination
      testPagination({
        totalItems,
        firstElement: 'Test Inference Service-0',
        paginationVariant: 'bottom',
      });
    });
  });
});
