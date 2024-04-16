import { mockK8sResourceList, mockNotebookK8sResource, mockProjectK8sResource } from '~/__mocks__';
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
} from '~/__tests__/cypress/cypress/utils/models';
import { mock200Status } from '~/__mocks__/mockK8sStatus';
import { mockPrometheusQueryResponse } from '~/__mocks__/mockPrometheusQueryResponse';

type HandlersProps = {
  isEmpty?: boolean;
};

const initInterceptors = ({ isEmpty = false }: HandlersProps) => {
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
            mockPVCK8sResource({ uid: 'test-id' }),
            mockPVCK8sResource({ displayName: 'Another Cluster Storage' }),
          ],
    ),
  );
  cy.interceptK8sList(NotebookModel, mockK8sResourceList([mockNotebookK8sResource({})]));
};

describe('ClusterStorage', () => {
  it('Empty state', () => {
    initInterceptors({ isEmpty: true });
    clusterStorage.visit('test-project');
    clusterStorage.findEmptyState().should('exist');
    clusterStorage.findCreateButton().should('be.enabled');
    clusterStorage.findCreateButton().click();
  });

  it('Add cluster storage', () => {
    initInterceptors({ isEmpty: true });
    clusterStorage.visit('test-project');
    clusterStorage.findCreateButton().click();
    addClusterStorageModal.findNameInput().fill('test-storage');
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

  it('list accelerator profiles and Table sorting', () => {
    initInterceptors({});
    clusterStorage.visit('test-project');
    const clusterStorageRow = clusterStorage.getClusterStorageRow('Test Storage');
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
