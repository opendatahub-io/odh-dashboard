/* eslint-disable camelcase */
import {
  mockCatalogAccuracyMetricsArtifact,
  mockCatalogModelArtifact,
  mockCatalogModelArtifactList,
  mockCatalogPerformanceMetricsArtifact,
} from '@odh-dashboard/model-registry/mocks/mockCatalogModelArtifactList';
import {
  mockCatalogModelList,
  mockCatalogModel,
} from '@odh-dashboard/model-registry/mocks/mockCatalogModelList';
import type { CatalogSource } from '@odh-dashboard/model-registry/types/modelCatalogTypes';
import {
  mockCatalogSource,
  mockCatalogSourceList,
} from '@odh-dashboard/model-registry/mocks/mockCatalogSourceList';
import type { ModelCatalogSource } from '@odh-dashboard/internal/concepts/modelCatalog/types';
import { modelDetailsPage } from '../../../pages/modelCatalog/modelDetailsPage';
import { modelServingWizard } from '../../../pages/modelServing';
import { initDeployPrefilledModelIntercepts } from '../../../utils/modelServingUtils';

const MODEL_CATALOG_API_VERSION = 'v1';
const MODEL_REGISTRY_API_VERSION = 'v1';

type HandlersProps = {
  catalogModels?: ModelCatalogSource[];
  isEmpty?: boolean;
  disableKServe?: boolean;
  sources?: CatalogSource[];
  modelsPerCategory?: number;
};

const initIntercepts = ({
  isEmpty = false,
  disableKServe = false,
  modelsPerCategory = 4,
  sources = [mockCatalogSource({}), mockCatalogSource({ id: 'source-2', name: 'source 2' })],
}: HandlersProps) => {
  initDeployPrefilledModelIntercepts({ isEmpty, disableKServe });
  cy.interceptOdh('GET /api/components', null, []);
  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/namespaces`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: [{ metadata: { name: 'odh-model-registries' } }] },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/user`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_catalog/sources`,
    {
      path: { apiVersion: MODEL_CATALOG_API_VERSION },
    },
    {
      data: mockCatalogSourceList({
        items: sources,
      }),
    },
  );

  sources.forEach((source) => {
    source.labels.forEach((label) => {
      cy.interceptOdh(
        `GET /model-registry/api/:apiVersion/model_catalog/models`,
        {
          path: { apiVersion: MODEL_CATALOG_API_VERSION },
          query: {
            sourceLabel: label,
          },
        },
        {
          data: mockCatalogModelList({
            items: Array.from({ length: modelsPerCategory }, (_, i) =>
              mockCatalogModel({
                name: `${label.toLowerCase()}-model-${i + 1}`,
                // eslint-disable-next-line camelcase
                source_id: source.id,
              }),
            ),
          }),
        },
      );
    });
  });

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_catalog/sources/:sourceId/models/:modelName`,
    {
      path: {
        apiVersion: MODEL_CATALOG_API_VERSION,
        sourceId: 'source-2',
        modelName: 'sample%20category%201-model-1',
      },
    },
    { data: mockCatalogModel({ name: 'sample-category-1-model-1', source_id: 'source-2' }) },
  ).as('loadModel');

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_catalog/sources/:sourceId/artifacts/:modelName`,
    {
      path: {
        apiVersion: MODEL_CATALOG_API_VERSION,
        sourceId: 'source-2',
        modelName: 'sample%20category%201-model-1',
      },
    },
    {
      data: mockCatalogModelArtifactList({
        items: [
          mockCatalogPerformanceMetricsArtifact({}),
          mockCatalogAccuracyMetricsArtifact({}),
          mockCatalogModelArtifact({
            uri: 'oci://registry.redhat.io/rhelai1/modelcar-granite-7b-redhat-lab:1.4.0',
          }),
        ],
      }),
    },
  ).as('loadArtifacts');
};

describe('Deploy catalog model', () => {
  it('Error if kserve is not enabled', () => {
    initIntercepts({ disableKServe: true });
    modelDetailsPage.visit();

    cy.wait('@loadModel');
    cy.wait('@loadArtifacts');
    modelDetailsPage.findDeployModelButton().should('have.attr', 'aria-disabled', 'true');
    modelDetailsPage.findDeployModelButton().focus();
    cy.findByRole('tooltip').should(
      'contain.text',
      'To enable model serving, an administrator must first select a model serving platform in the cluster settings.',
    );
  });

  it('Allow using a project with no platform selected (it will use kserve)', () => {
    initIntercepts({});
    modelDetailsPage.visit();

    cy.wait('@loadModel');
    cy.wait('@loadArtifacts');
    modelDetailsPage.findDeployModelButton().should('be.enabled');
    modelDetailsPage.findDeployModelButton().should('not.have.attr', 'aria-disabled', 'true');
    modelDetailsPage.findDeployModelButton().click();
    modelServingWizard.findModelSourceStep().should('exist');
  });

  it('Prefills deployment wizard model location details and type', () => {
    initIntercepts({});
    modelDetailsPage.visit();

    cy.wait('@loadModel');
    cy.wait('@loadArtifacts');
    modelDetailsPage.findDeployModelButton().should('be.enabled');
    modelDetailsPage.findDeployModelButton().should('not.have.attr', 'aria-disabled', 'true');
    modelDetailsPage.findDeployModelButton().click();
    modelServingWizard.findPrefillAlert().should('exist');
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.enabled');
    modelServingWizard.findNextButton().should('be.enabled');
    modelServingWizard
      .findModelTypeSelect()
      .should('contain.text', 'Generative AI model (Example, LLM)');
    modelServingWizard.findModelLocationSelect().should('contain.text', 'URI');
    modelServingWizard
      .findUrilocationInput()
      .should(
        'have.value',
        'oci://registry.redhat.io/rhelai1/modelcar-granite-7b-redhat-lab:1.4.0',
      );
    modelServingWizard.findNextButton().should('be.enabled').click();
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard
      .findModelDeploymentNameInput()
      .should('have.value', 'sample-category-1-model-1');
  });

  // TODO: unskip when we add a spinner for loading location data RHOAIENG-41407
  it.skip('Deployment wizard will show spinner, if the data is still loading', () => {
    initIntercepts({ isEmpty: true });
    modelDetailsPage.visit();

    cy.wait('@loadModel');
    cy.wait('@loadArtifacts');
    modelDetailsPage.findDeployModelButton().click();
    // Look for spinner here
  });
});
