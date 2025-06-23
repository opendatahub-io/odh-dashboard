import {
  buildMockStorageClass,
  mockDashboardConfig,
  mockK8sResourceList,
  mockNotebookK8sResource,
  mockProjectK8sResource,
  mockStorageClasses,
  mockStorageClassList,
} from '#~/__mocks__';

import { mockClusterSettings } from '#~/__mocks__/mockClusterSettings';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';
import { mockPodK8sResource } from '#~/__mocks__/mockPodK8sResource';
import {
  clusterStorage,
  addClusterStorageModal,
  updateClusterStorageModal,
} from '#~/__tests__/cypress/cypress/pages/clusterStorage';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import {
  NotebookModel,
  PVCModel,
  PodModel,
  ProjectModel,
  StorageClassModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mock200Status } from '#~/__mocks__/mockK8sStatus';
import { mockPrometheusQueryResponse } from '#~/__mocks__/mockPrometheusQueryResponse';
import { storageClassesPage } from '#~/__tests__/cypress/cypress/pages/storageClasses';
import { AccessMode } from '#~/__tests__/cypress/cypress/types';

type HandlersProps = {
  isEmpty?: boolean;
  storageClassName?: string;
};

const initInterceptors = ({ isEmpty = false, storageClassName }: HandlersProps) => {
  cy.interceptOdh('GET /api/cluster-settings', mockClusterSettings({}));
  cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({}));
  cy.interceptOdh('POST /api/prometheus/pvc', {
    code: 200,
    response: mockPrometheusQueryResponse({}),
  });
  cy.interceptK8sList(
    { model: PVCModel, ns: 'test-project' },
    mockK8sResourceList(
      isEmpty
        ? []
        : [
            mockPVCK8sResource({ uid: 'test-id', storageClassName }),
            mockPVCK8sResource({ displayName: 'Another Cluster Storage', storageClassName }),
            mockPVCK8sResource({
              displayName: 'Unbound storage',
              storageClassName,
              status: { phase: 'Pending' },
            }),
            mockPVCK8sResource({
              displayName: 'Updated storage with no workbench',
              storageClassName,
              storage: '13Gi',
              status: {
                phase: 'Bound',
                accessModes: ['ReadWriteOnce'],
                capacity: {
                  storage: '12Gi',
                },
                conditions: [
                  {
                    type: 'FileSystemResizePending',
                    status: 'True',
                    lastProbeTime: null,
                    lastTransitionTime: '2024-11-15T14:04:04Z',
                    message:
                      'Waiting for user to (re-)start a pod to finish file system resize of volume on node.',
                  },
                ],
              },
            }),
          ],
    ),
  );
  cy.interceptK8sList(
    NotebookModel,
    mockK8sResourceList([
      mockNotebookK8sResource({
        additionalVolumeMounts: [
          {
            mountPath: '/opt/app-root/src/test-dupe',
            name: 'test-dupe-pvc-path',
          },
        ],
        additionalVolumes: [
          {
            name: 'test-dupe-pvc-path',
            persistentVolumeClaim: {
              claimName: 'test-dupe-pvc-path',
            },
          },
        ],
      }),
    ]),
  );
};

const [openshiftDefaultStorageClass, otherStorageClass] = mockStorageClasses;

