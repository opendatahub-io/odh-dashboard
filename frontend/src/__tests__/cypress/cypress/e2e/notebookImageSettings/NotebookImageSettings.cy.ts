import { mockByon } from '~/__mocks__/mockByon';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockStatus } from '~/__mocks__/mockStatus';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { tablePagination } from '~/__tests__/cypress/cypress/pages/components/Pagination';
import {
  importNotebookImageModal,
  notebookImageDeleteModal,
  notebookImageSettings,
  updateNotebookImageModal,
} from '~/__tests__/cypress/cypress/pages/notebookImageSettings';
import { projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import { be } from '~/__tests__/cypress/cypress/utils/should';

describe('Notebook images', () => {
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
    notebookImageSettings.findTableHeaderButton('Name').should(be.sortDescending);
    notebookImageSettings.findTableHeaderButton('Name').click();
    notebookImageSettings.findTableHeaderButton('Name').should(be.sortAscending);

    // by description
    notebookImageSettings.findTableHeaderButton('Description').click();
    notebookImageSettings.findTableHeaderButton('Description').should(be.sortAscending);
    notebookImageSettings.findTableHeaderButton('Description').click();
    notebookImageSettings.findTableHeaderButton('Description').should(be.sortDescending);

    // by provider
    notebookImageSettings.findTableHeaderButton('Provider').click();
    notebookImageSettings.findTableHeaderButton('Provider').should(be.sortAscending);
    notebookImageSettings.findTableHeaderButton('Provider').click();
    notebookImageSettings.findTableHeaderButton('Provider').should(be.sortDescending);

    // by enabled
    notebookImageSettings.findTableHeaderButton('Enable').click();
    notebookImageSettings.findTableHeaderButton('Enable').should(be.sortAscending);
    notebookImageSettings.findTableHeaderButton('Enable').click();
    notebookImageSettings.findTableHeaderButton('Enable').should(be.sortDescending);
    notebookImageSettings.findTableHeaderButton('Name').click();

    // test pagination
    // test next page
    tablePagination.top.findNextButton().click();
    tablePagination.top.findNextButton().click();
    tablePagination.top.findNextButton().click();
    tablePagination.top.findNextButton().click();
    notebookImageSettings.getRow('image-136').find().should('exist');

    // test type page
    tablePagination.top.findInput().clear();
    tablePagination.top.findInput().type('50{enter}');
    notebookImageSettings.getRow('image-542').find().should('exist');

    // test last and first page
    tablePagination.top.findLastButton().click();
    notebookImageSettings.getRow('image-999').find().should('exist');

    tablePagination.top.findFirstButton().click();
    notebookImageSettings.getRow('image-0').find().should('exist');

    // test filtering
    // by name
    const notebookImageTableToolbar = notebookImageSettings.getTableToolbar();
    notebookImageTableToolbar.findSearchInput().type('123');
    notebookImageSettings.getRow('image-123').find().should('exist');

    // by provider
    notebookImageTableToolbar.findResetButton().click();
    notebookImageTableToolbar.findFilterMenuOption('filter-dropdown-select', 'Provider').click();
    notebookImageTableToolbar.findSearchInput().type('provider-321');
    notebookImageSettings.getRow('image-321').find().should('exist');

    // by description
    // test switching filtering options
    notebookImageTableToolbar.findFilterMenuOption('filter-dropdown-select', 'Description').click();
    notebookImageSettings.findEmptyResults();
    notebookImageTableToolbar.findFilterMenuOption('filter-dropdown-select', 'Provider').click();
    notebookImageSettings.getRow('image-321').find().should('exist');
  });

  it('Import form fields', () => {
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));
    cy.intercept('/api/images/byon', mockByon([{ url: 'test-image:latest' }]));
    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/images',
      },
      {},
    ).as('importNotebookImage');

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

    importNotebookImageModal.findSaveResourceButton('Software').click();
    importNotebookImageModal.findSubmitButton().should('be.enabled');
    let notebookImageTabRow = importNotebookImageModal.getSoftwareRow('software');
    notebookImageTabRow.shouldHaveVersionColumn('version');

    // test adding another software using Enter
    importNotebookImageModal.findAddSoftwareResourceButton().click();
    importNotebookImageModal.findSoftwareNameInput().type('software-1');
    importNotebookImageModal.findSoftwareVersionInput().type('version-1{enter}');
    importNotebookImageModal.findSubmitButton().should('be.disabled');
    notebookImageTabRow = importNotebookImageModal.getSoftwareRow('software-1');
    notebookImageTabRow.shouldHaveVersionColumn('version-1');

    // test escaping from the form doesnt add the software
    importNotebookImageModal.findSoftwareNameInput().type('software-2{esc}');
    importNotebookImageModal.findSoftwareRows().should('not.contain', 'software-2');

    importNotebookImageModal.findSubmitButton().should('be.enabled');

    // test deleting software
    notebookImageTabRow.findRemoveContentButton().click();
    importNotebookImageModal.findSoftwareRows().should('not.contain', 'software-1');

    // test packages tab
    importNotebookImageModal.findPackagesTab().click();

    // test adding packages
    // test form is disabled after entering packages add form
    importNotebookImageModal.findAddPackagesButton().click();
    importNotebookImageModal.findSubmitButton().should('be.disabled');

    // test form is enabled after submitting packages
    importNotebookImageModal.findPackagesNameInput().type('packages');
    importNotebookImageModal.findPackagesVersionInput().type('version');
    importNotebookImageModal.findSaveResourceButton('Packages').click();
    importNotebookImageModal.findSubmitButton().should('be.enabled');
    notebookImageTabRow = importNotebookImageModal.getPackagesRow('packages');
    notebookImageTabRow.shouldHaveVersionColumn('version');

    // test adding another packages using Enter
    importNotebookImageModal.findAddPackagesResourceButton().click();
    importNotebookImageModal.findPackagesNameInput().type('packages-1');
    importNotebookImageModal.findPackagesVersionInput().type('version-1{enter}');
    importNotebookImageModal.findSubmitButton().should('be.disabled');
    notebookImageTabRow = importNotebookImageModal.getPackagesRow('packages-1');
    notebookImageTabRow.shouldHaveVersionColumn('version-1');

    // test escaping from the form doesnt add the packages
    importNotebookImageModal.findPackagesNameInput().type('packages-2{esc}');
    importNotebookImageModal.findPackagesRows().should('not.contain', 'packages-2');
    importNotebookImageModal.findSubmitButton().should('be.enabled');

    // test open packages form blocks cancel, import, close, and tabbing
    importNotebookImageModal.findAddPackagesResourceButton().click();
    importNotebookImageModal.findCancelButton().should('be.disabled');
    importNotebookImageModal.findSubmitButton().should('be.disabled');

    //succesfully import notebook image
    importNotebookImageModal.findPackagesNameInput().type('packages-3');
    importNotebookImageModal.findPackagesVersionInput().type('version');
    importNotebookImageModal.findSaveResourceButton('Packages').click();
    importNotebookImageModal.findSubmitButton().should('be.enabled');

    importNotebookImageModal.findSubmitButton().click();

    cy.wait('@importNotebookImage').then((interception) => {
      expect(interception.request.body).to.eql({
        /* eslint-disable-next-line camelcase */
        display_name: 'image',
        url: 'image:latest',
        description: '',
        recommendedAcceleratorIdentifiers: [],
        provider: 'admin-user',
        packages: [
          { name: 'packages', version: 'version', visible: true },
          { name: 'packages-1', version: 'version-1', visible: true },
          { name: 'packages-3', version: 'version', visible: true },
        ],
        software: [{ name: 'software', version: 'version', visible: true }],
      });
    });
  });

  it('Edit form fields match', () => {
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));
    cy.intercept('/api/images/byon', mockByon([{ url: 'test-image:latest' }]));
    cy.intercept(
      {
        method: 'PUT',
        pathname: '/api/images/byon-123',
      },
      /* eslint-disable-next-line camelcase */
      mockByon([{ url: 'test-image:latest', display_name: 'Updated custom image' }]),
    ).as('editNotebookImage');

    notebookImageSettings.visit();

    // open edit form
    notebookImageSettings.getRow('Testing Custom Image').find().findKebabAction('Edit').click();

    // test inputs have correct values
    updateNotebookImageModal.findImageLocationInput().should('have.value', 'test-image:latest');
    updateNotebookImageModal.findNameInput().should('have.value', 'Testing Custom Image');
    updateNotebookImageModal.findDescriptionInput().should('have.value', 'A custom notebook image');

    // test software and packages have correct values
    let notebookImageTabRow = importNotebookImageModal.getSoftwareRow('test-software');
    notebookImageTabRow.shouldHaveVersionColumn('2.0');

    updateNotebookImageModal.findPackagesTab().click();
    notebookImageTabRow = importNotebookImageModal.getPackagesRow('test-package');
    notebookImageTabRow.shouldHaveVersionColumn('1.0');

    // test edit notebook image
    updateNotebookImageModal.findNameInput().clear();
    updateNotebookImageModal.findNameInput().type('Updated custom image');
    updateNotebookImageModal.findSubmitButton().should('be.enabled');

    updateNotebookImageModal.findSubmitButton().click();

    cy.wait('@editNotebookImage').then((interception) => {
      expect(interception.request.body).to.eql({
        name: 'byon-123',
        /* eslint-disable-next-line camelcase */
        display_name: 'Updated custom image',
        description: 'A custom notebook image',
        recommendedAcceleratorIdentifiers: [],
        packages: [{ name: 'test-package', version: '1.0', visible: true }],
        software: [{ name: 'test-software', version: '2.0', visible: true }],
      });
    });
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
    }).as('createError');

    cy.intercept('/api/images/byon-1', {
      success: false,
      error: 'Testing edit error message',
    }).as('editError');

    cy.intercept('DELETE', '/api/images/byon-1', {
      statusCode: 404,
    }).as('deleteError');

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

    cy.wait('@createError').then((interception) => {
      expect(interception.request.method).to.eql('POST');
    });

    importNotebookImageModal.findErrorMessageAlert().should('exist');
    importNotebookImageModal.findCloseButton().click();

    // edit error
    notebookImageSettings.getRow('Testing Custom Image').find().findKebabAction('Edit').click();
    updateNotebookImageModal.findSubmitButton().click();

    cy.wait('@editError').then((interception) => {
      expect(interception.request.method).to.eql('PUT');
    });

    updateNotebookImageModal.findErrorMessageAlert().should('exist');
    updateNotebookImageModal.findCloseButton().click();

    // delete error
    notebookImageSettings.getRow('Testing Custom Image').find().findKebabAction('Delete').click();
    notebookImageDeleteModal.findInput().type('Testing Custom Image');
    notebookImageDeleteModal.findSubmitButton().click();

    cy.wait('@deleteError');
    notebookImageDeleteModal
      .findAlertMessage()
      .should('have.text', 'Danger alert:Error deleting Testing Custom Image');
    deleteModal.findCloseButton().click();

    // test error icon
    notebookImageSettings.findErrorButton().should('exist');
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
