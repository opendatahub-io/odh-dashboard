import { createOpenShiftProject, deleteOpenShiftProject, applyOpenShiftYaml } from '~/__tests__/cypress/cypress/utils/ocCommands'; 
import { replacePlaceholdersInYaml } from '~/__tests__/cypress/cypress/utils/yaml_files';
import { ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { AWS_PIPELINES_BUCKET } from '~/__tests__/cypress/cypress/utils/s3Buckets';

import { homePage } from '~/__tests__/cypress/cypress/pages/home/home';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { pipelineImportModal } from '~/__tests__/cypress/cypress/pages/pipelines/pipelineImportModal';
import { pipelinesGlobal } from '~/__tests__/cypress/cypress/pages/pipelines/pipelinesGlobal';
import { pipelinesSection } from '~/__tests__/cypress/cypress/pages/pipelines/pipelinesSection';
import { pipelinesTable } from '~/__tests__/cypress/cypress/pages/pipelines/pipelinesTable';
import { pipelineRunFilterBar } from '~/__tests__/cypress/cypress/pages/pipelines/pipelineFilterBar';
import { createRunPage } from '~/__tests__/cypress/cypress/pages/pipelines/createRunPage';
import { pipelineRunDetails } from '~/__tests__/cypress/cypress/pages/pipelines/topology';

const projectName = 'test-pipelines-prj';
const dspaSecretName = 'dashboard-dspa-secret';
const allAvailableProjectsText = 'All available projects';
const testPipelineName = 'test-pipelines-pipeline';
const testRunName = 'test-pipelines-run';

describe('An admin user can import and run a pipeline', { testIsolation: false }, () => {
  before(() => {
    // Provision a Project
    createOpenShiftProject(projectName).then((result) => {
      expect(result.code).to.eq(0, `ERROR provisioning ${projectName} Project
                                    stdout: ${result.stdout}
                                    stderr: ${result.stderr}`);
    
    })
    
    // Create a pipeline compatible Data Connection
    const dataConnectionReplacements = {
      NAMESPACE: projectName,
      AWS_ACCESS_KEY_ID: Buffer.from(AWS_PIPELINES_BUCKET.AWS_ACCESS_KEY_ID).toString('base64'),
      AWS_DEFAULT_REGION: Buffer.from(AWS_PIPELINES_BUCKET.AWS_REGION).toString('base64'),
      AWS_S3_BUCKET: Buffer.from(AWS_PIPELINES_BUCKET.BUCKET_NAME).toString('base64'),
      AWS_S3_ENDPOINT: Buffer.from(AWS_PIPELINES_BUCKET.AWS_ENDPOINT).toString('base64'),
      AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_PIPELINES_BUCKET.AWS_SECRET_ACCESS_KEY).toString('base64')
    };
    cy.fixture('resources/yaml/data_connection.yml').then((yamlContent) => {
      const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, dataConnectionReplacements);
      const tempFilePath = 'cypress/temp_data_connection.yaml';
      applyOpenShiftYaml(modifiedYamlContent, tempFilePath).then((result) => {
        expect(result.code).to.eq(0, `ERROR applying YAML content
                                      stdout: ${result.stdout}
                                      stderr: ${result.stderr}`);
      });
    });

    // Configure Pipeline server: Create DSPA Secret
    const dspaSecretReplacements = {
      DSPA_SECRET_NAME: dspaSecretName,
      NAMESPACE: projectName,
      AWS_ACCESS_KEY_ID: Buffer.from(AWS_PIPELINES_BUCKET.AWS_ACCESS_KEY_ID).toString('base64'),
      AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_PIPELINES_BUCKET.AWS_SECRET_ACCESS_KEY).toString('base64')
    };
    cy.fixture('resources/yaml/dspa_secret.yml').then((yamlContent) => {
      const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, dspaSecretReplacements);
      const tempFilePath = 'cypress/temp_dspa_secret.yaml';
      applyOpenShiftYaml(modifiedYamlContent, tempFilePath).then((result) => {
        expect(result.code).to.eq(0, `ERROR applying YAML content
                                      stdout: ${result.stdout}
                                      stderr: ${result.stderr}`);
      });
    });

    // Configure Pipeline server: Create DSPA
    const dspaReplacements = {
      DSPA_SECRET_NAME: dspaSecretName,
      NAMESPACE: projectName,
      AWS_S3_BUCKET: AWS_PIPELINES_BUCKET.BUCKET_NAME
    };
    cy.fixture('resources/yaml/dspa.yml').then((yamlContent) => {
      const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, dspaReplacements);
      const tempFilePath = 'cypress/temp_dspa.yaml';
      applyOpenShiftYaml(modifiedYamlContent, tempFilePath).then((result) => {
        expect(result.code).to.eq(0, `ERROR applying YAML content
                                      stdout: ${result.stdout}
                                      stderr: ${result.stderr}`);
      });
    });
  });
  
  after(() => {
    // Delete provisioned Project
    deleteOpenShiftProject(projectName).then((result) => {
      expect(result.code).to.eq(0, `ERROR deleting ${projectName} Project
                                    stdout: ${result.stdout}
                                    stderr: ${result.stderr}`);
    });
  });

  it('An admin User can Import and Run a Pipeline', () => {

    // Login as an admin
    cy.visitWithLogin('/', ADMIN_USER);
    cy.findByRole('banner', { name: 'page masthead' }).contains(ADMIN_USER.USERNAME);
    
    /** 
     * Import Pipeline by URL from Project Details view
    */
    projectListPage.navigate()

    // Check if "All available projects" is selected in the DS Projects view
    projectListPage.findProjectsTypeDropdown()
      .invoke('text') 
      .then((text) => {
        if (!text.includes(allAvailableProjectsText)) {
          projectListPage.findProjectsTypeDropdown().click()
          projectListPage.findProjectsTypeDropdownByText(allAvailableProjectsText).click()
        }
      });
    
    // Open the project  
    projectListPage.findProjectLink(projectName).click()
    
    // Increasing the timeout to ~2mins so the DSPA can be loaded
    projectDetails.findImportPipelineButton(120000).click();

    // Fill tue Import Pipeline modal
    pipelineImportModal.findPipelineNameInput().type(testPipelineName);
    pipelineImportModal.findPipelineDescriptionInput().type("Pipeline Description");
    pipelineImportModal.findImportPipelineRadio().click();
    pipelineImportModal.findPipelineUrlInput().type("https://raw.githubusercontent.com/red-hat-data-services/ods-ci/master/ods_ci/tests/Resources/Files/pipeline-samples/v2/flip_coin_compiled.yaml");
    // pipelineImportModal.findCancelButton().click();
    pipelineImportModal.submit();

    /** 
     * Run the Pipeline from Data Science Pipelines view
    */
    //Navigate to Data Science Pipelines
    pipelinesGlobal.navigate()  

    //check the selected project is projectName
    pipelinesGlobal.findProjectSelect()
      .invoke('text') 
      .then((text) => {
        if (!text.includes(projectName)) {
          pipelinesGlobal.selectProjectByName(projectName)
        }
    });

    // Expand the pipeline row
    pipelinesTable.expandRowByPipelineName(testPipelineName)

    // Open the create run View using the 'Create run' option from the version kebab
    pipelinesTable.findPipelineVersionRowByVersionName(testPipelineName, testPipelineName).findKebab().click();
    pipelinesTable.findPipelineVersionRowByVersionName(testPipelineName, testPipelineName).findKebabAction('Create run').click();

    //Fill the Create run fields
    createRunPage.findExperimentSelect().click();
    createRunPage.selectExperimentByName('Default');
    createRunPage.fillName(testRunName);
    createRunPage.fillDescription('Run Description');
    createRunPage.findSubmitButton().click();

    //Redirected to the Graph view of the created run
    pipelineRunDetails.expectStatusLabelToBe('Succeeded');

  });
});
