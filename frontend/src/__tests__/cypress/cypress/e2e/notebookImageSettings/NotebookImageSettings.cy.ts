import { mockByon } from '~/__mocks__/mockByon';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockStatus } from '~/__mocks__/mockStatus';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { tablePagination } from '~/__tests__/cypress/cypress/pages/components/Pagination';
import {
  importNotebookImageModal,
  notebookImageSettings,
  updateNotebookImageModal,
} from '~/__tests__/cypress/cypress/pages/notebookImageSettings';
import { projectListPage } from '~/__tests__/cypress/cypress/pages/projects';

describe('Notebook Image Secttings', () => {
  it('Table filtering, sorting, searching', () => {
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));

    cy.intercept(
      '/api/images/byon',
      Array.from(
        { length: 1000 },
        (_, i) =>
          mockByon([
            {
              id: `id-${i}`,
              /* eslint-disable camelcase */
              display_name: `image-${i}`,
              /* eslint-enable camelcase */
              name: `byon-${i}`,
              description: `description-${i}`,
              provider: `provider-${i}`,
              visible: i % 3 === 0,
            },
          ])[0],
      ),
    );
    projectListPage.visit();
    notebookImageSettings.navigate();

    // test sorting
    // by name
    notebookImageSettings.findTableHeaderButton('Name').click();
    cy.findByText('image-999');

    // by description
    notebookImageSettings.findTableHeaderButton('Description').click();
    cy.findByText('image-0');

    // by provider
    notebookImageSettings.findTableHeaderButton('Provider').click();
    cy.findByText('image-0');

    // by enabled
    notebookImageSettings.findTableHeaderButton('Enable').click();
    cy.findByText('image-14');
    notebookImageSettings.findTableHeaderButton('Name').click();

    // test pagination
    // test next page
    tablePagination.top.findNextButton().click();
    tablePagination.top.findNextButton().click();
    tablePagination.top.findNextButton().click();
    tablePagination.top.findNextButton().click();
    cy.findByText('image-136');

    // test type page
    tablePagination.top.findInput().clear();
    tablePagination.top.findInput().type('50{enter}');
    cy.findByText('image-542');

    // test last and first page
    tablePagination.top.findLastButton().click();
    cy.findByText('image-999');
    tablePagination.top.findFirstButton().click();
    cy.findByText('image-0');

    // test filtering
    // by name
    notebookImageSettings.findSearchInput().type('123');
    cy.findByText('image-123');

    // by provider
    notebookImageSettings.findResetButton().click();
    notebookImageSettings.findFilterMenuOption('Provider').click();
    notebookImageSettings.findSearchInput().type('provider-321');
    cy.findByText('image-321');

    // by description
    // test switching filtering options
    notebookImageSettings.findFilterMenuOption('Description').click();
    notebookImageSettings.findEmptyResults();
    notebookImageSettings.findFilterMenuOption('Provider').click();
    cy.findByText('image-321');
  });

  it('Import form fields', () => {
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));

    cy.intercept('/api/images/byon', mockByon([{ url: 'test-image:latest' }]));

    notebookImageSettings.visit();

    // test form is disabled initially
    notebookImageSettings.findImportImageButton().click();
    importNotebookImageModal.findSubmitButton().should('be.disabled');

    // test form is enabled after filling out required fields
    importNotebookImageModal.findImageLocationInput().type('image:latest');
    importNotebookImageModal.findSubmitButton().should('be.disabled');

    importNotebookImageModal.findNameInput().type('image');
    importNotebookImageModal.findSubmitButton().should('be.enabled');

    // test form is disabled after entering software add form
    importNotebookImageModal.findAddSoftwareButton().click();
    importNotebookImageModal.findSubmitButton().should('be.disabled');

    // test form is enabled after submitting software
    importNotebookImageModal.findSoftwareNameInput().type('software');

    importNotebookImageModal.findSoftwareVersionInput().type('version');

    importNotebookImageModal.findSaveResourceButton().click();
    importNotebookImageModal.findSubmitButton().should('be.enabled');
    importNotebookImageModal.find().findByRole('cell', { name: 'software' }).should('exist');
    importNotebookImageModal.find().findByRole('cell', { name: 'version' }).should('exist');

    // test adding another software using Enter
    importNotebookImageModal.findAddResourceButton().click();
    importNotebookImageModal.findSoftwareNameInput().type('software-1');
    importNotebookImageModal.findSoftwareVersionInput().type('version-1{enter}');
    importNotebookImageModal.findSubmitButton().should('be.disabled');
    importNotebookImageModal.find().findByRole('cell', { name: 'software-1' }).should('exist');
    importNotebookImageModal.find().findByRole('cell', { name: 'version-1' }).should('exist');

    // test escaping from the form doesnt add the software
    importNotebookImageModal.findSoftwareNameInput().type('software-2{esc}');
    importNotebookImageModal.find().findByRole('cell', { name: 'software-2' }).should('not.exist');
    importNotebookImageModal.findSubmitButton().should('be.enabled');

    // test deleting software
    importNotebookImageModal
      .find()
      .findByRole('row', {
        name: /software-1 version-1/,
      })
      .findByRole('button', { name: 'Remove displayed content' })
      .click();
    importNotebookImageModal.find().findByRole('cell', { name: 'software-1' }).should('not.exist');

    // test packages tab
    importNotebookImageModal.findPackagesTab().click();

    // test adding packages
    // test form is disabled after entering packages add form
    importNotebookImageModal.findAddPackagesButton().click();
    importNotebookImageModal.findSubmitButton().should('be.disabled');

    // test form is enabled after submitting packages
    importNotebookImageModal.findPackageseNameInput().type('packages');
    importNotebookImageModal.findPackagesVersionInput().type('version');
    importNotebookImageModal.findSaveResourceButton().click();
    importNotebookImageModal.findSubmitButton().should('be.enabled');
    importNotebookImageModal.find().findByRole('cell', { name: 'packages' }).should('exist');
    importNotebookImageModal.find().findByRole('cell', { name: 'version' }).should('exist');

    // test adding another packages using Enter
    importNotebookImageModal.findAddPackagesButton().click();
    importNotebookImageModal.findPackageseNameInput().type('packages-1');
    importNotebookImageModal.findPackagesVersionInput().type('version-1{enter}');
    importNotebookImageModal.findSubmitButton().should('be.disabled');
    importNotebookImageModal.find().findByRole('cell', { name: 'packages-1' }).should('exist');
    importNotebookImageModal.find().findByRole('cell', { name: 'version-1' }).should('exist');

    // test escaping from the form doesnt add the packages
    importNotebookImageModal.findPackageseNameInput().type('packages-2{esc}');
    importNotebookImageModal.find().findByRole('cell', { name: 'packages-2' }).should('not.exist');
    importNotebookImageModal.findSubmitButton().should('be.enabled');

    // test open packages form blocks cancel, import, close, and tabbing
    importNotebookImageModal.findAddPackagesButton().click();
    importNotebookImageModal.findCancelButton().should('be.disabled');
    importNotebookImageModal.findSubmitButton().should('be.disabled');
  });

  it('Edit form fields match', () => {
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));

    cy.intercept('/api/images/byon', mockByon([{ url: 'test-image:latest' }]));
    notebookImageSettings.visit();

    // open edit form
    notebookImageSettings.getRow('Testing Custom Image').find().findKebabAction('Edit').click();

    // test inputs have correct values
    updateNotebookImageModal.findImageLocationInput().should('have.value', 'test-image:latest');
    updateNotebookImageModal.findNameInput().should('have.value', 'Testing Custom Image');
    updateNotebookImageModal.findDescriptionInput().should('have.value', 'A custom notebook image');

    // test software and packages have correct values
    updateNotebookImageModal.find().findByRole('cell', { name: 'test-software' }).should('exist');
    updateNotebookImageModal.find().findByRole('cell', { name: '2.0' }).should('exist');

    updateNotebookImageModal.findPackagesTab().click();
    updateNotebookImageModal.find().findByRole('cell', { name: 'test-package' }).should('exist');
    updateNotebookImageModal.find().findByRole('cell', { name: '1.0' }).should('exist');
  });

  it('Delete form', () => {
    cy.intercept('DELETE', '/api/images/byon-123').as('delete');
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));

    cy.intercept('/api/images/byon', mockByon([{ url: 'test-image:latest' }]));

    notebookImageSettings.visit();

    // test delete form is disabled initially
    notebookImageSettings.getRow('Testing Custom Image').find().findKebabAction('Delete').click();

    deleteModal.findSubmitButton().should('be.disabled');

    // test delete form is enabled after filling out required fields
    deleteModal.findInput().type('Testing Custom Image');
    deleteModal.findSubmitButton().should('be.enabled').click();

    cy.wait('@delete');
  });

  it('Error messages', () => {
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));

    cy.intercept('/api/images', {
      success: false,
      error: 'Testing create error message',
    });
    cy.intercept('/api/images/byon-1', {
      success: false,
      error: 'Testing edit error message',
    });
    cy.intercept('DELETE', '/api/images/byon-1', {
      statusCode: 404,
    });
    cy.intercept(
      '/api/images/byon',
      mockByon([
        {
          name: 'byon-1',
          error: 'Testing error message',
        },
      ]),
    );

    notebookImageSettings.visit();

    // import error
    notebookImageSettings.findImportImageButton().click();
    importNotebookImageModal.findImageLocationInput().type('image:location');
    importNotebookImageModal.findNameInput().type('test name');
    importNotebookImageModal.findSubmitButton().click();
    cy.findByText('Testing create error message');
    importNotebookImageModal.findCloseButton().click();

    // edit error
    notebookImageSettings.getRow('Testing Custom Image').find().findKebabAction('Edit').click();
    updateNotebookImageModal.findSubmitButton().click();
    cy.findByText('Testing edit error message');
    updateNotebookImageModal.findCloseButton().click();

    // delete error
    notebookImageSettings.getRow('Testing Custom Image').find().findKebabAction('Delete').click();
    deleteModal.findInput().type('Testing Custom Image');
    deleteModal.findSubmitButton().click();
    cy.findByRole('heading', { name: 'Danger alert: Error deleting Testing Custom Image' });
    deleteModal.findCloseButton().click();

    // test error icon
    cy.findByRole('button', { name: 'error icon' });
  });

  it('Import modal opens from the empty state', () => {
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));

    cy.intercept('/api/images/byon', mockByon([]));

    notebookImageSettings.visit();

    notebookImageSettings.findImportImageButton().click();
    importNotebookImageModal.find().should('exist');
    importNotebookImageModal.findCloseButton().click();
    importNotebookImageModal.find().should('not.exist');
  });
});
