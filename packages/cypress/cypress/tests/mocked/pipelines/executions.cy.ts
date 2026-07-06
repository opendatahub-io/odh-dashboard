/* eslint-disable camelcase */
import {
  buildMockPipeline,
  buildMockPipelines,
  mockDashboardConfig,
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockRouteK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import {
  mockGetExecutions,
  mockGetNextPageExecutions,
} from '@odh-dashboard/internal/__mocks__/mlmd/mockGetExecutions';
import { decodeGetExecutionsRequest, initMlmdIntercepts } from './mlmdUtils';
import {
  DataSciencePipelineApplicationModel,
  RouteModel,
  ProjectModel,
} from '../../../utils/models';
import { executionPage, executionFilter } from '../../../pages/pipelines/executions';
import { tablePagination } from '../../../pages/components/Pagination';
import { verifyRelativeURL } from '../../../utils/url';

const projectName = 'test-project-name';
const initialMockPipeline = buildMockPipeline({ display_name: 'Test pipeline' });

describe('ExecutionsError', () => {
  it('Fails to load executions list', () => {
    initIntercepts(false);
    executionPage.visit(projectName);
    executionPage.findText('There was an issue loading executions');
  });
});

describe('No Executions', () => {
  it('Has no executions', () => {
    initIntercepts(true, true);
    executionPage.visit(projectName);
    executionPage.findText('No executions');
  });
});

describe('Executions', () => {
  beforeEach(() => {
    initIntercepts(true);
    executionPage.visit(projectName);
  });

  it('Makes filter requests, includes more entries, tests page pagination, and visits execution details page', () => {
    shouldFilterItems(FilterArgs.Execution, 'digit-classification');
    shouldFilterItems(FilterArgs.ID, '289');
    shouldFilterItems(FilterArgs.Status);
    shouldFilterItems(FilterArgs.Type);
    testEntriesToggle();
    testPagePagination();
    testExecutionDetailsPage();
  });

  it('redirect from v2 to v3 route', () => {
    cy.visitWithLogin('/executions');
    cy.findByTestId('app-page-title').contains('Executions');
    cy.url().should('include', '/develop-train/pipelines/executions');
  });
});

export enum FilterArgs {
  Execution = 'Execution',
  ID = 'ID',
  Type = 'Type',
  Status = 'Status',
}

const setUpIntercept = () => {
  cy.interceptOdh(
    'POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetExecutions',
    { path: { namespace: projectName, serviceName: 'dspa' } },
    mockGetExecutions(),
  ).as('request');
};

const setUpInterceptForNextPage = () => {
  cy.interceptOdh(
    'POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetExecutions',
    { path: { namespace: projectName, serviceName: 'dspa' } },
    mockGetNextPageExecutions(),
  ).as('request');
};

const shouldFilterItems = (filter: FilterArgs, query?: string) => {
  switch (filter) {
    case FilterArgs.Execution:
      executionFilter.findSearchFilterItem(FilterArgs.Execution).click();
      if (typeof query === 'undefined') {
        throw new Error('Incorrect usage of shouldFilterItems');
      }
      setUpIntercept();
      executionFilter.findSearchFilter().type(query);
      cy.wait('@request').then((interception) => {
        expect(decodeGetExecutionsRequest(interception).options?.filterQuery).to.equal(
          "custom_properties.display_name.string_value LIKE '%digit-classification%'",
        );
      });
      break;
    case FilterArgs.ID:
      executionFilter.findSearchFilterItem(FilterArgs.ID).click();
      if (typeof query === 'undefined') {
        throw new Error('Incorrect usage of shouldFilterItems');
      }
      setUpIntercept();
      executionFilter.findSearchFilter().type(query);
      cy.wait('@request').then((interception) => {
        expect(decodeGetExecutionsRequest(interception).options?.filterQuery).to.equal(
          "custom_properties.display_name.string_value LIKE '%digit-classification%' AND id = cast(289 as int64)",
        );
      });
      break;
    case FilterArgs.Type:
      executionFilter.findSearchFilterItem(FilterArgs.Type).click();
      setUpIntercept();
      executionFilter.findTypeSearchFilterItem('system.ContainerExecution').click();
      cy.wait('@request').then((interception) => {
        expect(decodeGetExecutionsRequest(interception).options?.filterQuery).to.include(
          "type LIKE '%system.ContainerExecution%'",
        );
      });
      break;
    case FilterArgs.Status:
      executionFilter.findSearchFilterItem(FilterArgs.Status).click();
      setUpIntercept();
      executionFilter.findTypeSearchFilterItem('Cached').click();
      cy.wait('@request').then((interception) => {
        expect(decodeGetExecutionsRequest(interception).options?.filterQuery).to.include(
          'cast(last_known_state as int64) = 5',
        );
      });
      break;
  }
};

const initIntercepts = (interceptMlmd: boolean, isExecutionsEmpty?: boolean) => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
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
      mockProjectK8sResource({ k8sName: projectName, displayName: projectName }),
    ]),
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
    {
      path: { namespace: projectName, serviceName: 'dspa' },
    },
    buildMockPipelines([initialMockPipeline]),
  );

  if (interceptMlmd) {
    initMlmdIntercepts(projectName, { isExecutionsEmpty });
  }
};

const testEntriesToggle = () => {
  setUpIntercept();
  tablePagination.top.selectToggleOption('30 per page');
  cy.wait('@request').then((interception) => {
    expect(decodeGetExecutionsRequest(interception).options?.maxResultSize).to.equal(30);
  });
  setUpIntercept();
  tablePagination.top.selectToggleOption('20 per page');
  cy.wait('@request').then((interception) => {
    expect(decodeGetExecutionsRequest(interception).options?.maxResultSize).to.equal(20);
  });
};

const testPagePagination = () => {
  setUpInterceptForNextPage();
  tablePagination.top.findNextButton().click();
  cy.wait('@request').then((interception) => {
    expect(decodeGetExecutionsRequest(interception).options?.nextPageToken).to.equal('page token');
  });
  setUpIntercept();
  tablePagination.top.findPreviousButton().click();
  cy.wait('@request').then((interception) => {
    expect(decodeGetExecutionsRequest(interception).options?.nextPageToken).to.equal('');
  });
};

const testExecutionDetailsPage = () => {
  const id = 288;
  executionPage.findEntryByLink('digit-classification').click();
  executionPage.findText(`${id}`);
  executionPage.findText('system.ContainerExecution');
  executionPage.findText('Custom properties');
  executionPage.shouldFailToLoadRun();
  verifyRelativeURL(`/develop-train/pipelines/executions/${projectName}/${id}`);
};
