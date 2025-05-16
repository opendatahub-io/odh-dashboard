import { mock403Error, mockDashboardConfig, mockStatus } from '~/__mocks__';
import { mockSelfSubjectAccessReview } from '~/__mocks__/mockSelfSubjectAccessReview';
import {
  ODHDashboardConfigModel,
  SelfSubjectAccessReviewModel,
} from '~/__tests__/cypress/cypress/utils/models';
import type { AccessReviewResourceAttributes } from '~/k8sTypes';

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
export const asProjectAdminUser = (options?: {
  isSelfProvisioner?: boolean;
  projects?: string[];
}): void => {
  setUserConfig({ isSelfProvisioner: true, ...options, isProjectAdmin: true });
};

/**
 * Users with project edit access can perform any action except creation of role bindings in specific projects
 * or all projects if none specified.
 */
export const asProjectEditUser = (options?: {
  isSelfProvisioner?: boolean;
  projects?: string[];
}): void => {
  setUserConfig({ isSelfProvisioner: true, ...options, isProjectAdmin: false });
};

export type UserConfig = {
  isClusterAdmin?: boolean;
  isProductAdmin?: boolean;
  isProjectAdmin?: boolean;
  isSelfProvisioner?: boolean;
  projects?: string[];
};

export const getUserConfig = (): UserConfig => Cypress.env('USER_CONFIG');

const setUserConfig = (userConfig: UserConfig = {}, isAllowed = true) => {
  Cypress.env('USER_CONFIG', userConfig);
  const { isClusterAdmin, isProductAdmin } = userConfig;

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
  cy.intercept({ pathname: '/api/k8s/api/*/namespaces/*/*' }, (req) => {
    const [, , , version, , namespace, resource] = req.url.split('/');
    if (
      evaluateAccess(
        {
          verb: 'list',
          resource,
          namespace,
        },
        userConfig,
      )
    ) {
      req.reply(200, {
        apiVersion: version,
        metadata: {},
        items: [],
      });
    } else {
      req.reply(403, mock403Error({}));
    }
  });

  cy.intercept({ pathname: '/api/k8s/apis/*/*/namespaces/*/*' }, (req) => {
    const [, , , api, version, , namespace, resource] = req.url.split('/');
    if (
      evaluateAccess(
        {
          verb: 'list',
          resource,
          namespace,
        },
        userConfig,
      )
    ) {
      req.reply(200, {
        apiVersion: `${api}/${version}`,
        metadata: {},
        items: [],
      });
    } else {
      req.reply(403, mock403Error({}));
    }
  });

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
    resourceAttributes: AccessReviewResourceAttributes,
    config: UserConfig,
  ): boolean => {
    const { verb, resource, namespace } = resourceAttributes;
    const {
      isClusterAdmin: clusterAdmin,
      isProductAdmin: productAdmin,
      isProjectAdmin: projectAdmin,
      isSelfProvisioner: selfProvisioner,
      projects,
    } = config;

    const convertResourceAttrToString = (attr: AccessReviewResourceAttributes): string =>
      `${attr.verb} on ${attr.group ?? ''}/${attr.resource ?? ''}${
        attr.subresource ? `/${attr.subresource}` : ''
      } ${attr.namespace ? `(in ${attr.namespace})` : ''} ${attr.name ? `for ${attr.name}` : ''}`;

    const log = (displayName: string, message: string) => {
      Cypress.log({
        displayName: `${displayName}:`,
        message: `${message}. Details: ${convertResourceAttrToString(resourceAttributes)}`,
      });
    };

    const PROJECT_ADMIN_RESOURCES = ['projects', 'rolebindings'];
    const EDIT_VERBS = ['*', 'create', 'delete', 'deletecollection', 'update', 'patch'];

    if (clusterAdmin) {
      log('Cluster Admin', 'Full access granted');
      return true;
    }

    if (productAdmin) {
      if (namespace === 'opendatahub') {
        log('Product Admin', 'Access to resources in deployment namespace');
        return true;
      }

      if (!EDIT_VERBS.includes(verb)) {
        log('Product Admin', 'Limited to listing resources');
        return true;
      }
    }

    if (resource === 'projectrequests' && selfProvisioner) {
      log('Self Provisioner', 'Grant access to project creation');
      return true;
    }

    if (resource === 'rolebindings' && !projectAdmin) {
      log('Project Users', 'Access denied (requires Project Admin)');
      return false;
    }

    if (PROJECT_ADMIN_RESOURCES.includes(resource ?? '') && EDIT_VERBS.includes(verb)) {
      if (projectAdmin) {
        log('Project Admin', 'Edit access granted');
        return true;
      }
      log('Project Users', 'Edit access denied');
      return false;
    }

    if (namespace) {
      if (namespace === 'opendatahub' && !productAdmin) {
        log('Permission', 'Access denied to opendatahub namespace');
        return false;
      }
      if (projects) {
        log('Permission', 'Access granted within allowed projects');
        return projects.includes(namespace);
      }
      log('Permission', 'Access granted within namespace');
      return true;
    }

    log('Permission', 'No namespace, no access');
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
