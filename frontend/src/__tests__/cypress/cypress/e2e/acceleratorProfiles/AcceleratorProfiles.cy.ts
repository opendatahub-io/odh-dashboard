import {
  acceleratorProfile,
  disableAcceleratorProfileModal,
} from '~/__tests__/cypress/cypress/pages/acceleratorProfile';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { AcceleratorProfileModel } from '~/__tests__/cypress/cypress/utils/models';
import { mockK8sResourceList } from '~/__mocks__';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import { asProductAdminUser } from '~/__tests__/cypress/cypress/utils/users';
import { testPagination } from '~/__tests__/cypress/cypress/utils/pagination';

type HandlersProps = {
  isEmpty?: boolean;
};

const initIntercepts = ({ isEmpty = false }: HandlersProps) => {
  cy.interceptK8sList(
    { model: AcceleratorProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(
      isEmpty
        ? []
        : [
            mockAcceleratorProfile({ displayName: 'Test Accelerator' }),
            mockAcceleratorProfile({
              name: 'some-other-gpu',
              displayName: 'TensorRT',
              enabled: false,
              identifier: 'tensor.com/gpu',
              description: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe, quis',
            }),
          ],
    ),
  );
};

describe('Accelerator Profile', () => {
  beforeEach(() => {
    asProductAdminUser();
  });

  it('empty state no accelerator profile', () => {
    initIntercepts({ isEmpty: true });
    acceleratorProfile.visit();
    acceleratorProfile.findEmptyText().should('exist');
    acceleratorProfile.findAddButton().should('be.enabled');
  });

  it('list accelerator profiles and Table filtering, sorting, searching and pagination', () => {
    const totalItems = 50;
    cy.interceptK8sList(
      { model: AcceleratorProfileModel, ns: 'opendatahub' },
      mockK8sResourceList(
        Array.from({ length: totalItems }, (_, i) =>
          mockAcceleratorProfile({
            displayName: `Test Accelerator - ${i}`,
            identifier: 'tensor.com/gpu',
            description: `accelerator profile ${i}`,
          }),
        ),
      ),
    );
    acceleratorProfile.visit();
    const tableRow = acceleratorProfile.getRow('Test Accelerator - 0');
    tableRow.findDescription().contains('accelerator profile 0');
    tableRow.shouldHaveIdentifier('tensor.com/gpu');

    // top pagination
    testPagination({ totalItems, firstElement: 'Test Accelerator - 0', paginationVariant: 'top' });

    // bottom pagination
    testPagination({
      totalItems,
      firstElement: 'Test Accelerator - 0',
      paginationVariant: 'bottom',
    });

    //sort by Name
    acceleratorProfile.findTableHeaderButton('Name').click();
    acceleratorProfile.findTableHeaderButton('Name').should(be.sortDescending);
    acceleratorProfile.findTableHeaderButton('Name').click();
    acceleratorProfile.findTableHeaderButton('Name').should(be.sortAscending);

    // sort by Identifier
    acceleratorProfile.findTableHeaderButton('Identifier').click();
    acceleratorProfile.findTableHeaderButton('Identifier').should(be.sortAscending);
    acceleratorProfile.findTableHeaderButton('Identifier').click();
    acceleratorProfile.findTableHeaderButton('Identifier').should(be.sortDescending);

    // sort by enable
    acceleratorProfile.findTableHeaderButton('Enable').click();
    acceleratorProfile.findTableHeaderButton('Enable').should(be.sortAscending);
    acceleratorProfile.findTableHeaderButton('Enable').click();
    acceleratorProfile.findTableHeaderButton('Enable').should(be.sortDescending);

    // sort by last modified
    acceleratorProfile.findTableHeaderButton('Last modified').click();
    acceleratorProfile.findTableHeaderButton('Last modified').should(be.sortAscending);
    acceleratorProfile.findTableHeaderButton('Last modified').click();
    acceleratorProfile.findTableHeaderButton('Last modified').should(be.sortDescending);

    acceleratorProfile.findCreateButton().should('be.enabled');

    const acceleratorTableToolbar = acceleratorProfile.getTableToolbar();
    acceleratorTableToolbar.findFilterMenuOption('filter-dropdown-select', 'Name').click();
    acceleratorTableToolbar.findSearchInput().fill('Test');
    acceleratorProfile.getRow('Test Accelerator - 0').shouldHaveIdentifier('tensor.com/gpu');

    acceleratorTableToolbar.findFilterMenuOption('filter-dropdown-select', 'Identifier').click();
    acceleratorTableToolbar.findResetButton().click();
    acceleratorTableToolbar.findSearchInput().fill('tensor.com/gpu');
    tableRow.shouldHaveIdentifier('tensor.com/gpu');
  });

  it('delete accelerator profile', () => {
    initIntercepts({});
    cy.interceptOdh(
      'DELETE /api/accelerator-profiles/:name',
      {
        path: { name: 'some-other-gpu' },
      },
      { success: true },
    ).as('delete');
    acceleratorProfile.visit();
    acceleratorProfile.getRow('TensorRT').findKebabAction('Delete').click();
    deleteModal.findSubmitButton().should('be.disabled');
    deleteModal.findInput().fill('TensorRT');
    deleteModal.findSubmitButton().should('be.enabled').click();
    cy.wait('@delete');
  });

  it('disable accelerator profile', () => {
    initIntercepts({});
    cy.interceptOdh(
      'PUT /api/accelerator-profiles/:name',
      {
        path: { name: 'migrated-gpu' },
      },
      { success: true },
    ).as('disableAcceleratorProfile');
    acceleratorProfile.visit();
    acceleratorProfile.getRow('TensorRT').findEnabled().should('not.be.checked');
    acceleratorProfile.getRow('Test Accelerator').findEnabled().should('be.checked');
    acceleratorProfile.getRow('Test Accelerator').findEnableSwitch().click();
    disableAcceleratorProfileModal.findDisableButton().click();

    cy.wait('@disableAcceleratorProfile').then((interception) => {
      expect(interception.request.body).to.eql({ enabled: false });
    });
    acceleratorProfile.getRow('Test Accelerator').findEnabled().should('not.be.checked');
  });
});
