import { mockByon } from '#~/__mocks__/mockByon';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  importNotebookImageModal,
  notebookImageDeleteModal,
  notebookImageSettings,
  updateNotebookImageModal,
} from '#~/__tests__/cypress/cypress/pages/notebookImageSettings';
import { pageNotfound } from '#~/__tests__/cypress/cypress/pages/pageNotFound';
import { projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import {
  asProductAdminUser,
  asProjectAdminUser,
} from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { testPagination } from '#~/__tests__/cypress/cypress/utils/pagination';
import {
  AcceleratorProfileModel,
  HardwareProfileModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mockDashboardConfig, mockK8sResourceList } from '#~/__mocks__';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { mockAcceleratorProfile } from '#~/__mocks__/mockAcceleratorProfile';
import { IdentifierResourceType } from '#~/types';
import { HardwareProfileFeatureVisibility } from '#~/k8sTypes';

it('Workbench image settings should not be available for non product admins', () => {
  asProjectAdminUser();
  notebookImageSettings.visit(false);
  pageNotfound.findPage().should('exist');
  notebookImageSettings.findNavItem().should('not.exist');
});

describe('Workbench image settings', () => {
  beforeEach(() => {
    asProductAdminUser();
  });

  it('Table sorting and pagination', () => {
    const totalItems = 1000;
    cy.interceptOdh(
      'GET /api/images/byon',
      Array.from(
        { length: totalItems },
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

    // top pagination
    testPagination({ totalItems, firstElement: 'image-0', paginationVariant: 'top' });

    // bottom pagination
    testPagination({ totalItems, firstElement: 'image-0', paginationVariant: 'bottom' });
  });

  it('Table filtering and searching by name', () => {
    const totalItems = 1000;
    cy.interceptOdh(
      'GET /api/images/byon',
      Array.from(
        { length: totalItems },
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

    // test filtering
    // by name
    const notebookImageTableToolbar = notebookImageSettings.getTableToolbar();
    notebookImageTableToolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Name').click();
    notebookImageTableToolbar.findSearchInput().type('123');
    notebookImageSettings.getRow('image-123').find().should('exist');
  });

  it('Table filtering and searching by provider', () => {
    const totalItems = 1000;
    cy.interceptOdh(
      'GET /api/images/byon',
      Array.from(
        { length: totalItems },
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

    // by provider
    const notebookImageTableToolbar = notebookImageSettings.getTableToolbar();
    notebookImageTableToolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Provider').click();
    notebookImageTableToolbar.findSearchInput().type('provider-321');
    notebookImageSettings.getRow('image-321').find().should('exist');
  });

  it('Import form fields', () => {
    cy.interceptOdh('GET /api/images/byon', mockByon([{ url: 'test-image:latest' }]));
    cy.interceptOdh('POST /api/images', { success: true }).as('importNotebookImage');

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

    // test form is enabled after submitting software
    importNotebookImageModal.findSoftwareNameInput(0).type('software');
    importNotebookImageModal.findSoftwareVersionInput(0).type('version');

    importNotebookImageModal.findSubmitButton().should('be.enabled');

    // test resource name validation
    importNotebookImageModal.k8sNameDescription.findResourceEditLink().click();
    importNotebookImageModal.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'false');
    // Invalid character k8s names fail
    importNotebookImageModal.k8sNameDescription
      .findResourceNameInput()
      .clear()
      .type('InVaLiD vAlUe!');
    importNotebookImageModal.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'true');
    importNotebookImageModal.findSubmitButton().should('be.disabled');
    importNotebookImageModal.k8sNameDescription.findResourceNameInput().clear().type('image');
    importNotebookImageModal.findSubmitButton().should('be.enabled');

    let notebookImageTabRow = importNotebookImageModal.getSoftwareRow('software', 0);
    notebookImageTabRow.shouldHaveVersionColumn('version');

    // test adding another software using Enter
    importNotebookImageModal.findAddSoftwareResourceButton().click();
    importNotebookImageModal.findSoftwareNameInput(1).type('software-1');
    importNotebookImageModal.findSoftwareVersionInput(1).type('version-1');

    notebookImageTabRow = importNotebookImageModal.getSoftwareRow('software-1', 1);
    notebookImageTabRow.shouldHaveVersionColumn('version-1');

    // test deleting software
    notebookImageTabRow.findRemoveContentButton(1).click();
    importNotebookImageModal.findSoftwareRows().should('not.contain', 'software-1');

    // test packages tab
    importNotebookImageModal.findPackagesTab().click();

    // test adding package
    importNotebookImageModal.findAddPackagesButton().click();

    // test form is enabled after submitting packages
    importNotebookImageModal.findPackagesNameInput(0).type('packages');
    importNotebookImageModal.findPackagesVersionInput(0).type('version');
    importNotebookImageModal.findSubmitButton().should('be.enabled');
    notebookImageTabRow = importNotebookImageModal.getPackagesRow('packages', 0);
    notebookImageTabRow.shouldHaveVersionColumn('version');

    //succesfully import notebook image
    importNotebookImageModal.findAddPackagesResourceButton().click();
    importNotebookImageModal.findPackagesNameInput(1).type('packages-1');
    importNotebookImageModal.findPackagesVersionInput(1).type('version-1');
    importNotebookImageModal.findSubmitButton().should('be.enabled');

    importNotebookImageModal.findSubmitButton().click();

    cy.wait('@importNotebookImage').then((interception) => {
      expect(interception.request.body).to.eql({
        /* eslint-disable-next-line camelcase */
        display_name: 'image',
        name: 'image',
        url: 'image:latest',
        description: '',
        recommendedAcceleratorIdentifiers: [],
        provider: 'test-user',
        packages: [
          { name: 'packages', version: 'version', visible: true },
          { name: 'packages-1', version: 'version-1', visible: true },
        ],
        software: [{ name: 'software', version: 'version', visible: true }],
      });
    });
  });

  it('Edit form fields match', () => {
    cy.interceptOdh('GET /api/images/byon', mockByon([{ url: 'test-image:latest' }]));
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableHardwareProfiles: false,
      }),
    );
    cy.interceptOdh(
      'PUT /api/images/:image',
      { path: { image: 'byon-123' } },
      { success: true },
    ).as('editNotebookImage');

    cy.interceptK8sList(
      { model: AcceleratorProfileModel, ns: 'opendatahub' },
      mockK8sResourceList([
        mockAcceleratorProfile({
          name: 'test-accelerator-profile',
          displayName: 'Test Accelerator Profile',
          identifier: 'test-accelerator-profile',
        }),
      ]),
    );

    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList([
        mockHardwareProfile({
          name: 'test-hardware-profile-visible',
          displayName: 'Test Hardware Profile Visible',
          annotations: {
            'opendatahub.io/dashboard-feature-visibility': JSON.stringify([
              HardwareProfileFeatureVisibility.WORKBENCH,
            ]),
          },
          identifiers: [
            {
              displayName: 'hwp1',
              identifier: 'hwp1',
              minCount: '2Gi',
              maxCount: '5Gi',
              defaultCount: '2Gi',
              resourceType: IdentifierResourceType.MEMORY,
            },
            {
              displayName: 'hwp2',
              identifier: 'hwp2',
              minCount: '1',
              maxCount: '2',
              defaultCount: '1',
              resourceType: IdentifierResourceType.CPU,
            },
          ],
        }),
        mockHardwareProfile({
          name: 'test-hardware-profile-not-visible',
          displayName: 'Test Hardware Profile Not Visible',
          annotations: {
            'opendatahub.io/dashboard-feature-visibility': JSON.stringify([
              HardwareProfileFeatureVisibility.PIPELINES,
            ]),
          },
          identifiers: [
            {
              displayName: 'hwp3',
              identifier: 'hwp3',
              minCount: '2Gi',
              maxCount: '5Gi',
              defaultCount: '2Gi',
              resourceType: IdentifierResourceType.MEMORY,
            },
            {
              displayName: 'hwp4',
              identifier: 'hwp4',
              minCount: '1',
              maxCount: '2',
              defaultCount: '1',
              resourceType: IdentifierResourceType.CPU,
            },
          ],
        }),
      ]),
    );

    notebookImageSettings.visit();

    // open edit form
    notebookImageSettings.getRow('Testing Custom Image').find().findKebabAction('Edit').click();

    // test inputs have correct values
    updateNotebookImageModal.findImageLocationInput().should('have.value', 'test-image:latest');
    updateNotebookImageModal.findNameInput().should('have.value', 'Testing Custom Image');
    updateNotebookImageModal.findDescriptionInput().should('have.value', 'A custom notebook image');

    // test hardware profile
    updateNotebookImageModal.findHardwareProfileSelect().click();
    updateNotebookImageModal
      .findHardwareProfileSelectOptionValues()
      .should('deep.equal', ['hwp1', 'hwp2']);
    updateNotebookImageModal.findHardwareProfileSelectOption('hwp1').click();
    updateNotebookImageModal.findHardwareProfileSelectOption('hwp2').click();
    updateNotebookImageModal.findHardwareProfileSelect().click();

    // test software and packages have correct values
    let notebookImageTabRow = importNotebookImageModal.getSoftwareRow('test-software', 0);
    notebookImageTabRow.shouldHaveVersionColumn('2.0');

    updateNotebookImageModal.findPackagesTab().click();
    notebookImageTabRow = importNotebookImageModal.getPackagesRow('test-package', 0);
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
        recommendedAcceleratorIdentifiers: ['hwp1', 'hwp2'],
        packages: [{ name: 'test-package', version: '1.0', visible: true }],
        software: [{ name: 'test-software', version: '2.0', visible: true }],
      });
    });
  });

  it('Delete form', () => {
    cy.interceptOdh(
      'DELETE /api/images/:image',
      { path: { image: 'byon-123' } },
      { success: true },
    ).as('delete');

    cy.interceptOdh('GET /api/images/byon', mockByon([{ url: 'test-image:latest' }]));

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
    cy.interceptOdh('POST /api/images', {
      success: false,
      error: 'Testing create error message',
    }).as('createError');

    cy.interceptOdh(
      'PUT /api/images/:image',
      { path: { image: 'byon-1' } },
      {
        success: false,
        error: 'Testing edit error message',
      },
    ).as('editError');

    cy.interceptOdh(
      'DELETE /api/images/:image',
      { path: { image: 'byon-1' } },
      {
        statusCode: 404,
      },
    ).as('deleteError');

    cy.interceptOdh(
      'GET /api/images/byon',
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

    cy.wait('@createError');

    importNotebookImageModal.findErrorMessageAlert().should('exist');
    importNotebookImageModal.findCloseButton().click();

    // edit error
    notebookImageSettings.getRow('Testing Custom Image').find().findKebabAction('Edit').click();
    updateNotebookImageModal.findSubmitButton().click();

    cy.wait('@editError');

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
    cy.interceptOdh('GET /api/images/byon', mockByon([]));

    notebookImageSettings.visit();

    notebookImageSettings.findImportImageButton().click();
    importNotebookImageModal.find().should('exist');
    importNotebookImageModal.findCloseButton().click();
    importNotebookImageModal.find().should('not.exist');
  });
});
