import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mock200Status, mock403ErrorWithDetails, mock404Error } from '#~/__mocks__/mockK8sStatus';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '#~/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeK8sResource } from '#~/__mocks__/mockServingRuntimeK8sResource';
import {
  mockInvalidTemplateK8sResource,
  mockServingRuntimeTemplateK8sResource,
} from '#~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  inferenceServiceModal,
  inferenceServiceModalEdit,
  kserveModal,
  kserveModalEdit,
  modelServingGlobal,
  modelServingSection,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  ProjectModel,
  SecretModel,
  ServingRuntimeModel,
  TemplateModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import {
  DeploymentMode,
  type TemplateKind,
  type InferenceServiceKind,
  type ServingRuntimeKind,
} from '#~/k8sTypes';
import { ServingRuntimePlatform } from '#~/types';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import { asClusterAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { testPagination } from '#~/__tests__/cypress/cypress/utils/pagination';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
  mockOciConnectionTypeConfigMap,
} from '#~/__mocks__/mockConnectionType';
import { hardwareProfileSection } from '#~/__tests__/cypress/cypress/pages/components/HardwareProfileSection';
import {
  mockGlobalScopedHardwareProfiles,
  mockProjectScopedHardwareProfiles,
  mockHardwareProfile,
} from '#~/__mocks__/mockHardwareProfile';
import { initInterceptsForAllProjects } from '#~/__tests__/cypress/cypress/utils/servingUtils';
import { nimDeployModal } from '#~/__tests__/cypress/cypress/pages/components/NIMDeployModal';

type HandlersProps = {
  disableKServeConfig?: boolean;
  disableModelMeshConfig?: boolean;
  projectEnableModelMesh?: boolean;
  servingRuntimes?: ServingRuntimeKind[];
  inferenceServices?: InferenceServiceKind[];
  delayInferenceServices?: boolean;
  delayServingRuntimes?: boolean;
  disableKServeMetrics?: boolean;
  disableServingRuntimeParamsConfig?: boolean;
  disableProjectScoped?: boolean;
  servingRuntimesTemplates?: TemplateKind[];
};

