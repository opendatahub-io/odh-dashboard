import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockStatus } from '~/__mocks__/mockStatus';
import { mockComponents } from '~/__mocks__/mockComponents';
import { explorePage } from '~/__tests__/cypress/cypress/pages/explore';
import { globalDistributedWorkloads } from '~/__tests__/cypress/cypress/pages/distributedWorkloads';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockPrometheusQueryVectorResponse } from '~/__mocks__/mockPrometheusQueryVectorResponse';
import { mockWorkloadK8sResource } from '~/__mocks__/mockWorkloadK8sResource';

type HandlersProps = {
  isKueueInstalled?: boolean;
  disableDistributedWorkloads?: boolean;
  hasProjects?: boolean;
  hasWorkloads?: boolean;
};

const initIntercepts = ({
  isKueueInstalled = true,
  disableDistributedWorkloads = false,
  hasProjects = true,
  hasWorkloads = true,
}: HandlersProps) => {
  cy.intercept(
    '/api/dsc/status',
    mockDscStatus({
      installedComponents: { kueue: isKueueInstalled },
    }),
  );
  cy.intercept('/api/status', mockStatus());
  cy.intercept(
    '/api/config',
    mockDashboardConfig({
      disableDistributedWorkloads,
    }),
  );
  cy.intercept('/api/components', mockComponents());
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/project.openshift.io/v1/projects',
    },
    mockK8sResourceList(
      hasProjects
        ? [
            mockProjectK8sResource({ k8sName: 'test-project', displayName: 'Test Project' }),
            mockProjectK8sResource({ k8sName: 'test-project-2', displayName: 'Test Project 2' }),
          ]
        : [],
    ),
  );
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/k8s/apis/kueue.x-k8s.io/v1beta1/namespaces/*/workloads',
    },
    mockK8sResourceList(
      hasWorkloads
        ? [
            mockWorkloadK8sResource({ k8sName: 'test-workload' }),
            mockWorkloadK8sResource({ k8sName: 'test-workload-2' }),
          ]
        : [],
    ),
  );
  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/prometheus/query',
    },
    {
      code: 200,
      response: mockPrometheusQueryVectorResponse({ result: [] }),
    },
  );
};

describe('Workload Metrics', () => {
  it('Workload Metrics page does not exist if kueue is not installed', () => {
    initIntercepts({
      isKueueInstalled: false,
      disableDistributedWorkloads: false,
    });

    explorePage.visit();
    globalDistributedWorkloads.findNavItem().should('not.exist');

    globalDistributedWorkloads.visit(false);
    globalDistributedWorkloads.shouldNotFoundPage();
  });

  it('Workload Metrics page does not exist if feature is disabled', () => {
    initIntercepts({
      isKueueInstalled: true,
      disableDistributedWorkloads: true,
    });

    explorePage.visit();
    globalDistributedWorkloads.findNavItem().should('not.exist');

    globalDistributedWorkloads.visit(false);
    globalDistributedWorkloads.shouldNotFoundPage();
  });

  it('Workload Metrics page exists if kueue is installed and feature is enabled', () => {
    initIntercepts({
      isKueueInstalled: true,
      disableDistributedWorkloads: false,
    });
    explorePage.visit();
    globalDistributedWorkloads.findNavItem().should('exist');

    globalDistributedWorkloads.visit();
    globalDistributedWorkloads.shouldHavePageTitle();
  });

  it('Defaults to Project Metrics tab and automatically selects a project', () => {
    initIntercepts({});
    globalDistributedWorkloads.visit();

    cy.url().should('include', '/projectMetrics/test-project');
    cy.findByText('Top resource-consuming distributed workloads').should('exist');
  });

  it('Tabs navigate to corresponding routes and render their contents', () => {
    initIntercepts({});
    globalDistributedWorkloads.visit();

    cy.findByLabelText('Workload status tab').click();
    cy.url().should('include', '/workloadStatus/test-project');
    cy.findByText('Status overview').should('exist');

    cy.findByLabelText('Project metrics tab').click();
    cy.url().should('include', '/projectMetrics/test-project');
    cy.findByText('Top resource-consuming distributed workloads').should('exist');
  });

  it('Changing the project and navigating between tabs or to the root of the page retains the new project', () => {
    initIntercepts({});
    globalDistributedWorkloads.visit();
    cy.url().should('include', '/projectMetrics/test-project');

    globalDistributedWorkloads.selectProjectByName('Test Project 2');
    cy.url().should('include', '/projectMetrics/test-project-2');

    cy.findByLabelText('Workload status tab').click();
    cy.url().should('include', '/workloadStatus/test-project-2');

    cy.findByLabelText('Project metrics tab').click();
    cy.url().should('include', '/projectMetrics/test-project-2');

    globalDistributedWorkloads.navigate();
    cy.url().should('include', '/projectMetrics/test-project-2');
  });

  it('Should show an empty state if there are no projects', () => {
    initIntercepts({ hasProjects: false });
    globalDistributedWorkloads.visit();

    cy.findByText('No data science projects').should('exist');
  });

  it('Should render the workloads table', () => {
    initIntercepts({});
    globalDistributedWorkloads.visit();

    cy.findByLabelText('Workload status tab').click();
    cy.findByText('test-workload').should('exist');
  });

  it('Should render the workloads table with empty state', () => {
    initIntercepts({ hasWorkloads: false });
    globalDistributedWorkloads.visit();

    cy.findByLabelText('Workload status tab').click();
    cy.findByText('No workloads match your filters').should('exist');
  });

  it('Should render the projects metrics with empty workload state', () => {
    initIntercepts({ hasWorkloads: false });
    globalDistributedWorkloads.visit();

    cy.findByLabelText('Project metrics tab').click();

    cy.findByText('Resource Usage').should('exist');

    cy.findByText('Top resource-consuming distributed workloads')
      .closest('.dw-section-card')
      .within(() => {
        cy.findByText('No distributed workloads');
      });
    cy.findByText('Distributed workload resource metrics')
      .closest('.dw-section-card')
      .within(() => {
        cy.findByText('No distributed workloads');
      });
    cy.findByText('Resource Usage')
      .closest('.dw-section-card')
      .within(() => {
        //Resource Usage shows chart even if empty workload\
        cy.findByText('Charts Placeholder');
      });
  });
});
