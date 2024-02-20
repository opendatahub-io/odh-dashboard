import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockStatus } from '~/__mocks__/mockStatus';
import { acceleratorProfile } from '~/__tests__/cypress/cypress/pages/acceleratorProfile';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';

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

  it('list accelerator profiles', () => {
    initIntercepts({});
    acceleratorProfile.visit();
    const tableRow = acceleratorProfile.getRow('TensorRT');
    tableRow
      .findDescription()
      .contains('Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe, quis');
    tableRow.shouldHaveIdentifier('tensor.com/gpu');
    acceleratorProfile.findTableHeaderButton('Identifier').click();
    acceleratorProfile.shouldBeSortedByColumn('Identifier', 'asc');
    acceleratorProfile.findTableHeaderButton('Identifier').click();
    acceleratorProfile.shouldBeSortedByColumn('Identifier', 'desc');
    acceleratorProfile.findCreateButton().should('be.enabled');
    acceleratorProfile.findFilterMenuOption().findDropdownItem('Name').click();
    acceleratorProfile.findSearchInput().fill('Test');
    acceleratorProfile.getRow('Test Accelerator').shouldHaveIdentifier('nvidia.com/gpu');
    acceleratorProfile.findFilterMenuOption().findDropdownItem('Identifier').click();
    acceleratorProfile.findResetButton().click();
    acceleratorProfile.findSearchInput().fill('tensor.com/gpu');
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
});
