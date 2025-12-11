import * as yaml from 'js-yaml';

import { LDAP_CONTRIBUTOR_USER, LDAP_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
// eslint-disable-next-line no-restricted-syntax
import { clusterSettings } from '../../../../pages/clusterSettings';
import { userManagement } from '../../../../pages/userManagement';
import { pageNotfound } from '../../../../pages/pageNotFound';
import { storageClassesPage } from '../../../../pages/storageClasses';
import { notebookImageSettings } from '../../../../pages/notebookImageSettings';
import { hardwareProfile } from '../../../../pages/hardwareProfile';
import { connectionTypesPage } from '../../../../pages/connectionTypes';
import { servingRuntimes } from '../../../../pages/servingRuntimes';
import { modelRegistrySettings } from '../../../../pages/modelRegistrySettings';
import type {
  CommandLineResult,
  DashboardConfig,
  NotebookControllerConfig,
  NotebookControllerCullerConfig,
} from '../../../../types';
import {
  validateModelServingPlatforms,
  validatePVCSize,
  validateStopIdleNotebooks,
  checkUserNotInRHODSUserGroups,
} from '../../../../utils/clusterSettingsUtils';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { applyOpenShiftYaml } from '../../../../utils/oc_commands/baseCommands';
import { replacePlaceholdersInYaml } from '../../../../utils/yaml_files';
import {
  getClusterRoleBinding,
  deleteClusterRoleBinding,
} from '../../../../utils/oc_commands/roleBindings';

// Default PVC size constant (matches frontend/src/pages/clusterSettings/const.ts)
const DEFAULT_PVC_SIZE = 20;

type TestAdminClusterSettingsData = {
  clusterRoleBindingNamePrefix: string;
};

describe('Verify that only the Cluster Admin can access Cluster Settings', () => {
  let dashboardConfig: DashboardConfig;
  let notebookControllerConfig: NotebookControllerConfig;
  let notebookControllerCullerConfig: NotebookControllerCullerConfig | string;
  let testData: TestAdminClusterSettingsData;
  let testUserName: string;
  let clusterRoleBindingName: string;
  let originalClusterRoleBinding: string | null = null;

  retryableBefore(() => {
    // Load test data from fixture first
    return cy
      .fixture('e2e/settings/clusterSettings/testAdminClusterSettings.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as TestAdminClusterSettingsData;
        testUserName = LDAP_CLUSTER_ADMIN_USER.USERNAME;
        clusterRoleBindingName = `${testData.clusterRoleBindingNamePrefix}-${testUserName}-cluster-admin`;
        cy.log(
          `Loaded test data - User: ${testUserName}, ClusterRoleBinding: ${clusterRoleBindingName}`,
        );
      })
      .then(() => {
        // Retrieve the dashboard configuration
        cy.getDashboardConfig().then((config) => {
          dashboardConfig = config as DashboardConfig;
          cy.log('Dashboard Config:', JSON.stringify(dashboardConfig, null, 2));

          // If PVC size is not set, use the default value
          if (!dashboardConfig.notebookController.pvcSize) {
            dashboardConfig.notebookController = {
              ...dashboardConfig.notebookController,
              pvcSize: `${DEFAULT_PVC_SIZE}Gi`,
            };
            cy.log('Using default PVC size:', DEFAULT_PVC_SIZE);
          }
        });

        // Retrieve the Notebook controller configuration
        cy.getNotebookControllerConfig().then((config) => {
          notebookControllerConfig = config as NotebookControllerConfig;
          cy.log('Controller Config:', JSON.stringify(notebookControllerConfig, null, 2));
        });

        // Retrieve the Notebook controller culler configuration
        cy.getNotebookControllerCullerConfig().then((config) => {
          cy.log('Raw Controller Culler Config Response:', JSON.stringify(config));

          if (typeof config === 'object' && config !== null) {
            notebookControllerCullerConfig = config as NotebookControllerCullerConfig;
            cy.log(
              'Controller Culler Config:',
              JSON.stringify(notebookControllerCullerConfig, null, 2),
            );
          } else {
            notebookControllerCullerConfig = config as string;
            cy.log('Controller Culler Config (Error):', config);
          }
        });

        // We are going to use a provisioned user for this test. We are going to set it as a cluster-admin,
        // and after the tests are done, we are going to remove the cluster-admin role.
        // The idea is to check that a cluster-admin user works as a RHOAI Admin user.
        // Check if user is already in allowedGroups or adminGroups
        return checkUserNotInRHODSUserGroups(testUserName)
          .then(() => {
            // Get existing ClusterRoleBinding if it exists (for teardown)
            cy.step('Check for existing ClusterRoleBinding');
            return getClusterRoleBinding(clusterRoleBindingName);
          })
          .then((result: CommandLineResult) => {
            if (result.code === 0 && result.stdout && result.stdout.trim() !== '') {
              originalClusterRoleBinding = result.stdout;
              cy.log('Found existing ClusterRoleBinding, will restore after test');
            }
          })
          .then(() => {
            // Create ClusterRoleBinding to make user cluster-admin
            cy.step('Create ClusterRoleBinding for cluster-admin');
            return cy.fixture('resources/yaml/cluster_role_binding.yaml');
          })
          .then((yamlContent) => {
            const replacements = {
              CLUSTER_ROLE_BINDING_NAME: clusterRoleBindingName,
              USER_NAME: testUserName,
            };
            const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, replacements);
            return applyOpenShiftYaml(modifiedYamlContent);
          })
          .then((result: CommandLineResult) => {
            if (result.code !== 0) {
              throw new Error(`Failed to create ClusterRoleBinding: ${result.stderr}`);
            }
            cy.log('Successfully created ClusterRoleBinding');
          });
      });
  });

  after(() => {
    // Cleanup: Remove the ClusterRoleBinding we created
    cy.step('Cleanup: Remove test ClusterRoleBinding');
    deleteClusterRoleBinding(clusterRoleBindingName).then((result: CommandLineResult) => {
      if (result.code === 0) {
        cy.log('Successfully removed test ClusterRoleBinding');
      }
    });

    // If there was an original ClusterRoleBinding, restore it
    if (originalClusterRoleBinding) {
      cy.step('Restore original ClusterRoleBinding');
      applyOpenShiftYaml(originalClusterRoleBinding).then((result: CommandLineResult) => {
        if (result.code === 0) {
          cy.log('Successfully restored original ClusterRoleBinding');
        }
      });
    }
  });

  it(
    'Admin should access Cluster Settings and see UI fields matching OpenShift configurations',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-1216', '@Dashboard', '@ci-dashboard-set-2'] },
    () => {
      // Authentication and navigation
      cy.step(`Log into the application as ${testUserName}`);
      cy.visitWithLogin('/', LDAP_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Cluster Settings');
      clusterSettings.visit();

      // Validate model serving displays based on OpenShift command to 'get OdhDashboardConfig' to validate configuration
      cy.step('Validate Model Serving Platforms display and are checked');
      validateModelServingPlatforms(dashboardConfig);

      // Validate pvc size based on OpenShift command to 'get OdhDashboardConfig' to validate configuration
      cy.step('Validate PVC Size displays and default displays');
      validatePVCSize(dashboardConfig);

      // Validate Stop idle notebooks based on OpenShift command to 'notebook-controller' to validate configuration
      cy.step('Validate Stop idle notebooks displays and fields are enabled/disabled');
      cy.log('Notebook Controller Culler Config:', JSON.stringify(notebookControllerCullerConfig));
      validateStopIdleNotebooks(notebookControllerCullerConfig);

      // Validate notebook pod tolerations displays based on OpenShift command to 'get OdhDashboardConfig' to validate configuration
      cy.step('Validate Notebook pod tolerations displays and fields are enabled/disabled');
    },
  );

  it(
    'Test User - should not have access rights to view the Cluster Settings tab',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-1216', '@Dashboard'] },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Navigate to the Cluster Settings');
      clusterSettings.visit(false);

      pageNotfound.findPage().should('exist');

      clusterSettings.findNavItem().should('not.exist');
    },
  );

  it(
    'Cluster Admin user can access all Settings pages',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-1688', '@Dashboard'] },
    () => {
      cy.step(`Log into the application as ${testUserName}`);
      cy.visitWithLogin('/', LDAP_CLUSTER_ADMIN_USER);

      cy.step('Verify Cluster Settings is visible in navigation');
      clusterSettings.findNavItem().should('exist').and('be.visible');

      cy.step('Access Settings -> Cluster Settings -> General settings');
      clusterSettings.visit();
      clusterSettings.findSubmitButton().should('exist');

      cy.step('Access Settings -> Cluster Settings -> Storage classes');
      storageClassesPage.visit();
      storageClassesPage.findPageTitle().should('contain', 'Storage classes');

      cy.step('Access Settings -> Environment setup -> Workbench images');
      notebookImageSettings.visit();
      notebookImageSettings.findImportImageButton().should('exist');

      cy.step('Access Settings -> Environment setup -> Hardware profiles');
      hardwareProfile.visit();
      hardwareProfile.findPageTitle().should('exist');

      cy.step('Access Settings -> Environment setup -> Connection types');
      connectionTypesPage.visit();
      connectionTypesPage.findPageTitle().should('exist');

      cy.step('Access Settings -> Model resources and operations -> Serving runtimes');
      servingRuntimes.visit();
      servingRuntimes.findAppTitle().should('exist');

      cy.step('Access Settings -> Model resources and operations -> AI registry settings');
      modelRegistrySettings.visit();
      modelRegistrySettings.findPageTitle().should('contain', 'AI registry settings');

      cy.step('Access Settings -> User management');
      userManagement.visit();
      userManagement.findSubmitButton().should('exist');
    },
  );
});
