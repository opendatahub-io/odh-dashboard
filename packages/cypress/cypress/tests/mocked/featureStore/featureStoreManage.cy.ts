import { mockFeatureStoreCR } from '@odh-dashboard/feature-store/mocks/mockFeatureStoreCR';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import {
  FEATURE_STORE_UI_LABEL_KEY,
  FEATURE_STORE_UI_LABEL_VALUE,
} from '@odh-dashboard/feature-store/const';
import { ProjectModel } from '../../../utils/models';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import { featureStoreManagePage } from '../../../pages/featureStore/featureStoreManage';

const k8sNamespace = 'test-ns';

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
};

describe('Feature Store Manage Page', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initCommonIntercepts();
  });

  describe('Empty state', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/k8s/apis/feast.dev/v1/namespaces/*/featurestores', { items: [] });
    });

    it('should display empty state when no feature stores exist', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findEmptyState().should('exist');
      featureStoreManagePage.findEmptyState().should('contain.text', 'No feature stores');
    });

    it('should display create button in empty state for admin users', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findCreateButtonEmpty().should('exist');
      featureStoreManagePage.findCreateButtonEmpty().should('contain.text', 'Create feature store');
    });
  });

  describe('List view', () => {
    const store1 = mockFeatureStoreCR({
      name: 'store-alpha',
      namespace: k8sNamespace,
      feastProject: 'store_alpha',
      phase: 'Ready',
      labels: { [FEATURE_STORE_UI_LABEL_KEY]: FEATURE_STORE_UI_LABEL_VALUE },
    });

    const store2 = mockFeatureStoreCR({
      name: 'store-beta',
      namespace: k8sNamespace,
      feastProject: 'store_beta',
      phase: 'Installing',
    });

    beforeEach(() => {
      cy.intercept('GET', '/api/k8s/apis/feast.dev/v1/namespaces/*/featurestores', {
        items: [store1, store2],
      });
    });

    it('should display the feature store table with rows', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findTable().should('exist');
      featureStoreManagePage.findTable().should('contain.text', 'store-alpha');
      featureStoreManagePage.findTable().should('contain.text', 'store-beta');
    });

    it('should display create button in toolbar', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findCreateButtonToolbar().should('exist');
    });

    it('should show Ready status label for store-alpha', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findTable().should('contain.text', 'Ready');
    });

    it('should show Installing status label for store-beta', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findTable().should('contain.text', 'Installing');
    });

    it('should show Primary label for the UI-labeled store', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findTable().should('contain.text', 'Primary');
    });
  });

  describe('Cross-namespace row expansion', () => {
    const storeNs1 = mockFeatureStoreCR({
      name: 'my-store',
      namespace: 'ns-one',
      feastProject: 'my_store',
      uid: 'uid-ns-one-my-store',
    });
    const storeNs2 = mockFeatureStoreCR({
      name: 'my-store',
      namespace: 'ns-two',
      feastProject: 'my_store',
      uid: 'uid-ns-two-my-store',
    });

    beforeEach(() => {
      cy.interceptK8sList(
        ProjectModel,
        mockK8sResourceList([
          mockProjectK8sResource({ k8sName: 'ns-one' }),
          mockProjectK8sResource({ k8sName: 'ns-two' }),
        ]),
      );
      cy.intercept('GET', '/api/k8s/apis/feast.dev/v1/namespaces/ns-one/featurestores', {
        items: [storeNs1],
      });
      cy.intercept('GET', '/api/k8s/apis/feast.dev/v1/namespaces/ns-two/featurestores', {
        items: [storeNs2],
      });
    });

    it('should display both stores with the same name in different namespaces', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findTable().should('contain.text', 'ns-one');
      featureStoreManagePage.findTable().should('contain.text', 'ns-two');
    });
  });
});
