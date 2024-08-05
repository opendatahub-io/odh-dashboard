import { mockDashboardConfig, mockDscStatus, mockK8sResourceList } from '~/__mocks__';
import { mockDsciStatus } from '~/__mocks__/mockDsciStatus';
import { StackCapability, StackComponent } from '~/concepts/areas/types';
import { ModelRegistryModel } from '~/__tests__/cypress/cypress/utils/models';
import {
  FormFieldSelector,
  registerModelPage,
} from '~/__tests__/cypress/cypress/pages/modelRegistry/registerModelPage';
import { mockModelRegistry } from '~/__mocks__/mockModelRegistry';

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: false,
    }),
  );
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        [StackComponent.MODEL_REGISTRY]: true,
        [StackComponent.MODEL_MESH]: true,
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/dsci/status',
    mockDsciStatus({
      requiredCapabilities: [StackCapability.SERVICE_MESH, StackCapability.SERVICE_MESH_AUTHZ],
    }),
  );

  // TODO replace these with a mock list of services when https://github.com/opendatahub-io/odh-dashboard/pull/3034 is merged
  cy.interceptK8sList(
    ModelRegistryModel,
    mockK8sResourceList([mockModelRegistry({ name: 'modelregistry-sample' })]),
  );
  cy.interceptK8s(ModelRegistryModel, mockModelRegistry({ name: 'modelregistry-sample' }));
};

describe('Register model page', () => {
  beforeEach(() => {
    initIntercepts();
    registerModelPage.visit();
  });

  it('Renders', () => {
    // TODO replace this stub test
    registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).should('exist');
  });
});
