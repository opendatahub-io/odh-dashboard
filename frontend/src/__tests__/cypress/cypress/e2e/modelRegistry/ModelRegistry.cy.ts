import { mockComponents } from '~/__mocks__/mockComponents';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockRegisteredModelList } from '~/__mocks__/mockRegisteredModelsList';
import { mockModelRegistry } from '~/__mocks__/mockModelRegistry';
import { modelRegistry } from '~/__tests__/cypress/cypress/pages/modelRegistry';
import { mockK8sResourceList, mockRouteK8sResourceModelRegistry } from '~/__mocks__';
import { ModelRegistryModel, RouteModel } from '~/__tests__/cypress/cypress/utils/models';
import { MODEL_REGISTRY_API_VERSION } from '~/concepts/modelRegistry/const';

type HandlersProps = {
  disableModelRegistryFeature?: boolean;
  size?: number;
};

const initIntercepts = ({ disableModelRegistryFeature = false, size = 4 }: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: disableModelRegistryFeature,
    }),
  );
  cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());
  cy.interceptK8sList(
    ModelRegistryModel,
    mockK8sResourceList([mockModelRegistry({}), mockModelRegistry({ name: 'test-registry' })]),
  );

  cy.interceptK8s(ModelRegistryModel, mockModelRegistry({}));

  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResourceModelRegistry({
      name: 'modelregistry-sample-http',
      namespace: 'odh-model-registries',
    }),
  );
  cy.interceptOdh(
    `GET /api/service/modelregistry/modelregistry-sample/api/model_registry/${MODEL_REGISTRY_API_VERSION}/registered_models`,
    mockRegisteredModelList({ size }),
  );
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
  it('No registered models in the selected Model Registry', () => {
    initIntercepts({
      disableModelRegistryFeature: false,
      size: 0,
    });

    modelRegistry.visit();
    modelRegistry.navigate();
    modelRegistry.shouldtableToolbarExist();
    modelRegistry.shouldregisteredModelsEmpty();
  });
});
