import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { FeatureStoreModel, ProjectModel } from '../../../utils/models';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import { featureStoreCreatePage } from '../../../pages/featureStore/featureStoreCreate';

const NAMESPACE = 'test-ns';

const mockProject = () => {
  const project = mockProjectK8sResource({
    k8sName: NAMESPACE,
    displayName: 'Test Project',
  });
  project.metadata.labels = {
    ...project.metadata.labels,
    'opendatahub.io/feast': 'true',
  };
  return project;
};

const initIntercepts = ({ enableAdmin = true }: { enableAdmin?: boolean } = {}) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.FEAST_OPERATOR]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableFeatureStore: false,
      featureStoreAdmin: enableAdmin,
    }),
  );

  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProject()]));

  cy.interceptK8sList({ model: FeatureStoreModel, ns: NAMESPACE }, mockK8sResourceList([]));
};

describe('Feature Store Create Page', () => {
  beforeEach(() => {
    asClusterAdminUser();
    initIntercepts();
  });

  it('should display the create page with the wizard', () => {
    featureStoreCreatePage.visit();
    cy.findByTestId('app-page-title').should('have.text', 'Create feature store');
  });

  it('should show the wizard steps', () => {
    featureStoreCreatePage.visit();
    featureStoreCreatePage.findStepByName('Details').should('exist');
    featureStoreCreatePage.findStepByName('Registry').should('exist');
    featureStoreCreatePage.findStepByName('Online & offline stores').should('exist');
    featureStoreCreatePage.findStepByName('Advanced options').should('exist');
    featureStoreCreatePage.findStepByName('Review').should('exist');
  });

  it('should show the Next button on the first step', () => {
    featureStoreCreatePage.visit();
    featureStoreCreatePage.findNextButton().should('be.visible');
  });

  it('should show the Cancel button', () => {
    featureStoreCreatePage.visit();
    featureStoreCreatePage.findCancelButton().should('be.visible');
  });

  it('should disable the Back button on the first step', () => {
    featureStoreCreatePage.visit();
    featureStoreCreatePage.findBackButton().should('be.disabled');
  });

  it('should navigate back to the previous page when Cancel is clicked', () => {
    cy.visitWithLogin(
      '/develop-train/feature-store/overview?devFeatureFlags=Feature+store+plugin%3Dtrue',
    );
    featureStoreCreatePage.visit();
    featureStoreCreatePage.findCancelButton().click();
    cy.url().should('include', '/feature-store/overview');
  });

  describe('admin flag gating', () => {
    it('should not show the create page when featureStoreAdmin is disabled', () => {
      asClusterAdminUser();
      initIntercepts({ enableAdmin: false });

      cy.visitWithLogin(
        '/develop-train/feature-store/create?devFeatureFlags=Feature+store+plugin%3Dtrue',
      );

      cy.findByTestId('app-page-title').should('not.have.text', 'Create feature store');
    });
  });
});
