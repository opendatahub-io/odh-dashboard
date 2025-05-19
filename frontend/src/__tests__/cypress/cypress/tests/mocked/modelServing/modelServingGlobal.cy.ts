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
  inferenceServiceModalEdit,
  kserveModal,
  kserveModalEdit,
  modelServingGlobal,
  modelServingSection,
} from '~/__tests__/cypress/cypress/pages/modelServing';
import {
  AcceleratorProfileModel,
  HardwareProfileModel,
  InferenceServiceModel,
  ProjectModel,
  SecretModel,
  ServingRuntimeModel,
  TemplateModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { DeploymentMode, type InferenceServiceKind, type ServingRuntimeKind } from '~/k8sTypes';
import { ServingRuntimePlatform } from '~/types';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { asClusterAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { testPagination } from '~/__tests__/cypress/cypress/utils/pagination';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
  mockOciConnectionTypeConfigMap,
} from '~/__mocks__/mockConnectionType';
import { hardwareProfileSection } from '~/__tests__/cypress/cypress/pages/components/HardwareProfileSection';
import {
  mockGlobalScopedHardwareProfiles,
  mockProjectScopedHardwareProfiles,
} from '~/__mocks__/mockHardwareProfile';
import { initInterceptsForAllProjects } from '~/__tests__/cypress/cypress/utils/servingUtils';
import { nimDeployModal } from '~/__tests__/cypress/cypress/pages/components/NIMDeployModal';
import {
  mockGlobalScopedAcceleratorProfiles,
  mockProjectScopedAcceleratorProfiles,
} from '~/__mocks__/mockAcceleratorProfile';
import { acceleratorProfileSection } from '~/__tests__/cypress/cypress/pages/components/subComponents/AcceleratorProfileSection';

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
  disableHardwareProfiles?: boolean;
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
  disableHardwareProfiles = true,
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
      disableHardwareProfiles,
    }),
  );

  // Mock hardware profiles
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockGlobalScopedHardwareProfiles),
  ).as('hardwareProfiles');

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'test-project' },
    mockK8sResourceList(mockProjectScopedHardwareProfiles),
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

  // Mock accelerator profiles
  cy.interceptK8sList(
    { model: AcceleratorProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockGlobalScopedAcceleratorProfiles),
  ).as('acceleratorProfiles');

  cy.interceptK8sList(
    { model: AcceleratorProfileModel, ns: 'test-project' },
    mockK8sResourceList(mockProjectScopedAcceleratorProfiles),
  ).as('acceleratorProfiles');

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
    cy.findByRole('button', { name: 'Models' }).should('exist').click();

    modelServingGlobal.shouldWaitAndCancel();

    modelServingGlobal.shouldBeEmpty();

    cy.wait('@getServingRuntimes').then((response) => {
      expect(response.error?.message).to.eq('Socket closed before finished writing response');
    });

    cy.wait('@getInferenceServices').then((response) => {
      expect(response.error?.message).to.eq('Socket closed before finished writing response');
    });
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
      .should('have.text', 'NVIDIA NIM');

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
    inferenceServiceModalEdit.findSubmitButton().click().should('be.disabled');
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

    modelServingGlobal.findDeployModelButton().click();

    kserveModal.shouldBeOpen();
    kserveModal.findServingRuntimeTemplateHelptext().should('not.exist');
    kserveModal.findServingRuntimeTemplateDropdown().findSelectOption('Caikit').click();
    kserveModal.findServingRuntimeTemplateHelptext().should('exist');
  });

  it('Display project specific serving runtimes while deploying', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
    });
    modelServingGlobal.visit('test-project');

    modelServingGlobal.findDeployModelButton().click();

    kserveModal.findModelNameInput().should('exist');

    // Check for project specific serving runtimes
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    const projectScopedSR = kserveModal.getProjectScopedServingRuntime();
    projectScopedSR.find().findByRole('menuitem', { name: 'Multi Platform', hidden: true }).click();
    kserveModal.findProjectScopedLabel().should('exist');

    // Check for global specific serving runtimes
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    const globalScopedSR = kserveModal.getGlobalScopedServingRuntime();
    globalScopedSR.find().findByRole('menuitem', { name: 'Multi Platform', hidden: true }).click();
    kserveModal.findGlobalScopedLabel().should('exist');
    kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();

    // check model framework selection when serving runtime changes
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    globalScopedSR.find().findByRole('menuitem', { name: 'Multi Platform', hidden: true }).click();
    kserveModal.findModelFrameworkSelect().should('have.text', 'onnx - 1');

    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    globalScopedSR.find().findByRole('menuitem', { name: 'Caikit', hidden: true }).click();
    kserveModal.findModelFrameworkSelect().should('be.enabled');
    kserveModal.findModelFrameworkSelect().should('have.text', 'Select a framework');

    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    projectScopedSR.find().findByRole('menuitem', { name: 'Caikit', hidden: true }).click();
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    kserveModal.findModelFrameworkSelect().should('have.text', 'openvino_ir - opset1');
  });

  it('Display project scoped label on serving runtime selection on Edit', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
      servingRuntimes: [
        mockServingRuntimeK8sResource({
          isProjectScoped: true,
          scope: 'project',
          templateDisplayName: 'test-project-scoped-sr',
        }),
      ],
    });
    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();
    kserveModalEdit.findServingRuntimeTemplateSearchSelector().should('be.disabled');
    kserveModalEdit
      .findServingRuntimeTemplateSearchSelector()
      .should('have.text', 'test-project-scoped-sr Project-scoped');
    kserveModalEdit.findProjectScopedLabel().should('exist');
    kserveModalEdit.findModelFrameworkSelect().should('have.text', 'onnx - 1');
  });

  it('should display hardware profile selection when both hardware profile and project-scoped feature flag is enabled', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
      disableHardwareProfiles: false,
    });
    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
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

  it('Display project scoped label on serving runtime selection on Edit', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
      disableHardwareProfiles: false,
      servingRuntimes: [
        mockServingRuntimeK8sResource({
          hardwareProfileName: 'large-profile-1',
          hardwareProfileNamespace: 'test-project',
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

  it('should display accelerator profile selection when both accelerator profile and project-scoped feature flag is enabled', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
    });
    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    kserveModal.findModelNameInput().should('exist');

    // Verify accelerator profile section exists
    acceleratorProfileSection.findAcceleratorProfileSearchSelector().should('exist');
    acceleratorProfileSection.findAcceleratorProfileSearchSelector().click();

    // verify available project-scoped accelerator profile
    const projectScopedAcceleratorProfile =
      acceleratorProfileSection.getProjectScopedAcceleratorProfile();
    projectScopedAcceleratorProfile
      .find()
      .findByRole('menuitem', {
        name: 'Small Profile nvidia.com/gpu',
        hidden: true,
      })
      .click();
    kserveModal.findProjectScopedLabel().should('exist');

    // verify available global-scoped accelerator profile
    acceleratorProfileSection.findAcceleratorProfileSearchSelector().click();
    const globalScopedAcceleratorProfile =
      acceleratorProfileSection.getGlobalScopedAcceleratorProfile();
    globalScopedAcceleratorProfile
      .find()
      .findByRole('menuitem', {
        name: 'Small Profile Global nvidia.com/gpu',
        hidden: true,
      })
      .click();
    kserveModal.findGlobalScopedLabel().should('exist');
  });

  it('Display project scoped label on accelerator profile selection on Edit', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
      disableProjectScoped: false,
      servingRuntimes: [
        mockServingRuntimeK8sResource({
          acceleratorName: 'large-profile-1',
        }),
      ],
    });
    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();
    acceleratorProfileSection
      .findAcceleratorProfileSearchSelector()
      .should('contain.text', 'Large Profile-1');
    kserveModalEdit.findProjectScopedLabel().should('exist');
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
      .should('have.text', 'OpenVINO Serving Runtime (Supports GPUs) Global-scoped');
    kserveModalEdit.findGlobalScopedLabel().should('exist');
    kserveModalEdit.findModelFrameworkSelect().should('have.text', 'onnx - 1');
  });

  it('View predefined args popover populates', () => {
    initIntercepts({
      projectEnableModelMesh: false,
      disableServingRuntimeParamsConfig: false,
    });
    modelServingGlobal.visit('test-project');

    modelServingGlobal.findDeployModelButton().click();

    kserveModal.shouldBeOpen();
    kserveModal.findPredefinedArgsButton().click();
    kserveModal.findPredefinedArgsList().should('not.exist');
    kserveModal.findPredefinedArgsTooltip().should('exist');
    kserveModal.findServingRuntimeTemplateDropdown().findSelectOption('Caikit').click();
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

    modelServingGlobal.findDeployModelButton().click();

    kserveModal.shouldBeOpen();
    kserveModal.findPredefinedVarsButton().click();
    kserveModal.findPredefinedVarsList().should('not.exist');
    kserveModal.findPredefinedVarsTooltip().should('exist');
    kserveModal.findServingRuntimeTemplateDropdown().findSelectOption('Caikit').click();
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

    initIntercepts({ disableKServeMetrics: false });
    modelServingGlobal.visit('test-project');

    modelServingGlobal.getModelRow('Test Inference Service').should('have.length', 1);
    modelServingGlobal.getModelMetricLink('Test Inference Service').should('be.visible');
    modelServingGlobal.getModelMetricLink('Test Inference Service').click();
    cy.findByTestId('app-page-title').should('have.text', 'Test Inference Service metrics');
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
