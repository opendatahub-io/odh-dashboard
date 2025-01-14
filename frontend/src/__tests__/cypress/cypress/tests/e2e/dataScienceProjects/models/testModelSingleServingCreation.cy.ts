import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import { provisionProjectForPipelines } from "~/__tests__/cypress/cypress/utils/pipelines";
import { addUserToProject, deleteOpenShiftProject } from "~/__tests__/cypress/cypress/utils/oc_commands/project";
import { loadDSPFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { LDAP_CONTRIBUTOR_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';

let testData: DataScienceProjectData;
let projectName: string;
let contributor: string;
const dspaSecretName = 'dashboard-dspa-secret';

describe('Verify Model Creation and Validation using the UI', () => {
    before(() => {
    return loadDSPFixture('e2e/dataScienceProjects/testModelSingleServingCreation.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = testData.projectSingleModelResourceName;
        contributor = LDAP_CONTRIBUTOR_USER.USERNAME;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        // Create a Project for pipelines
        provisionProjectForPipelines(projectName, dspaSecretName);
        addUserToProject(projectName, contributor, 'edit');
      });
    });
      after(() => {
        // Delete provisioned Project
        deleteOpenShiftProject(projectName);
      });
   
    it('Verify that a Non Admin can Serve and Query a Model using the UI',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-2552', '@Dashboard'] },
    () => {
    // Authentication and navigation
      cy.step(`Log into the application with ${LDAP_CONTRIBUTOR_USER.USERNAME}`);
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

    // Project navigation, add user and provide contributor permissions
    cy.step(
        `Navigate to the Project list tab and search for ${testData.projectSingleModelResourceName}`,
        );
    projectListPage.navigate();
    projectListPage.filterProjectByName(testData.projectSingleModelResourceName);
    projectListPage.findProjectLink(testData.projectSingleModelResourceName).click();
    projectDetails.findSectionTab('Models').click();
    
    });
});