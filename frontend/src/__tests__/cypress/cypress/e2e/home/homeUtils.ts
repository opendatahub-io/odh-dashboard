import { mockDashboardConfig } from '~/__mocks__';

type HandlersProps = {
  disableHome?: boolean;
  disableProjects?: boolean;
  disableModelServing?: boolean;
  disablePipelines?: boolean;
};

export const initHomeIntercepts = (config: HandlersProps = {}): void => {
  const dashboardConfig = {
    ...config,
  };
  cy.interceptOdh('GET /api/config', mockDashboardConfig(dashboardConfig));
};
