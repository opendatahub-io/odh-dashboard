import { mockHardwareProfile } from '~/__mocks__/mockHardwareProfile';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
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
} from '~/__tests__/cypress/cypress/utils/models';
import {
  mockK8sResourceList,
  mockNotebookK8sResource,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockSecretK8sResource,
  mockStorageClassList,
} from '~/__mocks__';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { mockImageStreamK8sResource } from '~/__mocks__/mockImageStreamK8sResource';
import { asProductAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { workbenchPage, editSpawnerPage } from '~/__tests__/cypress/cypress/pages/workbench';
import { hardwareProfileSection } from '~/__tests__/cypress/cypress/pages/components/HardwareProfileSection';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import type { PodKind } from '~/k8sTypes';
import { IdentifierResourceType, TolerationEffect, TolerationOperator } from '~/types';

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
    mockK8sResourceList([
      mockHardwareProfile({
        name: 'small-profile',
        displayName: 'Small Profile',
        identifiers: [
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: '1',
            maxCount: '2',
            defaultCount: '1',
            resourceType: IdentifierResourceType.CPU,
          },
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: '2Gi',
            maxCount: '4Gi',
            defaultCount: '2Gi',
            resourceType: IdentifierResourceType.MEMORY,
          },
        ],
        tolerations: [
          {
            effect: TolerationEffect.NO_SCHEDULE,
            key: 'NotebooksOnlyChange',
            operator: TolerationOperator.EXISTS,
          },
        ],
        nodeSelector: {},
      }),
      mockHardwareProfile({
        name: 'large-profile',
        displayName: 'Large Profile',
        identifiers: [
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: '4',
            maxCount: '8',
            defaultCount: '4',
            resourceType: IdentifierResourceType.CPU,
          },
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: '8Gi',
            maxCount: '16Gi',
            defaultCount: '8Gi',
            resourceType: IdentifierResourceType.MEMORY,
          },
        ],
      }),
    ]),
  ).as('hardwareProfiles');

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'test-project' },
    mockK8sResourceList([
      mockHardwareProfile({
        name: 'small-profile',
        displayName: 'Small Profile',
        namespace: 'test-project',
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
        tolerations: [
          {
            effect: TolerationEffect.NO_SCHEDULE,
            key: 'NotebooksOnlyChange',
            operator: TolerationOperator.EXISTS,
          },
        ],
        nodeSelector: {},
      }),
      mockHardwareProfile({
        name: 'large-profile-1',
        displayName: 'Large Profile-1',
        namespace: 'test-project',
        identifiers: [
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: '4',
            maxCount: '8',
            defaultCount: '4',
          },
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: '8Gi',
            maxCount: '16Gi',
            defaultCount: '8Gi',
          },
        ],
      }),
    ]),
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
});
