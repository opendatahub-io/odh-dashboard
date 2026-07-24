/* eslint-disable camelcase */
import { buildMockPipeline, buildMockPipelineVersion } from '@odh-dashboard/internal/__mocks__';
import { DSPipelineAPIServerStore } from '@odh-dashboard/internal/k8sTypes.ts';
import {
  projectName,
  initialMockPipeline,
  initialMockPipelineVersion,
  initIntercepts,
} from './pipelinesTestUtils';
import {
  pipelinesGlobal,
  pipelinesTable,
  pipelineImportModal,
  pipelineVersionImportModal,
  pipelineDetails,
} from '../../../pages/pipelines';
import { verifyRelativeURL } from '../../../utils/url';
import { argoAlert } from '../../../pages/pipelines/argoAlert';

const pipelineYamlPath = './cypress/tests/mocked/pipelines/mock-upload-pipeline.yaml';
const argoWorkflowPipeline = './cypress/tests/mocked/pipelines/argo-workflow-pipeline.yaml';
const tooLargePipelineYAMLPath = './cypress/tests/mocked/pipelines/not-a-pipeline-2-megabytes.yaml';
const v1PipelineYamlPath = './cypress/tests/mocked/pipelines/v1-pipeline.yaml';

describe('Pipeline Import and Upload', () => {
  it('imports a new pipeline', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    const uploadPipelineParams = {
      display_name: 'New pipeline',
      name: 'New pipeline',
      description: 'New pipeline description',
    };
    const uploadedMockPipeline = buildMockPipeline(uploadPipelineParams);

    // Intercept upload/re-fetch of pipelines
    pipelineImportModal.mockUploadPipeline(uploadPipelineParams, projectName).as('uploadPipeline');
    pipelinesTable.mockGetPipelines([initialMockPipeline], projectName);
    pipelinesTable.mockGetPipelineVersions(
      [initialMockPipelineVersion],
      'new-pipeline',
      projectName,
    );

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Import pipeline" modal
    pipelinesGlobal.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName(initialMockPipeline.display_name);
    cy.findByTestId('duplicate-name-help-text').should('be.visible');
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.fillPipelineDescription('New pipeline description');
    pipelineImportModal.uploadPipelineYaml(pipelineYamlPath);
    pipelinesTable
      .mockGetPipelines([initialMockPipeline, uploadedMockPipeline], projectName)
      .as('refreshPipelines');
    pipelineDetails.mockGetPipeline(projectName, uploadedMockPipeline).as('getPipeline');
    pipelineDetails
      .mockGetPipelineVersion(
        uploadedMockPipeline.pipeline_id,
        initialMockPipelineVersion,
        projectName,
      )
      .as('getPipelineVersion');
    pipelineImportModal.submit();

    // Wait for pipeline upload
    cy.wait('@uploadPipeline').then((interception) => {
      // Note: contain is used instead of equals as different browser engines will add a different boundary
      // to the body - the aim is to not limit these tests to working with one specific engine.
      expect(interception.request.body).to.contain(
        'Content-Disposition: form-data; name="uploadfile"; filename="uploadedFile.yml"',
      );
      expect(interception.request.body).to.contain('Content-Type: application/x-yaml');
      expect(interception.request.body).to.contain('test-yaml-pipeline-content');

      expect(interception.request.query).to.eql({
        name: 'New pipeline',
        display_name: 'New pipeline',
        description: 'New pipeline description',
      });
    });

    cy.wait('@refreshPipelines');
    cy.wait('@getPipeline');
    cy.wait('@getPipelineVersion');

    verifyRelativeURL(
      `/develop-train/pipelines/definitions/${projectName}/${uploadedMockPipeline.pipeline_id}/${initialMockPipelineVersion.pipeline_version_id}/view`,
    );
  });

  it('imports a new pipeline to be stored as kubernetes resource', () => {
    initIntercepts({
      pipelineStore: DSPipelineAPIServerStore.KUBERNETES,
    });

    pipelinesGlobal.visit(projectName);
    const uploadPipelineParams = {
      display_name: 'New pipeline',
      name: 'new-pipeline',
      description: 'New pipeline description',
    };
    const uploadedMockPipeline = buildMockPipeline(uploadPipelineParams);

    // Intercept upload/re-fetch of pipelines
    pipelineImportModal.mockUploadPipeline(uploadPipelineParams, projectName).as('uploadPipeline');
    pipelinesTable.mockGetPipelines([initialMockPipeline], projectName);
    pipelinesTable.mockGetPipelineVersions(
      [initialMockPipelineVersion],
      'new-pipeline',
      projectName,
    );

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Import pipeline" modal
    pipelinesGlobal.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    // Instead of just Name/Desc field, there is now display/resource name and desc due to k8s pipeline store
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName(initialMockPipeline.display_name);
    pipelineImportModal.fillPipelineName('New pipeline');

    pipelineImportModal.findPipelineResourceNameInput().should('not.exist');
    pipelineImportModal.findPipelineEditResourceNameButton().should('exist');

    // change default generate resource name
    pipelineImportModal.findPipelineEditResourceNameButton().click();
    pipelineImportModal.fillPipelineResourceName('new-pipeline-resource');

    pipelineImportModal.fillPipelineDescription('New pipeline description');
    pipelineImportModal.uploadPipelineYaml(pipelineYamlPath);
    pipelinesTable
      .mockGetPipelines([initialMockPipeline, uploadedMockPipeline], projectName)
      .as('refreshPipelines');
    pipelineDetails.mockGetPipeline(projectName, uploadedMockPipeline).as('getPipeline');
    pipelineDetails
      .mockGetPipelineVersion(
        uploadedMockPipeline.pipeline_id,
        initialMockPipelineVersion,
        projectName,
      )
      .as('getPipelineVersion');
    pipelineImportModal.submit();

    // Wait for pipeline upload
    cy.wait('@uploadPipeline').then((interception) => {
      // Note: contain is used instead of equals as different browser engines will add a different boundary
      // to the body - the aim is to not limit these tests to working with one specific engine.
      expect(interception.request.body).to.contain(
        'Content-Disposition: form-data; name="uploadfile"; filename="uploadedFile.yml"',
      );
      expect(interception.request.body).to.contain('Content-Type: application/x-yaml');
      expect(interception.request.body).to.contain('test-yaml-pipeline-content');

      expect(interception.request.query).to.eql({
        name: 'new-pipeline-resource',
        description: 'New pipeline description',
        display_name: 'New pipeline',
      });
    });

    cy.wait('@refreshPipelines');
    cy.wait('@getPipeline');
    cy.wait('@getPipelineVersion');

    verifyRelativeURL(
      `/develop-train/pipelines/definitions/${projectName}/${uploadedMockPipeline.pipeline_id}/${initialMockPipelineVersion.pipeline_version_id}/view`,
    );
  });

  it('fails to import a too-large file', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    pipelinesGlobal.findImportPipelineButton().click();

    pipelineImportModal.shouldBeOpen();
    pipelinesTable.mockGetPipelines([initialMockPipeline], projectName, 1);
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.findUploadError().should('not.exist');
    pipelineImportModal.findSubmitButton().should('be.disabled');
    pipelineImportModal.uploadPipelineYaml(tooLargePipelineYAMLPath);
    pipelineImportModal.findUploadError().should('exist');
    pipelineImportModal.uploadPipelineYaml(pipelineYamlPath);
    pipelineImportModal.findUploadError().should('not.exist');
    pipelineImportModal.findSubmitButton().should('be.enabled');
  });

  it('imports fails with Argo workflow', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    // Return empty for subsequent pipeline list requests (e.g. duplicate name check)
    pipelinesTable.mockGetPipelines([], projectName);

    // Open the "Import pipeline" modal
    pipelinesGlobal.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.fillPipelineDescription('New pipeline description');
    // Safety net: intercept the upload endpoint so the test never hangs if the
    // client-side argo detection is bypassed due to a stale-closure race.
    pipelineImportModal.mockUploadPipeline({}, projectName);
    pipelineImportModal.uploadPipelineYaml(argoWorkflowPipeline);
    pipelineImportModal.findSubmitButton().should('be.enabled');
    pipelineImportModal.submit();

    pipelineImportModal.findImportModalError().should('exist');
    pipelineImportModal.findImportModalError().contains('Unsupported pipeline version');
  });

  it('fails to import a v1 pipeline', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    // Return empty for subsequent pipeline list requests (e.g. duplicate name check)
    pipelinesTable.mockGetPipelines([], projectName);

    // Open the "Import pipeline" modal
    pipelinesGlobal.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.fillPipelineDescription('New pipeline description');
    pipelineImportModal.uploadPipelineYaml(v1PipelineYamlPath);
    pipelineImportModal.findSubmitButton().should('be.enabled');
    pipelineImportModal.submit();

    pipelineImportModal.findImportModalError().should('exist');
    pipelineImportModal.findImportModalError().contains('Pipeline update and recompile required');
    argoAlert.findCloudServiceReleaseNotesLink().should('exist');
    argoAlert.findSelfManagedReleaseNotesLink().should('exist');
  });

  it('imports a new pipeline by url', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    const uploadPipelineAndVersionParams = {
      pipeline: {
        display_name: 'New pipeline',
      },
      pipeline_version: {
        display_name: 'New pipeline',
        package_url: {
          pipeline_url: 'https://example.com/pipeline.yaml',
        },
      },
    };
    const createdMockPipeline = buildMockPipeline(uploadPipelineAndVersionParams.pipeline);
    const createdVersion = buildMockPipelineVersion(
      uploadPipelineAndVersionParams.pipeline_version,
    );

    // Intercept upload/re-fetch of pipelines
    pipelineImportModal
      .mockCreatePipelineAndVersion(uploadPipelineAndVersionParams, projectName)
      .as('uploadPipelineAndVersion');
    pipelinesTable.mockGetPipelines([initialMockPipeline], projectName);
    pipelinesTable.mockGetPipelineVersions([createdVersion], 'new-pipeline', projectName);

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Import pipeline" modal
    pipelinesGlobal.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.findImportPipelineRadio().check();
    pipelineImportModal.findPipelineUrlInput().type('https://example.com/pipeline.yaml');
    pipelinesTable
      .mockGetPipelines([initialMockPipeline, createdMockPipeline], projectName)
      .as('refreshPipelines');
    pipelineDetails.mockGetPipeline(projectName, createdMockPipeline).as('getPipeline');
    pipelineDetails
      .mockGetPipelineVersion(createdMockPipeline.pipeline_id, createdVersion, projectName)
      .as('getPipelineVersion');
    pipelineImportModal.submit();

    // Wait for pipeline upload
    cy.wait('@uploadPipelineAndVersion');
    cy.wait('@refreshPipelines');
    cy.wait('@getPipeline');
    cy.wait('@getPipelineVersion');

    verifyRelativeURL(
      `/develop-train/pipelines/definitions/${projectName}/${createdMockPipeline.pipeline_id}/${createdVersion.pipeline_version_id}/view`,
    );
  });

  it('uploads a new pipeline version', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    const uploadVersionParams = {
      display_name: 'New pipeline version',
      description: 'New pipeline version description',
      pipeline_id: 'test-pipeline',
    };

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Upload new version" modal
    pipelinesGlobal.findUploadVersionButton().click();

    const uploadedMockPipelineVersion = buildMockPipelineVersion(uploadVersionParams);

    // Intercept upload/re-fetch of pipeline versions
    pipelineVersionImportModal
      .mockUploadVersion(uploadVersionParams, projectName)
      .as('uploadVersion');

    // Fill out the "Upload new version" modal and submit
    pipelineVersionImportModal.shouldBeOpen();
    pipelineVersionImportModal.selectPipelineByName('Test pipeline');
    pipelineVersionImportModal.fillVersionName('New pipeline version');
    pipelineVersionImportModal.fillVersionDescription('New pipeline version description');
    pipelineVersionImportModal.uploadPipelineYaml(pipelineYamlPath);
    pipelinesTable
      .mockGetPipelineVersions(
        [initialMockPipelineVersion, uploadedMockPipelineVersion],
        initialMockPipeline.pipeline_id,
        projectName,
      )
      .as('refreshVersions');
    pipelineDetails.mockGetPipeline(projectName, uploadedMockPipelineVersion).as('getPipeline');
    pipelineDetails
      .mockGetPipelineVersion(
        initialMockPipeline.pipeline_id,
        uploadedMockPipelineVersion,
        projectName,
      )
      .as('getPipelineVersion');
    pipelineVersionImportModal.submit();

    // Wait for upload/fetch requests
    cy.wait('@uploadVersion').then((interception) => {
      // Note: contain is used instead of equals as different browser engines will add a different boundary
      // to the body - the aim is to not limit these tests to working with one specific engine.
      expect(interception.request.body).to.contain(
        'Content-Disposition: form-data; name="uploadfile"; filename="uploadedFile.yml"',
      );
      expect(interception.request.body).to.contain('Content-Type: application/x-yaml');
      expect(interception.request.body).to.contain('test-yaml-pipeline-content');

      expect(interception.request.query).to.eql({
        name: 'New pipeline version',
        display_name: 'New pipeline version',
        description: 'New pipeline version description',
        pipelineid: 'test-pipeline',
      });
    });

    cy.wait('@refreshVersions').then((interception) => {
      expect(interception.request.query).to.include({
        sort_by: 'created_at desc',
        pipeline_id: 'test-pipeline',
      });
    });

    cy.wait('@getPipeline');
    cy.wait('@getPipelineVersion');

    verifyRelativeURL(
      `/develop-train/pipelines/definitions/${projectName}/${initialMockPipeline.pipeline_id}/${uploadedMockPipelineVersion.pipeline_version_id}/view`,
    );
  });

  it('uploads a new pipeline version to be stored as a kubernetes resource', () => {
    initIntercepts({
      pipelineStore: DSPipelineAPIServerStore.KUBERNETES,
    });
    pipelinesGlobal.visit(projectName);
    const uploadVersionParams = {
      display_name: 'New pipeline version',
      name: 'new-pipeline-version', // should automatically generate based on display name
      description: 'New pipeline version description',
      pipeline_id: 'test-pipeline',
    };

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Upload new version" modal
    pipelinesGlobal.findUploadVersionButton().click();

    const uploadedMockPipelineVersion = buildMockPipelineVersion(uploadVersionParams);

    // Intercept upload/re-fetch of pipeline versions
    pipelineVersionImportModal
      .mockUploadVersion(uploadVersionParams, projectName)
      .as('uploadVersion');

    // Fill out the "Upload new version" modal and submit
    pipelineVersionImportModal.shouldBeOpen();
    pipelineVersionImportModal.selectPipelineByName('Test pipeline');
    pipelineVersionImportModal.fillVersionName('New pipeline version');
    pipelineVersionImportModal.fillVersionDescription('New pipeline version description');
    pipelineVersionImportModal.uploadPipelineYaml(pipelineYamlPath);
    pipelinesTable
      .mockGetPipelineVersions(
        [initialMockPipelineVersion, uploadedMockPipelineVersion],
        initialMockPipeline.pipeline_id,
        projectName,
      )
      .as('refreshVersions');
    pipelineDetails.mockGetPipeline(projectName, uploadedMockPipelineVersion).as('getPipeline');
    pipelineDetails
      .mockGetPipelineVersion(
        initialMockPipeline.pipeline_id,
        uploadedMockPipelineVersion,
        projectName,
      )
      .as('getPipelineVersion');
    pipelineVersionImportModal.submit();

    // Wait for upload/fetch requests
    cy.wait('@uploadVersion').then((interception) => {
      // Note: contain is used instead of equals as different browser engines will add a different boundary
      // to the body - the aim is to not limit these tests to working with one specific engine.
      expect(interception.request.body).to.contain(
        'Content-Disposition: form-data; name="uploadfile"; filename="uploadedFile.yml"',
      );
      expect(interception.request.body).to.contain('Content-Type: application/x-yaml');
      expect(interception.request.body).to.contain('test-yaml-pipeline-content');

      expect(interception.request.query).to.eql({
        display_name: 'New pipeline version',
        name: 'new-pipeline-version',
        description: 'New pipeline version description',
        pipelineid: 'test-pipeline',
      });
    });

    cy.wait('@refreshVersions').then((interception) => {
      expect(interception.request.query).to.include({
        sort_by: 'created_at desc',
        pipeline_id: 'test-pipeline',
      });
    });

    cy.wait('@getPipeline');
    cy.wait('@getPipelineVersion');

    verifyRelativeURL(
      `/develop-train/pipelines/definitions/${projectName}/${initialMockPipeline.pipeline_id}/${uploadedMockPipelineVersion.pipeline_version_id}/view`,
    );
  });

  it('uploads fails with argo workflow', () => {
    initIntercepts({});

    // Return empty results for filtered version requests (duplicate-name check)
    // so the generic initIntercepts mock doesn't cause a false-positive.
    cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines/${initialMockPipeline.pipeline_id}/versions`,
        query: { filter: /.*/ },
      },
      { pipeline_versions: [], total_size: 0 },
    );

    pipelinesGlobal.visit(projectName);

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Upload new version" modal
    pipelinesGlobal.findUploadVersionButton().click();

    // Fill out the "Upload new version" modal and submit
    pipelineVersionImportModal.shouldBeOpen();
    pipelineVersionImportModal.selectPipelineByName('Test pipeline');
    pipelineVersionImportModal.fillVersionName('Argo workflow version');
    pipelineVersionImportModal.fillVersionDescription('Argo workflow version description');
    // Safety net: intercept the upload endpoint so the test never hangs if the
    // client-side argo detection is bypassed due to a stale-closure race.
    pipelineVersionImportModal.mockUploadVersion({}, projectName);
    pipelineVersionImportModal.uploadPipelineYaml(argoWorkflowPipeline);
    pipelineVersionImportModal.submit();

    pipelineVersionImportModal.findImportModalError().should('exist');
    pipelineVersionImportModal.findImportModalError().contains('Unsupported pipeline version');
  });

  it('imports a new pipeline version by url', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    const createPipelineVersionParams = {
      pipeline_id: 'test-pipeline',
      display_name: 'New pipeline version',
      description: 'New pipeline description',
      package_url: {
        pipeline_url: 'https://example.com/pipeline.yaml',
      },
    };

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Upload new version" modal
    pipelinesGlobal.findUploadVersionButton().click();

    const uploadedMockPipelineVersion = buildMockPipelineVersion(createPipelineVersionParams);

    // Intercept upload/re-fetch of pipeline versions
    pipelinesTable
      .mockGetPipelineVersions(
        [initialMockPipelineVersion, uploadedMockPipelineVersion],
        initialMockPipeline.pipeline_id,
        projectName,
      )
      .as('refreshVersions');
    pipelineVersionImportModal
      .mockCreatePipelineVersion(createPipelineVersionParams, projectName)
      .as('createVersion');
    pipelineDetails.mockGetPipeline(projectName, uploadedMockPipelineVersion).as('getPipeline');
    pipelineDetails
      .mockGetPipelineVersion(
        initialMockPipeline.pipeline_id,
        uploadedMockPipelineVersion,
        projectName,
      )
      .as('getPipelineVersion');
    // Fill out the "Upload new version" modal and submit
    pipelineVersionImportModal.shouldBeOpen();
    pipelineVersionImportModal.selectPipelineByName('Test pipeline');
    pipelinesTable.mockGetPipelineVersions(
      [initialMockPipelineVersion],
      initialMockPipeline.pipeline_id,
      projectName,
      2,
    );
    pipelineVersionImportModal.fillVersionName(initialMockPipelineVersion.display_name);
    cy.findByTestId('duplicate-name-help-text').should('be.visible');
    pipelineVersionImportModal.fillVersionName('New pipeline version');
    pipelineVersionImportModal.findImportPipelineRadio().check();
    pipelineVersionImportModal.findPipelineUrlInput().type('https://example.com/pipeline.yaml');
    pipelineVersionImportModal.submit();

    // Wait for upload/fetch requests
    cy.wait('@createVersion');
    cy.wait('@refreshVersions');
    cy.wait('@getPipeline');
    cy.wait('@getPipelineVersion');

    verifyRelativeURL(
      `/develop-train/pipelines/definitions/${projectName}/${initialMockPipeline.pipeline_id}/${uploadedMockPipelineVersion.pipeline_version_id}/view`,
    );
  });
});
