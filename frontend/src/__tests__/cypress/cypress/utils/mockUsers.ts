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
  const { isClusterAdmin, isProductAdmin, isProjectAdmin } = userConfig;

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
        allowed: evaluateAccess(resourceAttributes, userConfig),
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
      Cypress.log({
        name: 'SSAR Permission Check',
        displayName: 'Cluster Admin:',
        message: 'Full access granted',
        consoleProps: () => {
          return {
            Verb: resourceAttributes.verb,
            Resource: resourceAttributes.resource,
            Namespace: resourceAttributes.namespace,
            Group: resourceAttributes.group,
          };
        },
      });
      return true;
    }

    if (productAdmin) {
      if (namespace === 'opendatahub') {
        Cypress.log({
          name: 'SSAR Permission Check',
          displayName: 'Product Admin:',
          message: 'Access to resources in deployment namespace',
          consoleProps: () => {
            return {
              Verb: resourceAttributes.verb,
              Resource: resourceAttributes.resource,
              Namespace: resourceAttributes.namespace,
              Group: resourceAttributes.group,
            };
          },
        });
        return true;
      }
      if (!EDIT_VERBS.includes(verb)) {
        Cypress.log({
          name: 'SSAR Permission Check',
          displayName: 'Product Admin:',
          message: 'Limited to listing resources',
          consoleProps: () => {
            return {
              Verb: resourceAttributes.verb,
              Resource: resourceAttributes.resource,
              Namespace: resourceAttributes.namespace,
              Group: resourceAttributes.group,
            };
          },
        });
        return true;
      }
    }

    if (resource === 'projectrequests' && selfProvisioner) {
      Cypress.log({
        name: 'SSAR Permission Check',
        displayName: 'Self Provisioner:',
        message: 'Grant access to project creation',
        consoleProps: () => {
          return {
            Verb: resourceAttributes.verb,
            Resource: resourceAttributes.resource,
            Namespace: resourceAttributes.namespace,
            Group: resourceAttributes.group,
          };
        },
      });
      return true;
    }

    if (resource === 'rolebindings' && !projectAdmin) {
      Cypress.log({
        name: 'SSAR Permission Check',
        displayName: 'Project Users:',
        message: 'Access denied (requires Project Admin)',
        consoleProps: () => {
          return {
            Verb: resourceAttributes.verb,
            Resource: resourceAttributes.resource,
            Namespace: resourceAttributes.namespace,
            Group: resourceAttributes.group,
          };
        },
      });
      return false;
    }

    if (PROJECT_ADMIN_RESOURCES.includes(resource) && EDIT_VERBS.includes(verb)) {
      if (projectAdmin) {
        Cypress.log({
          name: 'SSAR Permission Check',
          displayName: 'Project Admin:',
          message: 'Edit access granted',
          consoleProps: () => {
            return {
              Verb: resourceAttributes.verb,
              Resource: resourceAttributes.resource,
              Namespace: resourceAttributes.namespace,
              Group: resourceAttributes.group,
            };
          },
        });
        return true;
      }
      Cypress.log({
        name: 'SSAR Permission Check',
        displayName: 'Project Users:',
        message: 'Edit access denied',
        consoleProps: () => {
          return {
            Verb: resourceAttributes.verb,
            Resource: resourceAttributes.resource,
            Namespace: resourceAttributes.namespace,
            Group: resourceAttributes.group,
          };
        },
      });
      return false;
    }
    if (namespace) {
      if (namespace === 'opendatahub' && !productAdmin) {
        Cypress.log({
          name: 'SSAR Permission Check',
          displayName: 'Permission:',
          message: 'Access denied to opendatahub namespace',
          consoleProps: () => {
            return {
              Verb: resourceAttributes.verb,
              Resource: resourceAttributes.resource,
              Namespace: resourceAttributes.namespace,
              Group: resourceAttributes.group,
            };
          },
        });
        return false;
      }
      Cypress.log({
        name: 'SSAR Permission Check',
        displayName: 'Permission:',
        message: 'Access granted within namespace',
        consoleProps: () => {
          return {
            Verb: resourceAttributes.verb,
            Resource: resourceAttributes.resource,
            Namespace: resourceAttributes.namespace,
            Group: resourceAttributes.group,
          };
        },
      });
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
