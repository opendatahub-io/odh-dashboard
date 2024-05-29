/* eslint-disable camelcase */
import { buildMockPipelineVersionV2 } from '~/__mocks__';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mock404Error } from '~/__mocks__/mockK8sStatus';
import { buildMockPipelineV2, buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import {
  pipelinesTable,
  configurePipelineServerModal,
  pipelineVersionImportModal,
  PipelineSort,
} from '~/__tests__/cypress/cypress/pages/pipelines';
import { pipelinesSection } from '~/__tests__/cypress/cypress/pages/pipelines/pipelinesSection';
import { projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import { DataSciencePipelineApplicationModel } from '~/__tests__/cypress/cypress/utils/models';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';
import {
  initIntercepts,
  runCreateRunPageNavTest,
  runScheduleRunPageNavTest,
  viewPipelineServerDetailsTest,
} from './Pipelines.cy';

const projectName = 'test-project-name';
const initialMockPipeline = buildMockPipelineV2({ display_name: 'Test pipeline' });
const initialMockPipelineVersion = buildMockPipelineVersionV2({
  pipeline_id: initialMockPipeline.pipeline_id,
});

const mockPipelines: PipelineKFv2[] = [
  buildMockPipelineV2({
    display_name: 'Test pipeline 1',
    pipeline_id: 'test-pipeline-1',
    created_at: '2023-01-30T22:55:17Z',
  }),

  buildMockPipelineV2({
    display_name: 'Test pipeline 2',
    pipeline_id: 'test-pipeline-2',
    created_at: '2024-01-30T22:55:17Z',
  }),
];

describe('PipelinesList', () => {
  it('should show the configure pipeline server button when the server is not configured', () => {
    initIntercepts({ isEmpty: true });
    cy.interceptK8s(
      {
        model: DataSciencePipelineApplicationModel,
        ns: projectName,
        name: 'pipelines-definition',
      },
      {
        statusCode: 404,
        body: mock404Error({}),
      },
    );

    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesSection.findCreatePipelineButton().should('be.enabled');
  });

  it('should verify that clicking on Configure pipeline server button will open a modal', () => {
    initIntercepts({ isEmpty: true });
    projectDetails.visitSection(projectName, 'pipelines-projects');
    pipelinesSection.findCreatePipelineButton().should('be.enabled');
    pipelinesSection.findCreatePipelineButton().click();
    configurePipelineServerModal.findSubmitButton().should('exist');
  });

  it('should view pipeline server', () => {
    const visitPipelineProjects = () =>
      projectDetails.visitSection(projectName, 'pipelines-projects');
    viewPipelineServerDetailsTest(visitPipelineProjects);
  });

  it('should disable the upload version button when the list is empty', () => {
    initIntercepts({});
    cy.interceptK8sList(
      DataSciencePipelineApplicationModel,
      mockK8sResourceList([mockDataSciencePipelineApplicationK8sResource({})]),
    );
    cy.interceptK8s(
      DataSciencePipelineApplicationModel,
      mockDataSciencePipelineApplicationK8sResource({}),
    );
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
      {
        path: { namespace: projectName, serviceName: 'dspa' },
      },
      buildMockPipelines([]),
    ).as('pipelines');

    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesSection.findImportPipelineSplitButton().should('be.enabled').click();

    cy.wait('@pipelines').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '5',
      });
    });

    pipelinesSection.findUploadVersionButton().should('have.attr', 'aria-disabled', 'true');
  });

  it('should show the ability to delete the pipeline server kebab option', () => {
    initIntercepts({});

    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesSection.findKebabActions().should('be.visible').should('be.enabled');
    pipelinesSection.findKebabActionItem('Delete pipeline server').should('be.visible');
  });

  it('should show the ability to upload new version when clicking the pipeline server kebab option', () => {
    initIntercepts({});

    projectDetails.visitSection(projectName, 'pipelines-projects');
    pipelinesTable.find();
    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findKebabAction('Upload new version').should('be.visible').click();
    pipelineVersionImportModal.shouldBeOpen();
  });

  it('should navigate to details page when clicking on the version name', () => {
    initIntercepts({});
    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesTable.find();
    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();
    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findPipelineVersionLink()
      .click();
    verifyRelativeURL(
      `/projects/${projectName}/pipeline/view/${initialMockPipeline.pipeline_id}/${initialMockPipelineVersion.pipeline_version_id}`,
    );
  });

  it('clicking on upload a new pipeline version should show a modal', () => {
    initIntercepts({});
    cy.intercept(
      {
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
      },
      buildMockPipelines([initialMockPipelineVersion]),
    );
    projectDetails.visitSection(projectName, 'pipelines-projects');
    cy.intercept(
      {
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
      },
      buildMockPipelines(mockPipelines),
    );

    pipelinesSection.findImportPipelineSplitButton().click();
    pipelinesSection.findUploadVersionButton().click();
    pipelineVersionImportModal.shouldBeOpen();
  });

  it('should sort the table', () => {
    pipelineTableSetup();
    pipelinesTable.shouldSortTable({
      sortType: PipelineSort.All,
      pipelines: mockPipelines,
    });
  });

  it('navigates to create run page from pipeline row', () => {
    const visitPipelineProjects = () =>
      projectDetails.visitSection(projectName, 'pipelines-projects');
    runCreateRunPageNavTest(visitPipelineProjects);
  });

  it('navigates to "Schedule run" page from pipeline row', () => {
    const visitPipelineProjects = () =>
      projectDetails.visitSection(projectName, 'pipelines-projects');
    runScheduleRunPageNavTest(visitPipelineProjects);
  });
});

const pipelineTableSetup = () => {
  initIntercepts({ mockPipelines });
  projectDetails.visitSection(projectName, 'pipelines-projects');
};
