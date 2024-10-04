import {
  initInterceptsToEnableNim,
  validateNimInmferenceModelsTable,
} from '~/__tests__/cypress/cypress/utils/nimUtils';
import { mockNimInferenceService, mockNimServingRuntime } from '~/__mocks__/mockNimResource';
import {
  InferenceServiceModel,
  ServingRuntimeModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { mockK8sResourceList } from '~/__mocks__';
import { modelServingGlobal } from '~/__tests__/cypress/cypress/pages/modelServing';

describe('NIM Models Deployments', () => {
  it('should be listed in the global models list', () => {
    initInterceptsToEnableNim({ hasAllModels: false });
    cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

    modelServingGlobal.visit('test-project');

    validateNimInmferenceModelsTable();
  });

  it('should only be allowed to be deleted, no edit', () => {
    initInterceptsToEnableNim({});
    cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Name').get('button[aria-label="Kebab toggle"]').click();

    modelServingGlobal
      .getModelRow('Test Name')
      .get('button[role="menuitem"]')
      .should('have.length', 1);
    modelServingGlobal
      .getModelRow('Test Name')
      .get('button[role="menuitem"]')
      .contains('Delete')
      .should('exist');
  });
});
