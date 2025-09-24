import {
  editHardwareProfile,
  legacyHardwareProfile,
} from '#~/__tests__/cypress/cypress/pages/hardwareProfile';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import {
  AcceleratorProfileModel,
  HardwareProfileModel,
  ODHDashboardConfigModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { migrationModal } from '#~/__tests__/cypress/cypress/pages/components/MigrationModal';
import { mock200Status, mockDashboardConfig, mockK8sResourceList } from '#~/__mocks__';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import { asProductAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { testPagination } from '#~/__tests__/cypress/cypress/utils/pagination';
import { mockAcceleratorProfile } from '#~/__mocks__/mockAcceleratorProfile';
import {
  IdentifierResourceType,
  SchedulingType,
  TolerationEffect,
  TolerationOperator,
} from '#~/types';

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      modelServerSizes: [],
      notebookSizes: [],
    }),
  );
};

describe('legacy profiles table', () => {
  const testNamespace = 'opendatahub';

  beforeEach(() => {
    asProductAdminUser();
    initIntercepts();
  });
  describe('Table', () => {
    it('should not show the table when there are no items', () => {
      legacyHardwareProfile.visit();
      legacyHardwareProfile.findSection().should('not.exist');
    });

    it('should not show the table when there are no legacy items', () => {
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: testNamespace },
        mockK8sResourceList([
          mockHardwareProfile({
            name: 'test-accelerator-profile',
            displayName: 'Test Accelerator Profile',
          }),
        ]),
      );

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findSection().should('not.exist');
    });

    it('should initially hide the table when there are legacy items', () => {
      cy.interceptK8sList(
        { model: AcceleratorProfileModel, ns: testNamespace },
        mockK8sResourceList([
          mockAcceleratorProfile({
            name: 'test-accelerator-profile',
            displayName: 'Test Accelerator Profile',
          }),
        ]),
      );

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findSection().should('exist');
      legacyHardwareProfile.findTable().should('not.be.visible');
    });

    it('should expand the section to visualize the table', () => {
      cy.interceptK8sList(
        { model: AcceleratorProfileModel, ns: testNamespace },
        mockK8sResourceList([
          mockAcceleratorProfile({
            name: 'test-accelerator-profile',
            displayName: 'Test Accelerator Profile',
          }),
        ]),
      );

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findTable().should('not.be.visible');
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.findTable().should('be.visible');
    });

    it('should show the Source column for legacy items', () => {
      cy.interceptK8sList(
        { model: AcceleratorProfileModel, ns: testNamespace },
        mockK8sResourceList([
          mockAcceleratorProfile({
            name: 'test-accelerator-profile',
            displayName: 'Test Accelerator Profile',
          }),
        ]),
      );

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.findTable().contains('th', 'Source').should('exist');
    });

    it('should show two entries in the table for each Accelerator Profile', () => {
      const totalItems = 3;

      cy.interceptK8sList(
        { model: AcceleratorProfileModel, ns: testNamespace },
        mockK8sResourceList(
          Array.from({ length: totalItems }, (_, i) =>
            mockAcceleratorProfile({
              name: `test-accelerator-profile-${i}`,
              displayName: `Test Accelerator Profile - ${i}`,
            }),
          ),
        ),
      );

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.findRows().should('have.length', totalItems * 2);
    });

    it('should filter legacy profiles', () => {
      const testAcceleratorProfileDisplayName = 'Test Accelerator Profile';
      const testNotebookSizeProfileName = 'test-notebook-size-profile';
      const testModelServerSizeProfileName = 'test-model-server-size-profile';

      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          modelServerSizes: [
            {
              name: testModelServerSizeProfileName,
              resources: { requests: { cpu: '1', memory: '1Gi' } },
            },
          ],
          notebookSizes: [
            {
              name: testNotebookSizeProfileName,
              resources: { requests: { cpu: '1', memory: '1Gi' } },
            },
          ],
        }),
      );

      cy.interceptK8sList(
        { model: AcceleratorProfileModel, ns: testNamespace },
        mockK8sResourceList([
          mockAcceleratorProfile({
            name: 'test-accelerator-profile',
            displayName: testAcceleratorProfileDisplayName,
            enabled: false,
          }),
        ]),
      );

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.findTable().should('be.visible');
      legacyHardwareProfile.findRows().should('have.length', 4);

      const tableToolbar = legacyHardwareProfile.getTableToolbar();

      tableToolbar.findSearchInput().type(testAcceleratorProfileDisplayName);
      legacyHardwareProfile.findRows().should('have.length', 2);
      legacyHardwareProfile.getRow(testAcceleratorProfileDisplayName).find().should('exist');

      tableToolbar.findFilterInput('name').clear();
      legacyHardwareProfile.findRows().should('have.length', 4);

      tableToolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Enabled').click();
      tableToolbar.selectEnableFilter('Enabled');
      legacyHardwareProfile.findRows().should('have.length', 2);
      legacyHardwareProfile.getRow(testNotebookSizeProfileName).find().should('exist');

      tableToolbar.selectEnableFilter('Disabled');
      legacyHardwareProfile.findRows().should('have.length', 2);
      legacyHardwareProfile.getRow(testAcceleratorProfileDisplayName).find().should('exist');

      tableToolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Name').click();
      tableToolbar.findFilterInput('name').type('No match');
      legacyHardwareProfile.findRows().should('have.length', 0);

      legacyHardwareProfile.findClearFiltersButton().click();
      legacyHardwareProfile.findRows().should('have.length', 4);
    });

    it('should paginate legacy profiles', () => {
      const itemCount = 25;
      const totalItems = itemCount * 2;
      const testModelServerProfileNamePrefix = 'test-model-server-size-profile';
      const testNotebookSizeProfileNamePrefix = 'test-notebook-size-profile';

      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          modelServerSizes: Array.from({ length: itemCount }, (_, i) => ({
            name: `${testModelServerProfileNamePrefix}-${i}`,
            resources: { requests: { cpu: '1', memory: '1Gi' } },
          })),
          notebookSizes: Array.from({ length: itemCount }, (_, i) => ({
            name: `${testNotebookSizeProfileNamePrefix}-${i}`,
            resources: { requests: { cpu: '1', memory: '1Gi' } },
          })),
        }),
      );

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.findTable().should('be.visible');

      testPagination({
        totalItems,
        firstElement: `${testModelServerProfileNamePrefix}-0`,
        paginationVariant: 'top',
      });

      testPagination({
        totalItems,
        firstElement: `${testModelServerProfileNamePrefix}-0`,
        paginationVariant: 'bottom',
      });

      legacyHardwareProfile.findTableHeaderButton('Name').click();
      legacyHardwareProfile.findTableHeaderButton('Name').should(be.sortAscending);
      legacyHardwareProfile.findTableHeaderButton('Name').click();
      legacyHardwareProfile.findTableHeaderButton('Name').should(be.sortDescending);
    });

    it('should show the expandable section for items', () => {
      const testModelServerProfileName = 'test-model-server-size-profile';
      const testAcceleratorProfileDisplayName = 'test-accelerator-profile';

      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          modelServerSizes: [
            {
              name: testModelServerProfileName,
              resources: { requests: { cpu: '1', memory: '1Gi' } },
            },
          ],
          notebookSizes: [],
        }),
      );

      cy.interceptK8sList(
        { model: AcceleratorProfileModel, ns: testNamespace },
        mockK8sResourceList([
          mockAcceleratorProfile({
            name: 'test-accelerator-profile',
            displayName: testAcceleratorProfileDisplayName,
            enabled: false,
            tolerations: [
              {
                key: 'nvidia.com/gpu',
                operator: TolerationOperator.EXISTS,
                effect: TolerationEffect.NO_SCHEDULE,
              },
            ],
          }),
        ]),
      );

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.findTable().should('be.visible');

      const row1 = legacyHardwareProfile.getRow(testModelServerProfileName);
      row1.findExpandButton().click();
      row1.findNodeResourceTable().should('exist');
      row1.findTolerationTable().should('not.exist');

      const row2 = legacyHardwareProfile.getRow(testAcceleratorProfileDisplayName);
      row2.findExpandButton().click();
      row2.findNodeResourceTable().should('exist');
      row2.findTolerationTable().should('exist');
    });

    it('should not allow changes in the Enabled button', () => {
      const testProfileDisplayNameEnabled = 'Test Accelerator Profile - Enabled';
      const testProfileDisplayNameDisabled = 'Test Accelerator Profile - Disabled';

      cy.interceptK8sList(
        { model: AcceleratorProfileModel, ns: testNamespace },
        mockK8sResourceList([
          mockAcceleratorProfile({
            name: 'test-accelerator-profile-enabled',
            displayName: testProfileDisplayNameEnabled,
            enabled: true,
          }),
          mockAcceleratorProfile({
            name: 'test-accelerator-profile-disabled',
            displayName: testProfileDisplayNameDisabled,
            enabled: false,
          }),
        ]),
      );

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.findTable().should('be.visible');

      const enabledRow = legacyHardwareProfile.getRow(testProfileDisplayNameEnabled);
      enabledRow.findEnabled().should('be.checked');
      enabledRow.findEnabled().should('be.disabled');

      const disabledRow = legacyHardwareProfile.getRow(testProfileDisplayNameDisabled);
      disabledRow.findEnabled().should('not.be.checked');
      disabledRow.findEnabled().should('be.disabled');
    });
  });

  describe('Accelerator profiles', () => {
    const testProfileName = 'test-accelerator-profile';
    const testProfileDisplayName = 'Test Accelerator Profile';

    beforeEach(() => {
      cy.interceptK8sList(
        { model: AcceleratorProfileModel, ns: testNamespace },
        mockK8sResourceList([
          mockAcceleratorProfile({
            name: testProfileName,
            displayName: testProfileDisplayName,
            namespace: testNamespace,
          }),
        ]),
      );
    });

    it('should delete', () => {
      cy.interceptK8s(
        'DELETE',
        {
          model: AcceleratorProfileModel,
          ns: testNamespace,
          name: testProfileName,
        },
        mock200Status({}),
      ).as('delete');

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.getRow(testProfileDisplayName).findKebabAction('Delete').click();

      deleteModal.findSubmitButton().should('be.disabled');
      deleteModal.findInput().fill('Delete 3 resources');
      deleteModal.findSubmitButton().should('be.enabled').click();

      cy.wait('@delete');
    });

    it('should duplicate', () => {
      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.getRow(testProfileDisplayName).findKebabAction('Duplicate').click();

      cy.url().should('include', `/hardwareProfiles/duplicate/${testProfileName}`);
    });

    it('should edit', () => {
      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.getRow(testProfileDisplayName).findKebabAction('Edit').click();

      cy.url().should('include', `/hardwareProfiles/edit/${testProfileName}`);

      editHardwareProfile.findMigrationAlert().should('be.visible');
    });

    it('should migrate', () => {
      // mocked model server size
      const modelServerSize = {
        name: 'Test Model Server Size',
        resources: { requests: { cpu: '2', memory: '2Gi' }, limits: { cpu: '3', memory: '3Gi' } },
      };
      // mocked notebook size
      const notebookSize = {
        name: 'Test Notebook Size',
        resources: { requests: { cpu: '1', memory: '1Gi' }, limits: { cpu: '2', memory: '2Gi' } },
      };
      // mock dashboard config
      const dashboardConfig = mockDashboardConfig({
        modelServerSizes: [modelServerSize],
        notebookSizes: [notebookSize],
      });

      cy.interceptOdh('GET /api/config', dashboardConfig);

      const originalAcceleratorProfile = mockAcceleratorProfile({
        namespace: 'opendatahub',
        name: 'legacy-hardware-profile',
        displayName: 'Legacy Hardware Profile',
        description: 'Legacy profile to be migrated',
        identifier: 'nvidia.com/gpu',
        enabled: true,
        tolerations: [
          {
            key: 'nvidia.com/gpu',
            operator: TolerationOperator.EXISTS,
            effect: TolerationEffect.NO_SCHEDULE,
          },
        ],
      });

      // Mock the accelerator profile that will be migrated
      cy.interceptK8sList(
        { model: AcceleratorProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([originalAcceleratorProfile]),
      );

      const migratedServingHardwareProfile = mockHardwareProfile({
        namespace: 'opendatahub',
        name: `${originalAcceleratorProfile.metadata.name}-serving`,
        displayName: originalAcceleratorProfile.spec.displayName,
        description: originalAcceleratorProfile.spec.description,
        annotations: {
          'opendatahub.io/dashboard-feature-visibility': '["model-serving","pipelines"]',
        },
        identifiers: [
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: modelServerSize.resources.requests.cpu,
            maxCount: modelServerSize.resources.limits.cpu,
            defaultCount: modelServerSize.resources.requests.cpu,
            resourceType: IdentifierResourceType.CPU,
          },
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: modelServerSize.resources.requests.memory,
            maxCount: modelServerSize.resources.limits.memory,
            defaultCount: modelServerSize.resources.requests.memory,
            resourceType: IdentifierResourceType.MEMORY,
          },
          {
            displayName: originalAcceleratorProfile.spec.identifier,
            identifier: originalAcceleratorProfile.spec.identifier,
            minCount: 1,
            defaultCount: 1,
          },
        ],
        tolerations: originalAcceleratorProfile.spec.tolerations,
      });

      const migratedNotebooksHardwareProfile = mockHardwareProfile({
        namespace: 'opendatahub',
        name: `${originalAcceleratorProfile.metadata.name}-notebooks`,
        annotations: {
          'opendatahub.io/dashboard-feature-visibility': '["workbench"]',
        },
        displayName: originalAcceleratorProfile.spec.displayName,
        description: originalAcceleratorProfile.spec.description,
        identifiers: [
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: notebookSize.resources.requests.cpu,
            maxCount: notebookSize.resources.limits.cpu,
            defaultCount: notebookSize.resources.requests.cpu,
          },
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: notebookSize.resources.requests.memory,
            maxCount: notebookSize.resources.limits.memory,
            defaultCount: notebookSize.resources.requests.memory,
          },
          {
            displayName: originalAcceleratorProfile.spec.identifier,
            identifier: originalAcceleratorProfile.spec.identifier,
            minCount: 0,
            defaultCount: 1,
          },
        ],
        tolerations: [
          ...(originalAcceleratorProfile.spec.tolerations || []),
          {
            key: 'NotebooksOnlyChange',
            operator: TolerationOperator.EXISTS,
            effect: TolerationEffect.NO_SCHEDULE,
          },
        ],
      });

      // Mock the API calls for migration
      cy.interceptK8s(
        'DELETE',
        { model: AcceleratorProfileModel, ns: 'opendatahub', name: 'legacy-hardware-profile' },
        mock200Status({}),
      ).as('deleteSource');

      // Mock the creation of the new hardware profiles
      cy.interceptK8s('POST', { model: HardwareProfileModel, ns: 'opendatahub' }, (req) => {
        // Check if the request body has the specific annotation
        const annotations =
          req.body.metadata?.annotations?.['opendatahub.io/dashboard-feature-visibility'];

        if (annotations?.includes('model-serving')) {
          req.reply(migratedServingHardwareProfile);
        } else if (annotations?.includes('workbench')) {
          req.reply(migratedNotebooksHardwareProfile);
        }
      }).as('create');

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile
        .getRow(originalAcceleratorProfile.spec.displayName)
        .findKebabAction('Migrate')
        .click();
      migrationModal.findSubmitButton().should('be.enabled').click();

      // assert the creation of the new hardware profiles
      cy.wait('@deleteSource');
      cy.wait('@create').then((interception) => {
        // Assert individually the properties that include random values
        const { name, annotations } = interception.request.body.metadata;
        expect(annotations).to.have.property('opendatahub.io/modified-date');

        const actual = Cypress._.omit(
          interception.request.body,
          'metadata.annotations["opendatahub.io/modified-date"]',
          'metadata.name',
        );

        const visibility =
          interception.request.body.metadata?.annotations?.[
            'opendatahub.io/dashboard-feature-visibility'
          ];

        if (visibility?.includes('model-serving')) {
          expect(name).to.match(
            new RegExp(`${originalAcceleratorProfile.metadata.name}-.*-serving`),
          );
          expect(actual).to.eql({
            ...migratedServingHardwareProfile,
            metadata: {
              namespace: 'opendatahub',
              annotations: {
                ...migratedServingHardwareProfile.metadata.annotations,
                'opendatahub.io/dashboard-feature-visibility': '["model-serving"]',
              },
            },
          });
        } else if (visibility?.includes('workbench')) {
          expect(name).to.match(
            new RegExp(`${originalAcceleratorProfile.metadata.name}-.*-notebooks`),
          );
          expect(actual).to.eql({
            ...migratedNotebooksHardwareProfile,
            metadata: {
              namespace: 'opendatahub',
              annotations: {
                ...migratedNotebooksHardwareProfile.metadata.annotations,
                'opendatahub.io/dashboard-feature-visibility': '["workbench"]',
              },
            },
          });
        }
      });
    });
  });

  describe('Notebook size profiles', () => {
    const testProfileName = 'test-notebook-size-profile';

    beforeEach(() => {
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          modelServerSizes: [],
          notebookSizes: [
            {
              name: testProfileName,
              resources: { requests: { cpu: '1', memory: '1Gi' } },
            },
          ],
        }),
      );
    });

    it('should delete', () => {
      cy.interceptK8s('PATCH', ODHDashboardConfigModel, mockDashboardConfig({})).as('delete');

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.getRow(testProfileName).findKebabAction('Delete').click();

      deleteModal.findSubmitButton().should('be.disabled');
      deleteModal.findInput().fill('Delete 2 resources');
      deleteModal.findSubmitButton().should('be.enabled').click();

      cy.wait('@delete');
    });

    it('should duplicate', () => {
      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.getRow(testProfileName).findKebabAction('Duplicate').click();

      cy.url().should('include', `/hardwareProfiles/duplicate/${testProfileName}`);
    });

    it('should edit', () => {
      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.getRow(testProfileName).findKebabAction('Edit').click();

      cy.url().should('include', `/hardwareProfiles/edit/${testProfileName}`);

      editHardwareProfile.findMigrationAlert().should('be.visible');
    });

    it('should migrate', () => {
      cy.interceptK8s('PATCH', ODHDashboardConfigModel, mockDashboardConfig({})).as('deleteSource');

      cy.interceptK8s(
        'POST',
        { model: HardwareProfileModel },
        mockHardwareProfile({
          name: testProfileName,
          displayName: testProfileName,
        }),
      ).as('createTarget');

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.getRow(testProfileName).findKebabAction('Migrate').click();
      migrationModal.findSubmitButton().should('be.enabled').click();

      cy.wait('@deleteSource');
      cy.wait('@createTarget').then((interception) => {
        // Assert individually the properties that include random values
        const { name, annotations } = interception.request.body.metadata;
        expect(annotations).to.have.property('opendatahub.io/modified-date');
        expect(name).to.include(`${testProfileName}-notebooks`);

        const actual = Cypress._.omit(
          interception.request.body,
          'metadata.annotations["opendatahub.io/modified-date"]',
          'metadata.name',
        );

        expect(actual).to.eql({
          apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            namespace: 'opendatahub',
            annotations: {
              'opendatahub.io/dashboard-feature-visibility': '["workbench"]',
              'opendatahub.io/display-name': 'test-notebook-size-profile',
              'opendatahub.io/disabled': 'false',
            },
          },
          spec: {
            identifiers: [
              {
                displayName: 'CPU',
                resourceType: 'CPU',
                identifier: 'cpu',
                minCount: '1',
                maxCount: '1',
                defaultCount: '1',
              },
              {
                displayName: 'Memory',
                resourceType: 'Memory',
                identifier: 'memory',
                minCount: '1Gi',
                maxCount: '1Gi',
                defaultCount: '1Gi',
              },
            ],
            scheduling: {
              type: SchedulingType.NODE,
              node: {
                tolerations: [
                  { key: 'NotebooksOnlyChange', effect: 'NoSchedule', operator: 'Exists' },
                ],
              },
            },
          },
        });
      });
      cy.wait('@deleteSource');
      cy.wait('@createTarget').then((interception) => {
        // Assert individually the properties that include random values
        const { name, annotations } = interception.request.body.metadata;
        expect(annotations).to.have.property('opendatahub.io/modified-date');
        expect(name).to.include(`${testProfileName}-notebooks`);

        const actual = Cypress._.omit(
          interception.request.body,
          'metadata.annotations["opendatahub.io/modified-date"]',
          'metadata.name',
        );

        expect(actual).to.eql({
          apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            namespace: 'opendatahub',
            annotations: {
              'opendatahub.io/dashboard-feature-visibility': '["workbench"]',
              'opendatahub.io/display-name': 'test-notebook-size-profile',
              'opendatahub.io/disabled': 'false',
            },
          },
          spec: {
            identifiers: [
              {
                displayName: 'CPU',
                resourceType: 'CPU',
                identifier: 'cpu',
                minCount: '1',
                maxCount: '1',
                defaultCount: '1',
              },
              {
                displayName: 'Memory',
                resourceType: 'Memory',
                identifier: 'memory',
                minCount: '1Gi',
                maxCount: '1Gi',
                defaultCount: '1Gi',
              },
            ],
            scheduling: {
              type: SchedulingType.NODE,
              node: {
                tolerations: [
                  { key: 'NotebooksOnlyChange', effect: 'NoSchedule', operator: 'Exists' },
                ],
              },
            },
          },
        });
      });
    });
  });

  describe('Model server size profiles', () => {
    const testProfileName = 'test-model-server-size-profile';

    beforeEach(() => {
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          modelServerSizes: [
            {
              name: testProfileName,
              resources: { requests: { cpu: '1', memory: '1Gi' } },
            },
          ],
          notebookSizes: [],
        }),
      );
    });

    it('should delete', () => {
      cy.interceptK8s('PATCH', ODHDashboardConfigModel, mockDashboardConfig({})).as('delete');

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.getRow(testProfileName).findKebabAction('Delete').click();

      deleteModal.findSubmitButton().should('be.disabled');
      deleteModal.findInput().fill('Delete 2 resources');
      deleteModal.findSubmitButton().should('be.enabled').click();

      cy.wait('@delete');
    });

    it('should duplicate', () => {
      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.getRow(testProfileName).findKebabAction('Duplicate').click();

      cy.url().should('include', `/hardwareProfiles/duplicate/${testProfileName}`);
    });

    it('should edit', () => {
      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.getRow(testProfileName).findKebabAction('Edit').click();

      cy.url().should('include', `/hardwareProfiles/edit/${testProfileName}`);

      editHardwareProfile.findMigrationAlert().should('be.visible');
    });

    it('should migrate', () => {
      cy.interceptK8s('PATCH', ODHDashboardConfigModel, mockDashboardConfig({})).as('deleteSource');

      cy.interceptK8s(
        'POST',
        { model: HardwareProfileModel },
        mockHardwareProfile({
          name: testProfileName,
          displayName: testProfileName,
        }),
      ).as('createTarget');

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.getRow(testProfileName).findKebabAction('Migrate').click();
      migrationModal.findSubmitButton().should('be.enabled').click();

      cy.wait('@deleteSource');
      cy.wait('@createTarget').then((interception) => {
        // Assert individually the properties that include random values
        const { name, annotations } = interception.request.body.metadata;
        expect(annotations).to.have.property('opendatahub.io/modified-date');
        expect(name).to.include(`${testProfileName}-serving`);

        const actual = Cypress._.omit(
          interception.request.body,
          'metadata.annotations["opendatahub.io/modified-date"]',
          'metadata.name',
        );

        expect(actual).to.eql({
          apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            namespace: 'opendatahub',
            annotations: {
              'opendatahub.io/dashboard-feature-visibility': '["model-serving"]',
              'opendatahub.io/display-name': 'test-model-server-size-profile',
              'opendatahub.io/disabled': 'false',
            },
          },
          spec: {
            identifiers: [
              {
                displayName: 'CPU',
                resourceType: 'CPU',
                identifier: 'cpu',
                minCount: '1',
                maxCount: '1',
                defaultCount: '1',
              },
              {
                displayName: 'Memory',
                resourceType: 'Memory',
                identifier: 'memory',
                minCount: '1Gi',
                maxCount: '1Gi',
                defaultCount: '1Gi',
              },
            ],
          },
        });
      });
      cy.wait('@deleteSource');
      cy.wait('@createTarget').then((interception) => {
        // Assert individually the properties that include random values
        const { name, annotations } = interception.request.body.metadata;
        expect(annotations).to.have.property('opendatahub.io/modified-date');
        expect(name).to.include(`${testProfileName}-serving`);

        const actual = Cypress._.omit(
          interception.request.body,
          'metadata.annotations["opendatahub.io/modified-date"]',
          'metadata.name',
        );

        expect(actual).to.eql({
          apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            namespace: 'opendatahub',
            annotations: {
              'opendatahub.io/dashboard-feature-visibility': '["model-serving"]',
              'opendatahub.io/display-name': 'test-model-server-size-profile',
              'opendatahub.io/disabled': 'false',
            },
          },
          spec: {
            identifiers: [
              {
                displayName: 'CPU',
                resourceType: 'CPU',
                identifier: 'cpu',
                minCount: '1',
                maxCount: '1',
                defaultCount: '1',
              },
              {
                displayName: 'Memory',
                resourceType: 'Memory',
                identifier: 'memory',
                minCount: '1Gi',
                maxCount: '1Gi',
                defaultCount: '1Gi',
              },
            ],
          },
        });
      });
    });
  });
});