const initIntercepts = ({
  disableKServeConfig,
  disableModelMeshConfig,
  projectEnableModelMesh,
  servingRuntimes = [mockServingRuntimeK8sResource({})],
  inferenceServices = [mockInferenceServiceK8sResource({})],
  delayInferenceServices,
  delayServingRuntimes,
  disableKServeMetrics,
  disableServingRuntimeParamsConfig,
  disableProjectScoped = true,
}: HandlersProps) => {
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
      disableKServe: disableKServeConfig,
      disableModelMesh: disableModelMeshConfig,
      disableKServeMetrics,
      disableServingRuntimeParams: disableServingRuntimeParamsConfig,
      disableProjectScoped,
    }),
  );

  // Mock hardware profiles
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'test-project' },
    mockK8sResourceList(mockProjectScopedHardwareProfiles),
  ).as('hardwareProfiles');

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockGlobalScopedHardwareProfiles),
  ).as('hardwareProfiles');

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
      { namespace: 'test-project' },
    ),
  );

  cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList(servingRuntimes));
  cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList(inferenceServices));
  cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));
  cy.interceptK8sList(
    { model: ServingRuntimeModel, ns: 'test-project' },
    {
      delay: delayServingRuntimes ? 500 : 0, //TODO: Remove the delay when we add support for loading states
      body: mockK8sResourceList(servingRuntimes),
    },
  );
  cy.interceptK8sList(
    { model: ServingRuntimeModel, ns: undefined },
    {
      delay: delayServingRuntimes ? 500 : 0, //TODO: Remove the delay when we add support for loading states
      body: mockK8sResourceList(servingRuntimes),
    },
  ).as('getServingRuntimes');
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: 'test-project' },
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
    mockK8sResourceList([mockSecretK8sResource({ namespace: 'test-project' })]),
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
          containerName: 'kserve-container',
          containerEnvVars: [{ name: 'HF_HOME', value: '/tmp/hf_home' }],
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

  cy.interceptOdh('GET /api/connection-types', [
    mockConnectionTypeConfigMap({
      displayName: 'URI - v1',
      name: 'uri-v1',
      category: ['existing-category'],
      fields: [
        {
          type: 'uri',
          name: 'URI field test',
          envVar: 'URI',
          required: true,
          properties: {},
        },
      ],
    }),
    mockOciConnectionTypeConfigMap(),
    mockConnectionTypeConfigMap({
      name: 's3',
      displayName: 'S3 compatible object storage - v1',
      description: 'description 2',
      category: ['existing-category'],
      fields: mockModelServingFields,
    }),
  ]);
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

    modelServingGlobal.clickDeployModelButtonWithRetry();

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

    // Wait for the loading state to be visible and hit the cancel button -> this redirects to the preferred project page
    modelServingGlobal.shouldWaitAndCancel();

    // Verify the empty state is visible
    modelServingGlobal.shouldBeEmpty();

    cy.url().should('include', '/deployments/test-project');
  });

  it('All projects with every type of serving listed', () => {
    asClusterAdminUser();
    initInterceptsForAllProjects();

    // Visit the all-projects view and ensure each project type is listed
    modelServingGlobal.visit();
    [
      {
        model: 'KServe Model',
        project: 'KServe Project',
        servingType: 'Single-model serving enabled',
      },
      {
        model: 'Model Mesh Model',
        project: 'Model Mesh Project',
        servingType: 'Multi-model serving enabled',
      },
      {
        model: 'NIM Model',
        project: 'NIM Project',
        servingType: 'NVIDIA NIM serving enabled',
      },
    ].forEach((row) => {
      modelServingSection.getInferenceServiceRow(row.model).findProject().findByText(row.project);
      modelServingSection
        .getInferenceServiceRow(row.model)
        .findProject()
        .findByText(row.servingType);
    });
    // Double check NIM Runtime is listed
    modelServingSection
      .getInferenceServiceRow('NIM Model')
      .findServingRuntime()
      .should('contain.text', 'NVIDIA NIM');

    // Open each modal and make sure it is the correct one
    modelServingGlobal.getModelRow('KServe Model').findKebabAction('Edit').click();
    // KServe Modal has section at the bottom for configuring params where as Model Mesh does not
    kserveModalEdit.findConfigurationParamsSection().should('exist');
    kserveModalEdit.findCancelButton().click();

    modelServingGlobal.getModelRow('Model Mesh Model').findKebabAction('Edit').click();
    inferenceServiceModalEdit.findConfigurationParamsSection().should('not.exist');
    inferenceServiceModalEdit.findCancelButton().click();

    modelServingGlobal.getModelRow('NIM Model').findKebabAction('Edit').click();
    // NIM Modal is the only one that has pvc-size
    nimDeployModal.findNimStorageSizeInput().should('exist');
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
    inferenceServiceModalEdit.shouldBeOpen();
    inferenceServiceModalEdit.findModelNameInput().clear();
    inferenceServiceModalEdit.findLocationPathInput().clear();
    inferenceServiceModalEdit.findSubmitButton().should('be.disabled');

    // test with invalid path name
    inferenceServiceModalEdit.findLocationPathInput().type('/');
    inferenceServiceModalEdit
      .findLocationPathInputError()
      .should('be.visible')
      .contains('The path must not point to a root folder');
    inferenceServiceModalEdit.findSubmitButton().should('be.disabled');
    inferenceServiceModalEdit.findLocationPathInput().clear();
    inferenceServiceModalEdit.findLocationPathInput().type('test//path');
    inferenceServiceModalEdit
      .findLocationPathInputError()
      .should('be.visible')
      .contains('Invalid path format');
    inferenceServiceModalEdit.findSubmitButton().should('be.disabled');
    inferenceServiceModalEdit.findLocationPathInput().clear();

    // test that you can update the name to a different name
    inferenceServiceModalEdit.findModelNameInput().type('Updated Model Name');
    inferenceServiceModalEdit.findLocationPathInput().type('test-model/');
    inferenceServiceModalEdit.findSubmitButton().should('be.enabled');

    // test that user cant upload on an empty field
    inferenceServiceModalEdit.findNewConnectionOption().click();
    inferenceServiceModalEdit.findConnectionType(/URI/).click();
    inferenceServiceModalEdit.findSubmitButton().should('be.disabled');
    inferenceServiceModalEdit.findConnectionNameInput().type('Test Name');
    inferenceServiceModalEdit.findConnectionFieldInput('URI').type('/');
    inferenceServiceModalEdit.findConnectionFieldInput('URI').blur();
    inferenceServiceModalEdit.findSubmitButton().should('be.disabled');
    inferenceServiceModalEdit.findConnectionFieldInput('URI').clear().type('https://test');
    inferenceServiceModalEdit.findSubmitButton().should('be.enabled');
    inferenceServiceModalEdit.findExistingConnectionOption().click();
    inferenceServiceModalEdit.findSubmitButton().click();

    cy.wait('@editModel').then((interception) => {
      const servingRuntimeMock = mockServingRuntimeK8sResource({ displayName: 'test-model' });
      const servingRuntimeMockNoResources = mockServingRuntimeK8sResource({
        displayName: 'test-model',
        disableResources: true,
        disableReplicas: true,
        disableModelMeshAnnotations: true,
      }); // KServe should send resources in ServingRuntime after migration
      servingRuntimeMockNoResources.metadata.annotations = {
        ...servingRuntimeMockNoResources.metadata.annotations,
      };
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
        name: 'test-model',
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
    inferenceServiceModal.findServingRuntimeSelect().should('contain.text', 'OVMS Model Serving');
    inferenceServiceModal.findServingRuntimeSelect().should('be.disabled');
    inferenceServiceModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findNewConnectionOption().click();
    inferenceServiceModal.findConnectionType(/OCI/).should('not.exist');
    inferenceServiceModal.findConnectionType(/S3/).should('exist');
    inferenceServiceModal.findConnectionType(/URI/).should('exist').click();
    inferenceServiceModal.findConnectionNameInput().type('Test Name');
    inferenceServiceModal.findConnectionFieldInput('URI').type('https://test');
    inferenceServiceModal.findSubmitButton().should('be.enabled');
    inferenceServiceModal.findExistingConnectionOption().click();
    inferenceServiceModal.findExistingConnectionSelect().should('have.attr', 'disabled');
    inferenceServiceModal.findLocationPathInput().type('test-model/');
    inferenceServiceModal.findSubmitButton().should('be.enabled');
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
            'serving.kserve.io/deploymentMode': DeploymentMode.ModelMesh,
          },
        },
        spec: {
          predictor: {
            model: {
              modelFormat: { name: 'onnx', version: '1' },
              runtime: 'test-model',
              storage: { key: 'test-secret', path: 'test-model/' },
              args: [],
              env: [],
            },
          },
        },
      } satisfies InferenceServiceKind);
    });

    // Actual request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry run request and 1 actual request
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
    inferenceServiceModal.findServingRuntimeSelect().should('contain.text', 'OVMS Model Serving');
    inferenceServiceModal.findServingRuntimeSelect().should('be.disabled');
    inferenceServiceModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
    inferenceServiceModal.findSubmitButton().should('be.disabled');
    inferenceServiceModal.findExistingConnectionSelect().should('have.attr', 'disabled');
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
            'serving.kserve.io/deploymentMode': DeploymentMode.ModelMesh,
          },
        },
        spec: {
          predictor: {
            model: {
              modelFormat: { name: 'onnx', version: '1' },
              runtime: 'test-model',
              storage: { key: 'test-secret', path: 'test-model/test-model/' },
              args: [],
              env: [],
            },
          },
        },
      } satisfies InferenceServiceKind);
    });

    cy.findByText('Error creating model server');

    // Close the modal
    inferenceServiceModal.findCancelButton().click();

    // Check that the error message is gone
    modelServingGlobal.findDeployModelButton().click();
    cy.findByText('Error creating model server').should('not.exist');
  });

  it('Serving runtime helptext', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
    });
    modelServingGlobal.visit('test-project');

    modelServingGlobal.clickDeployModelButtonWithRetry();

    kserveModal.shouldBeOpen();
    kserveModal.findServingRuntimeTemplateHelptext().should('not.exist');
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('Caikit').click();
    kserveModal.findServingRuntimeTemplateHelptext().should('exist');
  });

  it('Display project specific serving runtimes while deploying', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
    });
    modelServingGlobal.visit('test-project');

    modelServingGlobal.clickDeployModelButtonWithRetry();

    kserveModal.shouldBeOpen();

    kserveModal.findModelNameInput().should('exist');

    // Check for project specific serving runtimes
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findProjectScopedTemplateOption('Multi Platform').click();
    kserveModal.findProjectScopedLabel().should('exist');

    // Check for global specific serving runtimes
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('Multi Platform').click();
    kserveModal.findGlobalScopedLabel().should('exist');
    kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();

    // check model framework selection when serving runtime changes
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('Multi Platform').click();
    kserveModal.findModelFrameworkSelect().should('have.text', 'onnx - 1');

    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('Caikit').click();
    kserveModal.findModelFrameworkSelect().should('be.enabled');
    kserveModal.findModelFrameworkSelect().should('have.text', 'Select a framework');

    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findProjectScopedTemplateOption('Caikit').click();
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    kserveModal.findModelFrameworkSelect().should('have.text', 'openvino_ir - opset1');
  });

  it('Display project scoped label on serving runtime selection on Edit', () => {
    const projectScopedServingRuntime = mockServingRuntimeK8sResource({
      name: 'test-project-scoped-sr',
      isProjectScoped: true,
      scope: 'project',
      templateDisplayName: 'test-project-scoped-sr',
    });

    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
      servingRuntimes: [projectScopedServingRuntime],
      inferenceServices: [
        mockInferenceServiceK8sResource({
          modelName: 'test-project-scoped-sr', // Set runtime to match serving runtime name
        }),
      ],
    });
    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();
    kserveModalEdit.findServingRuntimeTemplateSearchSelector().should('be.disabled');
    kserveModalEdit
      .findServingRuntimeTemplateSearchSelector()
      .should('contain.text', 'test-project-scoped-sr');
    kserveModalEdit.findProjectScopedLabel().should('exist');
    kserveModalEdit.findModelFrameworkSelect().should('have.text', 'onnx - 1');
  });

  it('should display hardware profile selection when both hardware profile and project-scoped feature flag is enabled', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
    });
    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().should('be.enabled');
    modelServingGlobal.clickDeployModelButtonWithRetry();
    kserveModal.shouldBeOpen();
    kserveModal.findModelNameInput().should('exist');

    // Verify hardware profile section exists
    hardwareProfileSection.findHardwareProfileSearchSelector().should('exist');
    hardwareProfileSection.findHardwareProfileSearchSelector().click();

    // verify available project-scoped hardware profile
    const projectScopedHardwareProfile = hardwareProfileSection.getProjectScopedHardwareProfile();
    projectScopedHardwareProfile
      .find()
      .findByRole('menuitem', {
        name: 'Small Profile CPU: Request = 1; Limit = 1; Memory: Request = 2Gi; Limit = 2Gi',
        hidden: true,
      })
      .click();
    hardwareProfileSection.findProjectScopedLabel().should('exist');

    // verify available global-scoped hardware profile
    hardwareProfileSection.findHardwareProfileSearchSelector().click();
    const globalScopedHardwareProfile = hardwareProfileSection.getGlobalScopedHardwareProfile();
    globalScopedHardwareProfile
      .find()
      .findByRole('menuitem', {
        name: 'Small Profile CPU: Request = 1; Limit = 1; Memory: Request = 2Gi; Limit = 2Gi',
        hidden: true,
      })
      .click();
    hardwareProfileSection.findGlobalScopedLabel().should('exist');
  });

  it('Display project scoped hardware profile on serving runtime selection on Edit', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
      inferenceServices: [
        mockInferenceServiceK8sResource({
          namespace: 'test-project',
          hardwareProfileName: 'large-profile-1',
          hardwareProfileNamespace: 'test-project',
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
      ],
      servingRuntimes: [mockServingRuntimeK8sResource({})],
    });

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();

    hardwareProfileSection.findHardwareProfileSearchSelector().should('be.visible');

    hardwareProfileSection
      .findHardwareProfileSearchSelector()
      .should('contain.text', 'Large Profile-1');
    hardwareProfileSection.findProjectScopedLabel().should('exist');
  });

  it('should display hardware profile selection when project-scoped feature flag is enabled', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
    });
    modelServingGlobal.visit('test-project');
    modelServingGlobal.clickDeployModelButtonWithRetry();
    kserveModal.findModelNameInput().should('exist');

    // Verify hardware profile section exists
    hardwareProfileSection.findHardwareProfileSearchSelector().should('exist');
    hardwareProfileSection.findHardwareProfileSearchSelector().click();

    // verify available project-scoped hardware profile
    const projectScopedHardwareProfile = hardwareProfileSection.getProjectScopedHardwareProfile();
    projectScopedHardwareProfile
      .find()
      .findByRole('menuitem', {
        name: 'Small Profile CPU: Request = 1; Limit = 1; Memory: Request = 2Gi; Limit = 2Gi',
        hidden: true,
      })
      .click();
    hardwareProfileSection.findProjectScopedLabel().should('exist');

    // verify available global-scoped hardware profile
    hardwareProfileSection.findHardwareProfileSearchSelector().click();
    const globalScopedHardwareProfile = hardwareProfileSection.getGlobalScopedHardwareProfile();
    globalScopedHardwareProfile
      .find()
      .findByRole('menuitem', {
        name: 'Small Profile CPU: Request = 1; Limit = 1; Memory: Request = 2Gi; Limit = 2Gi',
        hidden: true,
      })
      .click();
    hardwareProfileSection.findGlobalScopedLabel().should('exist');
  });

  it('Display project scoped label on hardware profile selection on Edit', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
      servingRuntimes: [mockServingRuntimeK8sResource({})],
      inferenceServices: [
        mockInferenceServiceK8sResource({
          hardwareProfileName: 'large-profile-1',
          hardwareProfileNamespace: 'test-project',
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
      ],
    });

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();
    hardwareProfileSection
      .findHardwareProfileSearchSelector()
      .should('contain.text', 'Large Profile-1');
    hardwareProfileSection.findProjectScopedLabel().should('exist');
  });

  it('Display Existing settings for deleted hardware profile selection on Edit', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
      servingRuntimes: [mockServingRuntimeK8sResource({})],
      inferenceServices: [
        mockInferenceServiceK8sResource({
          // Explicitly create inference service without hardware profile
          // Use empty string to match the default, but ensure no hardware profile annotations
          hardwareProfileName: '',
          hardwareProfileNamespace: undefined,
          hardwareProfileResourceVersion: undefined,
        }),
      ],
    });

    // Override hardware profile intercepts to return empty lists
    // This ensures no hardware profiles are available, forcing "Use existing settings"
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'test-project' },
      mockK8sResourceList([]),
    );
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList([]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();
    hardwareProfileSection.findSelect().should('contain.text', 'Use existing settings');
  });

  it('Display global scoped label on serving runtime selection', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
      servingRuntimes: [
        mockServingRuntimeK8sResource({
          isProjectScoped: true,
          scope: 'global',
        }),
      ],
    });
    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();
    kserveModalEdit.findServingRuntimeTemplateSearchSelector().should('be.disabled');
    kserveModalEdit
      .findServingRuntimeTemplateSearchSelector()
      .should('contain.text', 'OpenVINO Serving Runtime (Supports GPUs)');
    kserveModalEdit.findGlobalScopedLabel().should('exist');
    kserveModalEdit.findModelFrameworkSelect().should('have.text', 'onnx - 1');
  });

  it('View predefined args popover populates', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
    });
    modelServingGlobal.visit('test-project');

    modelServingGlobal.clickDeployModelButtonWithRetry();

    kserveModal.shouldBeOpen();
    kserveModal.findPredefinedArgsButton().scrollIntoView();
    kserveModal.findPredefinedArgsButton().click();
    kserveModal.findPredefinedArgsList().should('not.exist');
    kserveModal.findPredefinedArgsTooltip().should('exist');
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('Caikit').click();
    kserveModal.findPredefinedArgsButton().click();
    kserveModal.findPredefinedArgsList().should('exist');
    kserveModal.findPredefinedArgsTooltip().should('not.exist');
    kserveModal.findPredefinedArgsList().should('include.text', '--port=8001');
  });

  it('View predefined vars popover populates', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
    });
    modelServingGlobal.visit('test-project');

    modelServingGlobal.clickDeployModelButtonWithRetry();

    kserveModal.shouldBeOpen();
    kserveModal.findPredefinedVarsButton().click();
    kserveModal.findPredefinedVarsList().should('not.exist');
    kserveModal.findPredefinedVarsTooltip().should('exist');
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('Caikit').click();
    kserveModal.findPredefinedVarsButton().click();
    kserveModal.findPredefinedVarsList().should('exist');
    kserveModal.findPredefinedVarsTooltip().should('not.exist');
    kserveModal.findPredefinedVarsList().should('include.text', 'HF_HOME=/tmp/hf_home');
  });

  it('Navigate to kserve model metrics page only if enabled', () => {
    initIntercepts({});
    modelServingGlobal.visit('test-project');

    // Verify initial run rows exist
    modelServingGlobal.getModelRow('Test Inference Service').should('have.length', 1);
    modelServingGlobal.getModelMetricLink('Test Inference Service').should('not.exist');

    initIntercepts({
      disableKServeMetrics: false,
      inferenceServices: [
        mockInferenceServiceK8sResource({
          activeModelState: 'Loaded',
        }),
      ],
    });
    modelServingGlobal.visit('test-project');

    modelServingGlobal.getModelRow('Test Inference Service').should('have.length', 1);
    modelServingGlobal.getModelMetricLink('Test Inference Service').should('be.visible');
    modelServingGlobal.getModelMetricLink('Test Inference Service').click();
    cy.findByTestId('app-page-title').should('have.text', 'Test Inference Service metrics');
  });

  it('Display the version label and status label correctly', () => {
    const servingRuntimeWithLatestVersion = mockServingRuntimeK8sResource({
      namespace: 'test-project',
      name: 'test-inference-service-latest',
      templateName: 'template-2',
      version: '1.0.0',
    });
    const servingRuntimeWithOutdatedVersion = mockServingRuntimeK8sResource({
      namespace: 'test-project',
      name: 'test-inference-service-outdated',
      templateName: 'template-2',
      version: '0.5.0',
    });
    const inferenceServiceLatest = mockInferenceServiceK8sResource({
      name: 'test-inference-service-latest',
      namespace: 'test-project',
      displayName: 'Latest Model',
      modelName: 'test-inference-service-latest',
    });
    const inferenceServiceOutdated = mockInferenceServiceK8sResource({
      name: 'test-inference-service-outdated',
      namespace: 'test-project',
      displayName: 'Outdated Model',
      modelName: 'test-inference-service-outdated',
    });

    initIntercepts({
      servingRuntimes: [servingRuntimeWithLatestVersion, servingRuntimeWithOutdatedVersion],
      inferenceServices: [inferenceServiceLatest, inferenceServiceOutdated],
    });

    modelServingGlobal.visit('test-project');

    const latestRow = modelServingSection.getInferenceServiceRow('Latest Model');
    latestRow.findServingRuntimeVersionLabel().should('contain.text', '1.0.0');
    latestRow.findServingRuntimeVersionStatusLabel().should('have.text', 'Latest');

    const outdatedRow = modelServingSection.getInferenceServiceRow('Outdated Model');
    outdatedRow.findServingRuntimeVersionLabel().should('contain.text', '0.5.0');
    outdatedRow.findServingRuntimeVersionStatusLabel().should('have.text', 'Outdated');
  });

  it('Not display the version label if the annotation is absent', () => {
    const servingRuntimeWithoutVersion = mockServingRuntimeK8sResource({});

    initIntercepts({
      servingRuntimes: [servingRuntimeWithoutVersion],
    });

    modelServingGlobal.visit('test-project');
    modelServingSection
      .getInferenceServiceRow('Test Inference Service')
      .findServingRuntimeVersionLabel()
      .should('not.exist');
    modelServingSection
      .getInferenceServiceRow('Test Inference Service')
      .findServingRuntimeVersionStatusLabel()
      .should('not.exist');
  });

  it('Should display env vars from a valueFrom secret', () => {
    initIntercepts({
      inferenceServices: [
        mockInferenceServiceK8sResource({
          env: [
            {
              name: 'value-from-secret-env-var',
              valueFrom: { secretKeyRef: { name: 'test-secret', key: 'test-key' } },
            },
            {
              name: 'key-value-env-var',
              value: 'test-value',
            },
          ],
        }),
      ],
    });
    modelServingGlobal.visit('test-project');

    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();
    kserveModalEdit.findServingRuntimeEnvVarsValue('0').should('be.disabled');
    kserveModalEdit
      .findServingRuntimeEnvVarsValue('0')
      .should('have.value', '{"secretKeyRef":{"name":"test-secret","key":"test-key"}}');
    kserveModalEdit.findServingRuntimeEnvVarsValue('1').should('not.be.disabled');
    kserveModalEdit.findServingRuntimeEnvVarsValue('1').should('have.value', 'test-value');
  });

  describe('Table filter and pagination', () => {
    it('filter by name', () => {
      initIntercepts({});
      modelServingGlobal.visit('test-project');

      // Verify initial run rows exist
      modelServingGlobal.getModelRow('Test Inference Service').should('have.length', 1);

      // Select the "Name" filter
      const modelServingGlobalToolbar = modelServingGlobal.getTableToolbar();
      modelServingGlobalToolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Name').click();
      modelServingGlobalToolbar.findSearchInput().type('Test Inference Service');
      // Verify only rows with the typed run name exist
      modelServingGlobal.getModelRow('Test Inference Service').should('exist');
      // Verify sort button works
      modelServingGlobal.findSortButton('Model deployment name').click();
      modelServingGlobal.findSortButton('Model deployment name').should(be.sortDescending);
      modelServingGlobal.findSortButton('Model deployment name').click();
      modelServingGlobal.findSortButton('Model deployment name').should(be.sortAscending);

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
      modelServingGlobalToolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Project').click();
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

    it('Sort model by last deployed', () => {
      const inferenceServiceNew = mockInferenceServiceK8sResource({
        namespace: 'test-project',
        name: 'new-model',
        displayName: 'New Model',
        modelName: 'test-inference-service-latest',
        lastTransitionTime: '2025-07-10T12:12:41Z',
        activeModelState: 'Loaded',
        isReady: true,
      });
      const inferenceServiceOld = mockInferenceServiceK8sResource({
        namespace: 'test-project',
        name: 'old-model',
        displayName: 'Old Model',
        modelName: 'test-inference-service-outdated',
        lastTransitionTime: '2024-09-04T16:12:41Z',
        activeModelState: 'Loaded',
        isReady: true,
      });
      initIntercepts({
        inferenceServices: [inferenceServiceNew, inferenceServiceOld],
      });

      modelServingGlobal.visit('test-project');

      modelServingGlobal.findSortButton('Last deployed').click();
      modelServingGlobal.findSortButton('Last deployed').should(be.sortAscending);
      modelServingGlobal.findSortButton('Last deployed').click();
      modelServingGlobal.findSortButton('Last deployed').should(be.sortDescending);

      const oldModelRow = modelServingSection.getInferenceServiceRow('Old Model');
      oldModelRow.findLastDeployedTimestamp().trigger('mouseenter');
      cy.findByRole('tooltip').should('contain.text', '9/4/2024, 4:12:41 PM UTC');
    });

    it('Validate pagination', () => {
      const totalItems = 50;
      const mockInferenceService: InferenceServiceKind[] = Array.from(
        { length: totalItems },
        (_, i) =>
          mockInferenceServiceK8sResource({
            name: `test-inference-service-${i}`,
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

    describe('redirect from v2 to v3 route', () => {
      beforeEach(() => {
        initIntercepts({});
      });

      it('root', () => {
        cy.visitWithLogin('/modelServing');
        cy.findByTestId('app-page-title').contains('Deployments');
        cy.url().should('include', '/ai-hub/deployments');
      });

      it('metrics', () => {
        cy.visitWithLogin('/modelServing/test-project/metrics/test-inference-service');
        cy.findByTestId('app-page-title').contains('Test Inference Service metrics');
        cy.url().should(
          'include',
          '/ai-hub/deployments/test-project/metrics/test-inference-service',
        );
      });

      it('metrics performance', () => {
        cy.visitWithLogin('/modelServing/test-project/metrics/test-inference-service/performance');
        cy.findByTestId('app-page-title').contains('Test Inference Service metrics');
        cy.url().should(
          'include',
          '/ai-hub/deployments/test-project/metrics/test-inference-service/performance',
        );
      });
    });
  });

  describe('Model Serving Hardware Profile Binding State Labels', () => {
    it('should show "Deleted" label when hardware profile is deleted', () => {
      initIntercepts({});
      // Mock inference service with non-existent hardware profile annotation
      cy.interceptK8sList(
        {
          model: InferenceServiceModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockInferenceServiceK8sResource({
            name: 'test-model',
            displayName: 'Test Model',
            namespace: 'test-project',
            isModelMesh: false,
            hardwareProfileName: 'deleted-profile', // Non-existent profile
            hardwareProfileResourceVersion: '104110942',
          }),
        ]),
      );

      // Mock the hardware profile as deleted (404 error)
      cy.interceptK8s(
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'deleted-profile',
        },
        {
          statusCode: 404,
          body: mock404Error({}),
        },
      );

      modelServingGlobal.visit('test-project');

      // Verify "Deleted" label appears in hardware profile column
      const deletedLabel = modelServingGlobal
        .getInferenceServiceRow('Test Model')
        .findHardwareProfileDeletedLabel();

      deletedLabel.should('be.visible');
      deletedLabel.click();

      // Verify "Deleted" popover shows correct message
      const popover = modelServingGlobal
        .getInferenceServiceRow('Test Model')
        .findHardwareProfileDeletedPopover();
      popover.title().should('be.visible');
      popover.body().should('be.visible');
    });

    it('should show "Disabled" label when hardware profile is disabled', () => {
      const mockInferenceService = mockInferenceServiceK8sResource({
        name: 'test-model',
        displayName: 'Test Model',
        namespace: 'test-project',
        isModelMesh: false,
        hardwareProfileName: 'disabled-profile',
      });

      // Set up proper intercepts with hardware profiles enabled
      initIntercepts({
        inferenceServices: [mockInferenceService],
      });

      // Mock disabled hardware profile
      cy.interceptK8s(
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'disabled-profile',
        },
        mockHardwareProfile({
          name: 'disabled-profile',
          displayName: 'Disabled Profile',
          annotations: {
            'opendatahub.io/disabled': 'true',
          },
          identifiers: [
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '1',
              maxCount: '2',
              defaultCount: '1',
            },
            {
              displayName: 'Memory',
              identifier: 'memory',
              minCount: '2Gi',
              maxCount: '4Gi',
              defaultCount: '2Gi',
            },
          ],
        }),
      );

      modelServingGlobal.visit('test-project');

      // Verify "Disabled" label appears in hardware profile column
      const disabledLabel = modelServingGlobal
        .getInferenceServiceRow('Test Model')
        .findHardwareProfileDisabledLabel();
      disabledLabel.should('be.visible');
      disabledLabel.click();

      // Verify "Disabled" popover shows correct message
      const popover = modelServingGlobal
        .getInferenceServiceRow('Test Model')
        .findHardwareProfileDisabledPopover();
      popover.title().should('be.visible');
      popover.body().should('be.visible');
    });

    it('should show "Updated" label when hardware profile spec has changed', () => {
      const mockInferenceService = mockInferenceServiceK8sResource({
        name: 'test-model',
        displayName: 'Test Model',
        namespace: 'test-project',
        isModelMesh: false,
        hardwareProfileName: 'updated-profile',
        hardwareProfileResourceVersion: '104110942',
      });

      // Set up proper intercepts with hardware profiles enabled
      initIntercepts({
        inferenceServices: [mockInferenceService],
      });

      // Mock hardware profile with different spec (updated)
      cy.interceptK8s(
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'updated-profile',
        },
        mockHardwareProfile({
          name: 'updated-profile',
          displayName: 'Updated Profile',
          enabled: true,
          identifiers: [
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '2', // Changed from 1 to 2
              maxCount: '4', // Changed from 1 to 4
              defaultCount: '2', // Changed from 1 to 2
            },
            {
              displayName: 'Memory',
              identifier: 'memory',
              minCount: '4Gi',
              maxCount: '8Gi',
              defaultCount: '4Gi',
            },
          ],
          resourceVersion: '104110943',
        }),
      );

      modelServingGlobal.visit('test-project');

      // Verify "Updated" label appears in hardware profile column
      const updatedLabel = modelServingGlobal
        .getInferenceServiceRow('Test Model')
        .findHardwareProfileUpdatedLabel();
      updatedLabel.should('be.visible');
      updatedLabel.click();

      // Verify "Updated" popover shows correct message
      const popover = modelServingGlobal
        .getInferenceServiceRow('Test Model')
        .findHardwareProfileUpdatedPopover();
      popover.title().should('be.visible');
      popover.body().should('be.visible');
    });

    it('should show error icon with popover when hardware profile fails to load (non-404 error)', () => {
      const mockInferenceService = mockInferenceServiceK8sResource({
        name: 'test-model',
        displayName: 'Test Model',
        namespace: 'test-project',
        isModelMesh: false,
        hardwareProfileName: 'error-profile',
      });

      initIntercepts({
        inferenceServices: [mockInferenceService],
      });

      cy.interceptK8s(
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'error-profile',
        },
        mock403ErrorWithDetails({}),
      );

      modelServingGlobal.visit('test-project');

      const modelRow = modelServingGlobal.getInferenceServiceRow('Test Model');
      const errorIcon = modelRow.findHardwareProfileErrorIcon();
      errorIcon.should('exist');
      errorIcon.trigger('mouseenter');
      const errorPopoverTitle = modelRow.findHardwareProfileErrorPopover();
      errorPopoverTitle.should('be.visible');
    });
  });
});
