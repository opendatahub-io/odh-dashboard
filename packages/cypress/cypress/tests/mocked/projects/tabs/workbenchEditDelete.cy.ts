import {
  mockGlobalScopedHardwareProfiles,
  mockProjectScopedHardwareProfiles,
} from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '@odh-dashboard/internal/__mocks__';
import { mockImageStreamK8sResource } from '@odh-dashboard/internal/__mocks__/mockImageStreamK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import { mock200Status, mock404Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { initIntercepts } from './workbenchTestUtils';
import { AccessMode } from '../../../../types';
import {
  ConfigMapModel,
  ImageStreamModel,
  NotebookModel,
  PVCModel,
  SecretModel,
  HardwareProfileModel,
} from '../../../../utils/models';
import { deleteModal } from '../../../../pages/components/DeleteModal';
import { verifyRelativeURL } from '../../../../utils/url';
import {
  createSpawnerPage,
  editSpawnerPage,
  notFoundSpawnerPage,
  workbenchPage,
  attachExistingStorageModal,
} from '../../../../pages/workbench';
import { hardwareProfileSection } from '../../../../pages/components/HardwareProfileSection.ts';

describe('Workbench page', () => {
  it('Edit workbench', () => {
    initIntercepts({
      notebooks: [
        mockNotebookK8sResource({
          lastImageSelection: 'test-imagestream:1.2',
          resources: {
            requests: { cpu: '4', memory: '8Gi' },
            limits: { cpu: '4', memory: '8Gi' },
          },
          opts: {
            metadata: {
              name: 'test-notebook',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Test image',
                'opendatahub.io/hardware-profile-name': 'large-profile',
                'opendatahub.io/hardware-profile-namespace': 'opendatahub',
              },
            },
          },
        }),
      ],
    });
    cy.interceptK8s(
      {
        model: HardwareProfileModel,
        ns: 'opendatahub',
        name: 'large-profile',
      },
      mockGlobalScopedHardwareProfiles[1],
    );
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
    );
    editSpawnerPage.visit('test-notebook');
    editSpawnerPage.findAlertMessage().should('not.exist');
    editSpawnerPage.k8sNameDescription.findDisplayNameInput().should('have.value', 'Test Notebook');
    editSpawnerPage.shouldHaveNotebookImageSelectInput('Test Image');
    hardwareProfileSection.findSelect().should('contain.text', 'Large Profile');
    editSpawnerPage
      .getStorageTable()
      .getRowById(0)
      .findNameValue()
      .should('have.text', 'Test Storage');
    editSpawnerPage.findSubmitButton().should('be.enabled');
    editSpawnerPage.k8sNameDescription.findDisplayNameInput().fill('Updated Notebook');

    cy.interceptK8s('PUT', NotebookModel, mockNotebookK8sResource({})).as('editWorkbenchDryRun');
    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('editWorkbench');

    editSpawnerPage.findSubmitButton().click();

    cy.wait('@editWorkbenchDryRun').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'openshift.io/display-name': 'Updated Notebook',
            'opendatahub.io/image-display-name': 'Test Image',
            'opendatahub.io/hardware-profile-name': 'large-profile',
            'opendatahub.io/hardware-profile-namespace': 'opendatahub',
          },
          name: 'test-notebook',
          namespace: 'test-project',
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  envFrom: [
                    {
                      secretRef: {
                        name: 'secret',
                      },
                    },
                  ],

                  name: 'test-notebook',
                },
              ],
              volumes: [
                { name: 'test-notebook', persistentVolumeClaim: { claimName: 'test-notebook' } },
              ],
            },
          },
        },
      });
    });
    // Actual request
    cy.wait('@editWorkbench').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });
  });

  it('Edit workbench with project-scoped images', () => {
    initIntercepts({
      disableProjectScoped: false,
      notebooks: [
        mockNotebookK8sResource({
          lastImageSelection: 'test-imagestream:1.2',
          resources: {
            requests: { cpu: '1', memory: '2Gi' },
            limits: { cpu: '1', memory: '2Gi' },
          },
          opts: {
            metadata: {
              name: 'test-notebook',
              namespace: 'test-project',
              labels: {
                'opendatahub.io/notebook-image': 'true',
              },
              annotations: {
                'opendatahub.io/image-display-name': 'Test image',
                'opendatahub.io/hardware-profile-name': 'small-profile',
                'opendatahub.io/hardware-profile-namespace': 'test-project',
              },
            },
          },
        }),
      ],
    });

    cy.interceptK8s(
      {
        model: HardwareProfileModel,
        ns: 'test-project',
        name: 'small-profile',
      },
      mockProjectScopedHardwareProfiles[0],
    );

    cy.interceptK8sList(
      ImageStreamModel,
      mockK8sResourceList([
        mockImageStreamK8sResource({
          name: 'project scoped test image',
          displayName: 'Project scoped test image',
          namespace: 'test-project',
        }),
      ]),
    );
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([mockPVCK8sResource({ name: 'test-notebook' })]),
    );

    editSpawnerPage.visit('test-notebook');
    editSpawnerPage.findAlertMessage().should('not.exist');
    editSpawnerPage.k8sNameDescription.findDisplayNameInput().should('have.value', 'Test Notebook');
    editSpawnerPage.k8sNameDescription.findDisplayNameInput().fill('Updated Notebook');

    // update notebook image
    editSpawnerPage
      .findNotebookImageSearchSelector()
      .should('have.text', 'Test ImageGlobal-scoped');
    editSpawnerPage.findNotebookImageSearchSelector().click();

    // Search for a value that exists in Global images but not in Project-scoped images
    editSpawnerPage.findNotebookImageSearchInput().should('be.visible').type('Project');
    editSpawnerPage.findNotebookImageSearchInput().clear();

    const projectScopedNotebookImage = editSpawnerPage.getProjectScopedNotebookImages();
    projectScopedNotebookImage
      .find()
      .findByRole('menuitem', { name: /^Project scoped test image/, hidden: true })
      .click();

    cy.findAllByTestId('project-scoped-label').should('have.length', 2);

    hardwareProfileSection
      .findHardwareProfileSearchSelector()
      .should('contain.text', 'Small Profile');

    cy.interceptK8s('PUT', NotebookModel, mockNotebookK8sResource({})).as('editWorkbenchDryRun');
    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('editWorkbench');

    editSpawnerPage.findSubmitButton().click();

    cy.wait('@editWorkbenchDryRun').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'openshift.io/display-name': 'Updated Notebook',
            'opendatahub.io/image-display-name': 'Project scoped test image',
            'opendatahub.io/workbench-image-namespace': 'test-project',
            'opendatahub.io/hardware-profile-name': 'small-profile',
            'opendatahub.io/hardware-profile-namespace': 'test-project',
          },
          name: 'test-notebook',
          namespace: 'test-project',
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  envFrom: [
                    {
                      secretRef: {
                        name: 'secret',
                      },
                    },
                  ],

                  name: 'test-notebook',
                },
              ],
              volumes: [
                { name: 'test-notebook', persistentVolumeClaim: { claimName: 'test-notebook' } },
              ],
            },
          },
        },
      });
    });

    // Actual request
    cy.wait('@editWorkbench').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });
  });

  it('Edit workbench when either configMap or secret variables not present', () => {
    initIntercepts({
      envFrom: [
        {
          secretRef: {
            name: 'secret-1',
          },
        },
        {
          secretRef: {
            name: 'secret-2',
          },
        },
      ],
    });
    cy.interceptK8s(
      {
        model: SecretModel,
        ns: 'test-project',
        name: 'secret-1',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );
    cy.interceptK8s(
      {
        model: SecretModel,
        ns: 'test-project',
        name: 'secret-2',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );
    editSpawnerPage.visit('test-notebook');
    editSpawnerPage.findAlertMessage().should('exist');
    editSpawnerPage.findAlertMessage().contains('secret-1 and secret-2');
    cy.interceptK8s('PUT', NotebookModel, mockNotebookK8sResource({})).as('editWorkbenchDryRun');
    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('editWorkbench');
    editSpawnerPage.findSubmitButton().click();
    cy.wait('@editWorkbenchDryRun').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'openshift.io/description': '',
            'openshift.io/display-name': 'Test Notebook',
            'opendatahub.io/image-display-name': 'Test Image',
          },
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  envFrom: [],

                  name: 'test-notebook',
                },
              ],
            },
          },
        },
      });
    });
    // Actual request
    cy.wait('@editWorkbench').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });
  });

  it('Edit workbench when both configMap and secret are deleted', () => {
    initIntercepts({
      envFrom: [
        {
          secretRef: {
            name: 'secret-1',
          },
        },
        {
          configMapRef: {
            name: 'secret-2',
          },
        },
      ],
    });
    cy.interceptK8s(
      {
        model: SecretModel,
        ns: 'test-project',
        name: 'secret-1',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'test-project',
        name: 'secret-2',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );
    editSpawnerPage.visit('test-notebook');
    editSpawnerPage.findAlertMessage().should('exist');
    editSpawnerPage.findAlertMessage().contains('secret-1 secret');
    editSpawnerPage.findAlertMessage().contains('secret-2 config map');
    cy.interceptK8s('PUT', NotebookModel, mockNotebookK8sResource({})).as('editWorkbenchDryRun');
    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('editWorkbench');
    editSpawnerPage.findSubmitButton().click();
    cy.wait('@editWorkbenchDryRun').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'openshift.io/description': '',
            'openshift.io/display-name': 'Test Notebook',
            'opendatahub.io/image-display-name': 'Test Image',
          },
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  envFrom: [],

                  name: 'test-notebook',
                },
              ],
            },
          },
        },
      });
    });
    // Actual request
    cy.wait('@editWorkbench').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });
  });

  it('Validate that updating invalid workbench will navigate to the new page with an error message', () => {
    initIntercepts({});
    notFoundSpawnerPage.visit('updated-notebook');
    notFoundSpawnerPage.shouldHaveErrorMessageTitle('Unable to edit workbench');
    notFoundSpawnerPage.findReturnToPage().should('have.attr', 'href').and('not.be.empty');
    notFoundSpawnerPage.findReturnToPage().click();
    verifyRelativeURL('/projects/test-project');
  });

  it('Delete Workbench', () => {
    initIntercepts({
      envFrom: [
        {
          secretRef: {
            name: 'secret-123456',
          },
        },
        {
          secretRef: {
            name: 'custom-secret',
          },
        },
        {
          configMapRef: {
            name: 'configmap-123456',
          },
        },
        {
          configMapRef: {
            name: 'custom-configmap',
          },
        },
      ],
    });
    cy.interceptK8s(
      {
        model: SecretModel,
        ns: 'test-project',
        name: 'secret-123456',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );
    cy.interceptK8s(
      {
        model: ConfigMapModel,
        ns: 'test-project',
        name: 'configmap-123456',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );
    workbenchPage.visit('test-project');
    const notebookRow = workbenchPage.getNotebookRow('Test Notebook');
    notebookRow.findKebabAction('Delete workbench').click();
    deleteModal.findInput().fill('Test Notebook');
    cy.interceptK8s(
      'DELETE',
      { model: NotebookModel, ns: 'test-project', name: 'test-notebook' },
      mock200Status({}),
    ).as('deleteWorkbench');

    cy.interceptK8s(
      'DELETE',
      { model: SecretModel, ns: 'test-project', name: 'secret-123456' },
      mock200Status({}),
    ).as('deleteSecret1');
    cy.interceptK8s(
      'DELETE',
      { model: ConfigMapModel, ns: 'test-project', name: 'configmap-123456' },
      mock200Status({}),
    ).as('deleteSecret2');

    // Intercept any DELETE requests for resources that should not be deleted
    const deleteCustomConfigMapSpy = cy.spy().as('deleteCustomConfigMap');
    cy.interceptK8s(
      'DELETE',
      { model: ConfigMapModel, ns: 'test-project', name: 'custom-configmap' },
      (req) => {
        deleteCustomConfigMapSpy();
        req.reply({ statusCode: 200, body: {} });
      },
    );
    const deleteCustomSecretSpy = cy.spy().as('deleteCustomSecret');
    cy.interceptK8s(
      'DELETE',
      { model: SecretModel, ns: 'test-project', name: 'custom-secret' },
      (req) => {
        deleteCustomSecretSpy();
        req.reply({ statusCode: 200, body: {} });
      },
    );

    cy.interceptK8sList(
      NotebookModel,
      mockK8sResourceList([
        mockNotebookK8sResource({ name: 'another-test', displayName: 'Another Notebook' }),
      ]),
    );
    deleteModal.findSubmitButton().click();
    cy.wait('@deleteWorkbench');
    cy.wait('@deleteSecret1');
    cy.wait('@deleteSecret2');

    // Verify custom resources were not deleted
    cy.get('@deleteCustomSecret').should('not.have.been.called');
    cy.get('@deleteCustomConfigMap').should('not.have.been.called');
  });

  describe('Attach existing storage', () => {
    it('should correctly display grouped PVCs by access mode and update on selection', () => {
      initIntercepts({
        isEmpty: true,
      });

      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([
          mockPVCK8sResource({
            name: 'pvc-rwo',
            displayName: 'pvc-rwo',
            accessModes: [AccessMode.RWO],
            storage: '10Gi',
          }),
          mockPVCK8sResource({
            name: 'pvc-rwx',
            displayName: 'pvc-rwx',
            accessModes: [AccessMode.RWX],
            storage: '5Gi',
          }),
          mockPVCK8sResource({
            name: 'pvc-rox',
            displayName: 'pvc-rox',
            accessModes: [AccessMode.ROX],
            storage: '1Gi',
          }),
          mockPVCK8sResource({
            name: 'pvc-rwop',
            displayName: 'pvc-rwop',
            accessModes: [AccessMode.RWOP],
            storage: '2Gi',
          }),
        ]),
      );

      workbenchPage.visit('test-project');
      workbenchPage.findCreateButton().click();

      createSpawnerPage.findAttachExistingStorageButton().click();
      attachExistingStorageModal.findExistingStorageField().findByRole('button').click();

      attachExistingStorageModal.findTypeaheadGroup('readwriteonce-rwo-storage').should('exist');
      attachExistingStorageModal.findTypeaheadGroup('readwritemany-rwx-storage').should('exist');
      attachExistingStorageModal.findTypeaheadGroup('readonlymany-rox-storage').should('exist');
      attachExistingStorageModal
        .findTypeaheadGroup('readwriteoncepod-rwop-storage')
        .should('exist');

      attachExistingStorageModal
        .findTypeaheadOptionUnderGroup('readwriteonce-rwo-storage', 'pvc-rwo')
        .should('exist');
      attachExistingStorageModal
        .findTypeaheadOptionUnderGroup('readwritemany-rwx-storage', 'pvc-rwx')
        .should('exist');
      attachExistingStorageModal
        .findTypeaheadOptionUnderGroup('readonlymany-rox-storage', 'pvc-rox')
        .should('exist');
      attachExistingStorageModal
        .findTypeaheadOptionUnderGroup('readwriteoncepod-rwop-storage', 'pvc-rwop')
        .should('exist');

      attachExistingStorageModal.selectExistingPersistentStorage('pvc-rwx');
      attachExistingStorageModal.verifyPSDropdownText('pvc-rwx');
    });

    it('should not include PVCs that are already attached', () => {
      initIntercepts({
        isEmpty: true,
      });

      const attachedPvcName = 'already-attached-pvc';
      cy.interceptK8sList(
        PVCModel,
        mockK8sResourceList([
          mockPVCK8sResource({
            name: attachedPvcName,
            displayName: attachedPvcName,
            accessModes: [AccessMode.RWO],
            storage: '5Gi',
          }),
          mockPVCK8sResource({
            name: 'new-pvc',
            displayName: 'new-pvc',
            accessModes: [AccessMode.RWO],
            storage: '5Gi',
          }),
          mockPVCK8sResource({
            name: 'new-pvc-1',
            displayName: 'new-pvc-1',
            accessModes: [AccessMode.RWO],
            storage: '5Gi',
          }),
        ]),
      );

      workbenchPage.visit('test-project');
      workbenchPage.findCreateButton().click();
      createSpawnerPage.findAttachExistingStorageButton().click();

      attachExistingStorageModal.selectExistingPersistentStorage('already-attached-pvc');
      attachExistingStorageModal.findStandardPathInput().clear().type('mnt/different-path');
      attachExistingStorageModal.findAttachButton().click();

      createSpawnerPage.findAttachExistingStorageButton().click();
      attachExistingStorageModal
        .findExistingStorageField()
        .findByRole('button')
        .should('not.be.disabled')
        .click();

      cy.findAllByRole('option').should('not.contain.text', attachedPvcName);
      cy.findAllByRole('option').should('contain.text', 'new-pvc');
      cy.findAllByRole('option').should('contain.text', 'new-pvc-1');
    });
  });
});
