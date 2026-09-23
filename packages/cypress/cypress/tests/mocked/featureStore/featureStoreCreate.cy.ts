import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockSelfSubjectAccessReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectAccessReview';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import {
  FeatureStoreModel,
  ProjectModel,
  SelfSubjectAccessReviewModel,
} from '../../../utils/models';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import { featureStoreCreatePage } from '../../../pages/featureStore/featureStoreCreate';

const NAMESPACE = 'test-ns';
const OTHER_NAMESPACE = 'other-ns';

const mockFeatureStoreCR = (
  overrides: {
    name?: string;
    namespace?: string;
    feastProject?: string;
    phase?: string;
    uiLabel?: boolean;
  } = {},
) => {
  const name = overrides.name ?? 'existing-store';
  const ns = overrides.namespace ?? NAMESPACE;
  return {
    apiVersion: 'feast.dev/v1',
    kind: 'FeatureStore',
    metadata: {
      name,
      namespace: ns,
      uid: `uid-${name}`,
      creationTimestamp: '2026-01-15T10:30:00Z',
      labels: {
        ...(overrides.uiLabel ? { 'feature-store-ui': 'enabled' } : {}),
      },
    },
    spec: {
      feastProject: overrides.feastProject ?? name,
      services: {
        registry: {
          local: { persistence: { file: { path: '/tmp/registry.pb' } } },
        },
      },
    },
    status: {
      phase: overrides.phase ?? 'Ready',
      feastVersion: '0.41.0',
      serviceHostnames: {
        registry: `feast-${name}-${ns}-registry.${ns}.svc:6565`,
      },
      conditions: [
        {
          type: 'Ready',
          status: 'True',
          message: 'FeatureStore installation complete',
          lastTransitionTime: '2026-01-15T10:31:00Z',
        },
      ],
    },
  };
};

const mockProject = (k8sName = NAMESPACE, displayName = 'Test Project', feastLabeled = true) => {
  const project = mockProjectK8sResource({
    k8sName,
    displayName,
  });
  project.metadata.labels = {
    ...project.metadata.labels,
    ...(feastLabeled ? { 'opendatahub.io/feast': 'true' } : {}),
  };
  return project;
};

const initIntercepts = ({
  enableAdmin = true,
  existingStores = [] as ReturnType<typeof mockFeatureStoreCR>[],
}: {
  enableAdmin?: boolean;
  existingStores?: ReturnType<typeof mockFeatureStoreCR>[];
} = {}) => {
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

  // Two projects so SimpleSelect does not auto-select and disable the namespace toggle.
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProject(), mockProject(OTHER_NAMESPACE, 'Other Project', false)]),
  );

  cy.interceptK8sList(
    { model: FeatureStoreModel, ns: NAMESPACE },
    mockK8sResourceList(existingStores),
  );
  cy.interceptK8sList({ model: FeatureStoreModel, ns: OTHER_NAMESPACE }, mockK8sResourceList([]));

  cy.interceptK8s('POST', SelfSubjectAccessReviewModel, (req) => {
    const { resourceAttributes } = req.body.spec;
    req.reply(mockSelfSubjectAccessReview({ ...resourceAttributes, allowed: true }));
  });
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

  describe('step validation gating', () => {
    it('should disable Next when name is empty and enable it when a valid name and namespace are provided', () => {
      featureStoreCreatePage.visit();

      featureStoreCreatePage.findNextButton().should('be.disabled');

      featureStoreCreatePage.fillProjectName('my-store');
      featureStoreCreatePage.selectNamespace(NAMESPACE);

      featureStoreCreatePage.findNextButton().should('not.be.disabled');
    });

    it('should disable Next when name contains invalid characters', () => {
      featureStoreCreatePage.visit();

      featureStoreCreatePage.fillProjectName('INVALID_NAME!');
      featureStoreCreatePage.selectNamespace(NAMESPACE);

      featureStoreCreatePage.findProjectNameError().should('exist');
      featureStoreCreatePage.findNextButton().should('be.disabled');
    });
  });

  describe('duplicate name detection', () => {
    it('should show an error and disable Next when typing an existing feature store name', () => {
      asClusterAdminUser();
      initIntercepts({
        existingStores: [
          mockFeatureStoreCR({ name: 'existing-proj', feastProject: 'existing-proj' }),
        ],
      });

      featureStoreCreatePage.visit();

      featureStoreCreatePage.fillProjectName('existing-proj');
      featureStoreCreatePage.selectNamespace(NAMESPACE);

      featureStoreCreatePage.findProjectNameError().should('exist');
      cy.contains('A feature store with this name already exists.').should('be.visible');
      featureStoreCreatePage.findNextButton().should('be.disabled');
    });
  });

  describe('secondary store auto-config', () => {
    it('should auto-select remote registry and pre-fill feastRef when a primary store exists', () => {
      const primaryStore = mockFeatureStoreCR({
        name: 'primary-store',
        feastProject: 'primary-project',
        uiLabel: true,
      });

      asClusterAdminUser();
      initIntercepts({ existingStores: [primaryStore] });

      featureStoreCreatePage.visit();

      featureStoreCreatePage.fillProjectName('secondary-store');
      featureStoreCreatePage.selectNamespace(NAMESPACE);
      featureStoreCreatePage.clickNext();

      featureStoreCreatePage.findRegistryTypeRadio('remote').should('be.checked');
      featureStoreCreatePage.findRegistryTypeRadio('local').should('be.disabled');

      featureStoreCreatePage.findFeastRefNameInput().should('have.value', 'primary-store');
    });
  });

  describe('happy path submit', () => {
    it('should fill all steps and submit the form successfully', () => {
      const createdCR = mockFeatureStoreCR({
        name: 'my-new-store',
        feastProject: 'my-new-store',
      });

      cy.interceptK8s('POST', { model: FeatureStoreModel, ns: NAMESPACE }, createdCR).as(
        'createFeatureStore',
      );

      featureStoreCreatePage.visit();

      featureStoreCreatePage.fillProjectName('my-new-store');
      featureStoreCreatePage.selectNamespace(NAMESPACE);
      featureStoreCreatePage.clickNext();

      featureStoreCreatePage.findStepByName('Registry').should('have.attr', 'aria-current', 'step');
      featureStoreCreatePage.clickNext();

      featureStoreCreatePage
        .findStepByName('Online & offline stores')
        .should('have.attr', 'aria-current', 'step');
      featureStoreCreatePage.clickNext();

      featureStoreCreatePage
        .findStepByName('Advanced options')
        .should('have.attr', 'aria-current', 'step');
      featureStoreCreatePage.clickNext();

      featureStoreCreatePage.findStepByName('Review').should('have.attr', 'aria-current', 'step');

      featureStoreCreatePage.findSubmitButton().should('not.be.disabled');
      featureStoreCreatePage.findSubmitButton().click();

      cy.wait('@createFeatureStore').then((interception) => {
        expect(interception.request.body).to.have.nested.property(
          'spec.feastProject',
          'my-new-store',
        );
        expect(interception.request.body).to.have.nested.property('metadata.namespace', NAMESPACE);
      });

      cy.url().should('include', '/create/deploy/');
    });
  });
});
