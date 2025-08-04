import {
  mockGlobalScopedHardwareProfiles,
  mockHardwareProfile,
  mockProjectScopedHardwareProfiles,
} from '#~/__mocks__/mockHardwareProfile';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import {
  HardwareProfileModel,
  ImageStreamModel,
  NotebookModel,
  PVCModel,
  PodModel,
  ProjectModel,
  RouteModel,
  SecretModel,
  StorageClassModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { ProfileIdentifierType } from '#~/concepts/hardwareProfiles/types';
import {
  mockK8sResourceList,
  mockNotebookK8sResource,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockSecretK8sResource,
  mockStorageClassList,
} from '#~/__mocks__';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';
import { mockPodK8sResource } from '#~/__mocks__/mockPodK8sResource';
import { mockImageStreamK8sResource } from '#~/__mocks__/mockImageStreamK8sResource';
import { asProductAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import { workbenchPage, editSpawnerPage } from '#~/__tests__/cypress/cypress/pages/workbench';
import { hardwareProfileSection } from '#~/__tests__/cypress/cypress/pages/components/HardwareProfileSection';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import type { PodKind } from '#~/k8sTypes';

type HandlersProps = {
  isEmpty?: boolean;
  mockPodList?: PodKind[];
  disableHardwareProfiles?: boolean;
  disableProjectScoped?: boolean;
};

const initIntercepts = ({
  isEmpty = false,
  mockPodList = [mockPodK8sResource({})],
  disableHardwareProfiles = false,
  disableProjectScoped = true,
}: HandlersProps = {}) => {
  asProductAdminUser();

  // Mock hardware profiles
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockGlobalScopedHardwareProfiles),
  ).as('hardwareProfiles');

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'test-project' },
    mockK8sResourceList(mockProjectScopedHardwareProfiles),
  ).as('hardwareProfiles');

  // Mock standard resources similar to workbench.cy.ts
  cy.interceptK8sList(StorageClassModel, mockStorageClassList());
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        workbenches: true,
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableHardwareProfiles,
      disableProjectScoped,
    }),
  );
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({}));
  cy.interceptK8sList(PodModel, mockK8sResourceList(mockPodList));
  cy.interceptK8sList(
    ImageStreamModel,
    mockK8sResourceList([
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
      }),
    ]),
  );
  cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'test-notebook' }));
  cy.interceptK8sList(
    {
      model: NotebookModel,
      ns: 'test-project',
    },
    mockK8sResourceList(
      isEmpty
        ? []
        : [
            mockNotebookK8sResource({
              displayName: 'Test Notebook',
            }),
          ],
    ),
  );
  cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));
  cy.interceptK8sList(
    PVCModel,
    mockK8sResourceList([mockPVCK8sResource({ name: 'test-storage-1' })]),
  );
};

