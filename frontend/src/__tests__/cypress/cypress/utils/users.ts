import { mockDashboardConfig, mockStatus } from '~/__mocks__';
import { mockSelfSubjectAccessReview } from '~/__mocks__/mockSelfSubjectAccessReview';
import {
  ODHDashboardConfigModel,
  SelfSubjectAccessReviewModel,
} from '~/__tests__/cypress/cypress/utils/models';

// Establish a user before applying any test specific intercepts.

/**
 * Disallowed users have no access to the dashboard.
 */
export const asDisallowedUser = (): void => {
  setUserConfig({}, false);
};

/**
 * Cluster admins have access to perform any action on resource in every project.
 * Cluster admins are also product admins.
 *
 * To be used only for special use cases. eg. listing resources across namespaces
 */
export const asClusterAdminUser = (): void => {
  setUserConfig({ isClusterAdmin: true, isProductAdmin: true });
};

/**
 * Product admins have special access to use dashboard backend admin endpoints.
 */
export const asProductAdminUser = (): void => {
  setUserConfig({ isProductAdmin: true });
};

/**
 * Users with project admin access can perform any action including creation of role bindings in specific projects
 * or all projects if none specified.
 */
export const asProjectAdminUser = (options?: { isSelfProvisioner?: boolean }): void => {
  setUserConfig({ isSelfProvisioner: true, ...options, isProjectAdmin: true });
};

/**
 * Users with project edit access can perform any action except creation of role bindings in specific projects
 * or all projects if none specified.
 */
export const asProjectEditUser = (options?: { isSelfProvisioner?: boolean }): void => {
  setUserConfig({ isSelfProvisioner: true, ...options, isProjectAdmin: false });
};

export type UserConfig = {
  isClusterAdmin?: boolean;
  isProductAdmin?: boolean;
  isProjectAdmin?: boolean;
  isSelfProvisioner?: boolean;
};

export const getUserConfig = (): UserConfig => Cypress.env('USER_CONFIG');

const setUserConfig = (userConfig: UserConfig = {}, isAllowed = true) => {
  Cypress.env('USER_CONFIG', userConfig);
  const { isClusterAdmin, isProductAdmin, isProjectAdmin, isSelfProvisioner } = userConfig;

  // return empty k8s resource list
  cy.intercept(
    { pathname: '/api/k8s/api/*/*' },
    {
      statusCode: isClusterAdmin ? 200 : 403,
      body: {
        apiVersion: 'unknown',
        metadata: {},
        items: [],
      },
    },
  );
  cy.intercept(
    { pathname: '/api/k8s/apis/*/*/*' },
    {
      statusCode: isClusterAdmin ? 200 : 403,
      body: {
        apiVersion: 'unknown',
        metadata: {},
        items: [],
      },
    },
  );

  // return empty k8s resource list for namespaced requests
  cy.intercept(
    { pathname: '/api/k8s/api/*/namespaces/*/*' },
    {
      statusCode: isClusterAdmin || isProjectAdmin || !isProductAdmin ? 403 : 200,
      body: {
        apiVersion: 'unknown',
        metadata: {},
        items: [],
      },
    },
  );
  cy.intercept(
    { pathname: '/api/k8s/apis/*/*/namespaces/*/*' },
    {
      statusCode: isClusterAdmin || isProjectAdmin || !isProductAdmin ? 403 : 200,
      body: {
        apiVersion: 'unknown',
        metadata: {},
        items: [],
      },
    },
  );

  const EDIT_VERBS = ['*', 'create', 'delete', 'deletecollection', 'update', 'patch'];
  cy.interceptK8s('POST', SelfSubjectAccessReviewModel, (req) => {
    const { verb, group, resource, namespace } = req.body.spec.resourceAttributes;
    req.reply(
      mockSelfSubjectAccessReview({
        verb,
        group,
        resource,
        allowed:
          // cluster admin can do everything
          isClusterAdmin
            ? true
            : // self provisioner capabilities grant access to project creation
            resource === 'projectrequests'
            ? isSelfProvisioner
            : // only project admins can create rolebindings
            resource === 'rolebindings' && EDIT_VERBS.includes(verb)
            ? isProjectAdmin
            : // product admins will be limited to listing resources
            isProductAdmin
            ? !EDIT_VERBS.includes(verb)
            : // everyone else can perform any action within
              !!namespace,
      }),
    );
  });

  // default intercepts for all users
  cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
  cy.interceptOdh(
    'GET /api/dashboardConfig/opendatahub/odh-dashboard-config',
    mockDashboardConfig({}),
  );
  cy.interceptK8s(ODHDashboardConfigModel, mockDashboardConfig({}));
  cy.interceptOdh(
    'GET /api/status',
    mockStatus({ isAllowed, isAdmin: isClusterAdmin || isProductAdmin }),
  );
};
