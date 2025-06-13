import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { nimDeployModal } from '#~/__tests__/cypress/cypress/pages/components/NIMDeployModal';
import { projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import {
  initInterceptsToDeployModel,
  initInterceptsToEnableNim,
} from '#~/__tests__/cypress/cypress/utils/nimUtils';
import {
  ServingRuntimeModel,
  InferenceServiceModel,
  PVCModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import {
  mockNimInferenceService,
  mockNimServingRuntime,
  mockNimModelPVC,
} from '#~/__mocks__/mockNimResource';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';

describe('NIM Memory Unit Conversion', () => {
  it('should show 1 TiB in modal when the storage size is 1024Gi', () => {
    // 1) Enable NIM
    initInterceptsToEnableNim({});

    // 2) Mock the list (I think this is correct, but I'm not sure)
    const svc = mockNimInferenceService() as any;
    cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([svc]));

    // 3) Mock the modal data (This is the part I'm having trouble with I think)
    const pvc = mockNimModelPVC() as any;
    pvc.spec.resources.requests.storage = '1024Gi';
    cy.interceptK8sList(PVCModel, mockK8sResourceList([pvc]));
    cy.interceptK8s('GET', { model: PVCModel, ns: 'test-project', name: pvc.metadata.name }, pvc);

    // 4) Open the modal
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    projectDetails.visitSection('test-project', 'model-server');
    projectDetails.getKserveTableRow('Test Name').findKebab().click();
    cy.findByRole('menuitem', { name: 'Edit' }).click();

    // 5) Assert conversion
    nimDeployModal.shouldBeOpen(true);
    nimDeployModal.findNimStorageSizeInput().should('have.value', '1');
    nimDeployModal.findNimStorageSizeUnitSelect().should('contain', 'TiB');
  });
});
