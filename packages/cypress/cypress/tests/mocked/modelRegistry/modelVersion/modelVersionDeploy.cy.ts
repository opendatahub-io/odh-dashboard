/* eslint-disable camelcase */
import {
  mockCustomSecretK8sResource,
  mockDashboardConfig,
  mockK8sResourceList,
  mockSecretK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mockRegisteredModelList } from '@odh-dashboard/internal/__mocks__/mockRegisteredModelsList';
import { mockModelVersionList } from '@odh-dashboard/internal/__mocks__/mockModelVersionList';
import { mockModelVersion } from '@odh-dashboard/internal/__mocks__/mockModelVersion';
import type { ModelVersion } from '@odh-dashboard/internal/concepts/modelRegistry/types';
import { ModelState } from '@odh-dashboard/internal/concepts/modelRegistry/types';
import { mockRegisteredModel } from '@odh-dashboard/internal/__mocks__/mockRegisteredModel';
import {
  mockModelRegistry,
  mockModelRegistryService,
} from '@odh-dashboard/internal/__mocks__/mockModelRegistryService';
import { mockModelArtifactList } from '@odh-dashboard/internal/__mocks__/mockModelArtifactList';
import { mockModelArtifact } from '@odh-dashboard/internal/__mocks__/mockModelArtifact';
import { ModelTypeLabel } from '@odh-dashboard/model-serving/components/deploymentWizard/types';
import { modelRegistry } from '../../../../pages/modelRegistry';
import { modelVersionDeployModal } from '../../../../pages/modelRegistry/modelVersionDeployModal';
import { SecretModel, ServiceModel } from '../../../../utils/models';
import { initDeployPrefilledModelIntercepts } from '../../../../utils/modelServingUtils';
import { modelDetails } from '../../../../pages/modelRegistry/modelDetails';
import { modelVersionDetails } from '../../../../pages/modelRegistry/modelVersionDetails';
import { modelServingWizard } from '../../../../pages/modelServing';

const MODEL_REGISTRY_API_VERSION = 'v1';

type HandlersProps = {
  registeredModelsSize?: number;
  modelVersions?: ModelVersion[];
  disableProjectScoped?: boolean;
  isEmpty?: boolean;
  disableKServe?: boolean;
  disableNIMModelServing?: boolean;
};

const registeredModelMocked = mockRegisteredModel({ name: 'test-1' });
const modelVersionMocked = mockModelVersion({
  id: '1',
  name: 'test model version',
  state: ModelState.LIVE,
});
const modelVersionMocked2 = mockModelVersion({
  id: '2',
  name: 'model version'.repeat(15),
  state: ModelState.LIVE,
});
//const modelArtifactMocked = mockModelArtifact();

