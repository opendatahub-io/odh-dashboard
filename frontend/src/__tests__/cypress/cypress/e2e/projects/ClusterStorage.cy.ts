import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockNotebookK8sResource,
  mockProjectK8sResource,
  mockStatus,
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

type HandlersProps = {
  isEmpty?: boolean;
};

const initInterceptors = ({ isEmpty = false }: HandlersProps) => {
  cy.intercept('/api/status', mockStatus());
  cy.intercept('/api/config', mockDashboardConfig({}));
  cy.intercept('/api/cluster-settings', mockClusterSettings({}));
  cy.intercept('/api/dsc/status', mockDscStatus({}));
  cy.intercept(
    { pathname: '/api/k8s/api/v1/namespaces/test-project/pods' },
    mockK8sResourceList([mockPodK8sResource({})]),
  );
  cy.intercept(
    { pathname: '/api/k8s/apis/project.openshift.io/v1/projects' },
    mockK8sResourceList([mockProjectK8sResource({})]),
  );
  cy.intercept(
    { pathname: '/api/k8s/apis/project.openshift.io/v1/projects/test-project' },
    mockProjectK8sResource({}),
  );
  cy.intercept({ pathname: '/api/prometheus/pvc' }, mockPVCK8sResource({}));
  cy.intercept(
    {
      method: 'GET',
      pathname:
        '/api/k8s/apis/opendatahub.io/v1alpha/namespaces/opendatahub/odhdashboardconfigs/odh-dashboard-config',
    },
    mockDashboardConfig({}),
  );
  cy.intercept(
    { pathname: '/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims' },
    mockK8sResourceList(
      isEmpty
        ? []
        : [
            mockPVCK8sResource({ uid: 'test-id' }),
            mockPVCK8sResource({ displayName: 'Another Cluster Storage' }),
          ],
    ),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks',
    },
    mockK8sResourceList([mockNotebookK8sResource({})]),
  );
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

    cy.intercept(
      {
        method: 'PATCH',
        pathname: '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks/test-notebook',
      },
      mockNotebookK8sResource({}),
    ).as('addClusterStorage');

    cy.intercept(
      { pathname: '/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims' },
      mockK8sResourceList([mockPVCK8sResource({})]),
    );

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
    clusterStorageRow.shouldHaveStorageSize('Max 5Gi');

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

    cy.intercept(
      {
        method: 'PUT',
        pathname: '/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims/test-storage',
      },
      mockPVCK8sResource({}),
    ).as('editClusterStorage');

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

    cy.intercept(
      {
        method: 'DELETE',
        pathname: '/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims/test-storage',
      },
      { kind: 'Status', apiVersion: 'v1', metadata: {}, status: 'Success' },
    ).as('deleteClusterStorage');

    deleteModal.findSubmitButton().click();
    cy.wait('@deleteClusterStorage');
  });
});