describe('ClusterStorage', () => {
  describe('when StorageClasses feature flag is enabled', () => {
    beforeEach(() => {
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableStorageClasses: false,
        }),
      );

      cy.interceptK8sList(
        StorageClassModel,
        mockStorageClassList([
          ...mockStorageClasses,
          buildMockStorageClass(
            {
              ...mockStorageClasses[0],
              metadata: {
                ...mockStorageClasses[0].metadata,
                name: 'test-initial-storage-class',
                annotations: {},
              },
            },
            {},
          ),
        ]),
      );
    });

    it('Check whether the Storage class column is present', () => {
      initInterceptors({ storageClassName: 'openshift-default-sc' });
      clusterStorage.visit('test-project');
      const clusterStorageRow = clusterStorage.getClusterStorageRow('Test Storage');
      clusterStorageRow.findStorageClassColumn().should('exist');
      clusterStorageRow.showStorageClassDetails();
      clusterStorageRow
        .findStorageClassResourceNameText()
        .should('have.text', 'openshift-default-sc');
      clusterStorageRow.findStorageClassResourceKindText().should('have.text', 'StorageClass');
    });

    it('Check whether the Storage class is deprecated', () => {
      initInterceptors({ storageClassName: 'test-storage-class-1' });
      clusterStorage.visit('test-project');

      const clusterStorageRow = clusterStorage.getClusterStorageRow('Test Storage');
      clusterStorageRow.findDeprecatedLabel().should('exist');

      clusterStorageRow.findDeprecatedLabel().trigger('mouseenter');
      clusterStorageRow.shouldHaveDeprecatedTooltip();
      clusterStorage.shouldHaveDeprecatedAlertMessage();
      clusterStorage.closeDeprecatedAlert();
    });

    it('Should hide deprecated alert when the storage class is not configured', () => {
      initInterceptors({ storageClassName: 'test-initial-storage-class' });
      clusterStorage.visit('test-project');

      const clusterStorageRow = clusterStorage.getClusterStorageRow('Test Storage');
      clusterStorageRow.queryDeprecatedLabel().should('not.exist');
      clusterStorage.shouldNotHaveDeprecatedAlertMessage();
    });
  });

  it('Empty state', () => {
    initInterceptors({ isEmpty: true });
    clusterStorage.visit('test-project');
    clusterStorage.findEmptyState().should('exist');
    clusterStorage.findCreateButton().should('be.enabled');
    clusterStorage.findCreateButton().click();
  });

  it('Add cluster storage', () => {
    initInterceptors({ isEmpty: true });
    storageClassesPage.mockGetStorageClasses([
      openshiftDefaultStorageClass,
      buildMockStorageClass(otherStorageClass, { isEnabled: true }),
    ]);

    clusterStorage.visit('test-project');
    clusterStorage.findCreateButton().click();
    addClusterStorageModal.findNameInput().fill('test-storage');

    // default selected
    addClusterStorageModal.find().findByText('openshift-default-sc').should('exist');

    const storageClassSelect = addClusterStorageModal.findStorageClassSelect();

    // confirm radio not enabled when only one storage access mode
    addClusterStorageModal.findRWOAccessMode().should('be.checked').should('be.disabled');

    // select storage class
    storageClassSelect.find().click();
    storageClassSelect.findSelectStorageClassLabel(/Test SC 1/, AccessMode.RWX).should('exist');
    storageClassSelect.selectStorageClassSelectOption(/Test SC 1/);
    addClusterStorageModal.findSubmitButton().should('be.enabled');
    addClusterStorageModal.findDescriptionInput().fill('description');
    addClusterStorageModal.findPVSizeMinusButton().click();
    addClusterStorageModal.findPVSizeInput().should('have.value', '19');
    addClusterStorageModal.findPVSizePlusButton().click();
    addClusterStorageModal.findPVSizeInput().should('have.value', '20');
    addClusterStorageModal.selectPVSize('MiB');

    // select access mode
    addClusterStorageModal.findRWOAccessMode().should('be.checked');
    addClusterStorageModal.findRWXAccessMode().click();
    addClusterStorageModal.findROXAccessMode().should('be.disabled');
    addClusterStorageModal.findRWOPAccessMode().should('be.disabled');

    //connect workbench
    addClusterStorageModal.findAddWorkbenchButton().click();
    addClusterStorageModal.findWorkbenchTable().should('exist');
    addClusterStorageModal.findWorkbenchName(0).should('have.attr', 'disabled');
    addClusterStorageModal.findWorkbenchSelectValueField(0).should('have.value', 'Test Notebook');

    //don't allow duplicate path
    addClusterStorageModal.findMountPathField(0).fill('test-dupe');
    addClusterStorageModal
      .findMountFieldHelperText()
      .should('contain.text', 'This path is already connected to this workbench');

    addClusterStorageModal.findMountPathField(0).clear();
    addClusterStorageModal.selectCustomPathFormat(0);
    addClusterStorageModal
      .findMountFieldHelperText()
      .should('contain.text', 'Enter a path to a model or folder.');
    addClusterStorageModal.findMountPathField(0).fill('data');
    addClusterStorageModal.findWorkbenchRestartAlert().should('exist');

    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('addClusterStorage');

    cy.interceptK8sList(PVCModel, mockK8sResourceList([mockPVCK8sResource({})]));

    // verify text here:
    const submitBtn = addClusterStorageModal.findSubmitButton();
    submitBtn.should('contain.text', 'Add storage');
    submitBtn.click();

    cy.wait('@addClusterStorage').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.eql([
        { op: 'add', path: '/spec/template/spec/volumes/-', value: { persistentVolumeClaim: {} } },
        {
          op: 'add',
          path: '/spec/template/spec/containers/0/volumeMounts/-',
          value: { mountPath: '/data' },
        },
      ]);
    });

    cy.wait('@addClusterStorage').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@addClusterStorage.all').then((interceptions) => {
      expect(interceptions).to.have.length(2);
    });
  });

  it('Add cluster storage with multiple workbench connections', () => {
    // one notebook already connected to a PVC
    const testNotebook = mockNotebookK8sResource({
      displayName: 'Test Notebook',
      name: 'test-notebook',
      opts: {
        spec: {
          template: {
            spec: {
              volumes: [
                { name: 'existing-pvc', persistentVolumeClaim: { claimName: 'existing-pvc' } },
              ],
              containers: [
                {
                  volumeMounts: [{ name: 'existing-pvc', mountPath: '/opt/app-root/src' }],
                },
              ],
            },
          },
        },
      },
    });

    // another notebook not connected to PVC
    const anotherNotebook = mockNotebookK8sResource({
      displayName: 'Another Notebook',
      name: 'another-notebook',
    });

    initInterceptors({});
    cy.interceptK8sList(NotebookModel, mockK8sResourceList([testNotebook, anotherNotebook]));

    cy.interceptK8sList(
      { model: PVCModel, ns: 'test-project' },
      mockK8sResourceList([
        mockPVCK8sResource({ name: 'existing-pvc', displayName: 'Existing PVC' }),
      ]),
    );

    clusterStorage.visit('test-project');
    const clusterStorageRow = clusterStorage.getClusterStorageRow('Existing PVC');
    clusterStorageRow.findKebabAction('Edit storage').click();
    updateClusterStorageModal.findAddWorkbenchButton().click();
    addClusterStorageModal.findWorkbenchName(1).should('have.attr', 'disabled');
    addClusterStorageModal
      .findWorkbenchSelectValueField(1)
      .should('have.value', 'Another Notebook');
    updateClusterStorageModal.findMountPathField(1).fill('new-data');

    cy.interceptK8s('PATCH', NotebookModel, anotherNotebook).as('updateClusterStorage');

    const submitBtn = updateClusterStorageModal.findSubmitButton();
    submitBtn.should('contain.text', 'Update storage');
    submitBtn.click();

    cy.wait('@updateClusterStorage').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.eql([
        {
          op: 'add',
          path: '/spec/template/spec/volumes/-',
          value: { name: 'existing-pvc', persistentVolumeClaim: { claimName: 'existing-pvc' } },
        },
        {
          op: 'add',
          path: '/spec/template/spec/containers/0/volumeMounts/-',
          value: { name: 'existing-pvc', mountPath: '/opt/app-root/src/new-data' },
        },
      ]);
    });

    cy.wait('@updateClusterStorage').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@updateClusterStorage.all').then((interceptions) => {
      expect(interceptions).to.have.length(2);
    });
  });

  it('list cluster storage and Table sorting', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableStorageClasses: true,
      }),
    );
    initInterceptors({});
    clusterStorage.visit('test-project');
    const clusterStorageRow = clusterStorage.getClusterStorageRow('Test Storage');
    clusterStorageRow.findStorageClassColumn().should('not.exist');
    clusterStorageRow.shouldHaveStorageTypeValue('Persistent storage');
    clusterStorageRow.findConnectedWorkbenches().should('have.text', 'No connections');
    clusterStorageRow.findSizeColumn().contains('5GiB');

    //sort by Name
    clusterStorage.findClusterStorageTableHeaderButton('Name').should(be.sortAscending);
    clusterStorage.findClusterStorageTableHeaderButton('Name').click();
    clusterStorage.findClusterStorageTableHeaderButton('Name').should(be.sortDescending);
  });

  it('should show warning when cluster storage size is updated but no workbench is connected', () => {
    initInterceptors({});
    clusterStorage.visit('test-project');
    const clusterStorageRow = clusterStorage.getClusterStorageRow(
      'Updated storage with no workbench',
    );
    clusterStorageRow.findSizeColumn().should('have.text', 'Max 13GiB');
    clusterStorageRow.findStorageSizeWarning();
    clusterStorageRow.findStorageSizeWarning().should('exist');
  });

  it('Edit cluster storage', () => {
    initInterceptors({});
    clusterStorage.visit('test-project');
    const clusterStorageRow = clusterStorage.getClusterStorageRow('Test Storage');
    clusterStorageRow.findKebabAction('Edit storage').click();
    updateClusterStorageModal.findNameInput().should('have.value', 'Test Storage');
    updateClusterStorageModal.findPVSizeInput().should('have.value', '5');
    updateClusterStorageModal.shouldHavePVSizeSelectValue('GiB');
    updateClusterStorageModal.findPersistentStorageWarningCanOnlyIncrease().should('exist');
    updateClusterStorageModal.findSubmitButton().should('be.enabled');
    updateClusterStorageModal.findNameInput().fill('test-updated');

    cy.interceptK8s('PUT', PVCModel, mockPVCK8sResource({})).as('editClusterStorage');

    updateClusterStorageModal.findExistingAccessMode().should('have.text', 'ReadWriteOnce (RWO)');
    updateClusterStorageModal.findSubmitButton().click();
    cy.wait('@editClusterStorage').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          annotations: {
            'openshift.io/description': '',
            'openshift.io/display-name': 'test-updated',
          },
          name: 'test-storage',
          namespace: 'test-project',
        },
        spec: {
          resources: { requests: { storage: '5Gi' } },
        },
        status: { phase: 'Pending', accessModes: ['ReadWriteOnce'], capacity: { storage: '5Gi' } },
      });
    });

    cy.wait('@editClusterStorage').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@editClusterStorage.all').then((interceptions) => {
      expect(interceptions).to.have.length(2);
    });
  });

  it('should disable size field when editing unbound storage', () => {
    initInterceptors({});
    clusterStorage.visit('test-project');
    const clusterStorageRow = clusterStorage.getClusterStorageRow('Unbound storage');
    clusterStorageRow.findKebabAction('Edit storage').click();
    updateClusterStorageModal.findNameInput().should('have.value', 'Unbound storage');
    updateClusterStorageModal.findPVSizeInput().should('have.value', '5').should('be.disabled');
    updateClusterStorageModal.shouldHavePVSizeSelectValue('GiB').should('be.disabled');
    updateClusterStorageModal.findPersistentStorageWarningCanNotEdit().should('exist');
  });

  it('Delete cluster storage', () => {
    initInterceptors({});
    clusterStorage.visit('test-project');
    const clusterStorageRow = clusterStorage.getClusterStorageRow('Test Storage');
    clusterStorageRow.findKebabAction('Delete storage').click();
    deleteModal.findInput().fill('Test Storage');

    cy.interceptK8s(
      'DELETE',
      { model: PVCModel, ns: 'test-project', name: 'test-storage' },
      mock200Status({}),
    ).as('deleteClusterStorage');

    deleteModal.findSubmitButton().click();
    cy.wait('@deleteClusterStorage');
  });
});
