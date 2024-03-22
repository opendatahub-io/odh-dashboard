import { mockComponents } from '~/__mocks__/mockComponents';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockStatus } from '~/__mocks__/mockStatus';
import { modelRegistry } from '~/__tests__/cypress/cypress/pages/modelRegistry';

type HandlersProps = {
  disableModelRegistryFeature?: boolean;
};

const initIntercepts = ({ disableModelRegistryFeature = false }: HandlersProps) => {
  cy.intercept('/api/status', mockStatus());
  cy.intercept(
    '/api/config',
    mockDashboardConfig({
      disableModelRegistry: disableModelRegistryFeature,
    }),
  );
  cy.intercept('/api/components?installed=true', mockComponents());
};
describe('Model Registry Global', () => {
  it('Model Registry Disabled in the cluster', () => {
    initIntercepts({
      disableModelRegistryFeature: true,
    });

    modelRegistry.landingPage();

    modelRegistry.tabDisabled();
  });

  it('Model Registry Enabled in the cluster', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
    });

    modelRegistry.landingPage();

    modelRegistry.tabEnabled();
  });
});
