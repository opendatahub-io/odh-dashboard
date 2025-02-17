import { hardwareProfile } from '~/__tests__/cypress/cypress/pages/hardwareProfile';
import { mockHardwareProfile } from '~/__mocks__/mockHardwareProfile';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { HardwareProfileModel } from '~/__tests__/cypress/cypress/utils/models';
import { mock200Status, mockK8sResourceList } from '~/__mocks__';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { asProductAdminUser } from '~/__tests__/cypress/cypress/utils/mockUsers';
import { testPagination } from '~/__tests__/cypress/cypress/utils/pagination';

const initIntercepts = () => {
  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList([
      mockHardwareProfile({ displayName: 'Test Hardware Profile' }),
      mockHardwareProfile({
        name: 'test-hardware-profile-delete',
        displayName: 'Test Hardware Profile Delete',
        enabled: false,
      }),
    ]),
  );
};

describe('Hardware Profile', () => {
  beforeEach(() => {
    asProductAdminUser();
  });

  describe('main table', () => {
    it('table sorting and pagination', () => {
      const totalItems = 50;
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList(
          Array.from({ length: totalItems }, (_, i) =>
            mockHardwareProfile({
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
      hardwareProfile.findTableHeaderButton('Name').should(be.sortDescending);
      hardwareProfile.findTableHeaderButton('Name').click();
      hardwareProfile.findTableHeaderButton('Name').should(be.sortAscending);

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
          ns: 'test-project',
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

    it('toggle hardware profile enablement', () => {
      initIntercepts();
      cy.interceptK8s('PATCH', HardwareProfileModel, mockHardwareProfile({})).as(
        'toggleHardwareProfile',
      );
      hardwareProfile.visit();
      hardwareProfile.getRow('Test Hardware Profile Delete').findEnabled().should('not.be.checked');
      hardwareProfile.getRow('Test Hardware Profile').findEnabled().should('be.checked');
      hardwareProfile.getRow('Test Hardware Profile').findEnableSwitch().click();

      cy.wait('@toggleHardwareProfile').then((interception) => {
        expect(interception.request.body).to.eql([
          { op: 'replace', path: '/spec/enabled', value: false },
        ]);
      });
      hardwareProfile.getRow('Test Hardware Profile').findEnabled().should('not.be.checked');
      hardwareProfile.getRow('Test Hardware Profile').findEnableSwitch().click();
      cy.wait('@toggleHardwareProfile').then((interception) => {
        expect(interception.request.body).to.eql([
          { op: 'replace', path: '/spec/enabled', value: true },
        ]);
      });
      hardwareProfile.getRow('Test Hardware Profile').findEnabled().should('be.checked');
    });
  });

  describe('expandable section', () => {
    it('should hide nested tables that do not have data', () => {
      cy.interceptK8sList(
        { model: HardwareProfileModel, ns: 'opendatahub' },
        mockK8sResourceList([
          mockHardwareProfile({
            displayName: 'Test Hardware Profile',
          }),
          mockHardwareProfile({
            displayName: 'Test Hardware Profile Empty',
            nodeSelector: {},
            identifiers: [],
            tolerations: [],
          }),
        ]),
      );
      hardwareProfile.visit();
      const row1 = hardwareProfile.getRow('Test Hardware Profile');
      row1.findExpandButton().click();
      row1.findNodeSelectorTable().should('exist');
      row1.findNodeResourceTable().should('exist');
      row1.findTolerationTable().should('exist');
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
  });
});
