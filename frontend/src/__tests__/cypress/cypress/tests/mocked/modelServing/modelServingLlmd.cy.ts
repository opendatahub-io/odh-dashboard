// eslint-disable-next-line import/no-extraneous-dependencies
import { LLMInferenceServiceModel } from '@odh-dashboard/llmd-serving/types';
// eslint-disable-next-line import/no-extraneous-dependencies
import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/llmd-serving/__tests__/utils';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeK8sResource } from '#~/__mocks__/mockServingRuntimeK8sResource';
import { modelServingGlobal } from '#~/__tests__/cypress/cypress/pages/modelServing';
import {
  InferenceServiceModel,
  ProjectModel,
  ServingRuntimeModel,
} from '#~/__tests__/cypress/cypress/utils/models';

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        kserve: true,
        'model-mesh': false,
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelMesh: true,
      disableNIMModelServing: true,
      disableKServe: false,
    }),
  );
  cy.interceptOdh('GET /api/components', null, []);

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: false })]),
  );
};

describe('Model Serving LLMD', () => {
  it('should display LLMD deployment in deployments table', () => {
    initIntercepts();

    // Mock LLMInferenceService resources
    cy.interceptK8sList(
      { model: LLMInferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([
        mockLLMInferenceServiceK8sResource({
          name: 'facebook-opt-125m-single',
          namespace: 'test-project',
          displayName: 'Facebook OPT 125M',
          modelName: 'facebook/opt-125m',
          modelUri: 'hf://facebook/opt-125m',
          isReady: true,
        }),
      ]),
    );

    // Mock empty KServe InferenceService resources
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([]),
    );

    // Mock empty ServingRuntime resources
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([]),
    );

    // Visit the model serving page
    cy.visitWithLogin('/modelServing/test-project?devFeatureFlags=Model+Serving+Plugin%3Dtrue');

    // Verify LLMD deployment is displayed in the table
    modelServingGlobal.getModelRow('Facebook OPT 125M').should('exist');
    modelServingGlobal.getModelRow('Facebook OPT 125M').should('be.visible');

    // Verify deployment details
    const llmdRow = modelServingGlobal.getModelRow('Facebook OPT 125M');
    llmdRow.should('contain', 'Facebook OPT 125M');

    // Check that the status shows as ready
    llmdRow.findByTestId('deployed-model-name').should('contain', 'Facebook OPT 125M');
  });

  it('should display both KServe and LLMD deployments in the same project', () => {
    initIntercepts();

    // Mock both LLMInferenceService and InferenceService resources
    cy.interceptK8sList(
      { model: LLMInferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([
        mockLLMInferenceServiceK8sResource({
          name: 'llmd-deployment',
          namespace: 'test-project',
          displayName: 'LLMD Test Model',
          modelName: 'facebook/opt-125m',
          modelUri: 'hf://facebook/opt-125m',
          isReady: true,
        }),
      ]),
    );

    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([
        mockInferenceServiceK8sResource({
          name: 'kserve-deployment',
          namespace: 'test-project',
          displayName: 'KServe Test Model',
          isReady: true,
        }),
      ]),
    );

    // Mock ServingRuntime for KServe deployment
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([
        mockServingRuntimeK8sResource({
          name: 'test-runtime',
          namespace: 'test-project',
        }),
      ]),
    );

    // Visit the model serving page
    cy.visitWithLogin('/modelServing/test-project?devFeatureFlags=Model+Serving+Plugin%3Dtrue');

    // Verify both deployments are displayed in the table
    modelServingGlobal.getModelRow('LLMD Test Model').should('exist');
    modelServingGlobal.getModelRow('KServe Test Model').should('exist');

    // Verify both are visible
    modelServingGlobal.getModelRow('LLMD Test Model').should('be.visible');
    modelServingGlobal.getModelRow('KServe Test Model').should('be.visible');

    // Verify we have exactly 2 deployments
    modelServingGlobal.findRows().should('have.length', 2);

    // Check deployment names
    modelServingGlobal
      .getModelRow('LLMD Test Model')
      .findByTestId('deployed-model-name')
      .should('contain', 'LLMD Test Model');

    modelServingGlobal
      .getModelRow('KServe Test Model')
      .findByTestId('deployed-model-name')
      .should('contain', 'KServe Test Model');
  });

  it('should show empty state when no deployments exist', () => {
    initIntercepts();

    // Mock empty resources for both platforms
    cy.interceptK8sList(
      { model: LLMInferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([]),
    );

    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([]),
    );

    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([]),
    );

    // Visit the model serving page
    cy.visitWithLogin('/modelServing/test-project?devFeatureFlags=Model+Serving+Plugin%3Dtrue');

    // Verify empty state is shown
    modelServingGlobal.shouldBeEmpty();
    modelServingGlobal.findDeployModelButton().should('be.visible');
  });

  it('should handle LLMD deployment with error status', () => {
    initIntercepts();

    // Mock LLMD deployment with error status
    cy.interceptK8sList(
      { model: LLMInferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([
        mockLLMInferenceServiceK8sResource({
          name: 'error-llmd-deployment',
          namespace: 'test-project',
          displayName: 'Error LLMD Model',
          modelName: 'facebook/opt-125m',
          modelUri: 'hf://facebook/opt-125m',
          isReady: false, // Set to error state
        }),
      ]),
    );

    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([]),
    );

    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([]),
    );

    // Visit the model serving page
    cy.visitWithLogin('/modelServing/test-project?devFeatureFlags=Model+Serving+Plugin%3Dtrue');

    // Verify LLMD deployment is displayed even with error status
    modelServingGlobal.getModelRow('Error LLMD Model').should('exist');
    modelServingGlobal.getModelRow('Error LLMD Model').should('be.visible');
  });
});
