import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER } from './e2eUsers';
import {
  dataRegistryProxyResponseTimeoutMs,
  verifyDataRegistryBrowsePageApi,
  waitForDataRegistryProjectCollectionsApi,
} from './api/dataRegistry';
import { ensureAdminOcSession } from './oc_commands/baseCommands';
import { createDataConnectionUri } from './oc_commands/dataConnection';
import {
  addUserToProject,
  deleteOpenShiftProjectBestEffort,
  waitForUserProjectAccess,
} from './oc_commands/project';
import {
  createFeatureStoreCR,
  waitForDataRegistryFeatureStoreReady,
  waitForDataRegistryNamespace,
} from './oc_commands/featureStoreResources';
import { createCleanProject } from './projectChecker';
import dataRegistryPage from '../pages/dataRegistry/dataRegistryPage';
import type { DataConnectionUriReplacements } from '../types';

export type DataRegistryTestContext = {
  testData: Record<string, string>;
  dataRegistryNamespace: string;
};

type DataRegistryTestSetupOptions = {
  projectName: string;
  connectionName?: string;
  onProjectCleanupRequired?: () => void;
};

export type DataRegistryTestCleanup = {
  label: string;
  cleanup?: () => Cypress.Chainable<string | false>;
};

type DataRegistryNavigationOptions = {
  expectedAsset?: string;
  verifyBrowserUser?: boolean;
};

/** Navigates to a project collection and verifies the visible browse page against its API. */
export const navigateToDataRegistry = (
  project: string,
  collection: string,
  options: DataRegistryNavigationOptions = {},
): Cypress.Chainable => {
  const { expectedAsset, verifyBrowserUser = false } = options;
  dataRegistryPage.navigate(project, LDAP_ADMIN_USER);
  dataRegistryPage.selectProject(project);
  return waitForDataRegistryProjectCollectionsApi(project)
    .then(() =>
      verifyDataRegistryBrowsePageApi(project, collection, {
        expectedAsset,
        expectedUser: verifyBrowserUser ? LDAP_ADMIN_USER.USERNAME : undefined,
      }),
    )
    .then(() =>
      dataRegistryPage.findRegistryTable(dataRegistryProxyResponseTimeoutMs).should('be.visible'),
    );
};

/**
 * Creates the per-spec project and prepares the shared Data Registry service and browser session.
 */
export const setupDataRegistryTestProject = ({
  projectName,
  connectionName,
  onProjectCleanupRequired,
}: DataRegistryTestSetupOptions): Cypress.Chainable<DataRegistryTestContext> => {
  let testData: Record<string, string>;
  let dataRegistryNamespace: string;

  const createProjectConnection = (): Cypress.Chainable => {
    if (!connectionName) {
      return cy.wrap(undefined, { log: false });
    }

    cy.step(`Create RHOAI connection/${connectionName} in ${projectName}`);
    const connectionReplacements: DataConnectionUriReplacements = {
      NAMESPACE: projectName,
      MODEL_URI: Buffer.from(`https://example.com/${connectionName}`).toString('base64'),
      CONNECTION_NAME: connectionName,
    };
    return createDataConnectionUri(connectionReplacements);
  };

  return cy
    .wrap(undefined, { log: false })
    .then(() => ensureAdminOcSession())
    .then(() => cy.fixture('e2e/dataRegistry/testDataRegistry.yaml', 'utf8'))
    .then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as Record<string, string>;
      testData.project = projectName;
    })
    .then(() => {
      cy.step(`Create Data Registry project/${projectName}`);
      return createCleanProject(projectName, onProjectCleanupRequired);
    })
    .then(() => {
      cy.step('Grant the administrator access to the test project');
      return addUserToProject(projectName, LDAP_ADMIN_USER.USERNAME, 'admin').then(() =>
        waitForUserProjectAccess(projectName, LDAP_ADMIN_USER.USERNAME),
      );
    })
    .then(() => createProjectConnection())
    .then(() =>
      waitForDataRegistryNamespace().then((namespace) => {
        dataRegistryNamespace = namespace;
      }),
    )
    .then(() => {
      cy.step('Create FeatureStore/data-registry for Data Registry');
      // Keep this cluster-wide service running so other E2E specs can reuse it.
      return createFeatureStoreCR(dataRegistryNamespace, 'data-registry', {
        dataRegistryEnabled: true,
      }).then((created) => {
        if (!created) {
          cy.log(`Reusing shared FeatureStore/data-registry in ${dataRegistryNamespace}`);
        }
        return waitForDataRegistryFeatureStoreReady(dataRegistryNamespace, 'data-registry');
      });
    })
    .then(() => {
      cy.step('Log in as the configured Data Registry test user and open its browse page');
      return navigateToDataRegistry(testData.project, testData.collection, {
        verifyBrowserUser: true,
      });
    })
    .then(() => cy.wrap({ testData, dataRegistryNamespace }, { log: false }));
};

/**
 * Runs the provided artifact cleanup and then deletes the per-spec project, collecting failures
 * while continuing through the remaining cleanup tasks.
 */
export const cleanupDataRegistryTestResources = (
  projectName: string,
  projectCleanupRequired: boolean,
  resourceCleanups: DataRegistryTestCleanup[],
): Cypress.Chainable<void> => {
  const cleanupErrors: string[] = [];
  const cleanupTasks = [
    ...resourceCleanups,
    {
      label: `project ${projectName}`,
      cleanup: projectCleanupRequired
        ? () =>
            deleteOpenShiftProjectBestEffort(projectName).then((result) =>
              result.exitCode === 0
                ? false
                : `oc delete exited ${result.exitCode}: ${result.stderr || result.stdout}`,
            )
        : undefined,
    },
  ].filter(({ cleanup }) => Boolean(cleanup));

  const runCleanup = (index: number): Cypress.Chainable<void> => {
    if (index >= cleanupTasks.length) {
      return cy.wrap(undefined as void, { log: false });
    }

    const { label, cleanup } = cleanupTasks[index];
    if (!cleanup) {
      return runCleanup(index + 1);
    }

    cy.step(`Cleanup ${label}`);
    return cleanup()
      .then((failureMessage) => {
        if (failureMessage) {
          cleanupErrors.push(`${label}: ${failureMessage}`);
          cy.log(`Cleanup failed: ${label}: ${failureMessage}`);
        }
      })
      .then(() => runCleanup(index + 1));
  };

  if (cleanupTasks.length === 0) {
    cy.log('Skipping Data Registry cleanup');
    return cy.wrap(undefined as void, { log: false });
  }

  return ensureAdminOcSession()
    .then(() => runCleanup(0))
    .then(() => {
      if (cleanupErrors.length > 0) {
        throw new Error(`Data Registry cleanup failed:\n${cleanupErrors.join('\n')}`);
      }
    });
};
