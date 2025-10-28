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
import {
  mock403ErrorWithDetails,
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
import { DataScienceStackComponent } from '#~/concepts/areas/types';

type HandlersProps = {
  isEmpty?: boolean;
  mockPodList?: PodKind[];
  disableProjectScoped?: boolean;
};

const initIntercepts = ({
  isEmpty = false,
  mockPodList = [mockPodK8sResource({})],
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
      components: {
        [DataScienceStackComponent.WORKBENCHES]: { managementState: 'Managed' },
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
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

  it('should display hardware profile selection in workbench creation without setting a feature flag', () => {
    initIntercepts();
    // debugger;
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
    initIntercepts({ disableProjectScoped: false });

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
    initIntercepts({ disableProjectScoped: false });

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
    initIntercepts({ disableProjectScoped: false });

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

    // Mock the individual hardware profile resource fetch
    cy.interceptK8s(
      {
        model: HardwareProfileModel,
        ns: 'test-project',
        name: 'large-profile-1',
      },
      mockHardwareProfile({
        name: 'large-profile-1',
        displayName: 'Large Profile-1',
        namespace: 'test-project',
      }),
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
    initIntercepts();
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
    hardwareProfileSection.verifyResourceValidation('cpu-requests', '', 'CPU must be provided');
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
      '',
      'Memory must be provided',
    );
    hardwareProfileSection.verifyResourceValidation(
      'memory-requests',
      '17',
      'Must not exceed 16 GiB',
    );
  });

  describe('Edit Workbench Hardware Profiles', () => {
    it('should auto-select hardware profile from annotations', () => {
      initIntercepts();
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
      initIntercepts();
      // Mock disabled hardware profile
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockHardwareProfile({
            name: 'small-profile',
            displayName: 'Small Profile',
            annotations: { 'opendatahub.io/disabled': 'true' },
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
      initIntercepts();
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
      initIntercepts();
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

  describe('Hardware Profile Dropdown Ordering', () => {
    beforeEach(() => {
      initIntercepts();
      // Common config for all dropdown ordering tests - remove notebook sizes
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableProjectScoped: true,
          notebookSizes: [], // Remove notebook sizes to test only hardware profiles
          hardwareProfileOrder: [], // Will be overridden by individual tests if needed
        }),
      );
    });

    it('should display dropdown options in alphabetical order when no hardwareProfileOrder is configured', () => {
      // Set hardware profiles for this test
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          ...mockGlobalScopedHardwareProfiles,
          mockHardwareProfile({ name: 'zebra-profile', displayName: 'Zebra Profile' }),
          mockHardwareProfile({ name: 'alpha-profile', displayName: 'Alpha Profile' }),
          mockHardwareProfile({ name: 'beta-profile', displayName: 'Beta Profile' }),
        ]),
      );

      // Navigate to workbench creation
      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      cy.wait('@hardwareProfiles');

      // Debug: Check if hardware profile section exists
      hardwareProfileSection
        .findSelect()
        .should('exist')
        .then(($el) => {
          cy.log('Hardware profile dropdown exists:', $el.length > 0);
        });

      hardwareProfileSection.findSelect().click();

      // Debug: Log all profile names to see what's actually in the dropdown
      cy.findAllByRole('option').then(($options) => {
        const profileNames = [...$options].map((el) => el.textContent);
        cy.log('Actual profiles in dropdown:', profileNames.join(', '));
      });

      // Verify alphabetical order with only hardware profiles (notebook sizes disabled)
      const expectedOrder = [
        'Alpha Profile',
        'Beta Profile',
        'Large Profile',
        'Small Profile',
        'Zebra Profile',
      ];

      // Verify total count first
      cy.findAllByRole('option').should('have.length', expectedOrder.length);

      // Then verify each position contains expected text
      expectedOrder.forEach((profileName, index) => {
        cy.findAllByRole('option').eq(index).should('contain', profileName);
      });
    });

    it('should display dropdown options in custom order when hardwareProfileOrder is configured', () => {
      // Override with custom hardware profile order
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableProjectScoped: true,
          hardwareProfileOrder: ['zebra-profile', 'alpha-profile', 'beta-profile'],
          notebookSizes: [],
        }),
      );

      // Override with just the profiles needed for this test
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockHardwareProfile({ name: 'alpha-profile', displayName: 'Alpha Profile' }),
          mockHardwareProfile({ name: 'beta-profile', displayName: 'Beta Profile' }),
          mockHardwareProfile({ name: 'zebra-profile', displayName: 'Zebra Profile' }),
        ]),
      );

      // Navigate to workbench creation
      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      cy.wait('@hardwareProfiles');

      hardwareProfileSection.findSelect().click();

      // Verify custom order
      const expectedOrder = ['Zebra Profile', 'Alpha Profile', 'Beta Profile'];
      expectedOrder.forEach((profileName, index) => {
        cy.findAllByRole('option').eq(index).should('contain', profileName);
      });
    });

    it('should handle partial ordering by appending unlisted profiles alphabetically', () => {
      // Override with partial ordering
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableProjectScoped: true,
          hardwareProfileOrder: ['beta-profile'], // Only beta specified
          notebookSizes: [],
        }),
      );

      // Override with additional profiles for this test
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          ...mockGlobalScopedHardwareProfiles,
          mockHardwareProfile({ name: 'alpha-profile', displayName: 'Alpha Profile' }),
          mockHardwareProfile({ name: 'beta-profile', displayName: 'Beta Profile' }),
          mockHardwareProfile({ name: 'zebra-profile', displayName: 'Zebra Profile' }),
          mockHardwareProfile({ name: 'delta-profile', displayName: 'Delta Profile' }),
        ]),
      );

      // Navigate to workbench creation
      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      cy.wait('@hardwareProfiles');

      hardwareProfileSection.findSelect().click();

      // Verify beta comes first (from order), then others alphabetically
      const expectedOrder = [
        'Beta Profile', // From hardwareProfileOrder
        'Alpha Profile', // Alphabetical
        'Delta Profile', // Alphabetical
        'Large Profile', // Alphabetical
        'Small Profile', // Alphabetical
        'Zebra Profile', // Alphabetical
      ];
      expectedOrder.forEach((profileName, index) => {
        cy.findAllByRole('option').eq(index).should('contain', profileName);
      });
    });

    it('should maintain custom order consistency during search filtering', () => {
      // Override with specific order for alpha profiles - enable project-scoped for search functionality
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableProjectScoped: false, // Enable to get search input
          hardwareProfileOrder: [
            'gamma-profile',
            'alpha-two-profile',
            'beta-profile',
            'alpha-one-profile',
          ],
          notebookSizes: [],
        }),
      );

      // Override with specific profiles for this test
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockHardwareProfile({ name: 'alpha-one-profile', displayName: 'Alpha One Profile' }),
          mockHardwareProfile({ name: 'alpha-two-profile', displayName: 'Alpha Two Profile' }),
          mockHardwareProfile({ name: 'beta-profile', displayName: 'Beta Profile' }),
          mockHardwareProfile({ name: 'gamma-profile', displayName: 'Gamma Profile' }),
        ]),
      );

      // Navigate to workbench creation
      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      cy.wait('@hardwareProfiles');

      // Open the searchable dropdown (used when project-scoped is enabled)
      hardwareProfileSection.findHardwareProfileSearchSelector().click();

      // Type search filter using helper function
      hardwareProfileSection.findHardwareProfileSearchInput().type('alpha');

      // Verify alpha profiles maintain custom order (Alpha Two before Alpha One)
      // After filtering, options are within menuitem roles in the dropdown
      cy.findAllByRole('menuitem').should('have.length', 2);
      cy.findAllByRole('menuitem').eq(0).should('contain', 'Alpha Two Profile');
      cy.findAllByRole('menuitem').eq(1).should('contain', 'Alpha One Profile');
    });

    it('should ignore deleted profiles in hardwareProfileOrder configuration', () => {
      // Override with deleted profile in order
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableProjectScoped: true,
          hardwareProfileOrder: ['gamma-profile', 'deleted-profile', 'alpha-profile'],
          notebookSizes: [],
        }),
      );

      // Override with limited profiles (deleted-profile not included)
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockHardwareProfile({ name: 'alpha-profile', displayName: 'Alpha Profile' }),
          mockHardwareProfile({ name: 'gamma-profile', displayName: 'Gamma Profile' }),
          // Note: deleted-profile is not included
        ]),
      );

      // Navigate to workbench creation
      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      cy.wait('@hardwareProfiles');

      hardwareProfileSection.findSelect().click();

      // Verify only existing profiles are shown in correct order
      const expectedOrder = ['Gamma Profile', 'Alpha Profile'];
      expectedOrder.forEach((profileName, index) => {
        cy.findAllByRole('option').eq(index).should('contain', profileName);
      });
    });
  });

  describe('Hardware profiles column state labels in the workbenches table', () => {
    it('should show "Deleted" label when hardware profile is deleted', () => {
      initIntercepts({});

      // Mock notebook with hardware profile annotation
      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'deleted-profile',
            displayName: 'Test Notebook',
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
          body: {
            kind: 'Status',
            apiVersion: 'v1',
            code: 404,
            message: 'hardwareprofiles.infrastructure.opendatahub.io "deleted-profile" not found',
            reason: 'NotFound',
            status: 'Failure',
          },
        },
      );

      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();

      // Verify "Deleted" label appears in hardware profile column
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHardwareProfileColumn()
        .should('contain', 'Deleted');

      // Verify "Deleted" popover shows correct message
      workbenchPage.getNotebookRow('Test Notebook').findHardwareProfileDeletedLabel().click();
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHardwareProfileDeletedPopover()
        .title()
        .should('be.visible');
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHardwareProfileDeletedPopover()
        .body()
        .should('be.visible');
    });

    it('should show "Disabled" label when hardware profile is disabled', () => {
      initIntercepts({});

      // Mock notebook with hardware profile annotation
      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'disabled-profile',
            displayName: 'Test Notebook',
          }),
        ]),
      );

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

      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();

      // Verify "Disabled" label appears in hardware profile column
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHardwareProfileColumn()
        .should('contain', 'Disabled');

      // Verify "Disabled" popover shows correct message
      workbenchPage.getNotebookRow('Test Notebook').findHardwareProfileDisabledLabel().click();
      cy.findByTestId('hardware-profile-status-disabled-popover-title').should('be.visible');
      cy.findByTestId('hardware-profile-status-disabled-popover-body').should('be.visible');
    });

    it('should show "Updated" label when hardware profile spec has changed', () => {
      initIntercepts({});

      // Mock notebook with hardware profile annotation and spec snapshot
      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'updated-profile',
            displayName: 'Test Notebook',
            opts: {
              metadata: {
                annotations: {
                  'opendatahub.io/hardware-profile-name': 'updated-profile',
                  'opendatahub.io/hardware-profile-resource-version': '104110942',
                },
              },
            },
          }),
        ]),
      );

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
          annotations: {
            'opendatahub.io/disabled': 'false',
          },
          identifiers: [
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '2',
              maxCount: '4',
              defaultCount: '2',
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

      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();

      // Verify "Updated" label appears in hardware profile column
      workbenchPage
        .getNotebookRow('Test Notebook')
        .findHardwareProfileColumn()
        .should('contain', 'Updated');

      // Verify "Updated" popover shows correct message
      workbenchPage.getNotebookRow('Test Notebook').findHardwareProfileUpdatedLabel().click();
      cy.findByTestId('hardware-profile-status-updated-popover-title').should('be.visible');
      cy.findByTestId('hardware-profile-status-updated-popover-body').should('be.visible');
    });

    it('should show binding state labels for running workbenches', () => {
      initIntercepts({});

      // Mock running notebook with deleted hardware profile
      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'deleted-profile',
            displayName: 'Running Notebook',
            opts: {
              metadata: {
                annotations: {
                  'opendatahub.io/hardware-profile-name': 'deleted-profile',
                  // No stop annotation = running
                },
              },
            },
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
          body: {
            kind: 'Status',
            apiVersion: 'v1',
            code: 404,
            message: 'hardwareprofiles.infrastructure.opendatahub.io "deleted-profile" not found',
            reason: 'NotFound',
            status: 'Failure',
          },
        },
      );

      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();

      // Verify "Deleted" label appears
      workbenchPage
        .getNotebookRow('Running Notebook')
        .findHardwareProfileDeletedLabel()
        .should('exist');

      // Verify popover mentions running workbench
      workbenchPage.getNotebookRow('Running Notebook').findHardwareProfileDeletedLabel().click();
      cy.findByTestId('hardware-profile-status-deleted-popover-body').should('be.visible');
    });

    it('should show error icon with popover when hardware profile fails to load (non-404 error)', () => {
      initIntercepts({});

      cy.interceptK8sList(
        {
          model: NotebookModel,
          ns: 'test-project',
        },
        mockK8sResourceList([
          mockNotebookK8sResource({
            hardwareProfileName: 'error-profile',
            hardwareProfileNamespace: 'opendatahub',
            displayName: 'Test Notebook',
          }),
        ]),
      );

      // Mock the hardware profile with a 403 error (forbidden)
      cy.interceptK8s(
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'error-profile',
        },
        mock403ErrorWithDetails({}),
      );

      projectDetails.visit(projectName);
      projectDetails.findSectionTab('workbenches').click();

      // Verify error icon appears
      const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
      const errorIcon = notebookRow.findHardwareProfileErrorIcon();
      errorIcon.should('exist');
      errorIcon.trigger('mouseenter');
      const errorPopoverTitle = notebookRow.findHardwareProfileErrorPopover();
      errorPopoverTitle.should('be.visible');
    });
  });
});
