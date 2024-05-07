import {
  CreatePipelineAndVersionKFData,
  PipelineKFv2,
  PipelineVersionKFv2,
} from '~/concepts/pipelines/kfTypes';
import {
  pipelinesTable,
  pipelinesGlobal,
  pipelineVersionImportModal,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { pipelinesSection } from '~/__tests__/cypress/cypress/pages/pipelines/pipelinesSection';
import { buildMockPipelineV2 } from '~/__mocks__/mockPipelinesProxy';
import { buildMockPipelineVersionV2 } from '~/__mocks__';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

const pipelineYamlPath = './cypress/e2e/pipelines/mock-upload-pipeline.yaml';

type UploadPipelineParams = {
  display_name: string;
  description: string;
};

type UploadVersionParams = {
  display_name: string;
  description: string;
  pipeline_id: string;
};

type CreatePipelineAndVersionParams = {
  pipeline: {
    display_name: string;
  };
  pipeline_version: {
    display_name: string;
    package_url: {
      pipeline_url: string;
    };
  };
};

class PipelineImportModal extends Modal {
  constructor() {
    super('Import pipeline');
  }

  importNewPipeline(
    projectName: string,
    initialMockPipeline: PipelineKFv2,
    uploadPipelineParams: UploadPipelineParams,
  ) {
    const uploadedMockPipeline = buildMockPipelineV2(uploadPipelineParams);

    // Intercept upload/re-fetch of pipelines
    pipelineImportModal.mockUploadPipeline(uploadPipelineParams, projectName).as('uploadPipeline');
    pipelinesTable
      .mockGetPipelines([initialMockPipeline, uploadedMockPipeline], projectName)
      .as('refreshPipelines');

    // Wait for the pipelines table to load
    pipelinesTable.find().should('exist');

    // Open the "Import pipeline" modal
    pipelinesSection.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName(uploadPipelineParams.display_name);
    pipelineImportModal.fillPipelineDescription(uploadPipelineParams.description);
    pipelineImportModal.uploadPipelineYaml(pipelineYamlPath);
    pipelineImportModal.submit();

    // Wait for upload/fetch requests
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
        description: 'New pipeline description',
      });
    });

    cy.wait('@refreshPipelines').then((interception) => {
      /* eslint-disable camelcase */
      expect(interception.request.query).to.containSubset({ sort_by: 'created_at desc' });
    });

    // Verify the uploaded pipeline is in the table
    pipelinesTable.getRowByName('New pipeline').find().should('exist');
  }

  importPipelineFromUrl(
    projectName: string,
    initialMockPipeline: PipelineKFv2,
    createPipelineAndVersionParams: CreatePipelineAndVersionParams,
  ) {
    const createdMockPipeline = buildMockPipelineV2(createPipelineAndVersionParams.pipeline);

    // Intercept upload/re-fetch of pipelines
    pipelineImportModal
      .mockCreatePipelineAndVersion(createPipelineAndVersionParams, projectName)
      .as('createPipelineAndVersion');
    pipelinesTable
      .mockGetPipelines([initialMockPipeline, createdMockPipeline], projectName)
      .as('refreshPipelines');
    pipelinesTable.mockGetPipelineVersions(
      [buildMockPipelineVersionV2(createPipelineAndVersionParams.pipeline_version)],
      'new-pipeline',
      projectName,
    );

    // Wait for the pipelines table to load
    pipelinesTable.find().should('exist');

    // Open the "Import pipeline" modal
    pipelinesGlobal.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.findImportPipelineRadio().check();
    pipelineImportModal.findPipelineUrlInput().type('https://example.com/pipeline.yaml');
    pipelineImportModal.submit();

    // Wait for upload/fetch requests
    cy.wait('@createPipelineAndVersion');
    cy.wait('@refreshPipelines');

    // Verify the uploaded pipeline is in the table
    pipelinesTable.getRowByName('New pipeline').find().should('exist');
  }

  uploadPipelineVersion(
    projectName: string,
    initialMockPipeline: PipelineKFv2,
    initialMockPipelineVersion: PipelineVersionKFv2,
    uploadVersionParams: UploadVersionParams,
  ) {
    // Wait for the pipelines table to load
    pipelinesTable.find().should('exist');

    // Open the "Upload new version" modal
    pipelinesGlobal.findUploadVersionButton().click();

    // Intercept upload/re-fetch of pipeline versions
    pipelineVersionImportModal
      .mockUploadVersion(uploadVersionParams, projectName)
      .as('uploadVersion');
    pipelinesTable
      .mockGetPipelineVersions(
        [initialMockPipelineVersion, buildMockPipelineVersionV2(uploadVersionParams)],
        initialMockPipeline.pipeline_id,
        projectName,
      )
      .as('refreshVersions');

    // Fill out the "Upload new version" modal and submit
    pipelineVersionImportModal.shouldBeOpen();
    pipelineVersionImportModal.selectPipelineByName('Test pipeline');
    pipelineVersionImportModal.fillVersionName('New pipeline version');
    pipelineVersionImportModal.fillVersionDescription('New pipeline version description');
    pipelineVersionImportModal.uploadPipelineYaml(pipelineYamlPath);
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
        description: 'New pipeline version description',
        pipelineid: 'test-pipeline',
      });
    });

    cy.wait('@refreshVersions').then((interception) => {
      expect(interception.request.query).to.eql({
        /* eslint-disable camelcase */
        sort_by: 'created_at desc',
        page_size: '1',
        pipeline_id: 'test-pipeline',
      });
    });

    // Verify the uploaded pipeline version is in the table
    pipelinesTable.getRowByName('Test pipeline').toggleExpandByIndex(0);
    pipelinesTable.getRowByName('New pipeline version').find().should('exist');
  }

  find() {
    return cy.findByTestId('import-pipeline-modal').parents('div[role="dialog"]');
  }

  findPipelineNameInput() {
    return this.find().findByTestId('pipeline-name');
  }

  findPipelineDescriptionInput() {
    return this.find().findByTestId('pipeline-description');
  }

  findUploadPipelineInput() {
    return this.find().find('[data-testid="pipeline-file-upload"] input[type="file"]');
  }

  findSubmitButton() {
    return this.findFooter().findByTestId('import-button');
  }

  findUploadPipelineRadio() {
    return this.find().findByTestId('upload-file-radio');
  }

  findImportPipelineRadio() {
    return this.find().findByTestId('import-url-radio');
  }

  findPipelineUrlInput() {
    return this.find().findByTestId('pipeline-url-input');
  }

  fillPipelineName(value: string) {
    this.findPipelineNameInput().clear().type(value);
  }

  fillPipelineDescription(value: string) {
    this.findPipelineDescriptionInput().clear().type(value);
  }

  uploadPipelineYaml(filePath: string) {
    this.findUploadPipelineInput().selectFile([filePath], { force: true });
  }

  mockCreatePipelineAndVersion(params: CreatePipelineAndVersionKFData, namespace: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/pipelines/create`,
        times: 1,
      },
      buildMockPipelineV2(params.pipeline),
    );
  }

  mockUploadPipeline(params: Partial<PipelineKFv2>, namespace: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/pipelines/upload`,
        times: 1,
      },
      buildMockPipelineV2(params),
    );
  }

  submit(): void {
    this.findSubmitButton().click();
  }
}

export const pipelineImportModal = new PipelineImportModal();
