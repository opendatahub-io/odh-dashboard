/* eslint-disable camelcase */
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { buildMockPipelineV2, buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import {
  buildMockPipelineVersionV2,
  buildMockPipelineVersionsV2,
} from '~/__mocks__/mockPipelineVersionsProxy';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import {
  pipelinesGlobal,
  pipelinesTable,
  pipelineImportModal,
  pipelineVersionImportModal,
  pipelineDeleteModal,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  DataSciencePipelineApplicationModel,
  ProjectModel,
  RouteModel,
} from '~/__tests__/cypress/cypress/utils/models';

const projectName = 'test-project-name';
const initialMockPipeline = buildMockPipelineV2({ display_name: 'Test pipeline' });
const initialMockPipelineVersion = buildMockPipelineVersionV2({
  pipeline_id: initialMockPipeline.pipeline_id,
});
const pipelineYamlPath = './cypress/e2e/pipelines/mock-upload-pipeline.yaml';

describe('Pipelines', () => {
  beforeEach(() => {
    initIntercepts();
    pipelinesGlobal.visit(projectName);
  });

  it('renders the page with pipelines table data', () => {
    pipelinesTable.find();
    pipelinesTable.getRowByName('Test pipeline').find().should('exist');
  });

  it('incompatible dpsa version shows error', () => {
    cy.interceptK8sList(
      DataSciencePipelineApplicationModel,
      mockK8sResourceList([
        mockDataSciencePipelineApplicationK8sResource({ namespace: projectName, dspVersion: 'v1' }),
      ]),
    );
    cy.interceptK8s(
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({ namespace: projectName, dspVersion: 'v1' }),
    );

    pipelinesGlobal.visit(projectName);
    pipelinesGlobal.isApiAvailable();
    pipelinesGlobal.findIsServerIncompatible().should('exist');
  });

  it('selects a different project', () => {
    verifyRelativeURL('/pipelines/test-project-name');

    pipelinesGlobal.selectProjectByName('Test Project 2');
    verifyRelativeURL('/pipelines/test-project-name-2');
  });

  it('imports a new pipeline', () => {
    const uploadPipelineParams = {
      display_name: 'New pipeline',
      description: 'New pipeline description',
    };
    const uploadedMockPipeline = buildMockPipelineV2(uploadPipelineParams);

    // Intercept upload/re-fetch of pipelines
    pipelineImportModal.mockUploadPipeline(uploadPipelineParams, projectName).as('uploadPipeline');
    pipelinesTable
      .mockGetPipelines([initialMockPipeline, uploadedMockPipeline], projectName)
      .as('refreshPipelines');

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Import pipeline" modal
    pipelinesGlobal.findImportPipelineButton().click();

    // Fill out the "Import pipeline" modal and submit
    pipelineImportModal.shouldBeOpen();
    pipelineImportModal.fillPipelineName('New pipeline');
    pipelineImportModal.fillPipelineDescription('New pipeline description');
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
      expect(interception.request.query).to.eql({ sort_by: 'created_at desc', page_size: '10' });
    });

    // Verify the uploaded pipeline is in the table
    pipelinesTable.getRowByName('New pipeline').find().should('exist');
  });

  it('imports a new pipeline by url', () => {
    const createPipelineAndVersionParams = {
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
    pipelinesTable.find();

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
  });

  it('uploads a new pipeline version', () => {
    const uploadVersionParams = {
      display_name: 'New pipeline version',
      description: 'New pipeline version description',
      pipeline_id: 'test-pipeline',
    };

    // Wait for the pipelines table to load
    pipelinesTable.find();

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
        sort_by: 'created_at desc',
        page_size: '1',
        pipeline_id: 'test-pipeline',
      });
    });

    // Verify the uploaded pipeline version is in the table
    pipelinesTable.getRowByName('Test pipeline').toggleExpandByIndex(0);
    pipelinesTable.getRowByName('New pipeline version').find().should('exist');
  });

  it('imports a new pipeline version by url', () => {
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

    // Intercept upload/re-fetch of pipeline versions
    pipelinesTable
      .mockGetPipelineVersions(
        [initialMockPipelineVersion, buildMockPipelineVersionV2(createPipelineVersionParams)],
        initialMockPipeline.pipeline_id,
        projectName,
      )
      .as('refreshVersions');

    pipelineVersionImportModal
      .mockCreatePipelineVersion(createPipelineVersionParams, projectName)
      .as('createVersion');

    // Fill out the "Upload new version" modal and submit
    pipelineVersionImportModal.shouldBeOpen();
    pipelineVersionImportModal.selectPipelineByName('Test pipeline');
    pipelineVersionImportModal.fillVersionName('New pipeline version');
    pipelineVersionImportModal.findImportPipelineRadio().check();
    pipelineVersionImportModal.findPipelineUrlInput().type('https://example.com/pipeline.yaml');
    pipelineVersionImportModal.submit();

    // Wait for upload/fetch requests
    cy.wait('@createVersion');
    cy.wait('@refreshVersions');

    // Verify the uploaded pipeline version is in the table
    pipelinesTable.getRowByName('Test pipeline').toggleExpandByIndex(0);
    pipelinesTable.getRowByName('New pipeline version').find().should('exist');
  });

  it('delete a single pipeline', () => {
    createDeletePipelineIntercept(initialMockPipeline.pipeline_id).as('deletePipeline');
    pipelinesTable.mockGetPipelineVersions([], initialMockPipeline.pipeline_id, projectName);
    pipelinesGlobal.visit(projectName);

    // Check pipeline
    pipelinesTable
      .getRowByName(initialMockPipeline.display_name)
      .findKebabAction('Delete pipeline')
      .click();
    pipelineDeleteModal.shouldBeOpen();
    pipelineDeleteModal.findInput().type(initialMockPipeline.display_name);
    cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
      },
      buildMockPipelines([]),
    ).as('refreshPipelines');
    pipelineDeleteModal.findSubmitButton().click();

    cy.wait('@deletePipeline');

    cy.wait('@refreshPipelines').then(() => pipelinesTable.shouldBeEmpty());
  });

  it('delete a single pipeline version', () => {
    createDeleteVersionIntercept(
      initialMockPipelineVersion.pipeline_id,
      initialMockPipelineVersion.pipeline_version_id,
    ).as('deleteVersion');

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Check pipeline version
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);
    pipelinesTable
      .getRowByName(initialMockPipelineVersion.display_name)
      .findKebabAction('Delete pipeline version')
      .click();
    pipelineDeleteModal.shouldBeOpen();
    pipelineDeleteModal.findInput().type(initialMockPipelineVersion.display_name);
    cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines/${initialMockPipeline.pipeline_id}/versions`,
      },
      buildMockPipelineVersionsV2([]),
    ).as('refreshVersions');
    pipelineDeleteModal.findSubmitButton().click();

    cy.wait('@deleteVersion');
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);

    cy.wait('@refreshVersions').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '1',
        pipeline_id: 'test-pipeline',
      });
    });
    pipelinesTable.getRowByName(initialMockPipeline.display_name).shouldNotHavePipelineVersion();
  });

  it('navigate to pipeline version details page', () => {
    // Wait for the pipelines table to load
    pipelinesTable.find();
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);
    pipelinesTable
      .getRowByName(initialMockPipelineVersion.display_name)
      .findPipelineName(initialMockPipelineVersion.display_name)
      .click();
    verifyRelativeURL(
      `/pipelines/${projectName}/pipeline/view/${initialMockPipeline.pipeline_id}/${initialMockPipelineVersion.pipeline_version_id}`,
    );
  });

  it('delete pipeline and versions', () => {
    const mockPipeline1 = buildMockPipelineV2({
      display_name: 'Test pipeline 1',
      pipeline_id: 'test-pipeline-1',
    });
    const mockPipeline2 = buildMockPipelineV2({
      display_name: 'Test pipeline 2',
      pipeline_id: 'test-pipeline-2',
    });

    const mockPipeline1Version1 = buildMockPipelineVersionV2({
      pipeline_id: mockPipeline1.pipeline_id,
      pipeline_version_id: 'test-pipeline-1-version-1',
      display_name: `${mockPipeline1.display_name} version 1`,
    });

    pipelinesTable.mockGetPipelines([mockPipeline1, mockPipeline2], projectName);
    pipelinesTable.mockGetPipelineVersions(
      [mockPipeline1Version1],
      mockPipeline1.pipeline_id,
      projectName,
    );
    pipelinesTable.mockGetPipelineVersions([], mockPipeline2.pipeline_id, projectName);

    pipelinesTable.mockDeletePipeline(mockPipeline2, projectName).as('deletePipeline');
    pipelinesTable
      .mockDeletePipelineVersion(mockPipeline1Version1, projectName)
      .as('deleteVersion');

    pipelinesGlobal.visit(projectName);

    // Check pipeline1 and one version in pipeline 2
    pipelinesTable.getRowByName(mockPipeline1.display_name).toggleExpandByIndex(0);
    pipelinesTable.getRowByName(mockPipeline2.display_name).toggleExpandByIndex(1);

    pipelinesTable.getRowByName(mockPipeline2.display_name).toggleCheckboxByRowName();
    pipelinesTable.getRowByName(mockPipeline1Version1.display_name).toggleCheckboxByRowName();

    //Delete the selected pipeline and versions
    pipelinesGlobal.findDeleteButton().click();
    deleteModal.shouldBeOpen();
    deleteModal.findInput().type('Delete 1 pipeline and 1 version');

    pipelinesTable.mockGetPipelines([mockPipeline1], projectName).as('refreshPipelines');
    pipelinesTable
      .mockGetPipelineVersions([], mockPipeline1.pipeline_id, projectName)
      .as('refreshVersions');
    deleteModal.findSubmitButton().click();

    // Wait for deletion
    cy.wait('@deletePipeline');
    cy.wait('@deleteVersion');

    cy.wait('@refreshPipelines');
    cy.wait('@refreshVersions').then(() => {
      // Test deleted
      pipelinesTable.shouldRowNotBeVisible(mockPipeline2.display_name);
      const pipelineTableRow = pipelinesTable.getRowByName(mockPipeline1.display_name);
      pipelineTableRow.toggleExpandByIndex(0);
      pipelinesTable.shouldRowNotBeVisible(mockPipeline1Version1.display_name);
    });
  });

  it('navigate to create run page from pipeline row', () => {
    // Wait for the pipelines table to load
    pipelinesTable.find();
    pipelinesTable
      .getRowByName(initialMockPipeline.display_name)
      .findKebabAction('Create run')
      .click();
    verifyRelativeURL(`/pipelines/${projectName}/pipelineRun/create`);
  });

  it('navigates to "Schedule run" page from pipeline row', () => {
    pipelinesTable.find();
    pipelinesTable
      .getRowByName(initialMockPipeline.display_name)
      .findKebabAction('Schedule run')
      .click();

    verifyRelativeURL(`/pipelines/${projectName}/pipelineRun/create?runType=scheduled`);
  });

  it('navigate to create run page from pipeline version row', () => {
    // Wait for the pipelines table to load
    pipelinesTable.find();
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);
    pipelinesTable
      .getRowByName(initialMockPipelineVersion.display_name)
      .findKebabAction('Create run')
      .click();
    verifyRelativeURL(`/pipelines/${projectName}/pipelineRun/create`);
  });

  it('navigates to "Schedule run" page from pipeline version row', () => {
    pipelinesTable.find();
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);
    pipelinesTable
      .getRowByName(initialMockPipelineVersion.display_name)
      .findKebabAction('Schedule run')
      .click();

    verifyRelativeURL(`/pipelines/${projectName}/pipelineRun/create?runType=scheduled`);
  });

  it('navigate to view runs page from pipeline version row', () => {
    // Wait for the pipelines table to load
    pipelinesTable.find();
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);
    pipelinesTable
      .getRowByName(initialMockPipelineVersion.display_name)
      .findKebabAction('View runs')
      .click();
    verifyRelativeURL(`/pipelineRuns/${projectName}?runType=active`);
  });

  it('navigates to "Schedules" page from pipeline version row', () => {
    pipelinesTable.find();
    pipelinesTable.getRowByName(initialMockPipeline.display_name).toggleExpandByIndex(0);
    pipelinesTable
      .getRowByName(initialMockPipelineVersion.display_name)
      .findKebabAction('View schedules')
      .click();
    verifyRelativeURL(`/pipelineRuns/${projectName}?runType=scheduled`);
  });
});

const initIntercepts = () => {
  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList([
      mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
    ]),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
  );
  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-dspa',
      namespace: projectName,
    }),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: projectName }),
      mockProjectK8sResource({ k8sName: `${projectName}-2`, displayName: 'Test Project 2' }),
    ]),
  );

  cy.intercept(
    {
      pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
    },
    buildMockPipelines([initialMockPipeline]),
  );

  cy.intercept(
    {
      method: 'GET',
      pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines/${initialMockPipeline.pipeline_id}/versions`,
    },
    buildMockPipelineVersionsV2([initialMockPipelineVersion]),
  );
};

const createDeleteVersionIntercept = (pipelineId: string, pipelineVersionId: string) =>
  cy.intercept(
    {
      pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines/${pipelineId}/versions/${pipelineVersionId}`,
      method: 'DELETE',
      times: 1,
    },
    {
      body: {},
    },
  );

const createDeletePipelineIntercept = (pipelineId: string) =>
  cy.intercept(
    {
      pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines/${pipelineId}`,
      method: 'DELETE',
      times: 1,
    },
    {
      body: {},
    },
  );
