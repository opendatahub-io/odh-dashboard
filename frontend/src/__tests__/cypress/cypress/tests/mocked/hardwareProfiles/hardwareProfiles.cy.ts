import { hardwareProfile } from '#~/__tests__/cypress/cypress/pages/hardwareProfile';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  HardwareProfileModel,
  SelfSubjectAccessReviewModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mock200Status, mockDashboardConfig, mockK8sResourceList } from '#~/__mocks__';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import { asProductAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { testPagination } from '#~/__tests__/cypress/cypress/utils/pagination';
import { IdentifierResourceType, SchedulingType } from '#~/types';
import { mockSelfSubjectAccessReview } from '#~/__mocks__/mockSelfSubjectAccessReview';

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      modelServerSizes: [],
      notebookSizes: [],
    }),
  );
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList([
      mockHardwareProfile({ name: 'Test Hardware Profile', displayName: 'Test Hardware Profile' }),
      mockHardwareProfile({
        name: 'test-hardware-profile-delete',
        displayName: 'Test Hardware Profile Delete',
        annotations: { 'opendatahub.io/disabled': 'true' },
      }),
    ]),
  );
};

describe('Hardware Profile', () => {
  beforeEach(() => {
    asProductAdminUser();
    initIntercepts();
  });

  describe('main table', () => {
    it('table sorting and pagination', () => {
      const totalItems = 50;
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList(
          Array.from({ length: totalItems }, (_, i) =>
            mockHardwareProfile({
              name: `test-hardware-profile-${i}`,
              displayName: `Test Hardware Profile - ${i}`,
              description: `hardware profile ${i}`,
            }),
          ),
        ),
      );
      hardwareProfile.visit();
      const tableRow = hardwareProfile.getRow('Test Hardware Profile - 0');
      tableRow.findDescription().contains('hardware profile 0');

      // top pagination
      testPagination({
        totalItems,
        firstElement: 'Test Hardware Profile - 0',
        paginationVariant: 'top',
      });

      // bottom pagination
      testPagination({
        totalItems,
        firstElement: 'Test Hardware Profile - 0',
        paginationVariant: 'bottom',
      });

      //sort by Name
      hardwareProfile.findTableHeaderButton('Name').click();
      hardwareProfile.findTableHeaderButton('Name').should(be.sortAscending);
      hardwareProfile.findTableHeaderButton('Name').click();
      hardwareProfile.findTableHeaderButton('Name').should(be.sortDescending);

      // sort by last modified
      hardwareProfile.findTableHeaderButton('Last modified').click();
      hardwareProfile.findTableHeaderButton('Last modified').should(be.sortAscending);
      hardwareProfile.findTableHeaderButton('Last modified').click();
      hardwareProfile.findTableHeaderButton('Last modified').should(be.sortDescending);

      hardwareProfile.findCreateButton().should('be.enabled');
    });

    it('table filtering and searching ', () => {
      initIntercepts();
      hardwareProfile.visit();

      const hardwareProfileTableToolbar = hardwareProfile.getTableToolbar();
      hardwareProfile.findRows().should('have.length', 2);

      hardwareProfileTableToolbar.findSearchInput().type('Test Hardware Profile Delete');
      hardwareProfile.findRows().should('have.length', 1);
      hardwareProfile.getRow('Test Hardware Profile Delete').find().should('exist');

      hardwareProfileTableToolbar.findFilterInput('name').clear();
      hardwareProfile.findRows().should('have.length', 2);

      hardwareProfileTableToolbar
        .findFilterMenuOption('filter-toolbar-dropdown', 'Enabled')
        .click();
      hardwareProfileTableToolbar.selectEnableFilter('Enabled');
      hardwareProfile.findRows().should('have.length', 1);
      hardwareProfile.getRow('Test Hardware Profile').find().should('exist');

      hardwareProfileTableToolbar.selectEnableFilter('Disabled');
      hardwareProfile.findRows().should('have.length', 1);
      hardwareProfile.getRow('Test Hardware Profile Delete').find().should('exist');
      hardwareProfileTableToolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Name').click();
      hardwareProfileTableToolbar.findFilterInput('name').type('No match');
      hardwareProfile.findRows().should('have.length', 0);
      hardwareProfile.findClearFiltersButton().click();
      hardwareProfile.findRows().should('have.length', 2);
    });

    it('delete hardware profile', () => {
      initIntercepts();
      cy.interceptK8s(
        'DELETE',
        {
          model: HardwareProfileModel,
          ns: 'opendatahub',
          name: 'test-hardware-profile-delete',
        },
        mock200Status({}),
      ).as('delete');
      hardwareProfile.visit();
      hardwareProfile.getRow('Test Hardware Profile Delete').findKebabAction('Delete').click();
      deleteModal.findSubmitButton().should('be.disabled');
      deleteModal.findInput().fill('Test Hardware Profile Delete');
      deleteModal.findSubmitButton().should('be.enabled').click();
      cy.wait('@delete');
    });

    it('toggle hardware profile enable', () => {
      initIntercepts();
      cy.interceptK8s(
        'PATCH',
        HardwareProfileModel,
        mockHardwareProfile({
          name: 'test-hardware-profile-delete',
        }),
      ).as('enableHardwareProfile');
      hardwareProfile.visit();
      hardwareProfile.getRow('Test Hardware Profile Delete').findEnabled().should('not.be.checked');
      hardwareProfile.getRow('Test Hardware Profile Delete').findEnabled().should('be.enabled');
      hardwareProfile.getRow('Test Hardware Profile Delete').findEnableSwitch().click();
      cy.wait('@enableHardwareProfile').then((interception) => {
        expect(interception.request.body).to.eql([
          {
            op: 'replace',
            path: '/metadata/annotations/opendatahub.io~1disabled',
            value: 'false',
          },
        ]);
      });
    });

    it('toggle hardware profile disable', () => {
      initIntercepts();
      cy.interceptK8s(
        'PATCH',
        HardwareProfileModel,
        mockHardwareProfile({
          name: 'Test Hardware Profile',
        }),
      ).as('disableHardwareProfile');
      hardwareProfile.visit();
      hardwareProfile.getRow('Test Hardware Profile Delete').findEnabled().should('not.be.checked');
      hardwareProfile.getRow('Test Hardware Profile').findEnabled().should('be.checked');
      hardwareProfile.getRow('Test Hardware Profile').findEnabled().should('be.enabled');
      hardwareProfile.getRow('Test Hardware Profile').findEnableSwitch().click();
      cy.wait('@disableHardwareProfile').then((interception) => {
        expect(interception.request.body).to.eql([
          {
            op: 'replace',
            path: '/metadata/annotations/opendatahub.io~1disabled',
            value: 'true',
          },
        ]);
      });
    });
  });

  describe('hardware profile errors', () => {
    it('shows warning when all hardware profiles are disabled.', () => {
      const totalItems = 5;
      cy.interceptK8sList(
        HardwareProfileModel,
        mockK8sResourceList(
          Array.from({ length: totalItems }, (_, i) =>
            mockHardwareProfile({
              name: `Test Hardware Profile - ${i}`,
              displayName: `Test Hardware Profile - ${i}`,
              description: `hardware profile ${i}`,
              annotations: { 'opendatahub.io/disabled': 'true' },
            }),
          ),
        ),
      );
      hardwareProfile.visit();
      const warningBanner = hardwareProfile.findHardwareProfileBanner();
      warningBanner.findTitle('All hardware profiles are disabled');
      warningBanner.findDescription(
        'You must have at least one hardware profile enabled for users to create workbenches or deploy models. Enable one or more profiles in the table below',
      );
    });

    it('shows warning when all hardware profiles are incomplete.', () => {
      const mockedHardwareProfiles = [
        mockHardwareProfile({
          name: 'Test Hardware Profile - 1',
          displayName: 'Test Hardware Profile - 1',
          description: 'hardware profile 1',
          identifiers: [
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '1',
              maxCount: '2',
              defaultCount: '1',
              resourceType: IdentifierResourceType.CPU,
            },
          ],
        }),
        mockHardwareProfile({
          name: 'Test Hardware Profile - 2',
          displayName: 'Test Hardware Profile - 2',
          description: 'hardware profile 2',
          identifiers: [],
        }),
      ];
      cy.interceptK8sList(HardwareProfileModel, mockK8sResourceList(mockedHardwareProfiles));
      hardwareProfile.visit();
      const warningBanner = hardwareProfile.findHardwareProfileBanner();
      warningBanner.findTitle('All hardware profiles are incomplete');
      warningBanner.findDescription(
        'All of your defined hardware profiles are missing either CPU or Memory. This is not recommended',
      );
    });

    it('shows warning when some hardware profiles are incomplete.', () => {
      const mockedHardwareProfiles = [
        mockHardwareProfile({
          name: 'Test Hardware Profile - 1',
          displayName: 'Test Hardware Profile - 1',
          description: 'hardware profile 1',
          identifiers: [
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '1',
              maxCount: '2',
              defaultCount: '1',
              resourceType: IdentifierResourceType.CPU,
            },
          ],
        }),
        mockHardwareProfile({
          name: 'Test Hardware Profile - 2',
          displayName: 'Test Hardware Profile - 2',
          description: 'hardware profile 2',
          identifiers: [
            {
              displayName: 'Memory',
              identifier: 'memory',
              minCount: '2Gi',
              maxCount: '5Gi',
              defaultCount: '2Gi',
              resourceType: IdentifierResourceType.MEMORY,
            },
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '1',
              maxCount: '2',
              defaultCount: '1',
              resourceType: IdentifierResourceType.CPU,
            },
          ],
        }),
      ];
      cy.interceptK8sList(HardwareProfileModel, mockK8sResourceList(mockedHardwareProfiles));
      hardwareProfile.visit();
      const warningBanner = hardwareProfile.findHardwareProfileBanner();
      warningBanner.findTitle('One or more hardware profiles are incomplete');
      warningBanner.findDescription(
        'One or more of your defined hardware profiles are missing either CPU or Memory. This is not recommended.',
      );
    });

    it('shows errors for all invalid.', () => {
      const mockedHardwareProfiles = [
        mockHardwareProfile({
          name: 'Test Hardware Profile - 1',
          displayName: 'Test Hardware Profile - 1',
          description: 'hardware profile 1',
          identifiers: [
            {
              displayName: 'Memory',
              identifier: 'memory',
              minCount: '2Gi',
              maxCount: '-5Gi',
              defaultCount: '2Gi',
              resourceType: IdentifierResourceType.MEMORY,
            },
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '1',
              maxCount: '2',
              defaultCount: '1',
              resourceType: IdentifierResourceType.CPU,
            },
          ],
        }),
        mockHardwareProfile({
          name: 'Test Hardware Profile - 2',
          displayName: 'Test Hardware Profile - 2',
          description: 'hardware profile 2',
          identifiers: [
            {
              displayName: 'Memory',
              identifier: 'memory',
              minCount: '-2Gi',
              maxCount: '5Gi',
              defaultCount: '2Gi',
              resourceType: IdentifierResourceType.MEMORY,
            },
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '-1',
              maxCount: '2',
              defaultCount: '1',
              resourceType: IdentifierResourceType.CPU,
            },
          ],
        }),
      ];
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList(mockedHardwareProfiles),
      );
      hardwareProfile.visit();
      const warningBanner = hardwareProfile.findHardwareProfileBanner();
      warningBanner.findTitle('All hardware profiles are invalid');
      warningBanner.findDescription(
        'You must have at least one valid hardware profile enabled for users to create workbenches or deploy models. Take the appropriate actions below to re-validate your profiles.',
      );
    });

    it('shows errors for some invalid.', () => {
      const mockedHardwareProfiles = [
        mockHardwareProfile({
          name: 'Test Hardware Profile - 1',
          displayName: 'Test Hardware Profile - 1',
          description: 'hardware profile 1',
          identifiers: [
            {
              displayName: 'Memory',
              identifier: 'memory',
              minCount: 'Gi',
              maxCount: '5Gi',
              defaultCount: '2Gi',
              resourceType: IdentifierResourceType.MEMORY,
            },
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '1',
              maxCount: '2',
              defaultCount: '1',
              resourceType: IdentifierResourceType.CPU,
            },
          ],
        }),
        mockHardwareProfile({
          name: 'Test Hardware Profile - 2',
          displayName: 'Test Hardware Profile - 2',
          description: 'hardware profile 2',
          identifiers: [
            {
              displayName: 'Memory',
              identifier: 'memory',
              minCount: '-2Gi',
              maxCount: '5Gi',
              defaultCount: '2Gi',
              resourceType: IdentifierResourceType.MEMORY,
            },
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '-1',
              maxCount: '2',
              defaultCount: '1',
              resourceType: IdentifierResourceType.CPU,
            },
          ],
        }),
        mockHardwareProfile({
          name: 'Test Hardware Profile - 3',
          displayName: 'Test Hardware Profile - 3',
          description: 'hardware profile 3',
          identifiers: [
            {
              displayName: 'Memory',
              identifier: 'memory',
              minCount: '5Gi',
              maxCount: '22Gi',
              defaultCount: '7Gi',
              resourceType: IdentifierResourceType.MEMORY,
            },
            {
              displayName: 'CPU',
              identifier: 'cpu',
              minCount: '1',
              maxCount: '2',
              defaultCount: '1',
              resourceType: IdentifierResourceType.CPU,
            },
          ],
        }),
      ];
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList(mockedHardwareProfiles),
      );
      hardwareProfile.visit();
      const warningBanner = hardwareProfile.findHardwareProfileBanner();
      warningBanner.findTitle('One or more hardware profiles are invalid');
      warningBanner.findDescription(
        'One or more of your defined hardware profiles are invalid. Take the appropriate actions below to revalidate your profiles.',
      );
      const row1 = hardwareProfile.getRow('Test Hardware Profile - 1');
      row1.findEnabled().should('not.be.checked');
      const row2 = hardwareProfile.getRow('Test Hardware Profile - 2');
      row2.findEnabled().should('not.be.checked');
      const row3 = hardwareProfile.getRow('Test Hardware Profile - 3');
      row3.findEnabled().should('be.checked');
    });
  });

  describe('expandable section', () => {
    it('should hide nested tables that do not have data', () => {
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockHardwareProfile({
            name: 'Test Hardware Profile',
            displayName: 'Test Hardware Profile',
            nodeSelector: {
              'test-key': 'test-value',
            },
          }),
          mockHardwareProfile({
            name: 'Test Hardware Profile Empty',
            displayName: 'Test Hardware Profile Empty',
            identifiers: [],
            tolerations: [],
            nodeSelector: {},
            schedulingType: SchedulingType.NODE,
          }),
        ]),
      );
      hardwareProfile.visit();
      const row1 = hardwareProfile.getRow('Test Hardware Profile');
      row1.findExpandButton().click();
      row1.findNodeSelectorTable().should('exist');
      row1.findNodeResourceTable().should('exist');
      row1.findTolerationTable().should('exist');
      row1.findExpandButton().click();
      const row2 = hardwareProfile.getRow('Test Hardware Profile Empty');
      row2.findExpandButton().click();
      row2.findNodeSelectorTable().should('not.exist');
      row2.findNodeResourceTable().should('not.exist');
      row2.findTolerationTable().should('not.exist');
    });

    it('should show dash when there is no value on the tolerations table', () => {
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockHardwareProfile({
            name: 'Test Hardware Profile Empty',
            displayName: 'Test Hardware Profile Empty',
            nodeSelector: {},
            identifiers: [],
            tolerations: [{ key: 'test-key' }],
          }),
        ]),
      );
      hardwareProfile.visit();
      const row = hardwareProfile.getRow('Test Hardware Profile Empty');
      row.findExpandButton().click();
      row.findNodeSelectorTable().should('not.exist');
      row.findNodeResourceTable().should('not.exist');
      row.findTolerationTable().should('exist');

      row.findTolerationTable().find(`[data-label=Operator]`).should('contain.text', '-');
      row.findTolerationTable().find(`[data-label=Key]`).should('contain.text', 'test-key');
      row.findTolerationTable().find(`[data-label=Value]`).should('contain.text', '-');
      row.findTolerationTable().find(`[data-label=Effect]`).should('contain.text', '-');
      row
        .findTolerationTable()
        .find(`[data-label="Toleration seconds"]`)
        .should('contain.text', '-');
    });

    it('should display local queue and workload priority in the expanded row', () => {
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockHardwareProfile({
            name: 'Test Hardware Profile With Queue',
            displayName: 'Test Hardware Profile With Queue',
            schedulingType: SchedulingType.QUEUE,
            localQueueName: 'test-queue',
            priorityClass: 'high',
          }),
        ]),
      );
      hardwareProfile.visit();
      const row = hardwareProfile.getRow('Test Hardware Profile With Queue');
      row.findExpandButton().click();
      row.findExpandableSection().contains('Local queue').should('be.visible');
      row.findExpandableSection().contains('test-queue').should('be.visible');
      row.findExpandableSection().contains('Workload priority').should('be.visible');
      row.findExpandableSection().contains('high').should('be.visible');
    });
  });
});

