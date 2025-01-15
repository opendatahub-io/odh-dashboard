import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import { provisionProjectForPipelines } from "~/__tests__/cypress/cypress/utils/pipelines";
import { addUserToProject, deleteOpenShiftProject } from "~/__tests__/cypress/cypress/utils/oc_commands/project";
import { loadDSPFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { LDAP_CONTRIBUTOR_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { modelServingGlobal } from '~/__tests__/cypress/cypress/pages/modelServing';
import { AWS_BUCKETS } from '~/__tests__/cypress/cypress/utils/s3Buckets';
import { cypressEnv } from '~/__tests__/cypress/cypress/utils/testConfig';
const { AWS_PIPELINES } = cypressEnv;

let testData: DataScienceProjectData;
let projectName: string;
let contributor: string;
const dspaSecretName = 'dashboard-dspa-secret';
const awsBucket = 'BUCKET_3' as const;

describe('Verify Model Creation and Validation using the UI', () => {
    before(() => {
      cy.log(`bucketKey: ${awsBucket}`);
    cy.log(`AWS_PIPELINES: ${JSON.stringify(AWS_PIPELINES)}`);
    cy.log(`bucketConfig: ${JSON.stringify(AWS_PIPELINES[awsBucket])}`);


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
        provisionProjectForPipelines(projectName, dspaSecretName, awsBucket);
        addUserToProject(projectName, contributor, 'edit');
      });
    });
      // after(() => {
      //   // Delete provisioned Project
      //   deleteOpenShiftProject(projectName);
      // });
   
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
    projectDetails.findSectionTab('model-server').click();
    cy.get('[data-testid="single-serving-select-button"]').click();
    //cy.get('[data-testid="deploy-button"]').click();
    modelServingGlobal.findDeployModelButton().click();
    
    });
});