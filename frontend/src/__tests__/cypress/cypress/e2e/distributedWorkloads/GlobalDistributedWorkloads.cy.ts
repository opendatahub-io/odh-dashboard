import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockStatus } from '~/__mocks__/mockStatus';
import { mockComponents } from '~/__mocks__/mockComponents';
import { explorePage } from '~/__tests__/cypress/cypress/pages/explore';
import { globalDistributedWorkloads } from '~/__tests__/cypress/cypress/pages/distributedWorkloads';

type HandlersProps = {
  isKueueInstalled?: boolean;
  disableDistributedWorkloads?: boolean;
};

const initIntercepts = ({
  isKueueInstalled = true,
  disableDistributedWorkloads = false,
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

  // TODO mturley other intercepts here
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
    cy.findByText('We can‘t find that page').should('exist');
  });

  it('Workload Metrics page does not exist if feature is disabled', () => {
    initIntercepts({
      isKueueInstalled: true,
      disableDistributedWorkloads: true,
    });

    explorePage.visit();
    globalDistributedWorkloads.findNavItem().should('not.exist');

    globalDistributedWorkloads.visit(false);
    cy.findByText('We can‘t find that page').should('exist');
  });

  it('Workload Metrics page exists if kueue is installed and feature is enabled', () => {
    initIntercepts({
      isKueueInstalled: true,
      disableDistributedWorkloads: false,
    });
    explorePage.visit();
    globalDistributedWorkloads.findNavItem().should('exist');

    globalDistributedWorkloads.visit();
    globalDistributedWorkloads.findHeaderText().should('exist');
  });

  // TODO mturley other tests here for tab navigation, empty states, etc.
});
