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
import { type TemplateKind, type InferenceServiceKind, type ServingRuntimeKind } from '#~/k8sTypes';
import { ServingRuntimePlatform } from '#~/types';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import { asClusterAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { testPagination } from '#~/__tests__/cypress/cypress/utils/pagination';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
  mockOciConnectionTypeConfigMap,
} from '#~/__mocks__/mockConnectionType';
import {
  mockGlobalScopedHardwareProfiles,
  mockProjectScopedHardwareProfiles,
  mockHardwareProfile,
} from '#~/__mocks__/mockHardwareProfile';
import { initInterceptsForAllProjects } from '#~/__tests__/cypress/cypress/utils/servingUtils';
import { nimDeployModal } from '#~/__tests__/cypress/cypress/pages/components/NIMDeployModal';
import { DataScienceStackComponent } from '#~/concepts/areas/types';

type HandlersProps = {
  disableKServeConfig?: boolean;
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
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableKServe: disableKServeConfig,
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
          name: 'template-2',
          displayName: 'Caikit',
          platforms: [ServingRuntimePlatform.SINGLE],
          containerName: 'kserve-container',
          containerEnvVars: [{ name: 'HF_HOME', value: '/tmp/hf_home' }],
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
      servingRuntimes: [],
      inferenceServices: [],
    });

    modelServingGlobal.visit('test-project');

    modelServingGlobal.shouldBeEmpty();

    // Test that the button is enabled
    cy.findByTestId('empty-state-title').should('exist');
    modelServingGlobal.findDeployModelButton().should('be.enabled');
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
    // KServe Modal has section at the bottom for configuring params
    kserveModalEdit.findConfigurationParamsSection().should('exist');
    kserveModalEdit.findCancelButton().click();

    modelServingGlobal.getModelRow('NIM Model').findKebabAction('Edit').click();
    // NIM Modal is the only one that has pvc-size
    nimDeployModal.findNimStorageSizeInput().should('exist');
  });

  it('Empty State No Project Selected', () => {
    initIntercepts({ inferenceServices: [] });

    // Visit the all-projects view (no project name passed here)
    modelServingGlobal.visit();

    modelServingGlobal.shouldBeEmpty();

    // Test that the button is enabled
    modelServingGlobal.findDeployModelButton().should('be.enabled');
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
      initIntercepts({});
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
