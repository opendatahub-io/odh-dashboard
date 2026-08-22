/* eslint-disable camelcase */

import { mockFeatureStoreService } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreService';
import { mockFeatureStoreProject } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreProject';
import { mockFeatureStoreLineage } from '@odh-dashboard/feature-store/mocks/mockLineage';
import {
  getEntityTypeAccentColor,
  getEntityTypeBackgroundColor,
} from '@odh-dashboard/feature-store/utils/featureStoreObjects';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel, ServiceModel } from '../../../utils/models';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import { featureStoreGlobal } from '../../../pages/featureStore/featureStoreGlobal';

const k8sNamespace = 'default';
const fsName = 'demo';
const fsProjectName = 'credit_scoring_local';

const initCommonIntercepts = () => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.FEAST_OPERATOR]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableFeatureStore: false }));

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: k8sNamespace })]),
  );

  cy.intercept('GET', '/api/featurestores', {
    featureStores: [
      {
        name: fsName,
        project: fsName,
        registry: {
          path: `feast-${fsName}-${k8sNamespace}-registry.${k8sNamespace}.svc.cluster.local:443`,
        },
        namespace: k8sNamespace,
        status: {
          conditions: [
            {
              type: 'Registry',
              status: 'True',
              lastTransitionTime: '2025-10-08T21:13:38.158Z',
            },
          ],
        },
      },
    ],
  });

  cy.interceptK8sList(
    ServiceModel,
    mockK8sResourceList([
      mockFeatureStoreService({
        name: 'feast-demo-registry-rest',
        namespace: 'default',
        featureStoreName: fsName,
      }),
    ]),
  );

  cy.interceptOdh(
    'GET /api/featurestores/:namespace/:projectName/api/:apiVersion/projects',
    {
      path: { namespace: k8sNamespace, projectName: fsName, apiVersion: 'v1' },
    },
    {
      projects: [mockFeatureStoreProject({ spec: { name: fsProjectName } })],
      pagination: {
        total_count: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
        page: 1,
        limit: 10,
      },
    },
  );
};

const mockLineageIntercept = () => {
  cy.interceptOdh(
    'GET /api/featurestores/:namespace/:projectName/api/:apiVersion/lineage/complete',
    {
      path: { namespace: k8sNamespace, projectName: fsName, apiVersion: 'v1' },
      query: { project: fsProjectName },
    },
    mockFeatureStoreLineage(),
  ).as('getLineage');
};

describe('Feature Store Lineage', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
    mockLineageIntercept();
  });

  it('displays object type legend and color-coded lineage nodes', () => {
    featureStoreGlobal.visitOverview(fsProjectName);
    featureStoreGlobal.clickLineageTab();
    cy.wait('@getLineage');

    featureStoreGlobal.findLineageLegend().should('be.visible');
    featureStoreGlobal.findLineageLegendItem('entity').should('be.visible');
    featureStoreGlobal.findLineageLegendItem('data_source').should('be.visible');
    featureStoreGlobal.findLineageLegendItem('feature_view').should('be.visible');
    featureStoreGlobal.findLineageLegendItem('feature_service').should('be.visible');

    const expectedNodeColors = [
      {
        background: getEntityTypeBackgroundColor('entity'),
        accent: getEntityTypeAccentColor('entity'),
      },
      {
        background: getEntityTypeBackgroundColor('batch_data_source'),
        accent: getEntityTypeAccentColor('batch_data_source'),
      },
      {
        background: getEntityTypeBackgroundColor('batch_feature_view'),
        accent: getEntityTypeAccentColor('batch_feature_view'),
      },
      {
        background: getEntityTypeBackgroundColor('feature_service'),
        accent: getEntityTypeAccentColor('feature_service'),
      },
    ];

    expectedNodeColors.forEach(({ background, accent }) => {
      cy.get('[data-testid="lineage-pill-background"][fill]').should(($backgrounds) => {
        const fills = [...$backgrounds].map((el) => el.getAttribute('fill'));
        expect(fills).to.include(background);
      });
      cy.get('[data-testid="lineage-pill-accent"][fill]').should(($accents) => {
        const fills = [...$accents].map((el) => el.getAttribute('fill'));
        expect(fills).to.include(accent);
      });
    });
  });
});
