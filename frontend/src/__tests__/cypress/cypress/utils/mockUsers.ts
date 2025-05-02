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

  cy.interceptK8s('POST', SelfSubjectAccessReviewModel, (req) => {
    const { resourceAttributes } = req.body.spec;
    req.reply(
      mockSelfSubjectAccessReview({
        ...resourceAttributes,
        allowed: evaluateAccess(resourceAttributes, {
          isClusterAdmin,
          isProductAdmin,
          isProjectAdmin,
          isSelfProvisioner,
        }),
      }),
    );
  });

  const evaluateAccess = (
    resourceAttributes: {
      verb: string;
      group?: string;
      resource: string;
      namespace?: string;
    },
    config: UserConfig,
  ): boolean => {
    const { verb, resource, namespace } = resourceAttributes;
    const {
      isClusterAdmin: clusterAdmin,
      isProductAdmin: productAdmin,
      isProjectAdmin: projectAdmin,
      isSelfProvisioner: selfProvisioner,
    } = config;

    const PROJECT_ADMIN_RESOURCES = ['projects', 'rolebindings'];
    const EDIT_VERBS = ['*', 'create', 'delete', 'deletecollection', 'update', 'patch'];

    if (clusterAdmin) {
      Cypress.log({ message: 'Cluster admin can do everything' });
      return true;
    }

    if (resource === 'projectrequests' && selfProvisioner) {
      Cypress.log({ message: 'Self provisioner capabilities grant access to project creation' });
      return true;
    }

    if (resource === 'rolebindings' && !projectAdmin) {
      Cypress.log({ message: 'Users cannot access permissions tab' });
      return false;
    }

    if (PROJECT_ADMIN_RESOURCES.includes(resource) && EDIT_VERBS.includes(verb)) {
      if (projectAdmin) {
        Cypress.log({ message: 'Project admins allowed edit on project resources' });
        return true;
      }
      Cypress.log({ message: 'Project users not allowed to edit project resources' });
      return false;
    }

    if (productAdmin && namespace === 'opendatahub') {
      Cypress.log({
        message:
          'Product admins are getting direct access to resources in the deployment namespace (but importantly, not other projects)',
      });
      return true;
    }

    if (productAdmin && !EDIT_VERBS.includes(verb)) {
      Cypress.log({ message: 'Product admins will be limited to listing resources' });
      return true;
    }

    if (namespace) {
      Cypress.log({ message: 'Everyone else can perform any action within' });
      return true;
    }

    return false;
  };

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
