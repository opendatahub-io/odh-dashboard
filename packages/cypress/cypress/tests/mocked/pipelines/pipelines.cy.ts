/* eslint-disable camelcase */
import {
  buildMockPipeline,
  buildMockPipelines,
  buildMockPipelineVersion,
  buildMockPipelineVersions,
  mockArgoWorkflowPipelineVersion,
} from '@odh-dashboard/internal/__mocks__';
import type { PipelineKF } from '@odh-dashboard/internal/concepts/pipelines/kfTypes';
import {
  projectName,
  initialMockPipeline,
  initialMockPipelineVersion,
  initIntercepts,
  createDeleteVersionIntercept,
  createDeletePipelineIntercept,
} from './pipelinesTestUtils';
import {
  pipelinesGlobal,
  pipelinesTable,
  pipelineDeleteModal,
  PipelineSort,
} from '../../../pages/pipelines';
import { deleteModal } from '../../../pages/components/DeleteModal';
import { tablePagination } from '../../../pages/components/Pagination';
import { verifyRelativeURL } from '../../../utils/url';
import { pipelineRunsGlobal } from '../../../pages/pipelines/pipelineRunsGlobal';

describe('Pipelines', () => {
  it('renders the page with pipelines table data', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    pipelinesTable.find();
    pipelinesTable.getRowById(initialMockPipeline.pipeline_id).find().should('exist');
  });

  describe('Table filtering and sorting', () => {
    it('Filter by pipeline name', () => {
      const mockPipelines: PipelineKF[] = [
        buildMockPipeline({
          display_name: 'Test pipeline 1',
          pipeline_id: 'test-pipeline-1',
        }),

        buildMockPipeline({
          display_name: 'Test pipeline 2',
          pipeline_id: 'test-pipeline-2',
        }),
      ];

      initIntercepts({ mockPipelines });
      pipelinesGlobal.visit(projectName);

      pipelinesTable.findRows().should('have.length', 2);

      pipelinesTable.selectFilterByName('Pipeline name');
      pipelinesTable.findFilterTextField().type('Test pipeline 1');

      pipelinesTable.mockGetPipelines(
        mockPipelines.filter((mockPipeline) =>
          mockPipeline.display_name.includes('Test pipeline 1'),
        ),
        projectName,
      );

      pipelinesTable.getRowById(mockPipelines[0].pipeline_id).find().should('exist');
      pipelinesTable.findRows().should('have.length', 1);
    });

    it('Filter by created after', () => {
      const mockPipelines = [
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

      initIntercepts({ mockPipelines });
      pipelinesGlobal.visit(projectName);

      pipelinesTable.findRows().should('have.length', 2);

      pipelinesTable.mockGetPipelines(
        mockPipelines.filter((mockPipeline) => mockPipeline.created_at.includes('2024-01-30')),
        projectName,
      );

      pipelinesTable.selectFilterByName('Created after');
      pipelinesTable.findFilterTextField().type('2024-01-30');

      pipelinesTable.findRows().should('have.length', 1);
      pipelinesTable.getRowById(mockPipelines[1].pipeline_id).find().should('exist');
    });

    it('table with no result found', () => {
      initIntercepts({});
      pipelinesGlobal.visit(projectName);

      pipelinesTable.selectFilterByName('Pipeline name');
      pipelinesTable.findFilterTextField().type('abc');
      const mockPipelines = [initialMockPipeline];

      pipelinesTable.mockGetPipelines(
        mockPipelines.filter((mockPipeline) => mockPipeline.display_name.includes('abc')),
        projectName,
      );

      pipelinesTable.findEmptyResults();
    });

    it('Table sort', () => {
      initIntercepts({});
      pipelinesGlobal.visit(projectName);

      pipelinesTable.shouldSortTable({
        sortType: PipelineSort.All,
        pipelines: [
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
        ],
        projectName,
      });
    });
  });

  it('selects a different project', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    verifyRelativeURL('/develop-train/pipelines/definitions/test-project-name');

    pipelineRunsGlobal.selectProjectByName('Test Project 2');
    verifyRelativeURL('/develop-train/pipelines/definitions/test-project-name-2');
  });

  it('delete a single pipeline', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    createDeletePipelineIntercept(initialMockPipeline.pipeline_id).as('deletePipeline');
    pipelinesTable.mockGetPipelineVersions([], initialMockPipeline.pipeline_id, projectName);
    pipelinesGlobal.visit(projectName);

    // Check pipeline
    pipelinesTable
      .getRowById(initialMockPipeline.pipeline_id)
      .findKebabAction('Delete pipeline')
      .click();
    pipelineDeleteModal.shouldBeOpen();
    pipelineDeleteModal.findInput().type(initialMockPipeline.display_name);
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
      {
        path: { namespace: projectName, serviceName: 'dspa' },
      },
      buildMockPipelines([]),
    ).as('refreshPipelines');

    pipelineDeleteModal.findSubmitButton().click();

    cy.wait('@deletePipeline');

    cy.wait('@refreshPipelines').then(() => pipelinesTable.shouldBeEmpty());
  });

  it('delete a single pipeline version', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    createDeleteVersionIntercept(
      initialMockPipelineVersion.pipeline_id,
      initialMockPipelineVersion.pipeline_version_id,
    ).as('deleteVersion');

    // Wait for the pipelines table to load
    pipelinesTable.find();

    // Check pipeline version
    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();
    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findKebabAction('Delete pipeline version')
      .click();
    pipelineDeleteModal.shouldBeOpen();
    pipelineDeleteModal.findInput().type(initialMockPipelineVersion.display_name);
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
      {
        path: {
          namespace: projectName,
          serviceName: 'dspa',
          pipelineId: initialMockPipeline.pipeline_id,
        },
      },
      buildMockPipelineVersions([]),
    ).as('refreshVersions');

    pipelineDeleteModal.findSubmitButton().click();

    cy.wait('@deleteVersion');
    pipelineRow.findExpandButton().click();

    cy.wait('@refreshVersions').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '1',
        pipeline_id: 'test-pipeline',
      });
    });
    pipelineRow.shouldNotHavePipelineVersion();
  });

  it('navigate to pipeline version details page', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();
    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();

    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findPipelineVersionLink()
      .click();

    verifyRelativeURL(
      `/develop-train/pipelines/definitions/${projectName}/${initialMockPipeline.pipeline_id}/${initialMockPipelineVersion.pipeline_version_id}/view`,
    );
  });

  it('navigates to pipeline version details page via pipeline name', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);
    pipelinesTable.find();

    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findPipelineNameLink(initialMockPipeline.display_name).click();

    verifyRelativeURL(
      `/develop-train/pipelines/definitions/${projectName}/${initialMockPipeline.pipeline_id}/${initialMockPipelineVersion.pipeline_version_id}/view`,
    );
  });

  it('delete pipeline and versions', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    const mockPipeline1 = buildMockPipeline({
      display_name: 'Test pipeline 1',
      pipeline_id: 'test-pipeline-1',
    });
    const mockPipeline2 = buildMockPipeline({
      display_name: 'Test pipeline 2',
      pipeline_id: 'test-pipeline-2',
    });

    const mockPipeline1Version1 = buildMockPipelineVersion({
      pipeline_id: mockPipeline1.pipeline_id,
      pipeline_version_id: 'test-pipeline-1-version-1',
      display_name: `${mockPipeline1.display_name} version 1`,
    });

    const mockPipeline1Version2 = buildMockPipelineVersion({
      pipeline_id: mockPipeline1.pipeline_id,
      pipeline_version_id: 'test-pipeline-1-version-2',
      display_name: `${mockPipeline1.display_name} version 2`,
    });

    pipelinesTable.mockGetPipelines([mockPipeline1, mockPipeline2], projectName);
    pipelinesTable.mockGetPipelineVersions(
      [mockPipeline1Version1, mockPipeline1Version2],
      mockPipeline1.pipeline_id,
      projectName,
    );
    pipelinesTable.mockGetPipelineVersions([], mockPipeline2.pipeline_id, projectName);

    pipelinesTable.mockDeletePipeline(mockPipeline2, projectName).as('deletePipeline');
    pipelinesTable
      .mockDeletePipelineVersion(mockPipeline1Version1, projectName)
      .as('deleteVersion');

    pipelinesGlobal.visit(projectName);

    // Check pipeline1 version 1 and pipeline 2
    const pipelineRow1 = pipelinesTable.getRowById(mockPipeline1.pipeline_id);
    pipelineRow1.findRowCheckbox().should('be.disabled');
    pipelineRow1.findExpandButton().click();
    pipelineRow1
      .getPipelineVersionRowById(mockPipeline1Version1.pipeline_version_id)
      .findRowCheckbox()
      .check();

    const pipelineRow2 = pipelinesTable.getRowById(mockPipeline2.pipeline_id);
    pipelineRow2.findRowCheckbox().should('be.enabled').check();

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
      pipelinesTable.getRowById(mockPipeline1.pipeline_id).findExpandButton().click();
      pipelinesTable.shouldRowNotBeVisible(mockPipeline1Version1.display_name);
    });
  });

  it('navigate to create run page from pipeline row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();
    pipelinesTable
      .getRowById(initialMockPipeline.pipeline_id)
      .findKebabAction('Create run')
      .click();

    verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/create`);
  });

  it('run and schedule dropdown action should be disabled when pipeline and pipeline version is not supported', () => {
    const mockPipelines: PipelineKF[] = [
      buildMockPipeline({
        display_name: 'Argo workflow',
        pipeline_id: 'argo-workflow',
      }),
    ];

    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
      {
        path: {
          namespace: projectName,
          serviceName: 'dspa',
          pipelineId: 'argo-workflow',
        },
      },
      initialMockPipeline,
    );

    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
      {
        path: {
          namespace: projectName,
          serviceName: 'dspa',
          pipelineId: 'argo-workflow',
        },
      },
      buildMockPipelineVersions([mockArgoWorkflowPipelineVersion({ pipelineId: 'argo-workflow' })]),
    );

    initIntercepts({ mockPipelines });
    pipelinesGlobal.visit(projectName);

    // Wait for the pipelines table to load
    pipelinesTable.find();
    const pipelineRow = pipelinesTable.getRowById('argo-workflow');
    pipelineRow.findKebabAction('Create run').should('have.attr', 'aria-disabled');
    pipelineRow.findKebabAction('Create schedule').should('have.attr', 'aria-disabled');

    pipelineRow.findExpandButton().click();

    const pipelineVersionRow = pipelineRow.getPipelineVersionRowById('test-pipeline-version');
    pipelineVersionRow.findKebabAction('Create run').should('have.attr', 'aria-disabled');
    pipelineVersionRow.findKebabAction('Create schedule').should('have.attr', 'aria-disabled');
  });

  it('run and schedule dropdown action should be disabeld when pipeline has no versions', () => {
    initIntercepts({ hasNoPipelineVersions: true });
    pipelinesGlobal.visit(projectName);

    pipelinesTable
      .getRowById(initialMockPipeline.pipeline_id)
      .findKebabAction('Create schedule')
      .should('have.attr', 'aria-disabled');
    pipelinesTable
      .getRowById(initialMockPipeline.pipeline_id)
      .findKebabAction('Create run')
      .should('have.attr', 'aria-disabled');
  });

  it('navigates to "Schedule run" page from pipeline row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();
    pipelinesTable
      .getRowById(initialMockPipeline.pipeline_id)
      .findKebabAction('Create schedule')
      .click();

    verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/schedules/create`);
  });

  it('navigate to create run page from pipeline version row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();

    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();
    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findKebabAction('Create run')
      .click();

    verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/runs/create`);
  });

  it('navigates to "Schedule run" page from pipeline version row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();
    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();
    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findKebabAction('Create schedule')
      .click();

    verifyRelativeURL(`/develop-train/pipelines/runs/${projectName}/schedules/create`);
  });

  it('navigate to view runs page from pipeline version row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();

    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();
    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findPipelineVersionViewRunLink()
      .click();

    verifyRelativeURL(
      `/develop-train/pipelines/runs/${projectName}/runs/active?pipeline_version=${initialMockPipelineVersion.pipeline_version_id}`,
    );
  });

  it('navigates to "Schedules" page from pipeline version row', () => {
    initIntercepts({});
    pipelinesGlobal.visit(projectName);

    pipelinesTable.find();
    const pipelineRow = pipelinesTable.getRowById(initialMockPipeline.pipeline_id);
    pipelineRow.findExpandButton().click();
    pipelineRow
      .getPipelineVersionRowById(initialMockPipelineVersion.pipeline_version_id)
      .findKebabAction('View schedules')
      .click();

    verifyRelativeURL(
      `/develop-train/pipelines/runs/${projectName}/schedules?pipeline_version=${initialMockPipelineVersion.pipeline_version_id}`,
    );
  });

  it('Table pagination', () => {
    const mockPipelines = Array.from({ length: 25 }, (_, i) =>
      buildMockPipeline({
        display_name: `Test pipeline-${i}`,
      }),
    );
    initIntercepts({
      mockPipelines: mockPipelines.slice(0, 10),
      totalSize: 25,
      nextPageToken: 'page-2-token',
    });
    pipelinesGlobal.visit(projectName);

    cy.wait('@getPipelines').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '10',
      });
    });

    pipelinesTable.getRowById(mockPipelines[0].pipeline_id).find().should('exist');
    pipelinesTable.findRows().should('have.length', '10');

    const pagination = tablePagination.top;

    // test Next button
    pagination.findPreviousButton().should('be.disabled');
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
      {
        path: { namespace: projectName, serviceName: 'dspa' },
      },
      buildMockPipelines(mockPipelines.slice(10, 20), 25),
    ).as('refreshPipelines');

    pagination.findNextButton().click();

    cy.wait('@refreshPipelines').then((interception) => {
      expect(interception.request.query).to.include({
        sort_by: 'created_at desc',
        page_token: 'page-2-token',
      });
    });

    pipelinesTable.getRowById(mockPipelines[10].pipeline_id).find().should('exist');
    pipelinesTable.findRows().should('have.length', '10');

    // test Previous button
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
      {
        path: { namespace: projectName, serviceName: 'dspa' },
      },
      buildMockPipelines(mockPipelines.slice(0, 10), 25),
    ).as('getFirstTenPipelines');

    pagination.findPreviousButton().click();

    cy.wait('@getFirstTenPipelines').then((interception) => {
      expect(interception.request.query).to.eql({
        sort_by: 'created_at desc',
        page_size: '10',
      });
    });

    pipelinesTable.getRowById(mockPipelines[0].pipeline_id).find().should('exist');

    // 20 per page
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
      {
        path: { namespace: projectName, serviceName: 'dspa' },
      },
      buildMockPipelines(mockPipelines.slice(0, 20), 22),
    );
    pagination.selectToggleOption('20 per page');
    pagination.findPreviousButton().should('be.disabled');
    pipelinesTable.getRowById(mockPipelines[19].pipeline_id).find().should('exist');
    pipelinesTable.findRows().should('have.length', '20');
  });
});