const initIntercepts = ({
  registeredModelsSize = 4,
  modelVersions = [
    mockModelVersion({ id: '1', name: 'test model version' }),
    mockModelVersion({ id: '2', name: modelVersionMocked2.name }),
    mockModelVersion({ id: '3', name: 'test model version 2' }),
    mockModelVersion({ id: '4', name: 'test model version 3' }),
    mockModelVersion({ id: '5', name: 'test model version 4' }),
  ],
  disableProjectScoped = true,
  disableKServe = false,
  disableNIMModelServing = true,
  isEmpty = false,
}: HandlersProps) => {
  initDeployPrefilledModelIntercepts({
    disableProjectScoped,
    disableKServe,
    disableNIMModelServing,
    isEmpty,
  });

  // Additional intercepts needed for wizard to load properly
  cy.interceptOdh('GET /api/components', null, []);

  // Namespace context intercept (needed for addSupportServingPlatformProject)
  cy.interceptOdh(
    'GET /api/namespaces/:namespace/:context',
    { path: { namespace: 'kserve-project', context: '*' } },
    { applied: true },
  );

  cy.interceptK8sList(
    ServiceModel,
    mockK8sResourceList([mockModelRegistryService({ name: 'modelregistry-sample' })]),
  );

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models',
    { path: { modelRegistryName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION } },
    {
      data: mockRegisteredModelList({
        items: [mockRegisteredModel({})],
        size: registeredModelsSize,
      }),
    },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: [mockModelRegistry({ name: 'modelregistry-sample' })] },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    { data: registeredModelMocked },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId/versions`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    {
      data: mockModelVersionList({
        items: modelVersions,
      }),
    },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    { data: modelVersionMocked },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    { data: modelVersionMocked },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 2,
      },
    },
    { data: modelVersionMocked2 },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 3,
      },
    },
    { data: mockModelVersion({ id: '3', name: 'test model version 2' }) },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 4,
      },
    },
    { data: mockModelVersion({ id: '4', name: 'test model version 3' }) },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 5,
      },
    },
    { data: mockModelVersion({ id: '5', name: 'test model version 4' }) },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/user`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/namespaces`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: [{ metadata: { name: 'odh-model-registries' } }] },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    { data: mockModelArtifactList({}) },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 2,
      },
    },
    { data: mockModelArtifactList({}) },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 3,
      },
    },
    {
      data: mockModelArtifactList({
        items: [mockModelArtifact({ uri: 'https://demo-models/some-path.zip' })],
      }),
    },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 4,
      },
    },
    {
      data: mockModelArtifactList({
        items: [mockModelArtifact({ uri: 'oci://test.io/test/private:test' })],
      }),
    },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 5,
      },
    },
    {
      data: mockModelArtifactList({
        items: [mockModelArtifact({ uri: 'oci://registry.redhat.io/rhel/private:test' })],
      }),
    },
  );
};

describe('Deploy action button', () => {
  it('Deploy action button is disabled in the model details page when there are no live versions', () => {
    initIntercepts({});
    cy.interceptOdh(
      `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId/versions`,
      {
        path: {
          modelRegistryName: 'modelregistry-sample',
          apiVersion: MODEL_REGISTRY_API_VERSION,
          registeredModelId: 1,
        },
      },
      {
        data: mockModelVersionList({
          items: [],
        }),
      },
    );
    modelDetails.visit();
    modelDetails.findModelVersionActionToggle().findDropdownItem('Deploy').should('not.exist');
  });

  it('Deploy action button is visible in the model details page when there are live versions', () => {
    initIntercepts({});
    modelDetails.visit();
    modelDetails.findModelActionToggle().findDropdownItem('Deploy test model version').click();
    cy.wait('@getProjects');
    modelVersionDeployModal.shouldBeOpen();
  });
});

describe('Model version deploy kebab action works', () => {
  it('does not show deploy in the kebab menu option when model serving is disabled', () => {
    initIntercepts({});
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableModelServing: true,
      }),
    );
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 3');
    modelVersionRow.findKebab().click();
    cy.get('[role="menu"]').within(() => {
      cy.contains('Deploy').should('not.exist');
    });
  });

  it('shows a disabled deploy menu option in the kebab menu for the model with OCI URI when kserve is disabled', () => {
    initIntercepts({ disableKServe: true });
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 4');
    modelVersionRow.findKebabAction('Deploy').should('have.attr', 'aria-disabled');
  });
});

describe('Deploy model version', () => {
  it('Deploy model version on unsupported single-model platform', () => {
    initIntercepts({ disableKServe: true });
    modelVersionDetails.visit();
    modelVersionDetails.findDeployModelButton().click();
    cy.findByRole('tooltip').should(
      'contain.text',
      'To enable model serving, an administrator must first select a model serving platform in the cluster settings.',
    );
  });

  it('Selects Create Connection in case of no matching OCI connections and verifies the prepopulation of Pull Access type', () => {
    initIntercepts({});
    modelVersionDetails.visit(undefined, undefined, '4');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    modelVersionDeployModal.findDeployButton().click();

    // Wait for wizard to open
    cy.url().should('include', '/ai-hub/deployments/deploy');

    // Step 1: Model source - verify we're on this step
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.disabled');

    // Validate OCI model URI and connection setup is in model source
    modelServingWizard.findOCIModelURI().should('have.value', 'test.io/test/private:test');

    // Verify Pull Access type is checked
    cy.findByTestId('field ACCESS_TYPE').click();
    cy.get('.pf-v6-c-menu')
      .contains('Pull secret')
      .parent()
      .find('input[type="checkbox"]')
      .should('be.checked');
  });

  it('Display project specific serving runtimes while deploying', () => {
    initIntercepts({ disableProjectScoped: false });
    modelVersionDetails.visit(undefined, undefined, '5');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    modelVersionDeployModal.findDeployButton().click();

    // Wait for wizard to open
    cy.url().should('include', '/ai-hub/deployments/deploy');

    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelLocationSelectOption('URI').should('exist').click();
    modelServingWizard.findUrilocationInput().type('https://registry.redhat.io/rhel/private:test');
    modelServingWizard.findSaveConnectionCheckbox().click();
    modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizard.findModelDeploymentStep().should('be.enabled');
    modelServingWizard.findModelDeploymentNameInput().should('exist');

    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();

    // Verify both groups are initially visible
    cy.contains('Project-scoped serving runtimes').should('be.visible');
    cy.contains('Global serving runtimes').should('be.visible');

    // Search for a value that exists in Project-scoped serving runtimes but not in Global serving runtimes
    modelServingWizard
      .findServingRuntimeTemplateSearchInput()
      .should('be.visible')
      .type('OpenVino local');

    // Wait for and verify the groups are visible
    cy.contains('Project-scoped serving runtimes').should('be.visible');
    modelServingWizard.getGlobalServingRuntimesLabel().should('not.exist');

    // Search for a value that doesn't exist in either Global serving runtimes or Project-scoped serving runtimes
    modelServingWizard
      .findServingRuntimeTemplateSearchInput()
      .should('be.visible')
      .clear()
      .type('sample');

    // Wait for and verify that no results are found
    cy.contains('No results found').should('be.visible');
    modelServingWizard.getGlobalServingRuntimesLabel().should('not.exist');
    modelServingWizard.getProjectScopedServingRuntimesLabel().should('not.exist');
    modelServingWizard.findServingRuntimeTemplateSearchInput().should('be.visible').clear();

    // Check for project specific serving runtimes
    modelServingWizard.findProjectScopedTemplateOption('Caikit').click();
    modelServingWizard.findProjectScopedLabel().should('exist');

    // Check for global specific serving runtimes
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.findGlobalScopedTemplateOption('OpenVINO').click();
    modelServingWizard.findGlobalScopedLabel().should('exist');
  });

  it('Display project specific hardware profile while deploying', () => {
    initIntercepts({ disableProjectScoped: false });
    modelVersionDetails.visit(undefined, undefined, '5');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('Test project');
    modelVersionDeployModal.findDeployButton().click();

    // Wait for wizard to open
    cy.url().should('include', '/ai-hub/deployments/deploy');

    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelLocationSelectOption('URI').should('exist').click();
    modelServingWizard.findUrilocationInput().type('https://registry.redhat.io/rhel/private:test');
    modelServingWizard.findSaveConnectionCheckbox().click();
    modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizard.findModelDeploymentStep().should('be.enabled');
    modelServingWizard.findModelDeploymentNameInput().should('exist');
    modelServingWizard
      .findModelDeploymentNameInput()
      .should('have.value', 'test-1 - test model version 4');

    // Verify project specific hardware profile is displayed
    // Wait for all hardware profiles to load (both namespaces) to avoid rerender during click
    // cy.wait('@hardwareProfiles');
    // cy.wait('@hardwareProfiles');
    // // Use force: true to bypass actionability checks during rerender
    // cy.findByTestId('hardware-profile-select').click({ force: true });
    // hardwareProfileSection.selectProjectScopedProfile('Large Profile-1');
    // hardwareProfileSection.findProjectScopedLabel().should('exist');
  });

  it('Prefills new connection in case of no matching connections', () => {
    initIntercepts({});
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockSecretK8sResource({
          name: 'test-secret-not-match',
          displayName: 'Test Secret Not Match',
          namespace: 'kserve-project',
          s3Bucket: 'dGVzdC1idWNrZXQ=',
          endPoint: 'dGVzdC1lbmRwb2ludC1ub3QtbWF0Y2g=', // endpoint not match
          region: 'dGVzdC1yZWdpb24=',
        }),
      ]),
    );
    modelVersionDetails.visit(undefined, undefined, '2');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    modelVersionDeployModal.findDeployButton().click();

    // Wait for wizard to open
    cy.url().should('include', '/ai-hub/deployments/deploy');

    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');

    // Validate connection section - should be creating a new connection
    cy.findByTestId('field AWS_S3_BUCKET').should('have.value', 'test-bucket');
    cy.findByTestId('field AWS_S3_ENDPOINT').should('have.value', 'test-endpoint');
    cy.findByTestId('field AWS_DEFAULT_REGION').should('have.value', 'test-region');
    modelServingWizard.findLocationPathInput().should('have.value', 'demo-models/test-path');
  });

  it('Prefills when there is one s3 matching connection', () => {
    initIntercepts({});
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockSecretK8sResource({
          namespace: 'kserve-project',
          s3Bucket: 'dGVzdC1idWNrZXQ=',
          endPoint: 'dGVzdC1lbmRwb2ludA==',
          region: 'dGVzdC1yZWdpb24=',
        }),
        mockSecretK8sResource({
          name: 'test-secret-not-match',
          displayName: 'Test Secret Not Match',
          namespace: 'kserve-project',
          s3Bucket: 'dGVzdC1idWNrZXQ=',
          endPoint: 'dGVzdC1lbmRwb2ludC1ub3QtbWF0Y2g=', // endpoint not match
          region: 'dGVzdC1yZWdpb24=',
        }),
      ]),
    );

    modelVersionDetails.visit(undefined, undefined, '1');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    modelVersionDeployModal.findConnectionSelect().should('exist');
    modelVersionDeployModal.findConnectionSelect().should('have.attr', 'disabled');
    modelVersionDeployModal.findDeployButton().click();

    // Wait for wizard to open
    cy.url().should('include', '/ai-hub/deployments/deploy');

    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');

    // Validate connection section - should use existing connection
    modelServingWizard.findExistingConnectionValue().should('have.value', 'Test Secret');
    modelServingWizard.findLocationPathInput().should('have.value', 'demo-models/test-path');
  });

  it('Prefills when there is one URI matching connection', () => {
    initIntercepts({});
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockCustomSecretK8sResource({
          namespace: 'kserve-project',
          name: 'test-secret',
          annotations: {
            'opendatahub.io/connection-type': 'uri-v1',
            'openshift.io/display-name': 'Test Secret',
          },
          data: { URI: 'aHR0cHM6Ly9kZW1vLW1vZGVscy9zb21lLXBhdGguemlw' },
        }),
      ]),
    );

    modelVersionDetails.visit(undefined, undefined, '3');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    modelVersionDeployModal.findDeployButton().click();

    // Wait for wizard to open
    cy.url().should('include', '/ai-hub/deployments/deploy');

    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');

    // Validate connection section - should use existing connection
    modelServingWizard.findExistingConnectionSelect().should('exist');
    modelServingWizard.findExistingConnectionValue().should('have.value', 'Test Secret');
  });

  it('Prefills when there is one OCI matching connection', () => {
    initIntercepts({});
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockCustomSecretK8sResource({
          namespace: 'kserve-project',
          name: 'test-secret',
          annotations: {
            'opendatahub.io/connection-type': 'oci-v1',
            'openshift.io/display-name': 'Test Secret',
          },
          data: {
            '.dockerconfigjson': 'aHR0cHM6Ly9kZW1vLW1vZGVscy9zb21lLXBhdGguemlw',
            OCI_HOST: 'dGVzdC5pby90ZXN0',
            ACCESS_TYPE: 'WyJQdWxsIl0',
          },
        }),
      ]),
    );

    modelVersionDetails.visit(undefined, undefined, '4');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    modelVersionDeployModal.findDeployButton().click();

    // Wait for wizard to open
    cy.url().should('include', '/ai-hub/deployments/deploy');

    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');

    // Validate connection section - should use existing connection
    cy.findByText('test.io/test').should('exist');
    modelServingWizard.findOCIModelURI().should('have.value', 'test.io/test/private:test');
  });

  it('Selects existing connection when there are 2 matching connections', () => {
    initIntercepts({});
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockCustomSecretK8sResource({
          namespace: 'kserve-project',
          name: 'test-secret',
          annotations: {
            'opendatahub.io/connection-type': 'uri-v1',
            'openshift.io/display-name': 'Test Secret',
          },
          data: { URI: 'aHR0cHM6Ly9kZW1vLW1vZGVscy9zb21lLXBhdGguemlw' },
        }),
        mockCustomSecretK8sResource({
          namespace: 'kserve-project',
          name: 'test-secret-2',
          annotations: {
            'opendatahub.io/connection-type': 'uri-v1',
            'openshift.io/display-name': 'Test Secret Match 2',
          },
          data: { URI: 'aHR0cHM6Ly9kZW1vLW1vZGVscy9zb21lLXBhdGguemlw' },
        }),
      ]),
    );

    modelVersionDetails.visit(undefined, undefined, '3');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate connection selection section appears with 2 matching connections
    modelVersionDeployModal.findConnectionSelectionSection().should('exist');
    modelVersionDeployModal.findConnectionSelectValue().should('be.empty');

    // Deploy button should be disabled until a connection is selected
    modelVersionDeployModal.findDeployButton().should('be.disabled');

    // Select a connection
    modelVersionDeployModal.findConnectionSelect().click();
    cy.findByRole('option', {
      name: 'Test Secret Type: URI - v1',
      hidden: true,
    }).click();

    // Now deploy button should be enabled
    modelVersionDeployModal.findDeployButton().should('be.enabled');
    modelVersionDeployModal.findDeployButton().click();

    // Wait for wizard to open
    cy.url().should('include', '/ai-hub/deployments/deploy');

    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');

    // Validate that the selected connection is used
    modelServingWizard.findExistingConnectionValue().should('have.value', 'Test Secret');
  });

  it('Deploy modal will show spinner, if the data is still loading', () => {
    initIntercepts({ isEmpty: true });
    modelVersionDetails.visit(undefined, undefined, '4');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    modelVersionDeployModal.findDeployButton().click();

    // Wizard should show spinner while data is loading
    modelServingWizard.findSpinner().should('exist');
    // Wait for wizard to open
    cy.url().should('include', '/ai-hub/deployments');
  });
});
