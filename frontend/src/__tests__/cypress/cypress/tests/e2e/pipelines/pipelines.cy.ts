import { createOpenShiftProject, deleteOpenShiftProject, applyOpenShiftYaml } from '~/__tests__/cypress/cypress/utils/ocCommands'; 
import { replacePlaceholdersInYaml } from '~/__tests__/cypress/cypress/utils/yaml_files';
import { ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { AWS_PIPELINES_BUCKET } from '~/__tests__/cypress/cypress/utils/s3Buckets';

const projectName = 'test-pipelines-prj';

describe('An admin user can import and run a pipeline', { testIsolation: false }, () => {
  before(() => {
    // Provision a Project
    createOpenShiftProject(projectName).then((result) => {
      expect(result.code).to.eq(0, `ERROR provisioning ${projectName} Project
                                    stdout: ${result.stdout}
                                    stderr: ${result.stderr}`);
    
    
    })
    // Create a pipeline compatible Data Connection
    const replacements = {
      NAMESPACE: projectName,
      AWS_ACCESS_KEY_ID: Buffer.from(AWS_PIPELINES_BUCKET.AWS_ACCESS_KEY_ID).toString('base64'),
      AWS_DEFAULT_REGION: Buffer.from(AWS_PIPELINES_BUCKET.AWS_REGION).toString('base64'),
      AWS_S3_BUCKET: Buffer.from(AWS_PIPELINES_BUCKET.BUCKET_NAME).toString('base64'),
      AWS_S3_ENDPOINT: Buffer.from(AWS_PIPELINES_BUCKET.AWS_ENDPOINT).toString('base64'),
      AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_PIPELINES_BUCKET.AWS_SECRET_ACCESS_KEY).toString('base64')
    };
    cy.fixture('resources/yaml/data_connection.yml').then((yamlContent) => {
      const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, replacements);
      const tempFilePath = 'cypress/temp_data_connection.yaml';
      applyOpenShiftYaml(modifiedYamlContent).then((result) => {
        expect(result.code).to.eq(0, `ERROR applying YAML content\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
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

  it('should login and load page', () => {
    cy.log(Cypress.env());
    cy.visitWithLogin('/', ADMIN_USER);
    cy.findByRole('banner', { name: 'page masthead' }).contains(ADMIN_USER.USERNAME);
  });
});




// import { ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
// import { createOpenShiftProject, deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/ocCommands';

// const projectName = 'test-pipelines-prj';

// describe.only('An admin user can import and run a pipeline', { testIsolation: false }, () => {
//   before(() => {
//     // Provision a Project
//     createOpenShiftProject(projectName).then((result) => {
//       expect(result.code).to.eq(0, 'Failed to provision a Project');
//     });
//     // cy.request('https://api.spacexdata.com/v3/missions').its('body').should('have.length', 10)
//   })

//   after(() => {
//     // Delete provisioned Project
//     deleteOpenShiftProject(projectName).then((result) => {
//       expect(result.code).to.eq(0, 'Project deletion should succeed');
//     });
//   })
  
//   it('should login and load page', () => {
//     cy.visitWithLogin('/');
//     cy.findByRole('banner', { name: 'page masthead' }).contains(ADMIN_USER.USERNAME);
//   });
// });


/**
 * Steps for base test
 * 
 * Before (Provision):
 *  1. Create "test-e2e-pipelines" DS Project if doesn't exist
 *      Name (Mandatory)
 *      Resource Name (Mandatory but can be extracted from the name)
 *      Description
 * oc new-project test-pipelines-prj --display-name 'test-pipelines-prj'
 * 
 * 
 *  2. Create Data Connection if doesn't already exist
 *      Name (Mandatory)
 *      Access Key (Mandatory)
 *      Secret Key (Mandatory)
 *      Endpoint (Mandatory)
 *      Region (Mandatory)
 *      Bucket (Mandatory)
 *  
 *  3. Configure Pipeline Server if it's not already configured
 *      (Using Data Connection)
 * 
 *  TEST:
 *  0. Login as an admin
 *  1. Navigate to "Overview" tab of "test-e2e-pipelines" DS Project
 *  2. Click in "Import pipeline" link
 *  3. Fill "Pipeline name" from "Import pipeline" modal
 *  4. (unrequired) Fill "Pipeline description" from "Import pipeline" modal 
 *  5. Chose "Import by url" in "Import pipeline" modal 
 *  6. Fill with URL (https://raw.githubusercontent.com/red-hat-data-services/ods-ci/master/ods_ci/tests/Resources/Files/pipeline-samples/v2/flip_coin_compiled.yaml) in "Import pipeline" modal 
 *  7. Click "Import pipeline" button  from "Import pipeline" modal 
 *  8. Navigate to "Data Science Pipelines"
 *  9. Click on the kebab button from our created pipeline, and click on Create run
 *  10. Select the experiment "Default"
 *  11. Fill the name
 *  12. (unrequired) Fill the description
 *  13. Click on "Create run" button
 *  14. Wait for the status not to be "Waiting" or "Running" but "Succeeded"
 * 
 * After (Clean-up):
 *  1. Delete"test-e2e-pipelines" DS Project if does exist (Waterfall deletion??)
 */