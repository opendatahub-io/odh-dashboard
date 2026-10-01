import type { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
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
import { asClusterAdminUser, asProjectEditUser } from '../../../utils/mockUsers';
import {
  featureStoreManagePage,
  deleteFeatureStoreModal,
} from '../../../pages/featureStore/featureStoreManage';

const NAMESPACE = 'test-ns';

const mockFeatureStoreCR = (
  overrides: {
    name?: string;
    namespace?: string;
    feastProject?: string;
    phase?: string;
    feastVersion?: string;
    uiLabel?: boolean;
    creationTimestamp?: string;
  } = {},
) => {
  const name = overrides.name ?? 'demo-store';
  const ns = overrides.namespace ?? NAMESPACE;
  return {
    apiVersion: 'feast.dev/v1',
    kind: 'FeatureStore',
    metadata: {
      name,
      namespace: ns,
      uid: `uid-${ns}-${name}`,
      creationTimestamp: overrides.creationTimestamp ?? '2026-01-15T10:30:00Z',
      labels: {
        ...(overrides.uiLabel !== false && { 'feature-store-ui': 'enabled' }),
      },
    },
    spec: {
      feastProject: overrides.feastProject ?? 'credit_scoring',
      services: {
        registry: {
          local: { persistence: { file: { path: '/tmp/registry.pb' } } },
        },
      },
    },
    status: {
      phase: overrides.phase ?? 'Ready',
      feastVersion: overrides.feastVersion ?? '0.41.0',
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
        {
          type: 'Registry',
          status: 'True',
          message: 'Registry deployed successfully',
          lastTransitionTime: '2026-01-15T10:30:30Z',
        },
      ],
    },
  };
};

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

const initIntercepts = ({
  featureStores = [mockFeatureStoreCR()],
  enableAdmin = true,
}: {
  featureStores?: ReturnType<typeof mockFeatureStoreCR>[];
  enableAdmin?: boolean;
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
  ).as('odh-config');

  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProject()]));

  cy.interceptK8sList(
    { model: FeatureStoreModel, ns: NAMESPACE },
    mockK8sResourceList(featureStores),
  );
};

