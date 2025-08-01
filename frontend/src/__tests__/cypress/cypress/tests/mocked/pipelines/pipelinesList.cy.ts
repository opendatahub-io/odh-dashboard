/* eslint-disable camelcase */
import {
  buildMockPipelineVersion,
  buildMockPipelineVersions,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockSecretK8sResource,
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
  mock404Error,
  buildMockPipeline,
  buildMockPipelines,
} from '#~/__mocks__';
import {
  pipelinesTable,
  configurePipelineServerModal,
  pipelineVersionImportModal,
  PipelineSort,
  pipelinesGlobal,
  managePipelineServerModal,
} from '#~/__tests__/cypress/cypress/pages/pipelines';
import { pipelinesSection } from '#~/__tests__/cypress/cypress/pages/pipelines/pipelinesSection';
import { projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import {
  DataSciencePipelineApplicationModel,
  ProjectModel,
  RouteModel,
  SecretModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';
import { MANAGE_PIPELINE_SERVER_CONFIGURATION_TITLE } from '#~/concepts/pipelines/content/const';
import type { PipelineKF } from '#~/concepts/pipelines/kfTypes';

const projectName = 'test-project-name';
const initialMockPipeline = buildMockPipeline({ display_name: 'Test pipeline' });
const initialMockPipelineVersion = buildMockPipelineVersion({
  pipeline_id: initialMockPipeline.pipeline_id,
});

const mockPipelines: PipelineKF[] = [
  buildMockPipeline({
    display_name: 'Test pipeline 1',
    pipeline_id: 'test-pipeline-1',
    created_at: '2023-01-30T22:55:17Z',
  }),

  buildMockPipeline({
    display_name: 'Test pipeline 2',
    pipeline_id: 'test-pipeline-2',
    created_at: '2024-01-30T22:55:17Z',
  }),
];

describe('PipelinesList', () => {
  it('should show the configure pipeline server button when the server is not configured', () => {
    initIntercepts({ isEmptyProject: true });
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
    initIntercepts({ isEmptyProject: true });
    projectDetails.visitSection(projectName, 'pipelines-projects');
    pipelinesSection.findCreatePipelineButton().should('be.enabled');
    pipelinesSection.findCreatePipelineButton().click();
    configurePipelineServerModal.findSubmitButton().should('exist');
  });

  it('should view pipeline server', () => {
    initIntercepts();
    cy.interceptK8s(
      {
        model: SecretModel,
        ns: projectName,
      },
      mockSecretK8sResource({
        s3Bucket: 'c2RzZA==',
        namespace: projectName,
        name: 'aws-connection-test',
      }),
    );
    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesGlobal.selectPipelineServerAction(MANAGE_PIPELINE_SERVER_CONFIGURATION_TITLE);
    managePipelineServerModal.shouldHaveAccessKey('sdsd');
    managePipelineServerModal.findPasswordHiddenButton().click();
    managePipelineServerModal.shouldHaveSecretKey('sdsd');
    managePipelineServerModal.shouldHaveEndPoint('https://s3.amazonaws.com');
    managePipelineServerModal.shouldHaveBucketName('test-pipelines-bucket');

    const checkbox = managePipelineServerModal.getPipelineCachingCheckbox();
    checkbox.should('be.checked');

    managePipelineServerModal.findButton('save', false);
    managePipelineServerModal.findButton('cancel', true);

    managePipelineServerModal.findCloseButton().click();
  });

  it('should disable the upload version button when the list is empty', () => {
    initIntercepts();
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
    initIntercepts();

    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesSection.findKebabActions().should('be.visible').should('be.enabled');
    pipelinesSection.findKebabActionItem('Delete pipeline server').should('be.visible');
  });

  it('should show the ability to upload new version when clicking the pipeline server kebab option', () => {
    initIntercepts();
    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesTable.find();
    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findKebabAction('Upload new version').should('be.visible').click();
    pipelineVersionImportModal.shouldBeOpen();
  });

  it('should navigate to details page when clicking on the version name', () => {
    initIntercepts();
    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesTable.find();
    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();
    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findPipelineVersionLink()
      .click();

    verifyRelativeURL(
      `/pipelines/${projectName}/${initialMockPipeline.pipeline_id}/${initialMockPipelineVersion.pipeline_version_id}/view`,
    );
  });

  it('clicking on upload a new pipeline version should show a modal', () => {
    initIntercepts();
    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesTable.find();
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
    initIntercepts();
    projectDetails.visitSection(projectName, 'pipelines-projects');

    // Wait for the pipelines table to load
    pipelinesTable.find();
    pipelinesTable
      .getRowById(initialMockPipeline.pipeline_id)
      .findKebabAction('Create run')
      .click();

    verifyRelativeURL(`/pipelineRuns/${projectName}/runs/create`);
  });

  it('navigates to "Schedule run" page from pipeline row', () => {
    initIntercepts();
    projectDetails.visitSection(projectName, 'pipelines-projects');

    pipelinesTable.find();
    pipelinesTable
      .getRowById(initialMockPipeline.pipeline_id)
      .findKebabAction('Create schedule')
      .click();

    verifyRelativeURL(`/pipelineRuns/${projectName}/schedules/create`);
  });
});

const pipelineTableSetup = () => {
  initIntercepts();
  projectDetails.visitSection(projectName, 'pipelines-projects');
};

export const initIntercepts = (
  { isEmptyProject }: { isEmptyProject?: boolean } = { isEmptyProject: false },
): void => {
  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList(
      isEmptyProject
        ? []
        : [mockDataSciencePipelineApplicationK8sResource({ namespace: projectName })],
    ),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({
      namespace: projectName,
      dspaSecretName: 'aws-connection-test',
    }),
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

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
    {
      path: { namespace: projectName, serviceName: 'dspa' },
    },
    buildMockPipelines([initialMockPipeline]),
  ).as('getPipelines');

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: initialMockPipeline.pipeline_id,
      },
    },
    buildMockPipelineVersions([initialMockPipelineVersion]),
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: initialMockPipeline.pipeline_id,
      },
    },
    initialMockPipeline,
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: initialMockPipeline.pipeline_id,
        pipelineVersionId: initialMockPipelineVersion.pipeline_version_id,
      },
    },
    initialMockPipelineVersion,
  );
};