describe('hardware profiles - empty state', () => {
  it('shows warning when no hardware profiles exist.', () => {
    asProductAdminUser();
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelServerSizes: [],
        notebookSizes: [],
      }),
    );
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList([]),
    );

    hardwareProfile.visit();
    hardwareProfile.findHardwareProfilePageEmptyState().should('be.visible');
    hardwareProfile.findNoProfilesAvailableText().should('contain', 'No hardware profiles');
    hardwareProfile.findHardwareProfilesCreateButton().and('contain', 'Add new hardware profile');
    hardwareProfile.findHardwareProfilesCreateButton().click();
    cy.url().should('include', '/hardware-profiles/create');
  });

  it('should hide "Add new hardware profile" button when user does not have create permission', () => {
    cy.interceptK8s(
      'POST',
      SelfSubjectAccessReviewModel,
      mockSelfSubjectAccessReview({
        verb: 'create',
        resource: 'hardwareprofiles',
        group: 'dashboard.opendatahub.io',
        allowed: false,
      }),
    ).as('selfSubjectAccessReviewsCall');
    hardwareProfile.visit();
    hardwareProfile.findHardwareProfilesCreateButton().should('not.exist');
  });
});

describe('hardware profiles - ordering', () => {
  beforeEach(() => {
    asProductAdminUser();
  });

  it('should display hardware profiles in alphabetical order when no persistent order is configured', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelServerSizes: [],
        notebookSizes: [],
        hardwareProfileOrder: [],
      }),
    );
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList([
        mockHardwareProfile({ name: 'zebra-profile', displayName: 'Zebra Profile' }),
        mockHardwareProfile({ name: 'alpha-profile', displayName: 'Alpha Profile' }),
        mockHardwareProfile({ name: 'beta-profile', displayName: 'Beta Profile' }),
      ]),
    );

    hardwareProfile.visit();

    // Should be in alphabetical order
    hardwareProfile.findRows().should('have.length', 3);
    hardwareProfile.findRows().eq(0).should('contain', 'Alpha Profile');
    hardwareProfile.findRows().eq(1).should('contain', 'Beta Profile');
    hardwareProfile.findRows().eq(2).should('contain', 'Zebra Profile');
  });

  it('should display hardware profiles in persistent order when configured', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelServerSizes: [],
        notebookSizes: [],
        hardwareProfileOrder: ['zebra-profile', 'alpha-profile', 'beta-profile'], // Custom order
      }),
    );
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList([
        mockHardwareProfile({ name: 'alpha-profile', displayName: 'Alpha Profile' }),
        mockHardwareProfile({ name: 'beta-profile', displayName: 'Beta Profile' }),
        mockHardwareProfile({ name: 'zebra-profile', displayName: 'Zebra Profile' }),
      ]),
    );

    hardwareProfile.visit();

    // Should be in persistent order (zebra, alpha, beta)
    hardwareProfile.findRows().should('have.length', 3);
    hardwareProfile.findRows().eq(0).should('contain', 'Zebra Profile');
    hardwareProfile.findRows().eq(1).should('contain', 'Alpha Profile');
    hardwareProfile.findRows().eq(2).should('contain', 'Beta Profile');
  });

  it('should handle partial persistent order by appending new profiles alphabetically', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelServerSizes: [],
        notebookSizes: [],
        hardwareProfileOrder: ['beta-profile'], // Only beta in persistent order
      }),
    );
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList([
        mockHardwareProfile({ name: 'alpha-profile', displayName: 'Alpha Profile' }),
        mockHardwareProfile({ name: 'beta-profile', displayName: 'Beta Profile' }),
        mockHardwareProfile({ name: 'zebra-profile', displayName: 'Zebra Profile' }),
      ]),
    );

    hardwareProfile.visit();

    // Should show beta first (from persistent order), then alpha and zebra alphabetically
    hardwareProfile.findRows().should('have.length', 3);
    hardwareProfile.findRows().eq(0).should('contain', 'Beta Profile');
    hardwareProfile.findRows().eq(1).should('contain', 'Alpha Profile');
    hardwareProfile.findRows().eq(2).should('contain', 'Zebra Profile');
  });

  it('should ignore deleted profiles in persistent order', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelServerSizes: [],
        notebookSizes: [],
        hardwareProfileOrder: ['deleted-profile', 'beta-profile', 'alpha-profile'], // includes deleted profile
      }),
    );
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList([
        mockHardwareProfile({ name: 'alpha-profile', displayName: 'Alpha Profile' }),
        mockHardwareProfile({ name: 'beta-profile', displayName: 'Beta Profile' }),
        // deleted-profile not present
      ]),
    );

    hardwareProfile.visit();

    // Should show only existing profiles in persistent order (beta, alpha)
    hardwareProfile.findRows().should('have.length', 2);
    hardwareProfile.findRows().eq(0).should('contain', 'Beta Profile');
    hardwareProfile.findRows().eq(1).should('contain', 'Alpha Profile');
  });

  it('should maintain order consistency after filtering', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelServerSizes: [],
        notebookSizes: [],
        hardwareProfileOrder: [
          'gamma-profile',
          'alpha-two-profile',
          'beta-profile',
          'alpha-one-profile',
        ],
      }),
    );
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList([
        mockHardwareProfile({ name: 'alpha-one-profile', displayName: 'Alpha One Profile' }),
        mockHardwareProfile({ name: 'alpha-two-profile', displayName: 'Alpha Two Profile' }),
        mockHardwareProfile({ name: 'beta-profile', displayName: 'Beta Profile' }),
        mockHardwareProfile({ name: 'gamma-profile', displayName: 'Gamma Profile' }),
      ]),
    );

    hardwareProfile.visit();

    // Verify custom order initially (all 4 profiles)
    hardwareProfile.findRows().should('have.length', 4);
    hardwareProfile.findRows().eq(0).should('contain', 'Gamma Profile');
    hardwareProfile.findRows().eq(1).should('contain', 'Alpha Two Profile');
    hardwareProfile.findRows().eq(2).should('contain', 'Beta Profile');
    hardwareProfile.findRows().eq(3).should('contain', 'Alpha One Profile');

    // Apply filter for "alpha"
    const toolbar = hardwareProfile.getTableToolbar();
    toolbar.findSearchInput().type('alpha');

    // Should show both Alpha profiles in the configured order
    hardwareProfile.findRows().should('have.length', 2);
    hardwareProfile.findRows().eq(0).should('contain', 'Alpha Two Profile');
    hardwareProfile.findRows().eq(1).should('contain', 'Alpha One Profile');

    toolbar.findFilterInput('name').clear();

    // Should return to full custom order
    hardwareProfile.findRows().should('have.length', 4);
    hardwareProfile.findRows().eq(0).should('contain', 'Gamma Profile');
    hardwareProfile.findRows().eq(1).should('contain', 'Alpha Two Profile');
    hardwareProfile.findRows().eq(2).should('contain', 'Beta Profile');
    hardwareProfile.findRows().eq(3).should('contain', 'Alpha One Profile');
  });
});
