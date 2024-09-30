import {
  buildMockStorageClass,
  mockDashboardConfig,
  mockK8sResourceList,
  mockNotebookK8sResource,
  mockProjectK8sResource,
  mockStorageClasses,
  mockStorageClassList,
} from '~/__mocks__';

import { mockClusterSettings } from '~/__mocks__/mockClusterSettings';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import {
  clusterStorage,
  addClusterStorageModal,
  updateClusterStorageModal,
} from '~/__tests__/cypress/cypress/pages/clusterStorage';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { be } from '~/__tests__/cypress/cypress/utils/should';
import {
  NotebookModel,
  PVCModel,
  PodModel,
  ProjectModel,
  StorageClassModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { mock200Status } from '~/__mocks__/mockK8sStatus';
import { mockPrometheusQueryResponse } from '~/__mocks__/mockPrometheusQueryResponse';
import { storageClassesPage } from '~/__tests__/cypress/cypress/pages/storageClasses';

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
            mockPVCK8sResource({ displayName: 'Another Cluster Storage' }),
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

      cy.interceptK8sList(StorageClassModel, mockStorageClassList());
    });

    it('Check whether the Storage class column is present', () => {
      initInterceptors({ storageClassName: 'openshift-default-sc' });
      clusterStorage.visit('test-project');
      const clusterStorageRow = clusterStorage.getClusterStorageRow('Test Storage');
      clusterStorageRow.findStorageClassColumn().should('exist');
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

    // select storage class
    addClusterStorageModal.findStorageClassSelect().findSelectOption('Test SC 1').click();
    addClusterStorageModal.findSubmitButton().should('be.enabled');
    addClusterStorageModal.findDescriptionInput().fill('description');
    addClusterStorageModal.findPVSizeMinusButton().click();
    addClusterStorageModal.findPVSizeInput().should('have.value', '19');
    addClusterStorageModal.findPVSizePlusButton().click();
    addClusterStorageModal.findPVSizeInput().should('have.value', '20');
    addClusterStorageModal.selectPVSize('Mi');

    //connect workbench
    addClusterStorageModal
      .findWorkbenchConnectionSelect()
      .findSelectOption('Test Notebook')
      .click();

    // don't allow duplicate path
    addClusterStorageModal.findMountField().clear();
    addClusterStorageModal.findMountField().fill('test-dupe');
    addClusterStorageModal
      .findMountFieldHelperText()
      .should('have.text', 'Mount folder is already in use for this workbench.');

    // don't allow number in the path
    addClusterStorageModal.findMountField().clear();
    addClusterStorageModal.findMountField().fill('test2');
    addClusterStorageModal
      .findMountFieldHelperText()
      .should('have.text', 'Must only consist of lowercase letters and dashes.');

    // Allow trailing slash
    addClusterStorageModal.findMountField().clear();
    addClusterStorageModal.findMountField().fill('test/');
    addClusterStorageModal
      .findMountFieldHelperText()
      .should('have.text', 'Must consist of lowercase letters and dashes.');

    addClusterStorageModal.findMountField().clear();
    addClusterStorageModal
      .findMountFieldHelperText()
      .should(
        'have.text',
        'Enter a path to a model or folder. This path cannot point to a root folder.',
      );
    addClusterStorageModal.findMountField().fill('data');
    addClusterStorageModal.findWorkbenchRestartAlert().should('exist');

    cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('addClusterStorage');

    cy.interceptK8sList(PVCModel, mockK8sResourceList([mockPVCK8sResource({})]));

    addClusterStorageModal.findSubmitButton().click();
    cy.wait('@addClusterStorage').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.eql([
        { op: 'add', path: '/spec/template/spec/volumes/-', value: { persistentVolumeClaim: {} } },
        {
          op: 'add',
          path: '/spec/template/spec/containers/0/volumeMounts/-',
          value: { mountPath: '/opt/app-root/src/data' },
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
                  volumeMounts: [{ name: 'existing-pvc', mountPath: '/' }],
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

    // Connect to 'Another Notebook'
    updateClusterStorageModal
      .findWorkbenchConnectionSelect()
      .findSelectOption('Another Notebook')
      .click();
    updateClusterStorageModal.findMountField().fill('new-data');

    cy.interceptK8s('PATCH', NotebookModel, anotherNotebook).as('updateClusterStorage');

    updateClusterStorageModal.findSubmitButton().click();
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
                  volumeMounts: [{ name: 'existing-pvc', mountPath: '/' }],
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

    // Connect to 'Another Notebook'
    updateClusterStorageModal
      .findWorkbenchConnectionSelect()
      .findSelectOption('Another Notebook')
      .click();
    updateClusterStorageModal.findMountField().fill('new-data');

    cy.interceptK8s('PATCH', NotebookModel, anotherNotebook).as('updateClusterStorage');

    updateClusterStorageModal.findSubmitButton().click();
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
    clusterStorageRow.toggleExpandableContent();
    clusterStorageRow.shouldHaveStorageSize('5Gi');

    //sort by Name
    clusterStorage.findClusterStorageTableHeaderButton('Name').click();
    clusterStorage.findClusterStorageTableHeaderButton('Name').should(be.sortAscending);
    clusterStorage.findClusterStorageTableHeaderButton('Name').click();
    clusterStorage.findClusterStorageTableHeaderButton('Name').should(be.sortDescending);
  });

  it('Edit cluster storage', () => {
    initInterceptors({});
    clusterStorage.visit('test-project');
    const clusterStorageRow = clusterStorage.getClusterStorageRow('Test Storage');
    clusterStorageRow.findKebabAction('Edit storage').click();
    updateClusterStorageModal.findNameInput().should('have.value', 'Test Storage');
    updateClusterStorageModal.findPVSizeInput().should('have.value', '5');
    updateClusterStorageModal.shouldHavePVSizeSelectValue('Gi');
    updateClusterStorageModal.findPersistentStorageWarning().should('exist');
    updateClusterStorageModal.findSubmitButton().should('be.enabled');
    updateClusterStorageModal.findNameInput().fill('test-updated');

    cy.interceptK8s('PUT', PVCModel, mockPVCK8sResource({})).as('editClusterStorage');

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
