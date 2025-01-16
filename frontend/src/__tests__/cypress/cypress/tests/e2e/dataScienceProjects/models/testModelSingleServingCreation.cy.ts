import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import { provisionProjectForPipelines } from "~/__tests__/cypress/cypress/utils/pipelines";
import { addUserToProject, deleteOpenShiftProject } from "~/__tests__/cypress/cypress/utils/oc_commands/project";
import { loadDSPFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { LDAP_CONTRIBUTOR_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { modelServingGlobal, createServingRuntimeModal, modelServingSection, inferenceServiceModal } from '~/__tests__/cypress/cypress/pages/modelServing';
import { AWS_BUCKETS } from '~/__tests__/cypress/cypress/utils/s3Buckets';
import { cypressEnv } from '~/__tests__/cypress/cypress/utils/testConfig';
import { ServingRuntimeModel } from '~/api';
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
        provisionProjectForPipelines(projectName, dspaSecretName, awsBucket, 'resources/yaml/data_connection_model_serving.yaml');
        addUserToProject(projectName, contributor, 'edit');
      });
    });
      //  after(() => {
      //    // Delete provisioned Project
      //    deleteOpenShiftProject(projectName);
       //});
   
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
    modelServingGlobal.findSingleServingModelButton().click();
    modelServingGlobal.findDeployModelButton().click();
    inferenceServiceModal.findModelNameInput().type('test-model1234');


      // Click on <button> "Caikit TGIS ServingRuntim..."
  cy.get('[data-testid="serving-runtime-template-selection"]').click();

  // Click on <span> "OpenVINO Model Server"
  cy.get('.pf-v6-c-menu__list-item:nth-child(1) .pf-v6-c-truncate__start').click();

    //not working
    //createServingRuntimeModal.findServingRuntimeTemplateDropdown().click();
    //createServingRuntimeModal.findServingRuntimeTemplateDropdown().findSelectOption('Caikit Standalone ServingRuntime for KServe').click(); 

    inferenceServiceModal.findLocationPathInput().type('flan-t5-small/flan-t5-small-caikit');

    //cy.get('.pf-v6-c-action-list__item:nth-child(1)').click();
    inferenceServiceModal.findSubmitButton().click();
    
    cy.get('[data-testid="status-tooltip"]').click();
    cy.contains('Loaded', { timeout: 120000 }).should('be.visible');

    //locator('[data-testid="status-tooltip"]').click();
    //getByText('Loaded').should('be.visible')(120000);
    // const inferenceServiceRow = modelServingSection.getInferenceServiceRow('test-model1234');
    // inferenceServiceRow.findStatusTooltip().should('be.visible');
    // inferenceServiceRow.findStatusTooltipValue('Loaded', 120000);
    
    });
});