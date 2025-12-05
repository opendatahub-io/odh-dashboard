import * as yaml from 'js-yaml';

import { LDAP_CONTRIBUTOR_USER, LDAP_USER_10 } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
// eslint-disable-next-line no-restricted-syntax
import { DEFAULT_PVC_SIZE } from '#~/pages/clusterSettings/const';
import { clusterSettings } from '#~/__tests__/cypress/cypress/pages/clusterSettings';
import { userManagement } from '#~/__tests__/cypress/cypress/pages/userManagement';
import { pageNotfound } from '#~/__tests__/cypress/cypress/pages/pageNotFound';
import { storageClassesPage } from '#~/__tests__/cypress/cypress/pages/storageClasses';
import { notebookImageSettings } from '#~/__tests__/cypress/cypress/pages/notebookImageSettings';
import { hardwareProfile } from '#~/__tests__/cypress/cypress/pages/hardwareProfile';
import { connectionTypesPage } from '#~/__tests__/cypress/cypress/pages/connectionTypes';
import { servingRuntimes } from '#~/__tests__/cypress/cypress/pages/servingRuntimes';
import { modelRegistrySettings } from '#~/__tests__/cypress/cypress/pages/modelRegistrySettings';
import type {
  CommandLineResult,
  DashboardConfig,
  NotebookControllerConfig,
  NotebookControllerCullerConfig,
} from '#~/__tests__/cypress/cypress/types';
import {
  validateModelServingPlatforms,
  validatePVCSize,
  validateStopIdleNotebooks,
} from '#~/__tests__/cypress/cypress/utils/clusterSettingsUtils';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { applyOpenShiftYaml } from '#~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';
import { replacePlaceholdersInYaml } from '#~/__tests__/cypress/cypress/utils/yaml_files';

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
        testUserName = LDAP_USER_10.USERNAME;
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
        cy.step('Check if user is in RHODS user groups');
        cy.exec(`oc get OdhDashboardConfig -A -o json | jq -r '.items[].spec.groupsConfig'`).then(
          (result: CommandLineResult) => {
            if (result.code === 0 && result.stdout && result.stdout.trim() !== '') {
              try {
                const groupsConfig = JSON.parse(result.stdout);
                const allowedGroups = groupsConfig.allowedGroups || [];
                const adminGroups = groupsConfig.adminGroups || [];

                cy.log(`Allowed Groups: ${JSON.stringify(allowedGroups)}`);
                cy.log(`Admin Groups: ${JSON.stringify(adminGroups)}`);

                // Check if user's groups are in the lists
                cy.exec(
                  `oc get user ${testUserName} -o jsonpath='{.groups[*]}' --ignore-not-found`,
                  {
                    failOnNonZeroExit: false,
                  },
                ).then((userGroupsResult: CommandLineResult) => {
                  if (userGroupsResult.code === 0 && userGroupsResult.stdout) {
                    const userGroups = userGroupsResult.stdout.trim().split(/\s+/).filter(Boolean);
                    cy.log(`User groups: ${JSON.stringify(userGroups)}`);

                    // Verify user is not in allowedGroups or adminGroups
                    const isInAllowedGroups = userGroups.some((group) =>
                      allowedGroups.includes(group),
                    );
                    const isInAdminGroups = userGroups.some((group) => adminGroups.includes(group));

                    if (isInAllowedGroups || isInAdminGroups) {
                      throw new Error(
                        `User ${testUserName} is already in allowedGroups or adminGroups. Cannot proceed with test.`,
                      );
                    }
                  }
                });
              } catch (error) {
                cy.log('Could not parse groupsConfig, continuing with test');
              }
            }
          },
        );

        // Get existing ClusterRoleBinding if it exists (for teardown)
        cy.step('Check for existing ClusterRoleBinding');
        cy.exec(`oc get clusterrolebinding ${clusterRoleBindingName} -o json --ignore-not-found`, {
          failOnNonZeroExit: false,
        }).then((result: CommandLineResult) => {
          if (result.code === 0 && result.stdout && result.stdout.trim() !== '') {
            originalClusterRoleBinding = result.stdout;
            cy.log('Found existing ClusterRoleBinding, will restore after test');
          }
        });

        // Create ClusterRoleBinding to make user cluster-admin
        cy.step('Create ClusterRoleBinding for cluster-admin');
        cy.fixture('resources/yaml/cluster_role_binding.yaml').then((yamlContent) => {
          const replacements = {
            CLUSTER_ROLE_BINDING_NAME: clusterRoleBindingName,
            USER_NAME: testUserName,
          };
          const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, replacements);
          return applyOpenShiftYaml(modifiedYamlContent).then((result: CommandLineResult) => {
            if (result.code !== 0) {
              throw new Error(`Failed to create ClusterRoleBinding: ${result.stderr}`);
            }
            cy.log('Successfully created ClusterRoleBinding');
          });
        });
      });
  });

  after(() => {
    // Cleanup: Remove the ClusterRoleBinding we created
    cy.step('Cleanup: Remove test ClusterRoleBinding');
    cy.exec(`oc delete clusterrolebinding ${clusterRoleBindingName} --ignore-not-found`, {
      failOnNonZeroExit: false,
    }).then((result: CommandLineResult) => {
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
      cy.visitWithLogin('/', LDAP_USER_10);

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
    'Cluster Admin user (not in RHODS groups) can access all Settings pages',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-XXXX', '@Dashboard'] },
    () => {
      cy.step(`Log into the application as ${testUserName}`);
      cy.visitWithLogin('/', LDAP_USER_10);

      cy.step('Verify Cluster Settings is visible in navigation');
      clusterSettings.findNavItem().should('exist').and('be.visible');

      cy.step('Access Settings -> Cluster Settings -> General settings');
      clusterSettings.visit();
      clusterSettings.findSubmitButton().should('exist');

      cy.step('Access Settings -> Cluster Settings -> Storage classes');
      storageClassesPage.visit();
      cy.findByTestId('app-page-title').should('contain', 'Storage classes');

      cy.step('Access Settings -> Environment setup -> Workbench images');
      notebookImageSettings.visit();
      notebookImageSettings.findImportImageButton().should('exist');

      cy.step('Access Settings -> Environment setup -> Hardware profiles');
      hardwareProfile.visit();
      cy.findByTestId('app-page-title').should('exist');

      cy.step('Access Settings -> Environment setup -> Connection types');
      connectionTypesPage.visit();
      cy.findByTestId('app-page-title').should('exist');

      cy.step('Access Settings -> Model resources and operations -> Serving runtimes');
      servingRuntimes.visit();
      servingRuntimes.findAppTitle().should('exist');

      cy.step('Access Settings -> Model resources and operations -> AI registry settings');
      modelRegistrySettings.visit();
      cy.findByTestId('app-page-title').should('contain', 'AI registry settings');

      cy.step('Access Settings -> User management');
      userManagement.visit();
      userManagement.findSubmitButton().should('exist');
    },
  );
});
