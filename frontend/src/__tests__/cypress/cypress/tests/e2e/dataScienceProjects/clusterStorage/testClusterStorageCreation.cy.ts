import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadDSPFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import {
  clusterStorage,
  addClusterStorageModal,
} from '~/__tests__/cypress/cypress/pages/clusterStorage';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';

describe('Verify Cluster Storage - Creation and Deletion', () => {
  let testData: DataScienceProjectData;
  let projectName: string;
  let pvStorageName: string;
  let pvStorageDescription: string;

  // Setup: Load test data and ensure clean state
  before(() => {
    return loadDSPFixture('e2e/dataScienceProjects/testClusterStorageCreation.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = testData.projectPVStorageResourceName;
        pvStorageName = testData.pvStorageName;
        pvStorageDescription = testData.pvStorageDescription;
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
    'Create and Delete a Persistent Volume Storage',
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
      addClusterStorageModal.findSubmitButton().click();
      clusterStorage.getClusterStorageRow(pvStorageName);

      // Delete the DCluster Storage and confirm that the deletion was successful
      cy.step('Delete the Cluster Storage and verify deletion');
      clusterStorage.findKebabToggle().click();
      clusterStorage.getClusterStorageRow(pvStorageName).findKebabAction('Delete storage').click();
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(pvStorageName);
      deleteModal.findSubmitButton().should('be.enabled').click();
      clusterStorage.findEmptyState().should('exist');
    },
  );
});
