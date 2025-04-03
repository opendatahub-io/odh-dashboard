/* eslint-disable camelcase */
import { mockK8sResourceList } from '~/__mocks__';
import { ConfigMapModel, ServingRuntimeModel } from '~/__tests__/cypress/cypress/utils/models';
import { modelDetailsPage } from '~/__tests__/cypress/cypress/pages/modelCatalog/modelDetailsPage';
import { kserveModal } from '~/__tests__/cypress/cypress/pages/modelServing';
import { initDeployPrefilledModelIntercepts } from '~/__tests__/cypress/cypress/utils/modelServingUtils';
import type { ModelCatalogSource } from '~/concepts/modelCatalog/types';
import { mockModelCatalogSource } from '~/__mocks__/mockModelCatalogSource';
import {
  mockModelCatalogConfigMap,
  mockUnmanagedModelCatalogConfigMap,
} from '~/__mocks__/mockModelCatalogConfigMap';
import { modelCatalogDeployModal } from '~/__tests__/cypress/cypress/pages/modelCatalog/modelCatalogDeployModal';

type HandlersProps = {
  catalogModels?: ModelCatalogSource[];
  modelMeshInstalled?: boolean;
  kServeInstalled?: boolean;
};

const initIntercepts = ({
  catalogModels = [mockModelCatalogSource({})],
  modelMeshInstalled = true,
  kServeInstalled = true,
}: HandlersProps) => {
  initDeployPrefilledModelIntercepts({ modelMeshInstalled, kServeInstalled });

  cy.interceptK8s(
    {
      model: ConfigMapModel,
      ns: 'opendatahub',
      name: 'model-catalog-sources',
    },
    mockModelCatalogConfigMap(catalogModels),
  );
  cy.interceptK8s(
    {
      model: ConfigMapModel,
      ns: 'opendatahub',
      name: 'model-catalog-unmanaged-sources',
    },
    mockUnmanagedModelCatalogConfigMap(catalogModels),
  );
};

describe('Deploy catalog model', () => {
  it('Error if kserve is not enabled', () => {
    initIntercepts({ kServeInstalled: false });
    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    cy.wait('@getProjects');
    modelCatalogDeployModal.selectProjectByName('KServe project');
    cy.findByText('Single-model platform is not installed').should('exist');
  });

  it('Allow using a project with no platform selected (it will use kserve)', () => {
    initIntercepts({});
    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    modelCatalogDeployModal.selectProjectByName('Test project');
    modelDetailsPage.findDeployModelButton().should('be.enabled');
  });

  it('OCI info alert is visible', () => {
    initIntercepts({});
    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));
    cy.findByTestId('oci-deploy-kserve-alert').should('exist');
  });

  it('Selects Current URI in case of built-in registry OCI connections', () => {
    initIntercepts({});
    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    modelCatalogDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The format of the source model is').should('not.exist');

    // Validate connection section
    kserveModal.findExistingUriOption().should('be.checked');
    kserveModal.find().within(() => {
      cy.findByText(
        'oci://registry.redhat.io/rhelai1/granite-8b-code-instruct:1.3-1732870892',
      ).should('exist');
    });
  });
});
