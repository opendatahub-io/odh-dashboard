import type { DataScienceProjectData, DashboardConfig } from '~/__tests__/cypress/cypress/types';
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

describe('Verify Cluster Storage - Creating, Editing and Deleting', () => {
  let testData: DataScienceProjectData;
  let dashboardConfig: DashboardConfig;
  let projectName: string;
  let pvStorageName: string;
  let pvStorageDescription: string;
  let pvStorageNameEdited: string;

  // Setup: Load test data and ensure clean state
  before(() => {
    // Retrieve the dashboard configuration
    cy.getDashboardConfig().then((config) => {
      dashboardConfig = config as DashboardConfig;
      cy.log('Dashboard Config:', JSON.stringify(dashboardConfig, null, 2));
      const { pvcSize } = dashboardConfig.notebookController;
      cy.log(`Value of PVC Size: ${String(pvcSize)}`);
    });
    return loadDSPFixture('e2e/dataScienceProjects/testClusterStorageCreation.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = testData.projectPVStorageResourceName;
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
    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName);
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
      cy.step(
        `Navigate to the Project list tab and search for ${testData.projectPVStorageResourceName}`,
      );
      projectListPage.navigate();
      projectListPage.filterProjectByName(testData.projectPVStorageResourceName);
      projectListPage.findProjectLink(testData.projectPVStorageResourceName).click();

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
      addClusterStorageModal.findSubmitButton().click();
      clusterStorage.getClusterStorageRow(pvStorageName);

      // Edit the Cluster Storage, amend the name and update
      cy.step('Edit the Cluster Storage and verify edits are successful');
      clusterStorage.findKebabToggle().click();
      clusterStorage.getClusterStorageRow(pvStorageName).findKebabAction('Edit storage').click();
      updateClusterStorageModal.findNameInput().clear();
      updateClusterStorageModal.findNameInput().type(pvStorageNameEdited);
      updateClusterStorageModal.findSubmitButton().click();
      clusterStorage.getClusterStorageRow(pvStorageNameEdited);

      // Delete the Cluster Storage and confirm that the deletion was successful
      cy.step('Delete the Cluster Storage and verify deletion');
      // Note reload is required to ensure that the new edited name is propagated
      cy.reload();
      clusterStorage.findKebabToggle().click();
      clusterStorage.getClusterStorageRow(pvStorageName).findKebabAction('Delete storage').click();
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(pvStorageNameEdited);
      deleteModal.findSubmitButton().should('be.enabled').click();
      clusterStorage.findEmptyState().should('exist');
    },
  );
});
