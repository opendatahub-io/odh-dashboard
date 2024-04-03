import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import {
  mockInferenceServiceK8sResource,
  mockInferenceServicek8sError,
} from '~/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockSelfSubjectAccessReview } from '~/__mocks__/mockSelfSubjectAccessReview';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import {
  mockInvalidTemplateK8sResource,
  mockServingRuntimeTemplateK8sResource,
} from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  inferenceServiceModal,
  modelServingGlobal,
} from '~/__tests__/cypress/cypress/pages/modelServing';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { ServingRuntimePlatform } from '~/types';

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
  cy.intercept(
    '/api/dsc/status',
    mockDscStatus({
      installedComponents: { kserve: true, 'model-mesh': true },
    }),
  );
  cy.intercept('/api/status', mockStatus());
  cy.intercept(
    '/api/config',
    mockDashboardConfig({
      disableKServe: disableKServeConfig,
      disableModelMesh: disableModelMeshConfig,
    }),
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/k8s/apis/authorization.k8s.io/v1/selfsubjectaccessreviews',
    },
    mockSelfSubjectAccessReview({ allowed: true }),
  ).as('selfSubjectAccessReviewsCall');
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes',
    },
    mockK8sResourceList(servingRuntimes),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices',
    },
    mockK8sResourceList(inferenceServices),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/api/v1/namespaces/test-project/secrets',
    },
    mockK8sResourceList([mockSecretK8sResource({})]),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/modelServing/servingruntimes',
    },
    mockK8sResourceList(servingRuntimes),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/serving.kserve.io/v1alpha1/servingruntimes',
    },
    {
      delay: delayServingRuntimes ? 500 : 0, //TODO: Remove the delay when we add support for loading states
      body: mockK8sResourceList(servingRuntimes),
    },
  ).as('getServingRuntimes');
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/serving.kserve.io/v1beta1/namespaces/modelServing/inferenceservices',
    },
    mockK8sResourceList(inferenceServices),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/serving.kserve.io/v1beta1/inferenceservices',
    },
    {
      delay: delayInferenceServices ? 500 : 0, //TODO: Remove the delay when we add support for loading states
      body: mockK8sResourceList(inferenceServices),
    },
  ).as('getInferenceServices');
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices',
    },
    { statusCode: 500 },
  ).as('inferenceServicesError');
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/api/v1/namespaces/modelServing/secrets',
    },
    mockK8sResourceList([mockSecretK8sResource({})]),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname:
        '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes/test-model',
    },
    mockServingRuntimeK8sResource({}),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
    },
    mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: projectEnableModelMesh })]),
  );
  cy.intercept(
    {
      method: 'POST',
      pathname:
        '/api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices/test',
    },
    mockInferenceServiceK8sResource({}),
  );
  cy.intercept(
    {
      method: 'POST',
      pathname:
        '/api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices/trigger-error',
    },
    { statusCode: 422, body: mockInferenceServicek8sError() },
  );
  cy.intercept(
    {
      method: 'GET',
      pathname:
        '/api/k8s/apis/opendatahub.io/v1alpha/namespaces/opendatahub/odhdashboardconfigs/odh-dashboard-config',
    },
    mockDashboardConfig({}),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/template.openshift.io/v1/namespaces/opendatahub/templates',
    },
    mockK8sResourceList([
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
    ]),
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

    cy.intercept(
      {
        method: 'DELETE',
        pathname:
          '/api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices/test-inference-service',
      },
      {},
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

    cy.intercept(
      {
        method: 'PUT',
        pathname:
          '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes/test-model',
      },
      mockServingRuntimeK8sResource({ name: 'Updated Model Name' }),
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
      delete servingRuntimeMock.metadata.annotations?.['enable-auth'];
      delete servingRuntimeMock.metadata.annotations?.['enable-route'];
      delete servingRuntimeMock.spec.replicas;
      expect(interception.request.url).to.include('?dryRun=All'); //dry run request
      expect(interception.request.method).to.eql('PUT');
      expect(interception.request.body).to.eql(servingRuntimeMock);
    });
  });

  it('Create model', () => {
    initIntercepts({
      projectEnableModelMesh: true,
    });

    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/k8s/api/v1/namespaces/test-project/secrets',
      },
      mockSecretK8sResource({}),
    );
    cy.intercept(
      {
        method: 'POST',
        pathname:
          '/api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices',
      },
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

    cy.wait('@selfSubjectAccessReviewsCall').then((interception) => {
      expect(interception.request.body).to.eql({
        apiVersion: 'authorization.k8s.io/v1',
        kind: 'SelfSubjectAccessReview',
        spec: {
          resourceAttributes: {
            group: 'serving.kserve.io',
            resource: 'servingruntimes',
            subresource: '',
            verb: 'list',
            name: '',
            namespace: '',
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
});
