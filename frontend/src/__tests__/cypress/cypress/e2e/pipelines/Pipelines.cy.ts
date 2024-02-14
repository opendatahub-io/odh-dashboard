/* eslint-disable camelcase */
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { buildMockPipelineV2, buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import {
  buildMockPipelineVersionV2,
  buildMockPipelineVersionsV2,
} from '~/__mocks__/mockPipelineVersionsProxy';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import {
  pipelinesGlobal,
  pipelinesTable,
  pipelineImportModal,
  pipelineVersionImportModal,
} from '~/__tests__/cypress/cypress/pages/pipelines';

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
    pipelinesTable.findRowByName('Test pipeline');
  });

  it('incompatible dpsa version shows error', () => {
    cy.intercept(
      {
        method: 'GET',
        pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications`,
      },
      mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({ dspVersion: 'v1' })]),
    );
    cy.intercept(
      {
        method: 'GET',
        pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications/dspa`,
      },
      mockDataSciencePipelineApplicationK8sResource({ dspVersion: 'v1' }),
    );

    pipelinesGlobal.visit(projectName);
    pipelinesGlobal.findIsApiAvailable().should('exist');
    pipelinesGlobal.findIsServerIncompatible().should('exist');
  });

  it('selects a different project', () => {
    cy.url().should('include', 'test-project-name');

    pipelinesGlobal.selectProjectByName('Test Project 2');
    cy.url().should('include', 'test-project-name-2');
  });

  it('imports a new pipeline', () => {
    const uploadPipelineParams = {
      display_name: 'New pipeline',
      description: 'New pipeline description',
    };
    const uploadedMockPipeline = buildMockPipelineV2(uploadPipelineParams);

    // Intercept upload/re-fetch of pipelines
    pipelineImportModal.mockUploadPipeline(uploadPipelineParams).as('uploadPipeline');
    pipelinesTable
      .mockGetPipelines([initialMockPipeline, uploadedMockPipeline])
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
    pipelineVersionImportModal.mockUploadVersion(uploadVersionParams).as('uploadVersion');
    pipelinesTable
      .mockGetPipelineVersions(
        [initialMockPipelineVersion, buildMockPipelineVersionV2(uploadVersionParams)],
        initialMockPipeline.pipeline_id,
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
    pipelinesTable.toggleExpandRowByIndex(0);
    pipelinesTable.findRowByName('New pipeline version');
  });

  it('delete a single pipeline version', () => {
    createDeleteVersionIntercept(
      initialMockPipelineVersion.pipeline_id,
      initialMockPipelineVersion.pipeline_version_id,
    ).as('deleteVersion');

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Check pipeline version
    pipelinesTable.toggleExpandRowByIndex(0);
    pipelinesTable
      .findRowByName(initialMockPipelineVersion.display_name)
      .findByLabelText('Kebab toggle')
      .click();

    // Delete the selected version
    pipelinesTable
      .findRowByName(initialMockPipelineVersion.display_name)
      .findByText('Delete pipeline version')
      .click();
    deleteModal.shouldBeOpen();
    deleteModal.findInput().type(initialMockPipelineVersion.display_name);
    cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/pipelines/${initialMockPipeline.pipeline_id}/versions`,
      },
      buildMockPipelineVersionsV2([]),
    ).as('refreshVersions');
    deleteModal.findSubmitButton().click();

    cy.wait('@deleteVersion');

    pipelinesTable.toggleExpandRowByIndex(0);
    cy.wait('@refreshVersions').then(() =>
      pipelinesTable
        .findRowByName(initialMockPipeline.display_name)
        .parents('tbody')
        .findByTestId('no-pipeline-versions')
        .should('exist'),
    );
  });
});

const initIntercepts = () => {
  cy.intercept('/api/status', mockStatus());
  cy.intercept('/api/config', mockDashboardConfig({}));
  cy.intercept(
    {
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications`,
    },
    mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({})]),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: `/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/${projectName}/datasciencepipelinesapplications/dspa`,
    },
    mockDataSciencePipelineApplicationK8sResource({}),
  );
  cy.intercept(
    {
      pathname: `/api/k8s/apis/route.openshift.io/v1/namespaces/${projectName}/routes/ds-pipeline-dspa`,
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

  cy.intercept(
    {
      pathname: '/api/proxy/apis/v2beta1/pipelines',
    },
    buildMockPipelines([initialMockPipeline]),
  );

  cy.intercept(
    {
      method: 'POST',
      pathname: `/api/proxy/apis/v2beta1/pipelines/${initialMockPipeline.pipeline_id}/versions`,
    },
    buildMockPipelineVersionsV2([initialMockPipelineVersion]),
  );
};

const createDeleteVersionIntercept = (pipelineId: string, pipelineVersionId: string) =>
  cy.intercept(
    {
      pathname: `/api/proxy/apis/v2beta1/pipelines/${pipelineId}/versions/${pipelineVersionId}`,
      method: 'POST',
      times: 1,
    },
    (req) => {
      expect(req.body.method).eq('DELETE');
      req.reply({ body: {} });
    },
  );
