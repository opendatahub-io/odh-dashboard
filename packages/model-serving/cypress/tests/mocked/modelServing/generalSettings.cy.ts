import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { asProductAdminUser } from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import { be } from '@odh-dashboard/cypress/cypress/utils/should';
import { generalSettingsPage } from '@odh-dashboard/cypress/cypress/pages/modelDeploymentSettings/generalSettings';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import { mockStandardModelServingTemplateK8sResources } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockGlobalScopedHardwareProfiles } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
  mockOciConnectionTypeConfigMap,
} from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
import { mockURISecretK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import { SecretModel } from '@odh-dashboard/k8s-core/api/models';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  ProjectModel,
  PVCModel,
  ServingRuntimeModel,
  TemplateModel,
} from '@odh-dashboard/cypress/cypress/utils/models';
import {
  modelServingGlobal,
  modelServingWizard,
} from '@odh-dashboard/cypress/cypress/pages/modelServing';
import {
  ModelLocationSelectOption,
  ModelTypeLabel,
} from '@odh-dashboard/cypress/cypress/utils/modelServingConstants';

// Structural type + factory inlined here rather than importing ClusterSettingsType /
// mockClusterSettings from @odh-dashboard/internal (frontend/src). Those live outside this
// package's tsconfig rootDir and pull the whole frontend/src/__mocks__ tree into the cypress
// ts-loader program, breaking compilation of every model-serving spec (TS6059).
type ClusterSettingsType = {
  userTrackingEnabled: boolean;
  cullerTimeout: number;
  pvcSize: number;
  modelServingPlatformEnabled: { kServe: boolean; LLMd: boolean };
  isDistributedInferencingDefault?: boolean;
  defaultDeploymentStrategy?: string;
  globalMLflowNamespaces?: string[];
};

const mockClusterSettings = (
  overrides: Partial<ClusterSettingsType> = {},
): ClusterSettingsType => ({
  userTrackingEnabled: false,
  cullerTimeout: 31536000, // 1 year (no culling)
  pvcSize: 20,
  modelServingPlatformEnabled: { kServe: true, LLMd: true },
  isDistributedInferencingDefault: true,
  defaultDeploymentStrategy: 'rolling',
  globalMLflowNamespaces: [],
  ...overrides,
});

const initIntercepts = () => {
  asProductAdminUser();

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelServing: false,
      disableKServe: false,
      disableLLMd: false,
    }),
  );

  cy.interceptOdh('GET /api/cluster-settings', mockClusterSettings({}));
  cy.interceptOdh('PUT /api/cluster-settings', { success: true }).as('clusterSettings');
};

const initWizardIntercepts = ({ isLLMdDefault }: { isLLMdDefault: boolean }) => {
  asProductAdminUser();

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelServing: false,
      disableKServe: false,
      disableLLMd: false,
      disableNIMModelServing: true,
      vLLMDeploymentOnMaaS: true,
      isLLMdDefault,
    }),
  );

  cy.interceptOdh(
    'GET /api/namespaces/:namespace/:context',
    { path: { namespace: 'test-project', context: '*' } },
    { applied: true },
  );

  cy.interceptOdh('GET /api/components', null, []);
  cy.interceptOdh('GET /api/connection-types', [
    mockConnectionTypeConfigMap({
      displayName: 'URI - v1',
      name: 'uri-v1',
      category: ['existing-category'],
      fields: [
        {
          type: 'uri',
          name: 'URI',
          envVar: 'URI',
          required: true,
          properties: {},
        },
      ],
    }),
    mockConnectionTypeConfigMap({
      displayName: 'S3',
      name: 's3',
      category: ['existing-category'],
      fields: mockModelServingFields,
    }),
    mockOciConnectionTypeConfigMap(),
  ]);

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList([mockGlobalScopedHardwareProfiles[0], mockGlobalScopedHardwareProfiles[1]]),
  );

  cy.interceptK8sList(
    { model: SecretModel, ns: 'test-project' },
    mockK8sResourceList([mockURISecretK8sResource({ namespace: 'test-project' })]),
  );

  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(mockStandardModelServingTemplateK8sResources(), {
      namespace: 'opendatahub',
    }),
  );

  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8sList(PVCModel, mockK8sResourceList([mockPVCK8sResource({})]));
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: 'test-project' },
    mockK8sResourceList([mockInferenceServiceK8sResource({})]),
  );
  cy.interceptK8sList(
    { model: ServingRuntimeModel, ns: 'test-project' },
    mockK8sResourceList([mockServingRuntimeK8sResource({})]),
  );
};

const navigateToDeploymentMethodStep = () => {
  modelServingGlobal.visit('test-project');
  modelServingGlobal.findDeployModelButton().click();

  modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).should('exist').click();
  modelServingWizard
    .findModelLocationSelectOption(ModelLocationSelectOption.URI)
    .should('exist')
    .click();
  modelServingWizard.findUrilocationInput().type('https://test');
  modelServingWizard.findSaveConnectionCheckbox().click();
  modelServingWizard.findNextButton().should('be.enabled').click();

  modelServingWizard.findModelDeploymentStep().should('be.enabled');
};

