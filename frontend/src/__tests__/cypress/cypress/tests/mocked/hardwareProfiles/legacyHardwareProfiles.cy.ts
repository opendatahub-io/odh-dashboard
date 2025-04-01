import {
  editHardwareProfile,
  legacyHardwareProfile,
} from '~/__tests__/cypress/cypress/pages/hardwareProfile';
import { mockHardwareProfile } from '~/__mocks__/mockHardwareProfile';
import {
  AcceleratorProfileModel,
  HardwareProfileModel,
  ODHDashboardConfigModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { migrationModal } from '~/__tests__/cypress/cypress/pages/components/MigrationModal';
import { mock200Status, mockDashboardConfig, mockK8sResourceList } from '~/__mocks__';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { asProductAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { testPagination } from '~/__tests__/cypress/cypress/utils/pagination';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { TolerationEffect, TolerationOperator } from '~/types';

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
      legacyHardwareProfile.findTableHeaderButton('Name').should(be.sortDescending);
      legacyHardwareProfile.findTableHeaderButton('Name').click();
      legacyHardwareProfile.findTableHeaderButton('Name').should(be.sortAscending);
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
      cy.interceptK8s(
        'DELETE',
        {
          model: AcceleratorProfileModel,
          ns: testNamespace,
          name: testProfileName,
        },
        mock200Status({}),
      ).as('deleteSource');

      cy.interceptK8s(
        'POST',
        { model: HardwareProfileModel },
        mockHardwareProfile({
          name: testProfileName,
          displayName: testProfileDisplayName,
        }),
      ).as('createTarget');

      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();
      legacyHardwareProfile.getRow(testProfileDisplayName).findKebabAction('Migrate').click();
      migrationModal.findSubmitButton().should('be.enabled').click();

      cy.wait('@deleteSource');
      cy.wait('@createTarget').then((interception) => {
        // Assert individually the properties that include random values
        const { name, annotations } = interception.request.body.metadata;
        expect(annotations).to.have.property('opendatahub.io/modified-date');
        expect(name).to.include(testProfileName);

        const actual = Cypress._.omit(
          interception.request.body,
          'metadata.annotations["opendatahub.io/modified-date"]',
          'metadata.name',
        );

        expect(actual).to.eql({
          apiVersion: 'dashboard.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            namespace: 'opendatahub',
            annotations: {
              'opendatahub.io/dashboard-feature-visibility': '["workbench"]',
            },
          },
          spec: {
            displayName: 'Test Accelerator Profile',
            description: '',
            enabled: true,
            tolerations: [
              { key: 'NotebooksOnlyChange', effect: 'NoSchedule', operator: 'Exists' },
              { key: 'nvidia.com/gpu', operator: 'Exists', effect: 'NoSchedule' },
            ],
            identifiers: [
              {
                displayName: 'CPU',
                resourceType: 'CPU',
                identifier: 'cpu',
                minCount: '1',
                defaultCount: '1',
              },
              {
                displayName: 'Memory',
                resourceType: 'Memory',
                identifier: 'memory',
                minCount: '1Mi',
                defaultCount: '1Mi',
              },
              {
                identifier: 'nvidia.com/gpu',
                displayName: 'nvidia.com/gpu',
                minCount: 0,
                defaultCount: 1,
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
        expect(name).to.include(testProfileName);

        const actual = Cypress._.omit(
          interception.request.body,
          'metadata.annotations["opendatahub.io/modified-date"]',
          'metadata.name',
        );

        expect(actual).to.eql({
          apiVersion: 'dashboard.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            namespace: 'opendatahub',
            annotations: {
              'opendatahub.io/dashboard-feature-visibility': '["workbench"]',
            },
          },
          spec: {
            displayName: 'Test Accelerator Profile',
            description: '',
            enabled: true,
            tolerations: [
              { key: 'NotebooksOnlyChange', effect: 'NoSchedule', operator: 'Exists' },
              { key: 'nvidia.com/gpu', operator: 'Exists', effect: 'NoSchedule' },
            ],
            identifiers: [
              {
                displayName: 'CPU',
                resourceType: 'CPU',
                identifier: 'cpu',
                minCount: '1',
                defaultCount: '1',
              },
              {
                displayName: 'Memory',
                resourceType: 'Memory',
                identifier: 'memory',
                minCount: '1Mi',
                defaultCount: '1Mi',
              },
              {
                identifier: 'nvidia.com/gpu',
                displayName: 'nvidia.com/gpu',
                minCount: 0,
                defaultCount: 1,
              },
            ],
          },
        });
      });
    });

    it('should show correct Visibility labels', () => {
      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();

      legacyHardwareProfile.getFeatureLabels(0).then((labels) => {
        expect(labels).to.have.members(['Workbenches']);
      });

      legacyHardwareProfile.getFeatureLabels(1).then((labels) => {
        expect(labels).to.have.members(['Model serving', 'Data science pipelines']);
      });
    });

    it('should show correct Source', () => {
      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();

      legacyHardwareProfile.getCell(0, 4).should('have.text', 'Accelerator profile');
      legacyHardwareProfile.getCell(1, 4).should('have.text', 'Accelerator profile');
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
          apiVersion: 'dashboard.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            namespace: 'opendatahub',
            annotations: {
              'opendatahub.io/dashboard-feature-visibility': '["workbench"]',
            },
          },
          spec: {
            displayName: 'test-notebook-size-profile',
            enabled: true,
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
            tolerations: [{ key: 'NotebooksOnlyChange', effect: 'NoSchedule', operator: 'Exists' }],
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
          apiVersion: 'dashboard.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            namespace: 'opendatahub',
            annotations: {
              'opendatahub.io/dashboard-feature-visibility': '["workbench"]',
            },
          },
          spec: {
            displayName: testProfileName,
            enabled: true,
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
            tolerations: [{ key: 'NotebooksOnlyChange', effect: 'NoSchedule', operator: 'Exists' }],
          },
        });
      });
    });

    it('should show correct Visibility labels', () => {
      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();

      legacyHardwareProfile.getFeatureLabels(0).then((labels) => {
        expect(labels).to.have.members(['Workbenches']);
      });
    });

    it('should show correct Source', () => {
      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();

      legacyHardwareProfile.getCell(0, 4).should('have.text', 'Workbench container size');
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
          apiVersion: 'dashboard.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            namespace: 'opendatahub',
            annotations: {
              'opendatahub.io/dashboard-feature-visibility': '["model-serving"]',
            },
          },
          spec: {
            displayName: 'test-model-server-size-profile',
            enabled: true,
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
          apiVersion: 'dashboard.opendatahub.io/v1alpha1',
          kind: 'HardwareProfile',
          metadata: {
            namespace: 'opendatahub',
            annotations: {
              'opendatahub.io/dashboard-feature-visibility': '["model-serving"]',
            },
          },
          spec: {
            displayName: 'test-model-server-size-profile',
            enabled: true,
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

    it('should show correct Visibility labels', () => {
      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();

      legacyHardwareProfile.getFeatureLabels(0).then((labels) => {
        expect(labels).to.have.members(['Model serving']);
      });
    });

    it('should show correct Source', () => {
      legacyHardwareProfile.visit();
      legacyHardwareProfile.findExpandButton().click();

      legacyHardwareProfile.getCell(0, 4).should('have.text', 'Model serving container size');
    });
  });
});
