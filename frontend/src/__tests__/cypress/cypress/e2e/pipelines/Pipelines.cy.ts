/* eslint-disable camelcase */
import { RelationshipKF, ResourceTypeKF } from '~/concepts/pipelines/kfTypes';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { buildMockPipeline, buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import {
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

const projectName = 'test-project-name';
const initialMockPipeline = buildMockPipeline({ name: 'Test pipeline' });
const initialMockPipelineVersion = buildMockPipelineVersion({
  id: initialMockPipeline.default_version?.id,
  name: initialMockPipeline.default_version?.name,
  resource_references: [
    {
      key: { type: ResourceTypeKF.PIPELINE, id: initialMockPipeline.id },
      relationship: RelationshipKF.OWNER,
    },
  ],
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

  it('selects a different project', () => {
    cy.url().should('include', 'test-project-name');

    pipelinesGlobal.selectProjectByName('Test Project 2');
    cy.url().should('include', 'test-project-name-2');
  });

  it('imports a new pipeline', () => {
    const uploadPipelineParams = { name: 'New pipeline', description: 'New pipeline description' };
    const uploadedMockPipeline = buildMockPipeline(uploadPipelineParams);

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
      name: 'New pipeline version',
      description: 'New pipeline version description',
      pipelineid: 'test-pipeline',
    };

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Open the "Upload new version" modal
    pipelinesGlobal.findUploadVersionButton().click();

    // Intercept upload/re-fetch of pipeline versions
    pipelineVersionImportModal.mockUploadVersion(uploadVersionParams).as('uploadVersion');
    pipelinesTable
      .mockGetPipelineVersions([
        initialMockPipelineVersion,
        buildMockPipelineVersion(uploadVersionParams),
      ])
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

  cy.intercept(
    {
      pathname: '/api/proxy/apis/v1beta1/pipelines',
    },
    buildMockPipelines([initialMockPipeline]),
  );

  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v1beta1/pipeline_versions',
    },
    buildMockPipelineVersions([initialMockPipelineVersion]),
  );
};
