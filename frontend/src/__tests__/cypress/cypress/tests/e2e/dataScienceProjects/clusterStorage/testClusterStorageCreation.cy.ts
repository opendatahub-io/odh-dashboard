import type { DataScienceProjectData, DashboardConfig } from '~/__tests__/cypress/cypress/types';
// eslint-disable-next-line no-restricted-syntax
import { DEFAULT_PVC_SIZE } from '~/pages/clusterSettings/const';
import { projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadDSPFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import {
  clusterStorage,
  addClusterStorageModal,
  updateClusterStorageModal,
} from '~/__tests__/cypress/cypress/pages/clusterStorage';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  retryableBefore,
  wasSetupPerformed,
} from '~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('Verify Cluster Storage - Creating, Editing and Deleting', () => {
  let testData: DataScienceProjectData;
  let dashboardConfig: DashboardConfig;
  let projectName: string;
  let pvStorageName: string;
  let pvStorageDescription: string;
  let pvStorageNameEdited: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() => {
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

      const { pvcSize } = dashboardConfig.notebookController;
      cy.log(`Value of PVC Size: ${String(pvcSize)}`);
    });
    return loadDSPFixture('e2e/dataScienceProjects/testClusterStorageCreation.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectPVStorageResourceName}-${uuid}`;
        pvStorageName = testData.pvStorageName;
        pvStorageDescription = testData.pvStorageDescription;
        pvStorageNameEdited = testData.pvStorageNameEdited;
        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Project ${projectName} confirmed to be created and verified successfully`);
      });
  });
  after(() => {
    //Check if the Before Method was executed to perform the setup
    if (!wasSetupPerformed()) return;

    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName, { wait: false });
    }
  });

  it(
    'Create, Edit and Delete a Persistent Volume Storage',
    { tags: ['@Sanity', '@SanitySet1', '@ODS-1824', '@Dashboard'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation and navigate to the Cluster Storage tab
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      //Navigate to Cluster Storage and click to Add Storage
      cy.step('Navigate to Cluster Storage and click to create Cluster Storage');
      projectDetails.findSectionTab('cluster-storages').click();
      clusterStorage.findCreateButton().click();

      // Enter validate Cluster Storage details into the Cluster Storage Modal
      cy.step('Enter valid Cluster Storage details and verify creation');
      addClusterStorageModal.findNameInput().type(pvStorageName);
      addClusterStorageModal.findDescriptionInput().type(pvStorageDescription);
      const numericPvcSize = dashboardConfig.notebookController.pvcSize.replace(/\D/g, '');
      addClusterStorageModal.findPVStorageSizeValue().should('have.value', numericPvcSize);
      addClusterStorageModal.findSubmitButton().click({ force: true });
      clusterStorage.getClusterStorageRow(pvStorageName).find().should('exist');

      // Edit the Cluster Storage, amend the name and update
      cy.step('Edit the Cluster Storage and verify edits are successful');
      clusterStorage.findKebabToggle().click();
      clusterStorage.getClusterStorageRow(pvStorageName).findKebabAction('Edit storage').click();
      updateClusterStorageModal.findNameInput().clear();
      updateClusterStorageModal.findNameInput().type(pvStorageNameEdited);
      updateClusterStorageModal.findSubmitButton().click({ force: true });
      clusterStorage.getClusterStorageRow(pvStorageNameEdited).find().should('exist');

      // Delete the Cluster Storage and confirm that the deletion was successful
      cy.step('Delete the Cluster Storage and verify deletion');
      // Note reload is required to ensure that the new edited name is propagated
      cy.reload();
      clusterStorage.findKebabToggle().click();
      clusterStorage
        .getClusterStorageRow(pvStorageNameEdited)
        .findKebabAction('Delete storage')
        .click({ force: true });
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(pvStorageNameEdited);
      deleteModal.findSubmitButton().should('be.enabled').click();
      clusterStorage.findEmptyState().should('exist');
    },
  );
});
