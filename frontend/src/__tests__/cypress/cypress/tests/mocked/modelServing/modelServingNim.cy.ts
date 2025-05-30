import { initInterceptsToEnableNim } from '#~/__tests__/cypress/cypress/utils/nimUtils';
import { mockNimInferenceService, mockNimServingRuntime } from '#~/__mocks__/mockNimResource';
import {
  InferenceServiceModel,
  ServingRuntimeModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mockK8sResourceList } from '#~/__mocks__';
import {
  modelServingGlobal,
  modelServingSection,
} from '#~/__tests__/cypress/cypress/pages/modelServing';

describe('NIM Models Deployments', () => {
  it('should be listed in the global models list', () => {
    initInterceptsToEnableNim({ hasAllModels: false });
    cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

    modelServingGlobal.visit('test-project');

    // Table is visible and has 1 row
    modelServingSection.findInferenceServiceTable().should('have.length', 1);

    // First row matches the NIM inference service details
    modelServingSection
      .getInferenceServiceRow('Test Name')
      .findProject()
      .should('contains.text', 'Test Project');
    modelServingSection
      .getInferenceServiceRow('Test Name')
      .findProject()
      .should('contains.text', 'NVIDIA NIM serving enabled');
    modelServingSection
      .getInferenceServiceRow('Test Name')
      .findServingRuntime()
      .should('have.text', 'NVIDIA NIM');
    modelServingSection
      .getInferenceServiceRow('Test Name')
      .findAPIProtocol()
      .should('have.text', 'REST');
  });

  it('should be allowed to be deleted and edit', () => {
    initInterceptsToEnableNim({});
    cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([mockNimInferenceService()]));
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([mockNimServingRuntime()]));

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Name').findKebabAction('Edit').should('exist');
    modelServingGlobal.getModelRow('Test Name').findKebabAction('Delete').should('exist');
  });
});
