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
  ImageStreamModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import {
  mock200Status,
  mock403Error,
  mock404Error,
  mockDashboardConfig,
  mockK8sResourceList,
} from '#~/__mocks__';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { mockAcceleratorProfile } from '#~/__mocks__/mockAcceleratorProfile';
import {
  IdentifierResourceType,
  ImageStreamAnnotation,
  ImageStreamLabel,
  ImageStreamSpecTagAnnotation,
} from '#~/types';
import { HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { mockImageStreamK8sResource } from '#~/__mocks__/mockImageStreamK8sResource';

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
    cy.interceptK8sList(
      { model: ImageStreamModel, ns: 'opendatahub' },
      mockK8sResourceList(
        Array.from({ length: totalItems }, (_, i) =>
          mockImageStreamK8sResource({
            name: `byon-${i}`,
            displayName: `image-${i}`,
            opts: {
              metadata: {
                uid: `id-${i}`,
                labels: {
                  'app.kubernetes.io/created-by': 'byon',
                  [ImageStreamLabel.NOTEBOOK]: (i % 3 === 0).toString(),
                },
                annotations: {
                  [ImageStreamAnnotation.DESC]: `description-${i}`,
                  [ImageStreamAnnotation.DISP_NAME]: `image-${i}`,
                  [ImageStreamAnnotation.CREATOR]: `provider-${i}`,
                },
              },
            },
          }),
        ),
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
    cy.interceptK8sList(
      { model: ImageStreamModel, ns: 'opendatahub' },
      mockK8sResourceList(
        Array.from({ length: totalItems }, (_, i) =>
          mockImageStreamK8sResource({
            name: `byon-${i}`,
            displayName: `image-${i}`,
            opts: {
              metadata: {
                uid: `id-${i}`,
                labels: {
                  'app.kubernetes.io/created-by': 'byon',
                  [ImageStreamLabel.NOTEBOOK]: (i % 3 === 0).toString(),
                },
                annotations: {
                  [ImageStreamAnnotation.DESC]: `description-${i}`,
                  [ImageStreamAnnotation.DISP_NAME]: `image-${i}`,
                  [ImageStreamAnnotation.CREATOR]: `provider-${i}`,
                },
              },
            },
          }),
        ),
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
    cy.interceptK8sList(
      { model: ImageStreamModel, ns: 'opendatahub' },
      mockK8sResourceList(
        Array.from({ length: totalItems }, (_, i) =>
          mockImageStreamK8sResource({
            name: `byon-${i}`,
            displayName: `image-${i}`,
            opts: {
              metadata: {
                uid: `id-${i}`,
                labels: {
                  'app.kubernetes.io/created-by': 'byon',
                  [ImageStreamLabel.NOTEBOOK]: (i % 3 === 0).toString(),
                },
                annotations: {
                  [ImageStreamAnnotation.DESC]: `description-${i}`,
                  [ImageStreamAnnotation.DISP_NAME]: `image-${i}`,
                  [ImageStreamAnnotation.CREATOR]: `provider-${i}`,
                },
              },
            },
          }),
        ),
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
    cy.interceptK8sList(
      { model: ImageStreamModel, ns: 'opendatahub' },
      mockK8sResourceList([mockImageStreamK8sResource({})]),
    );
    cy.interceptK8s('POST', { model: ImageStreamModel, ns: 'opendatahub' }, mock200Status({})).as(
      'importNotebookImage',
    );

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

    const expectedImageStream = {
      apiVersion: 'image.openshift.io/v1',
      kind: 'ImageStream',
      metadata: {
        annotations: {
          'opendatahub.io/notebook-image-creator': 'test-user',
          'opendatahub.io/notebook-image-desc': '',
          'opendatahub.io/notebook-image-name': 'image',
          'opendatahub.io/notebook-image-url': 'image:latest',
          'opendatahub.io/recommended-accelerators': '[]',
        },
        labels: {
          'app.kubernetes.io/created-by': 'byon',
          'opendatahub.io/dashboard': 'true',
          'opendatahub.io/notebook-image': 'true',
        },
        name: 'image',
        namespace: 'opendatahub',
      },
      spec: {
        lookupPolicy: {
          local: true,
        },
        tags: [
          {
            annotations: {
              'openshift.io/imported-from': 'image:latest',
              'opendatahub.io/notebook-software':
                '[{"name":"software","version":"version","visible":true}]',
              'opendatahub.io/notebook-python-dependencies':
                '[{"name":"packages","version":"version","visible":true},{"name":"packages-1","version":"version-1","visible":true}]',
            },
            from: {
              kind: 'DockerImage',
              name: 'image:latest',
            },
            name: 'latest',
          },
        ],
      },
    };

    cy.wait('@importNotebookImage').then((interception) => {
      expect(interception.request.body).to.eql(expectedImageStream);
    });
  });

  it('Edit form fields match', () => {
    cy.interceptK8sList(
      { model: ImageStreamModel, ns: 'opendatahub' },
      mockK8sResourceList([
        mockImageStreamK8sResource({
          name: 'byon-123',
          displayName: 'Testing Custom Image',
          opts: {
            metadata: {
              labels: {
                'app.kubernetes.io/created-by': 'byon',
                [ImageStreamLabel.NOTEBOOK]: 'true',
              },
              annotations: {
                [ImageStreamAnnotation.DISP_NAME]: 'Testing Custom Image',
                [ImageStreamAnnotation.URL]: 'test-image:latest',
                [ImageStreamAnnotation.DESC]: 'A custom notebook image',
              },
            },
            spec: {
              tags: [
                {
                  annotations: {
                    [ImageStreamSpecTagAnnotation.DEPENDENCIES]:
                      '[{"name":"test-package","version": "1.0", "visible": true}]',
                    [ImageStreamSpecTagAnnotation.SOFTWARE]:
                      '[{"name":"test-software","version":"2.0", "visible": true}]',
                  },
                },
              ],
            },
          },
        }),
      ]),
    );

    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableHardwareProfiles: false,
      }),
    );

    cy.interceptK8s(
      'PUT',
      { model: ImageStreamModel, ns: 'opendatahub', name: 'byon-123' },
      mock200Status({}),
    ).as('editNotebookImage');

    const expectedImageStream = mockImageStreamK8sResource({
      name: 'byon-123',
      namespace: 'opendatahub',
      imageTag: 'image:latest',
      tagName: 'latest',
      displayName: 'Updated custom image',
      opts: {
        metadata: {
          uid: 'd6a75af7-f215-47d1-a167-e1c1e78d465c',
          resourceVersion: '1579802',
          generation: 2,
          creationTimestamp: '2023-06-30T15:07:35Z',
          annotations: {
            'kfctl.kubeflow.io/kfdef-instance': 'opendatahub.opendatahub',
            'opendatahub.io/notebook-image-desc': 'A custom notebook image',
            'opendatahub.io/notebook-image-order': '1',
            'opendatahub.io/notebook-image-url':
              'https://github.com//opendatahub-io/notebooks/tree/main/jupyter/minimal',
            'opendatahub.io/recommended-accelerators': '["hwp1","hwp2"]',
          },
        },
        spec: {
          lookupPolicy: {
            local: true,
          },
          tags: [
            {
              name: 'latest',
              from: {
                kind: 'DockerImage',
                name: 'image:latest',
              },
              annotations: {
                'openshift.io/imported-from': 'image:latest',
                'opendatahub.io/notebook-software':
                  '[{"name":"test-software","version":"2.0","visible":true}]',
                'opendatahub.io/notebook-python-dependencies':
                  '[{"name":"test-package","version":"1.0","visible":true}]',
              },
            },
          ],
        },
        status: {
          dockerImageRepository:
            'image-registry.openshift-image-registry.svc:5000/opendatahub/jupyter-minimal-notebook',
          tags: [
            {
              tag: 'latest',
              items: [
                {
                  created: '2023-06-30T15:07:36Z',
                  dockerImageReference: 'image:latest',
                  image: 'image:latest',
                  generation: 2,
                },
              ],
            },
          ],
        },
      },
    });

    cy.interceptK8s(
      'GET',
      { model: ImageStreamModel, ns: 'opendatahub', name: 'byon-123' },
      expectedImageStream,
    ).as('getNotebookImage');

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
      expect(interception.request.body).to.eql(expectedImageStream);
    });
  });

  it('Delete form', () => {
    cy.interceptK8s(
      'DELETE',
      { model: ImageStreamModel, ns: 'opendatahub', name: 'byon-123' },
      mock200Status({}),
    ).as('delete');

    cy.interceptK8sList(
      { model: ImageStreamModel, ns: 'opendatahub' },
      mockK8sResourceList([
        mockImageStreamK8sResource({
          name: 'byon-123',
          displayName: 'Testing Custom Image',
          opts: {
            metadata: {
              labels: {
                'app.kubernetes.io/created-by': 'byon',
                [ImageStreamLabel.NOTEBOOK]: 'true',
              },
              annotations: {
                [ImageStreamAnnotation.DISP_NAME]: 'Testing Custom Image',
              },
            },
            spec: {
              tags: [
                {
                  annotations: {
                    [ImageStreamSpecTagAnnotation.DEPENDENCIES]:
                      '[{"name":"test-package","version": "1.0", "visible": true}]',
                    [ImageStreamSpecTagAnnotation.SOFTWARE]:
                      '[{"name":"test-software","version":"2.0", "visible": true}]',
                  },
                },
              ],
            },
          },
        }),
      ]),
    );

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
    cy.interceptK8s(
      'POST',
      { model: ImageStreamModel, ns: 'opendatahub' },
      mock403Error({ message: 'Testing create error message' }),
    ).as('createError');

    cy.interceptK8s(
      'PUT',
      { model: ImageStreamModel, ns: 'opendatahub', name: 'byon-1' },
      mock404Error({ message: 'Testing edit error message' }),
    ).as('editError');

    cy.interceptK8s(
      'GET',
      { model: ImageStreamModel, ns: 'opendatahub', name: 'byon-1' },
      mockImageStreamK8sResource({
        name: 'byon-1',
        namespace: 'opendatahub',
        imageTag: 'image:latest',
        tagName: 'latest',
        displayName: 'Updated custom image',
      }),
    );

    cy.interceptK8s(
      'DELETE',
      { model: ImageStreamModel, ns: 'opendatahub', name: 'byon-1' },
      mock404Error({ message: 'Danger alert:Error deleting Testing Custom Image' }),
    ).as('deleteError');

    cy.interceptK8sList(
      { model: ImageStreamModel, ns: 'opendatahub' },
      mockK8sResourceList([
        mockImageStreamK8sResource({
          name: 'byon-1',
          displayName: 'Testing Custom Image',
          opts: {
            metadata: {
              labels: {
                'app.kubernetes.io/created-by': 'byon',
                [ImageStreamLabel.NOTEBOOK]: 'true',
              },
              annotations: {
                [ImageStreamAnnotation.DISP_NAME]: 'Testing Custom Image',
              },
            },
            status: {
              tags: [
                {
                  tag: 'tag-1',
                  conditions: [
                    { type: 'ImportSuccess', status: 'False', message: 'Testing error message' },
                  ],
                },
              ],
            },
            spec: {
              tags: [
                {
                  name: 'tag-1',
                  annotations: {
                    [ImageStreamSpecTagAnnotation.DEPENDENCIES]:
                      '[{"name":"test-package","version": "1.0", "visible": true}]',
                    [ImageStreamSpecTagAnnotation.SOFTWARE]:
                      '[{"name":"test-software","version":"2.0", "visible": true}]',
                  },
                },
              ],
            },
          },
        }),
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
      .should('contain.text', 'Danger alert:Error deleting Testing Custom Image');
    deleteModal.findCloseButton().click();

    // test error icon
    notebookImageSettings.findErrorButton().should('exist');
  });

  it('Import modal opens from the empty state', () => {
    cy.interceptK8sList(
      { model: ImageStreamModel, ns: 'opendatahub' },
      mockK8sResourceList([mockImageStreamK8sResource({})]),
    );

    notebookImageSettings.visit();

    notebookImageSettings.findImportImageButton().click();
    importNotebookImageModal.find().should('exist');
    importNotebookImageModal.findCloseButton().click();
    importNotebookImageModal.find().should('not.exist');
  });
});
