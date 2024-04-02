import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockStatus } from '~/__mocks__/mockStatus';
import {
  acceleratorProfile,
  disableAcceleratorProfileModal,
} from '~/__tests__/cypress/cypress/pages/acceleratorProfile';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { be } from '~/__tests__/cypress/cypress/utils/should';

type HandlersProps = {
  isEmpty?: boolean;
};

const initIntercepts = ({ isEmpty = false }: HandlersProps) => {
  cy.intercept('/api/dsc/status', mockDscStatus({}));
  cy.intercept('/api/status', mockStatus());
  cy.intercept('/api/config', mockDashboardConfig({}));
  cy.intercept(
    '/api/k8s/apis/dashboard.opendatahub.io/v1/namespaces/opendatahub/acceleratorprofiles',
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
  it('empty state no accelerator profile', () => {
    initIntercepts({ isEmpty: true });
    acceleratorProfile.visit();
    acceleratorProfile.findEmptyText().should('exist');
    acceleratorProfile.findAddButton().should('be.enabled');
  });

  it('list accelerator profiles and Table filtering, sorting, searching', () => {
    initIntercepts({});
    acceleratorProfile.visit();
    const tableRow = acceleratorProfile.getRow('TensorRT');
    tableRow
      .findDescription()
      .contains('Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe, quis');
    tableRow.shouldHaveIdentifier('tensor.com/gpu');

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
    acceleratorProfile.getRow('Test Accelerator').shouldHaveIdentifier('nvidia.com/gpu');

    acceleratorTableToolbar.findFilterMenuOption('filter-dropdown-select', 'Identifier').click();
    acceleratorTableToolbar.findResetButton().click();
    acceleratorTableToolbar.findSearchInput().fill('tensor.com/gpu');
    tableRow.shouldHaveIdentifier('tensor.com/gpu');
  });

  it('delete accelerator profile', () => {
    initIntercepts({});
    cy.intercept(
      {
        method: 'DELETE',
        pathname: '/api/accelerator-profiles/some-other-gpu',
      },
      {},
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
    cy.intercept(
      {
        method: 'PUT',
        pathname: '/api/accelerator-profiles/migrated-gpu',
      },
      {},
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
