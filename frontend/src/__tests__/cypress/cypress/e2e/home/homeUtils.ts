import { mockDashboardConfig } from '~/__mocks__';

export const initHomeIntercepts = (
  config: Parameters<typeof mockDashboardConfig>[0] = {},
): void => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig(config));
};