describe('General Settings tab (model serving settings)', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('Edit model serving settings', () => {
    generalSettingsPage.visit();

    // LLMd and single platform switches should be checked initially
    generalSettingsPage.findEnableLLMdSwitch().should('be.checked');
    generalSettingsPage.findSinglePlatformSwitch().should('be.checked');
    generalSettingsPage.findDistributedInferencing().should('be.checked');
    generalSettingsPage.findSaveButton().should('be.disabled');
    generalSettingsPage.findServingPlatformAlert().should('not.exist');

    // If disable model serving switch is unchecked, submit button should be enabled
    generalSettingsPage.findSinglePlatformSwitch().click({ force: true });
    generalSettingsPage.findSaveButton().should('be.enabled');
    generalSettingsPage.findServingPlatformAlert().should(be.warning);
    // and if disable model serving switch is unchecked, LLMd switch should be unchecked and disabled as well
    generalSettingsPage.findEnableLLMdSwitch().should('not.be.checked');
    generalSettingsPage.findEnableLLMdSwitch().should('be.disabled');
    generalSettingsPage.findDistributedInferencing().should('not.be.checked');
    generalSettingsPage.findDistributedInferencing().should('be.disabled');
    generalSettingsPage.findServingPlatformAlert().should('exist');

    // reenable model serving (automatically enables llmd and distributed inferencing)
    generalSettingsPage.findSinglePlatformSwitch().click({ force: true });

    generalSettingsPage.findEnableLLMdSwitch().should('be.checked');
    generalSettingsPage.findDistributedInferencing().should('not.be.disabled');
    generalSettingsPage.findDistributedInferencing().should('be.checked');

    generalSettingsPage.findServingPlatformAlert().should('not.exist');

    generalSettingsPage.findSaveButton().should('be.disabled');

    // If llmd is disabled the distributed inferencing switch should be unchecked as well
    generalSettingsPage.findEnableLLMdSwitch().click({ force: true });
    generalSettingsPage.findEnableLLMdSwitch().should('not.be.checked');
    generalSettingsPage.findDistributedInferencing().should('not.be.checked');
    generalSettingsPage.findDistributedInferencing().should('be.disabled');
    generalSettingsPage.findDistributedInferencingAlert().should('exist');

    generalSettingsPage.findSaveButton().should('be.enabled');

    // reenable llmd but not distributed inferencing -> submit button should be disabled, back to original state
    generalSettingsPage.findEnableLLMdSwitch().click({ force: true });

    generalSettingsPage.findSaveButton().should('be.disabled');

    // check deployment strategy field
    generalSettingsPage.findRollingUpdateRadio().should('be.checked');
    generalSettingsPage.findSaveButton().should('be.disabled');
    generalSettingsPage.findRecreateRadio().check();
    generalSettingsPage.findSaveButton().should('be.enabled');
    generalSettingsPage.findRollingUpdateRadio().check();
    generalSettingsPage.findSaveButton().should('be.disabled');

    // make an actual change and save it
    generalSettingsPage.findRecreateRadio().check();
    generalSettingsPage.findSaveButton().should('be.enabled').click();

    cy.wait('@clusterSettings').then((interception) => {
      expect(interception.request.body).to.eql(
        mockClusterSettings({
          defaultDeploymentStrategy: 'recreate',
        }),
      );
    });
  });

  it('should save isDistributedInferencingDefault when the default llm-d switch is toggled', () => {
    generalSettingsPage.visit();

    generalSettingsPage.findDistributedInferencing().should('be.checked');
    generalSettingsPage.findDistributedInferencing().click({ force: true });
    generalSettingsPage.findDistributedInferencing().should('not.be.checked');
    generalSettingsPage.findSaveButton().should('be.enabled').click();

    cy.wait('@clusterSettings').then((interception) => {
      expect(interception.request.body).to.eql(
        mockClusterSettings({
          isDistributedInferencingDefault: false,
        }),
      );
    });

    generalSettingsPage.findDistributedInferencing().should('not.be.checked');
    generalSettingsPage.findDistributedInferencing().click({ force: true });
    generalSettingsPage.findDistributedInferencing().should('be.checked');
    generalSettingsPage.findSaveButton().should('be.enabled').click();

    cy.wait('@clusterSettings').then((interception) => {
      expect(interception.request.body).to.eql(
        mockClusterSettings({
          isDistributedInferencingDefault: true,
        }),
      );
    });
  });
});

describe('Deployment wizard defaults from distributed inference setting', () => {
  it('should select llm-d by default when isLLMdDefault is true', () => {
    initWizardIntercepts({ isLLMdDefault: true });
    navigateToDeploymentMethodStep();

    modelServingWizard.findDeploymentMethodRadio('llm-inference-service-llmd').should('be.checked');
    modelServingWizard
      .findDeploymentMethodRadio('llm-inference-service-simple-vllm')
      .should('not.be.checked');
  });

  it('should not select llm-d by default when isLLMdDefault is false', () => {
    initWizardIntercepts({ isLLMdDefault: false });
    navigateToDeploymentMethodStep();

    modelServingWizard
      .findDeploymentMethodRadio('llm-inference-service-llmd')
      .should('not.be.checked');
    modelServingWizard
      .findDeploymentMethodRadio('llm-inference-service-simple-vllm')
      .should('be.checked');
  });
});
