/* eslint-disable camelcase */
import { RelationshipKF, ResourceTypeKF } from '~/concepts/pipelines/kfTypes';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { buildMockPipeline, buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import {
  buildMockDefaultPipelineVersion,
  buildMockPipelineVersion,
  buildMockPipelineVersions,
} from '~/__mocks__/mockPipelineVersionsProxy';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import {
  pipelinesGlobal,
  pipelinesTable,
  pipelineImportModal,
  pipelineVersionImportModal,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';

const projectName = 'test-project-name';
const initialMockPipeline = buildMockPipeline({ name: 'Test pipeline' });
const initialMockPipelineVersion = buildMockDefaultPipelineVersion(initialMockPipeline);
const pipelineYamlPath = './cypress/e2e/pipelines/mock-upload-pipeline.yaml';

describe('Pipelines', () => {
  it('renders the page with pipelines table data', () => {
    initIntercepts();
    initPipelineIntercepts();
    pipelinesGlobal.visit(projectName);
    pipelinesTable.findRowByName('Test pipeline');
  });

  it('selects a different project', () => {
    initIntercepts();
    initPipelineIntercepts();
    pipelinesGlobal.visit(projectName);
    cy.url().should('include', 'test-project-name');

    pipelinesGlobal.selectProjectByName('Test Project 2');
    cy.url().should('include', 'test-project-name-2');
  });

  it('imports a new pipeline', () => {
    initIntercepts();
    initPipelineIntercepts();
    pipelinesGlobal.visit(projectName);
    const uploadPipelineParams = { name: 'New pipeline', description: 'New pipeline description' };
    const uploadedMockPipeline = buildMockPipeline(uploadPipelineParams);

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
    cy.wait('@uploadPipeline');
    cy.wait('@refreshPipelines');

    // Verify the uploaded pipeline is in the table
    pipelinesTable.findRowByName('New pipeline');
  });

  it('uploads a new pipeline version', () => {
    initIntercepts();
    initPipelineIntercepts();
    pipelinesGlobal.visit(projectName);
    const uploadVersionParams = {
      name: 'New pipeline version',
      description: 'New pipeline version description',
      pipelineid: 'test-pipeline',
    };

    // Open the "Upload new version" modal
    pipelinesGlobal.findUploadVersionButton().click();

    // Intercept upload/re-fetch of pipeline versions
    pipelineVersionImportModal
      .mockUploadVersion(uploadVersionParams, projectName)
      .as('uploadVersion');
    pipelinesTable
      .mockGetPipelineVersions(
        [initialMockPipelineVersion, buildMockPipelineVersion(uploadVersionParams)],
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
    cy.wait('@uploadVersion');
    cy.wait('@refreshVersions');

    // Verify the uploaded pipeline version is in the table
    pipelinesTable.toggleExpandRowByName(initialMockPipeline.name);
    pipelinesTable.findRowByName('New pipeline version');
  });

  it('delete a single pipeline', () => {
    initIntercepts();
    cy.intercept(
      {
        method: 'GET',
        pathname:
          '/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipelines',
      },
      buildMockPipelines([initialMockPipeline]),
    );
    cy.intercept(
      {
        method: 'GET',
        pathname:
          '/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipeline_versions',
      },
      buildMockPipelineVersions([initialMockPipelineVersion]),
    );
    createDeletePipelineIntercept(initialMockPipeline.id).as('deletePipeline');

    pipelinesGlobal.visit(projectName);

    // Check pipeline
    pipelinesTable.toggleCheckboxByRowName(initialMockPipeline.name);

    // Delete the selected pipeline
    pipelinesGlobal.findDeleteButton().click();
    deleteModal.shouldBeOpen();
    deleteModal.findInput().type(initialMockPipeline.name);
    cy.intercept(
      {
        method: 'GET',
        pathname:
          '/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipelines',
      },
      buildMockPipelines([]),
    ).as('refreshPipelines');
    deleteModal.findSubmitButton().click();

    cy.wait('@deletePipeline');
    cy.wait('@refreshPipelines').then(() => cy.findByTestId('global-no-pipelines').should('exist'));
  });

  it('delete a single pipeline version', () => {
    initIntercepts();
    cy.intercept(
      {
        method: 'GET',
        pathname:
          '/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipelines',
      },
      buildMockPipelines([initialMockPipeline]),
    );
    cy.intercept(
      {
        method: 'GET',
        pathname:
          '/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipeline_versions',
      },
      buildMockPipelineVersions([initialMockPipelineVersion]),
    );
    createDeleteVersionIntercept(initialMockPipelineVersion.id).as('deleteVersion');

    pipelinesGlobal.visit(projectName);

    // Check pipeline version
    pipelinesTable.toggleExpandRowByName(initialMockPipeline.name);
    pipelinesTable.toggleCheckboxByRowName(initialMockPipelineVersion.name);

    // Delete the selected version
    pipelinesGlobal.findDeleteButton().click();
    deleteModal.shouldBeOpen();
    deleteModal.findInput().type(initialMockPipelineVersion.name);
    cy.intercept(
      {
        method: 'GET',
        pathname:
          '/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipeline_versions',
      },
      buildMockPipelineVersions([]),
    ).as('refreshVersions');
    deleteModal.findSubmitButton().click();

    cy.wait('@deleteVersion');

    pipelinesTable.toggleExpandRowByName(initialMockPipeline.name);
    cy.wait('@refreshVersions').then(() =>
      pipelinesTable
        .findRowByName(initialMockPipeline.name)
        .parents('tbody')
        .findByTestId('no-pipeline-versions')
        .should('exist'),
    );
  });

  it('delete pipeline and versions', () => {
    const mockPipeline1 = buildMockPipeline({ name: 'Test pipeline 1' });
    const mockPipeline1Version1 = buildMockDefaultPipelineVersion(mockPipeline1);
    const mockPipeline2 = buildMockPipeline({ name: 'Test pipeline 2' });
    const mockPipeline2Version1 = buildMockDefaultPipelineVersion(mockPipeline2);
    const mockPipeline2Version2 = buildMockPipelineVersion({
      id: 'test-pipeline-2-new-version',
      name: 'Test pipeline 2 new version',
      resource_references: [
        {
          key: { type: ResourceTypeKF.PIPELINE, id: mockPipeline2.id },
          relationship: RelationshipKF.OWNER,
        },
      ],
    });

    initIntercepts();
    cy.intercept(
      {
        method: 'GET',
        pathname:
          '/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipelines',
      },
      buildMockPipelines([mockPipeline1, mockPipeline2]),
    );
    cy.intercept(
      {
        method: 'GET',
        pathname:
          '/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipeline_versions',
      },
      (req) => {
        const response = {
          [mockPipeline1.id]: buildMockPipelineVersions([mockPipeline1Version1]),
          [mockPipeline2.id]: buildMockPipelineVersions([
            mockPipeline2Version1,
            mockPipeline2Version2,
          ]),
        };
        req.reply(response[req.query['resource_key.id']]);
      },
    );
    createDeletePipelineIntercept(mockPipeline1.id).as('deletePipeline');
    createDeleteVersionIntercept(mockPipeline2Version1.id).as('deleteVersion');

    pipelinesGlobal.visit(projectName);

    // Check pipeline1 and one version in pipeline 2
    pipelinesTable.toggleExpandRowByName(mockPipeline1.name);
    pipelinesTable.toggleExpandRowByName(mockPipeline2.name);

    pipelinesTable.toggleCheckboxByRowName(mockPipeline1.name);
    pipelinesTable.toggleCheckboxByRowName(mockPipeline2Version1.name);

    // Delete the selected pipeline and versions
    pipelinesGlobal.findDeleteButton().click();
    deleteModal.shouldBeOpen();
    deleteModal.findInput().type('Delete 1 pipeline and 1 version');
    cy.intercept(
      {
        method: 'GET',
        pathname:
          '/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipelines',
      },
      buildMockPipelines([mockPipeline2]),
    ).as('refreshPipelines');
    cy.intercept(
      {
        method: 'GET',
        pathname:
          '/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipeline_versions',
      },
      (req) => {
        const response = { [mockPipeline2.id]: buildMockPipelineVersions([mockPipeline2Version2]) };
        req.reply(response[req.query['resource_key.id']]);
      },
    ).as('refreshVersions');
    deleteModal.findSubmitButton().click();

    // Wait for deletion
    cy.wait('@deletePipeline');
    cy.wait('@deleteVersion');

    cy.wait('@refreshPipelines');
    cy.wait('@refreshVersions').then(() => {
      // Test deleted
      pipelinesTable.checkRow().shouldNotExist(mockPipeline1.name);
      pipelinesTable.checkRow().shouldExist(mockPipeline2.name);
      pipelinesTable.toggleExpandRowByName(mockPipeline2.name);
      pipelinesTable.checkRow().shouldNotExist(mockPipeline2Version1.name);
      pipelinesTable.checkRow().shouldExist(mockPipeline2Version2.name);
    });
  });
});

const initIntercepts = () => {
  cy.intercept('/api/status', mockStatus());
  cy.intercept('/api/config', mockDashboardConfig({}));
  cy.intercept(
    {
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications/pipelines-definition`,
    },
    mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
  );
  cy.intercept(
    {
      pathname: `/api/k8s/apis/route.openshift.io/v1/namespaces/${projectName}/routes/ds-pipeline-pipelines-definition`,
    },
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-pipelines-definition',
      namespace: projectName,
    }),
  );
  cy.intercept(
    {
      pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
    },
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: projectName }),
      mockProjectK8sResource({ k8sName: `${projectName}-2`, displayName: 'Test Project 2' }),
    ]),
  );
};

const initPipelineIntercepts = () => {
  cy.intercept(
    {
      method: 'GET',
      pathname:
        '/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipelines',
    },
    buildMockPipelines([initialMockPipeline]),
  );

  cy.intercept(
    {
      method: 'GET',
      pathname:
        '/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipeline_versions',
    },
    buildMockPipelineVersions([initialMockPipelineVersion]),
  );
};

const createDeletePipelineIntercept = (id: string) =>
  cy.intercept(
    {
      pathname: `/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipelines/${id}`,
      method: 'DELETE',
      times: 1,
    },
    (req) => {
      req.reply({ body: {} });
    },
  );

const createDeleteVersionIntercept = (id: string) =>
  cy.intercept(
    {
      pathname: `/api/service/pipelines/test-project-name/pipelines-definition/apis/v1beta1/pipeline_versions/${id}`,
      method: 'DELETE',
      times: 1,
    },
    (req) => {
      req.reply({ body: {} });
    },
  );
