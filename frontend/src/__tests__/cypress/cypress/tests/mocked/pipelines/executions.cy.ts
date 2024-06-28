/* eslint-disable camelcase */
import {
  buildMockPipelineV2,
  buildMockPipelines,
  mockDashboardConfig,
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockRouteK8sResource,
} from '~/__mocks__';
import {
  DataSciencePipelineApplicationModel,
  RouteModel,
  ProjectModel,
} from '~/__tests__/cypress/cypress/utils/models';
import {
  executionPage,
  executionFilter,
} from '~/__tests__/cypress/cypress/pages/pipelines/executions';
import { mockGetExecutions, mockGetNextPageExecutions } from '~/__mocks__/mlmd/mockGetExecutions';
import { initMlmdIntercepts } from './mlmdUtils';

const projectName = 'test-project-name';
const initialMockPipeline = buildMockPipelineV2({ display_name: 'Test pipeline' });

describe('ExecutionsError', () => {
  it('Fails to load executions list', () => {
    initIntercepts(false);
    executionPage.visit(projectName);
    cy.contains('There was an issue loading executions');
  });
});

describe('No Executions', () => {
  it('Has no executions', () => {
    initIntercepts(true, true);
    executionPage.visit(projectName);
    cy.contains('No executions');
  });
});

describe('Executions', () => {
  beforeEach(() => {
    initIntercepts(true);
    executionPage.visit(projectName);
  });

  it('Makes filter request', () => {
    shouldFilterItems(FilterArgs.Execution, 'h');
    shouldFilterItems(FilterArgs.ID, '2');
    shouldFilterItems(FilterArgs.Status);
    shouldFilterItems(FilterArgs.Type);
  });

  it('Makes requests to include more entries', () => {
    executionFilter.findEntriesPerPage().click();
    setUpIntercept();
    cy.findByText('20 per page').click();
    cy.wait('@request');
    executionFilter.findEntriesPerPage().click();
    setUpIntercept();
    cy.findByText('30 per page').click();
    cy.wait('@request');
  });

  it('Visits execution details page', () => {
    cy.get('a[href="/executions/test-project-name/288"]').click();
    cy.contains('288');
    cy.contains('system.ContainerExecution');
  });

  it('Navigates to next page and previous page', () => {
    executionFilter.findNextPage().as('nextpage');
    setUpInterceptForNextPage();
    cy.get('@nextpage').click();
    cy.wait('@request');
    executionFilter.findPreviousPage().as('prevpage');
    setUpIntercept();
    cy.get('@prevpage').click();
    cy.wait('@request');
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
      executionFilter.findSearchFilterItem(FilterArgs.Execution);
      if (typeof query === 'undefined') {
        throw new Error('Incorrect usage of shouldFilterItems');
      }
      setUpIntercept();
      executionFilter.typeSearchFilter(query);
      cy.wait('@request');
      executionFilter.clearSearchFilter();
      break;
    case FilterArgs.ID:
      executionFilter.findSearchFilterItem(FilterArgs.ID);
      if (typeof query === 'undefined') {
        throw new Error('Incorrect usage of shouldFilterItems');
      }
      setUpIntercept();
      executionFilter.typeSearchFilter(query);
      cy.wait('@request');
      executionFilter.clearSearchFilter();
      break;
    case FilterArgs.Type:
      executionFilter.findSearchFilterItem(FilterArgs.Type);
      setUpIntercept();
      executionFilter.findTypeSearchFilterItem('system.ContainerExecution');
      cy.wait('@request');
      break;
    case FilterArgs.Status:
      executionFilter.findSearchFilterItem(FilterArgs.Status);
      setUpIntercept();
      executionFilter.findTypeSearchFilterItem('Cached');
      cy.wait('@request');
      break;
  }
};

const initIntercepts = (interceptMlmd: boolean, isExecutionsEmpty?: boolean) => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disablePipelineExperiments: false }));
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
    if (isExecutionsEmpty) {
      initMlmdIntercepts(projectName, true);
    } else {
      initMlmdIntercepts(projectName, false);
    }
  }
};
