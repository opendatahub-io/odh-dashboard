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
import { featureStoreCreatePage } from '../../../pages/featureStore/featureStoreManage';

const k8sNamespace = 'test-ns';

const initCommonIntercepts = (featureStores: unknown[] = []) => {
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

  cy.intercept('GET', '/api/k8s/apis/feast.dev/v1/namespaces/*/featurestores', {
    items: featureStores,
  });

  cy.intercept('GET', '/api/k8s/api/v1/namespaces/*/secrets', { items: [] });
  cy.intercept('GET', '/api/k8s/api/v1/namespaces/*/configmaps', { items: [] });
};

describe('Feature Store Create Wizard', () => {
  beforeEach(() => {
    asClusterAdminUser();
  });

  describe('Project basics step', () => {
    beforeEach(() => {
      initCommonIntercepts();
      featureStoreCreatePage.visit();
    });

    it('should display the wizard with project basics as the first step', () => {
      featureStoreCreatePage.findProjectNameInput().should('exist');
    });

    it('should have Next button disabled when project name is empty', () => {
      featureStoreCreatePage.findProjectNameInput().clear();
      featureStoreCreatePage.findNextButton().should('be.disabled');
    });

    it('should enable Next button when valid project name and namespace are provided', () => {
      featureStoreCreatePage.findProjectNameInput().clear().type('validstore');
      featureStoreCreatePage.findNextButton().should('not.be.disabled');
    });

    it('should block Next when a duplicate project name is entered', () => {
      const existingStore = mockFeatureStoreCR({
        name: 'existing-store',
        namespace: k8sNamespace,
        feastProject: 'existing_store',
      });
      initCommonIntercepts([existingStore]);
      featureStoreCreatePage.visit();

      featureStoreCreatePage.findProjectNameInput().clear().type('existing_store');
      featureStoreCreatePage.findNextButton().should('be.disabled');
    });
  });

  describe('Registry step — local registry', () => {
    beforeEach(() => {
      initCommonIntercepts();
      featureStoreCreatePage.visit();
      featureStoreCreatePage.findProjectNameInput().clear().type('teststore');
      featureStoreCreatePage.findNextButton().click();
    });

    it('should navigate to registry step', () => {
      cy.contains('Registry server').should('exist');
    });

    it('should have REST API enabled by default', () => {
      featureStoreCreatePage.findRestApiSwitch().should('be.checked');
    });

    it('should block Next when REST API is disabled', () => {
      featureStoreCreatePage.clickRestApiSwitch();
      featureStoreCreatePage.findNextButton().should('be.disabled');
    });

    it('should allow Next when REST API remains enabled and gRPC is toggled off', () => {
      featureStoreCreatePage.clickGrpcSwitch();
      featureStoreCreatePage.findNextButton().should('not.be.disabled');
    });
  });

  describe('Registry step — remote registry (secondary store)', () => {
    const primaryStore = mockFeatureStoreCR({
      name: 'primary-store',
      namespace: k8sNamespace,
      feastProject: 'primary_store',
      labels: { [FEATURE_STORE_UI_LABEL_KEY]: FEATURE_STORE_UI_LABEL_VALUE },
    });

    beforeEach(() => {
      initCommonIntercepts([primaryStore]);
      featureStoreCreatePage.visit();
      featureStoreCreatePage.findProjectNameInput().clear().type('secondarystore');
      featureStoreCreatePage.findNextButton().click();
    });

    it('should auto-select remote registry when a primary store exists', () => {
      cy.findByRole('radio', { name: /remote registry/i }).should('be.checked');
    });

    it('should disable the local registry option', () => {
      cy.findByRole('radio', { name: /local registry/i }).should('be.disabled');
    });

    it('should auto-populate the FeatureStore reference name', () => {
      featureStoreCreatePage.findFeastRefNameInput().should('have.value', 'primary-store');
    });
  });

  describe('Store config step', () => {
    beforeEach(() => {
      initCommonIntercepts();
      featureStoreCreatePage.visit();
      featureStoreCreatePage.findProjectNameInput().clear().type('teststore');
      featureStoreCreatePage.findNextButton().click();
      featureStoreCreatePage.findNextButton().click();
    });

    it('should navigate to online & offline stores step', () => {
      cy.contains('Online store').should('exist');
    });

    it('should have offline store toggle', () => {
      featureStoreCreatePage.findOfflineStoreSwitch().should('exist');
    });
  });

  describe('Advanced step', () => {
    beforeEach(() => {
      initCommonIntercepts();
      featureStoreCreatePage.visit();
      featureStoreCreatePage.findProjectNameInput().clear().type('teststore');
      featureStoreCreatePage.findNextButton().click();
      featureStoreCreatePage.findNextButton().click();
      featureStoreCreatePage.findNextButton().click();
    });

    it('should navigate to advanced options step', () => {
      cy.contains('Authorization').should('exist');
    });
  });

  describe('Review step', () => {
    beforeEach(() => {
      initCommonIntercepts();
      featureStoreCreatePage.visit();
      featureStoreCreatePage.findProjectNameInput().clear().type('teststore');
      featureStoreCreatePage.findNextButton().click();
      featureStoreCreatePage.findNextButton().click();
      featureStoreCreatePage.findNextButton().click();
      featureStoreCreatePage.findNextButton().click();
    });

    it('should navigate to review step and show summary', () => {
      cy.contains('Review').should('exist');
      cy.contains('teststore').should('exist');
    });

    it('should show submit button on final step', () => {
      featureStoreCreatePage.findSubmitButton().should('exist');
      featureStoreCreatePage.findSubmitButton().should('contain.text', 'Create feature store');
    });

    it('should submit the form successfully', () => {
      cy.intercept('POST', '/api/k8s/apis/feast.dev/v1/namespaces/*/featurestores', {
        statusCode: 201,
        body: mockFeatureStoreCR({ name: 'teststore', namespace: k8sNamespace }),
      }).as('createFeatureStore');

      featureStoreCreatePage.findSubmitButton().click();
      cy.wait('@createFeatureStore');
    });

    it('should display an error when creation fails', () => {
      cy.intercept('POST', '/api/k8s/apis/feast.dev/v1/namespaces/*/featurestores', {
        statusCode: 409,
        body: {
          kind: 'Status',
          apiVersion: 'v1',
          status: 'Failure',
          message: 'featurestores.feast.dev "teststore" already exists',
          reason: 'AlreadyExists',
          code: 409,
        },
      }).as('createFeatureStoreFail');

      featureStoreCreatePage.findSubmitButton().click();
      cy.wait('@createFeatureStoreFail');
      cy.contains('Failed to create feature store').should('exist');
    });
  });
});