describe('Workbench Hardware Profiles', () => {
  const projectName = 'test-project';

  it('should display hardware profile selection in workbench creation when feature flag is enabled', () => {
    initIntercepts({ disableHardwareProfiles: false });

    // Navigate to workbench creation
    projectDetails.visit(projectName);
    projectDetails.findSectionTab('workbenches').click();
    workbenchPage.findCreateButton().click();

    // wait for hardware profile select to be loaded in
    cy.wait('@hardwareProfiles');

    // Verify hardware profile section exists
    hardwareProfileSection.findSelect().should('exist');

    // Verify available profiles
    hardwareProfileSection.selectProfile(
      'Small Profile CPU: Request = 1 Cores; Limit = 1 Cores; Memory: Request = 2 GiB; Limit = 2 GiB',
    );
    hardwareProfileSection.selectProfile(
      'Large Profile CPU: Request = 4 Cores; Limit = 4 Cores; Memory: Request = 8 GiB; Limit = 8 GiB',
    );
  });

  it('should display and select project-scoped hardware and global-scoped hardware profiles while creating a workbench', () => {
    initIntercepts({ disableHardwareProfiles: false, disableProjectScoped: false });

    cy.interceptK8sList(
      {
        model: NotebookModel,
        ns: 'test-project',
      },
      mockK8sResourceList([
        mockNotebookK8sResource({
          hardwareProfileName: 'large-profile-1',
          displayName: 'Test Notebook',
        }),
      ]),
    );

    // Navigate to workbench creation
    projectDetails.visit(projectName);
    projectDetails.findSectionTab('workbenches').click();
    workbenchPage.findCreateButton().click();

    // wait for hardware profile select to be loaded in
    cy.wait('@hardwareProfiles');

    // Verify hardware profile section exists
    hardwareProfileSection.findHardwareProfileSearchSelector().should('exist');
    hardwareProfileSection.findHardwareProfileSearchSelector().click();

    // Verify both groups are initially visible
    cy.contains('Project-scoped hardware profiles').should('be.visible');
    cy.contains('Global-scoped hardware profiles').scrollIntoView();
    cy.contains('Global-scoped hardware profiles').should('be.visible');

    // Search for a value that exists in Project-scoped hardware profiles but not in Global-scoped hardware profiles
    hardwareProfileSection
      .findHardwareProfileSearchInput()
      .should('be.visible')
      .type('Large Profile-1');

    // Wait for and verify the groups are visible
    cy.contains('Large Profile-1').should('be.visible');
    hardwareProfileSection.getGlobalHardwareProfileLabel().should('not.exist');

    //Search for a value that doesn't exist in either Global-scoped hardware profiles or Project-scoped hardware profiles
    hardwareProfileSection
      .findHardwareProfileSearchInput()
      .should('be.visible')
      .clear()
      .type('sample');

    // Wait for and verify that no results are found
    cy.contains('No results found').should('be.visible');
    hardwareProfileSection.getGlobalHardwareProfileLabel().should('not.exist');
    hardwareProfileSection.getProjectScopedHardwareProfileLabel().should('not.exist');
    hardwareProfileSection.findHardwareProfileSearchInput().should('be.visible').clear();
  });

  it('should display hardware profile selection in workbench creation when both hardware profile and project-scoped feature flag is enabled', () => {
    initIntercepts({ disableHardwareProfiles: false, disableProjectScoped: false });

    // Navigate to workbench creation
    projectDetails.visit(projectName);
    projectDetails.findSectionTab('workbenches').click();
    workbenchPage.findCreateButton().click();

    // wait for hardware profile select to be loaded in
    cy.wait('@hardwareProfiles');

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

  it('should have project scoped label on table row', () => {
    initIntercepts({ disableHardwareProfiles: false, disableProjectScoped: false });

    // Mock notebook with hardware profile annotation
    cy.interceptK8sList(
      {
        model: NotebookModel,
        ns: 'test-project',
      },
      mockK8sResourceList([
        mockNotebookK8sResource({
          hardwareProfileName: 'large-profile-1',
          displayName: 'Test Notebook',
          hardwareProfileNamespace: 'test-project',
        }),
      ]),
    );

    projectDetails.visit(projectName);
    projectDetails.findSectionTab('workbenches').click();
    workbenchPage
      .getNotebookRow('Test Notebook')
      .find()
      .findByText('Large Profile-1')
      .should('exist');
    workbenchPage.getNotebookRow('Test Notebook').findProjectScopedLabel().should('exist');
  });

  it('should validate hardware profile customization within limits', () => {
    initIntercepts({ disableHardwareProfiles: false });

    // Navigate to workbench creation
    projectDetails.visit(projectName);
    projectDetails.findSectionTab('workbenches').click();
    workbenchPage.findCreateButton().click();

    // Select profile and open customization
    hardwareProfileSection.selectProfile(
      'Large Profile CPU: Request = 4 Cores; Limit = 4 Cores; Memory: Request = 8 GiB; Limit = 8 GiB',
    );
    hardwareProfileSection.findCustomizeButton().click();

    // Test CPU validation
    hardwareProfileSection.verifyResourceValidation(
      'cpu-requests',
      '3',
      'Must be at least 4 Cores',
    );
    hardwareProfileSection.verifyResourceValidation('cpu-requests', '9', 'Must not exceed 8 Cores');
    hardwareProfileSection.verifyResourceValidation('cpu-requests', '6');
    hardwareProfileSection.verifyResourceValidation(
      'cpu-limits',
      '5',
      'Limit must be greater than or equal to request',
    );

    // Test Memory validation
    hardwareProfileSection.verifyResourceValidation(
      'memory-requests',
      '1',
      'Must be at least 8 GiB',
    );

    hardwareProfileSection.verifyResourceValidation(
      'memory-requests',
      '17',
      'Must not exceed 16 GiB',
    );
  });

  it('should not display hardware profile selection when feature flag is disabled', () => {
    initIntercepts({ disableHardwareProfiles: true });

    // Navigate to workbench creation
    projectDetails.visit(projectName);
    projectDetails.findSectionTab('workbenches').click();
    workbenchPage.findCreateButton().click();

    // Verify hardware profile section does not exist
    hardwareProfileSection.findSelect().should('not.exist');
  });

  describe('Edit Workbench Hardware Profiles', () => {
    it('should auto-select hardware profile from annotations', () => {
      initIntercepts({
        disableHardwareProfiles: false,
      });

      // Mock notebook with hardware profile annotation
      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'small-profile',
            displayName: 'Test Notebook',
          }),
        ]),
      );

      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
      );

      editSpawnerPage.visit('test-notebook');
      hardwareProfileSection.findSelect().should('contain.text', 'Small Profile');
    });

    it('should auto-select project-scoped hardware profile from annotations', () => {
      initIntercepts({
        disableHardwareProfiles: false,
        disableProjectScoped: false,
      });

      // Mock notebook with hardware profile annotation
      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'large-profile-1',
            displayName: 'Test Notebook',
            hardwareProfileNamespace: 'test-project',
          }),
        ]),
      );

      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
      );

      editSpawnerPage.visit('test-notebook');
      hardwareProfileSection
        .findHardwareProfileSearchSelector()
        .should('contain.text', 'Large Profile-1');
      hardwareProfileSection.findProjectScopedLabel().should('exist');
    });

    it('should auto-select disabled hardware profile from annotations and show disabled state', () => {
      initIntercepts({
        disableHardwareProfiles: false,
      });

      // Mock disabled hardware profile
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockHardwareProfile({
            name: 'small-profile',
            displayName: 'Small Profile',
            enabled: false,
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
        ]),
      );

      // Mock notebook with disabled hardware profile annotation
      cy.interceptK8sList(
        NotebookModel,
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'small-profile',
            displayName: 'Test Notebook',
          }),
        ]),
      );

      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
      );

      editSpawnerPage.visit('test-notebook');
      editSpawnerPage.findAlertMessage().should('not.exist');
      hardwareProfileSection.findSelect().should('contain.text', 'Small Profile (disabled)');
    });

    it('should auto-select matching hardware profile when resources match', () => {
      initIntercepts({
        disableHardwareProfiles: false,
      });

      // Mock notebook with matching resources but no hardware profile annotation
      cy.interceptK8sList(
        NotebookModel,
        mockK8sResourceList([
          mockNotebookK8sResource({
            opts: {
              metadata: {
                name: 'test-notebook',
                annotations: {
                  'openshift.io/display-name': 'Test Notebook',
                },
              },
              spec: {
                template: {
                  spec: {
                    containers: [
                      {
                        name: 'test-notebook',
                        resources: {
                          requests: {
                            cpu: '1',
                            memory: '2Gi',
                          },
                          limits: {
                            cpu: '1',
                            memory: '2Gi',
                          },
                        },
                      },
                    ],
                    tolerations: [],
                    nodeSelector: {},
                  },
                },
              },
            },
          }),
        ]),
      );

      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
      );

      editSpawnerPage.visit('test-notebook');
      editSpawnerPage.findAlertMessage().should('not.exist');
      hardwareProfileSection.findSelect().should('contain.text', 'Small Profile');
      hardwareProfileSection.findSelect().click();
      cy.findByRole('option', { name: 'Use existing settings' }).should('not.exist');
    });

    it('should auto-select "Use existing settings" when resources do not match any profile', () => {
      initIntercepts({
        disableHardwareProfiles: false,
      });

      // Mock notebook with non-matching resources and no hardware profile annotation
      cy.interceptK8sList(
        NotebookModel,
        mockK8sResourceList([
          mockNotebookK8sResource({
            opts: {
              metadata: {
                name: 'test-notebook',
                annotations: {
                  'openshift.io/display-name': 'Test Notebook',
                },
              },
              spec: {
                template: {
                  spec: {
                    containers: [
                      {
                        name: 'test-notebook',
                        resources: {
                          requests: {
                            cpu: '10',
                            memory: '6Gi',
                          },
                          limits: {
                            cpu: '10',
                            memory: '6Gi',
                          },
                        },
                      },
                    ],
                    tolerations: [
                      {
                        key: 'some-new-key',
                      },
                    ],
                    nodeSelector: {},
                  },
                },
              },
            },
          }),
        ]),
      );

      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
      );

      editSpawnerPage.visit('test-notebook');
      editSpawnerPage.findAlertMessage().should('not.exist');
      hardwareProfileSection.findSelect().should('contain.text', 'Use existing settings');
    });
  });

  describe('Hardware profile customization for legacy profiles', () => {
    beforeEach(() => {
      initIntercepts({ disableHardwareProfiles: false });

      // Mock notebook with initial values
      cy.interceptK8sList(
        NotebookModel,
        mockK8sResourceList([
          mockNotebookK8sResource({
            opts: {
              spec: {
                template: {
                  spec: {
                    containers: [
                      {
                        name: 'test-notebook',
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
                      },
                    ],
                  },
                },
              },
            },
          }),
        ]),
      );

      // Navigate to workbench creation
      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();

      // Select profile and open customization
      hardwareProfileSection.selectProfile(
        'Small CPU: Request = 1 Cores; Limit = 1 Cores; Memory: Request = 8 GiB; Limit = 8 GiB',
      );
      hardwareProfileSection.findCustomizeButton().click();
    });

    it('should show requests and limits info popover', () => {
      // Click info button and verify popover content
      hardwareProfileSection.findRequestsLimitsInfoButton().click();
      hardwareProfileSection.findRequestsLimitsPopover().should('be.visible');

      // Verify popover content
      cy.contains('Requests: A request is the guaranteed minimum amount').should('exist');
      cy.contains('Limits: A limit is the maximum amount').should('exist');
      cy.contains('Request and limit values must be within the minimum and maximum bounds').should(
        'exist',
      );
    });

    it('should handle checkbox interactions correctly', () => {
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        true,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.LIMIT,
        true,
        false,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.REQUEST,
        true,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.LIMIT,
        true,
        false,
      );

      // Verify initial values
      hardwareProfileSection.verifyResourceValue('cpu', ProfileIdentifierType.REQUEST, '1');
      hardwareProfileSection.verifyResourceValue('cpu', ProfileIdentifierType.LIMIT, '1');
      hardwareProfileSection.verifyResourceValue('memory', ProfileIdentifierType.REQUEST, '8');
      hardwareProfileSection.verifyResourceValue('memory', ProfileIdentifierType.LIMIT, '8');

      // Disable CPU requests, CPU limits should also be disabled automatically
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        false,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.LIMIT,
        false,
        true,
      );

      // Re-enable CPU requests and limits
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.findCPULimitsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        true,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.LIMIT,
        true,
        false,
      );

      // Disable Memory requests should also disable and uncheck limits
      hardwareProfileSection.findMemoryRequestsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.REQUEST,
        false,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.LIMIT,
        false,
        true,
      );
    });

    it('should validate resource dependencies', () => {
      // Set CPU requests
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '2');
      hardwareProfileSection.verifyResourceValue('cpu', ProfileIdentifierType.REQUEST, '2');

      // Set CPU limits lower than requests - should show error
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '1');
      cy.contains('Limit must be greater than or equal to request').should('exist');

      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '4');
      cy.contains('Must not exceed 2 Cores').should('exist');

      // Set CPU limits higher than requests - should show error
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '5');
      cy.contains('Must not exceed 2 Cores').should('exist');

      // Set CPU requests higher than limits - should show error
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '6');
      cy.contains('Must not exceed 2 Cores').should('exist');

      // Set CPU requests higher than max count - should show error
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '2');
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '1');
      cy.contains('Limit must be greater than or equal to request').should('exist');
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '2');

      // Set Memory requests
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '8');
      hardwareProfileSection.verifyResourceValue('memory', ProfileIdentifierType.REQUEST, '8');

      // Set Memory limits lower than requests - should show error
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '6');
      cy.contains('Must be at least 8 GiB').should('exist');

      // Set Memory limits equal to requests - should be valid
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '8');
      cy.contains('Limit must be greater than or equal to request').should('not.exist');

      // Set Memory limits higher than requests - should be valid
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '10');
      cy.contains('Must not exceed 8 GiB').should('exist');

      // Set Memory requests higher than limits - should show error
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '12');
      cy.contains('Must not exceed 8 GiB').should('exist');
    });

    it('should validate memory values with units', () => {
      // Set Memory requests with GiB units
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '8');
      hardwareProfileSection.selectResourceUnit('memory', ProfileIdentifierType.REQUEST, 'Gi');
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '8');
      hardwareProfileSection.selectResourceUnit('memory', ProfileIdentifierType.LIMIT, 'Gi');

      hardwareProfileSection.verifyResourceValue('memory', ProfileIdentifierType.REQUEST, '8');
      hardwareProfileSection.verifyResourceUnit('memory', ProfileIdentifierType.REQUEST, 'Gi');
      hardwareProfileSection.verifyResourceValue('memory', ProfileIdentifierType.LIMIT, '8');
      hardwareProfileSection.verifyResourceUnit('memory', ProfileIdentifierType.LIMIT, 'Gi');

      // Try setting memory with MiB units
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '9216');
      hardwareProfileSection.selectResourceUnit('memory', ProfileIdentifierType.LIMIT, 'Mi');
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '9216');
      hardwareProfileSection.selectResourceUnit('memory', ProfileIdentifierType.REQUEST, 'Mi');

      hardwareProfileSection.verifyResourceValue('memory', ProfileIdentifierType.LIMIT, '9216');
      hardwareProfileSection.verifyResourceUnit('memory', ProfileIdentifierType.LIMIT, 'Mi');
      hardwareProfileSection.verifyResourceValue('memory', ProfileIdentifierType.REQUEST, '9216');
      hardwareProfileSection.verifyResourceUnit('memory', ProfileIdentifierType.REQUEST, 'Mi');
    });

    it('should restore previous values when re-enabling checkboxes', () => {
      // Set initial values
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '4');
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.LIMIT, '6');

      // Disable CPU requests (should also disable limits)
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.REQUEST,
        false,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'cpu',
        ProfileIdentifierType.LIMIT,
        false,
        true,
      );

      // Re-enable CPU requests - should restore previous value
      hardwareProfileSection.findCPURequestsCheckbox().click();
      hardwareProfileSection.verifyResourceValue('cpu', ProfileIdentifierType.REQUEST, '4');

      // Re-enable CPU limits - should restore previous value
      hardwareProfileSection.findCPULimitsCheckbox().click();
      hardwareProfileSection.verifyResourceValue('cpu', ProfileIdentifierType.LIMIT, '6');
      // Set initial values for memory
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '8');
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.LIMIT, '10');

      // Disable Memory requests (should also disable limits)
      hardwareProfileSection.findMemoryRequestsCheckbox().click();
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.REQUEST,
        false,
      );
      hardwareProfileSection.verifyResourceCheckboxState(
        'memory',
        ProfileIdentifierType.LIMIT,
        false,
        true,
      );

      // Re-enable Memory requests - should restore previous value
      hardwareProfileSection.findMemoryRequestsCheckbox().click();
      hardwareProfileSection.verifyResourceValue('memory', ProfileIdentifierType.REQUEST, '8');

      // Re-enable Memory limits - should restore previous value
      hardwareProfileSection.findMemoryLimitsCheckbox().click();
      hardwareProfileSection.verifyResourceValue('memory', ProfileIdentifierType.LIMIT, '10');
    });

    it('should handle min/max validation for all resources', () => {
      // CPU validation
      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '0.5');
      cy.contains('Must be at least 1 Cores').should('exist');

      hardwareProfileSection.setResourceValue('cpu', ProfileIdentifierType.REQUEST, '10');
      cy.contains('Must not exceed 2 Cores').should('exist');

      // Memory validation
      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '4Gi');
      cy.contains('Must be at least 8 GiB').should('exist');

      hardwareProfileSection.setResourceValue('memory', ProfileIdentifierType.REQUEST, '20Gi');
      cy.contains('Must not exceed 8 GiB').should('exist');
    });
  });
});