describe('Feature Store Manage Page', () => {
  describe('with feature stores', () => {
    const store1 = mockFeatureStoreCR({
      name: 'store-alpha',
      feastProject: 'alpha_project',
      phase: 'Ready',
      feastVersion: '0.41.0',
      uiLabel: true,
      creationTimestamp: '2026-06-01T09:07:00Z',
    });
    const store2 = mockFeatureStoreCR({
      name: 'store-beta',
      feastProject: 'beta_project',
      phase: 'Installing',
      feastVersion: '0.40.0',
      uiLabel: false,
      creationTimestamp: '2026-06-05T14:30:00Z',
    });

    beforeEach(() => {
      asClusterAdminUser();
      initIntercepts({ featureStores: [store1, store2] });
    });

    it('should display the manage page with a table of feature stores', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findTable().should('be.visible');
      featureStoreManagePage.findRowByName(NAMESPACE, 'store-alpha').should('exist');
      featureStoreManagePage.findRowByName(NAMESPACE, 'store-beta').should('exist');
    });

    it('should show the Create feature store button in the toolbar', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findCreateButton().should('be.visible');
    });

    it('should display status labels for each feature store', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage
        .findRowByName(NAMESPACE, 'store-alpha')
        .should('contain.text', 'Ready');
      featureStoreManagePage
        .findRowByName(NAMESPACE, 'store-beta')
        .should('contain.text', 'Installing');
    });

    it('should display version for each feature store', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage
        .findRowByName(NAMESPACE, 'store-alpha')
        .should('contain.text', '0.41.0');
      featureStoreManagePage
        .findRowByName(NAMESPACE, 'store-beta')
        .should('contain.text', '0.40.0');
    });

    it('should display the Primary label on UI-labeled feature stores', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage
        .findRowByName(NAMESPACE, 'store-alpha')
        .should('contain.text', 'Primary');
      featureStoreManagePage
        .findRowByName(NAMESPACE, 'store-beta')
        .should('not.contain.text', 'Primary');
    });

    it('should link Ready feature store names to the overview page', () => {
      featureStoreManagePage.visit();
      cy.findByTestId(`feature-store-link-${NAMESPACE}-store-alpha`)
        .should('have.attr', 'href')
        .and('include', '/feature-store/overview/alpha_project');
    });

    it('should not link non-Ready feature store names', () => {
      featureStoreManagePage.visit();
      cy.findByTestId(`feature-store-link-${NAMESPACE}-store-beta`).should('not.exist');
    });

    it('should display namespace for each feature store', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage
        .findRowByName(NAMESPACE, 'store-alpha')
        .should('contain.text', NAMESPACE);
    });

    it('should expand a row to show detail summary', () => {
      featureStoreManagePage.visit();
      cy.findByTestId(`feature-store-row-${NAMESPACE}-store-alpha`)
        .findByRole('button', { name: 'Details' })
        .click();

      cy.contains('Feast project').should('be.visible');
      cy.contains('alpha_project').should('be.visible');
      cy.contains('Registry').should('be.visible');
      cy.contains('Local (file: /tmp/registry.pb)').should('be.visible');
    });

    it('should show conditions in the expanded row', () => {
      featureStoreManagePage.visit();
      cy.findByTestId(`feature-store-row-${NAMESPACE}-store-alpha`)
        .findByRole('button', { name: 'Details' })
        .click();

      cy.contains('Conditions').should('be.visible');
      cy.contains('FeatureStore installation complete').should('be.visible');
    });

    it('should show service hostnames in the expanded row', () => {
      featureStoreManagePage.visit();
      cy.findByTestId(`feature-store-row-${NAMESPACE}-store-alpha`)
        .findByRole('button', { name: 'Details' })
        .click();

      cy.contains('Service hostnames').should('be.visible');
      cy.contains(`feast-store-alpha-${NAMESPACE}-registry.${NAMESPACE}.svc:6565`).should(
        'be.visible',
      );
    });

    it('should navigate to the create page when clicking the toolbar Create button', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findCreateButton().click();
      cy.url().should('include', '/feature-store/create');
    });
  });

  describe('empty state', () => {
    beforeEach(() => {
      asClusterAdminUser();
      initIntercepts({ featureStores: [] });
    });

    it('should display an empty state when no feature stores exist', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findEmptyState().should('be.visible');
      cy.contains('No feature stores yet').should('be.visible');
      cy.contains('To get started, create a feature store.').should('be.visible');
    });

    it('should show a Create feature store button in the empty state', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findEmptyStateCreateButton().should('be.visible');
    });

    it('should navigate to the create page when clicking the empty state Create button', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findEmptyStateCreateButton().click();
      cy.url().should('include', '/feature-store/create');
    });
  });

  describe('delete flow', () => {
    beforeEach(() => {
      asClusterAdminUser();
      initIntercepts({ featureStores: [mockFeatureStoreCR({ name: 'deletable-store' })] });
    });

    it('should open the delete modal from the kebab menu', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findKebabAction(NAMESPACE, 'deletable-store', 'Delete').click();
      deleteFeatureStoreModal.shouldBeOpen('deletable-store');
    });

    it('should disable the delete button until the store name is confirmed', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findKebabAction(NAMESPACE, 'deletable-store', 'Delete').click();
      deleteFeatureStoreModal.shouldBeOpen('deletable-store');

      deleteFeatureStoreModal.findDeleteButton().should('be.disabled');
      deleteFeatureStoreModal.typeConfirmation('deletable-store');
      deleteFeatureStoreModal.findDeleteButton().should('not.be.disabled');
    });

    it('should close the modal when cancel is clicked', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findKebabAction(NAMESPACE, 'deletable-store', 'Delete').click();
      deleteFeatureStoreModal.shouldBeOpen('deletable-store');

      deleteFeatureStoreModal.findCancelButton().click();
      cy.findByRole('dialog').should('not.exist');
    });

    it('should successfully delete a feature store', () => {
      cy.interceptK8s(
        'DELETE',
        { model: FeatureStoreModel, ns: NAMESPACE, name: 'deletable-store' },
        { kind: 'Status', apiVersion: 'v1', status: 'Success', code: 200 } as K8sStatus,
      ).as('deleteFeatureStore');

      featureStoreManagePage.visit();
      featureStoreManagePage.findKebabAction(NAMESPACE, 'deletable-store', 'Delete').click();
      deleteFeatureStoreModal.typeConfirmation('deletable-store');
      deleteFeatureStoreModal.findDeleteButton().click();

      cy.wait('@deleteFeatureStore').then((interception) => {
        expect(interception.request.method).to.equal('DELETE');
      });
    });

    it('should display the modal body with correct warning text', () => {
      featureStoreManagePage.visit();
      featureStoreManagePage.findKebabAction(NAMESPACE, 'deletable-store', 'Delete').click();
      deleteFeatureStoreModal.shouldBeOpen('deletable-store');

      cy.findByRole('dialog').should(
        'contain.text',
        'and all of its associated resources will be permanently deleted',
      );
    });
  });

  describe('status badge colors', () => {
    it('should render correct badge colors for Ready, Failed, and Installing phases', () => {
      const readyStore = mockFeatureStoreCR({
        name: 'store-ready',
        feastProject: 'ready_project',
        phase: 'Ready',
      });
      const failedStore = mockFeatureStoreCR({
        name: 'store-failed',
        feastProject: 'failed_project',
        phase: 'Failed',
        uiLabel: false,
      });
      const installingStore = mockFeatureStoreCR({
        name: 'store-installing',
        feastProject: 'installing_project',
        phase: 'Installing',
        uiLabel: false,
      });

      asClusterAdminUser();
      initIntercepts({
        featureStores: [readyStore, failedStore, installingStore],
      });

      featureStoreManagePage.visit();

      featureStoreManagePage
        .findRowByName(NAMESPACE, 'store-ready')
        .findByTestId('status-badge-ready')
        .should('have.text', 'Ready')
        .and('have.class', 'pf-m-green');

      featureStoreManagePage
        .findRowByName(NAMESPACE, 'store-failed')
        .findByTestId('status-badge-failed')
        .should('have.text', 'Failed')
        .and('have.class', 'pf-m-red');

      featureStoreManagePage
        .findRowByName(NAMESPACE, 'store-installing')
        .findByTestId('status-badge-installing')
        .should('have.text', 'Installing')
        .and('have.class', 'pf-m-blue');
    });
  });

  describe('cross-namespace same name', () => {
    it('should display two stores with the same name in different namespaces', () => {
      const ns2 = 'other-ns';
      const project2 = mockProjectK8sResource({
        k8sName: ns2,
        displayName: 'Other Project',
      });
      project2.metadata.labels = {
        ...project2.metadata.labels,
        'opendatahub.io/feast': 'true',
      };

      const store1 = mockFeatureStoreCR({
        name: 'my-store',
        namespace: NAMESPACE,
        feastProject: 'my_store_ns1',
      });
      const store2 = mockFeatureStoreCR({
        name: 'my-store',
        namespace: ns2,
        feastProject: 'my_store_ns2',
        uiLabel: false,
      });

      asClusterAdminUser();

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
          featureStoreAdmin: true,
        }),
      ).as('odh-config');

      cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProject(), project2]));

      cy.interceptK8sList(
        { model: FeatureStoreModel, ns: NAMESPACE },
        mockK8sResourceList([store1]),
      );
      cy.interceptK8sList({ model: FeatureStoreModel, ns: ns2 }, mockK8sResourceList([store2]));

      featureStoreManagePage.visit();

      featureStoreManagePage.findRowByName(NAMESPACE, 'my-store').should('exist');
      featureStoreManagePage.findRowByName(ns2, 'my-store').should('exist');

      featureStoreManagePage.findRowByName(NAMESPACE, 'my-store').should('contain.text', NAMESPACE);
      featureStoreManagePage.findRowByName(ns2, 'my-store').should('contain.text', ns2);
    });
  });

  describe('RBAC viewer', () => {
    const viewerStores = [
      mockFeatureStoreCR({
        name: 'viewer-store',
        feastProject: 'viewer_project',
        phase: 'Ready',
      }),
    ];

    const initViewerIntercepts = () => {
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
          featureStoreAdmin: true,
        }),
      ).as('odh-config');

      cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProject()]));

      cy.interceptK8sList(
        { model: FeatureStoreModel, ns: NAMESPACE },
        mockK8sResourceList(viewerStores),
      );

      // AccessReviewProvider defaults undefined namespace to dashboardNamespace
      // (opendatahub). Allow list (needed by the route gate) but deny
      // create/delete so the RBAC viewer assertions hold.
      cy.interceptK8s('POST', SelfSubjectAccessReviewModel, (req) => {
        const { resourceAttributes } = req.body.spec;
        const allowed =
          resourceAttributes.resource === 'featurestores' && resourceAttributes.verb === 'list';
        req.reply(mockSelfSubjectAccessReview({ ...resourceAttributes, allowed }));
      });
    };

    it('should hide Create button and disable Delete action when user lacks create/delete permissions', () => {
      asProjectEditUser();
      initViewerIntercepts();

      featureStoreManagePage.visit();

      featureStoreManagePage.findTable().should('be.visible');
      featureStoreManagePage.findRowByName(NAMESPACE, 'viewer-store').should('exist');

      cy.findByTestId('create-feature-store-toolbar-btn').should('not.exist');

      featureStoreManagePage
        .findRowByName(NAMESPACE, 'viewer-store')
        .findByRole('button', { name: /kebab toggle/i })
        .click();
      cy.findByRole('menuitem', { name: 'Delete' }).should('have.attr', 'aria-disabled', 'true');
    });

    it('should allow expanding rows even without create/delete permissions', () => {
      asProjectEditUser();
      initViewerIntercepts();

      featureStoreManagePage.visit();

      cy.findByTestId(`feature-store-row-${NAMESPACE}-viewer-store`)
        .findByRole('button', { name: 'Details' })
        .click();

      cy.contains('Feast project').should('be.visible');
      cy.contains('viewer_project').should('be.visible');
    });
  });

  describe('admin flag gating', () => {
    it('should not show the manage page when featureStoreAdmin is disabled', () => {
      asClusterAdminUser();
      initIntercepts({ enableAdmin: false });

      cy.visitWithLogin(
        '/settings/environment-setup/feature-stores?devFeatureFlags=Feature+store+plugin%3Dtrue',
      );

      cy.wait('@odh-config');
      cy.findByTestId('feature-store-list-table').should('not.exist');
      cy.findByTestId('empty-feature-stores').should('not.exist');
    });
  });
});
