/* eslint-disable camelcase */
import {
  mockCustomSecretK8sResource,
  mockDashboardConfig,
  mockK8sResourceList,
  mockSecretK8sResource,
} from '#~/__mocks__';
import { mockRegisteredModelList } from '#~/__mocks__/mockRegisteredModelsList';
import {
  SecretModel,
  ServiceModel,
  ServingRuntimeModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mockModelVersionList } from '#~/__mocks__/mockModelVersionList';
import { mockModelVersion } from '#~/__mocks__/mockModelVersion';
import type { ModelVersion } from '#~/concepts/modelRegistry/types';
import { ModelState } from '#~/concepts/modelRegistry/types';
import { mockRegisteredModel } from '#~/__mocks__/mockRegisteredModel';
import { modelRegistry } from '#~/__tests__/cypress/cypress/pages/modelRegistry';
import { mockModelRegistry, mockModelRegistryService } from '#~/__mocks__/mockModelRegistryService';
import { modelVersionDeployModal } from '#~/__tests__/cypress/cypress/pages/modelRegistry/modelVersionDeployModal';
import { mockModelArtifactList } from '#~/__mocks__/mockModelArtifactList';
import { kserveModal } from '#~/__tests__/cypress/cypress/pages/modelServing';
import { mockModelArtifact } from '#~/__mocks__/mockModelArtifact';
import { initDeployPrefilledModelIntercepts } from '#~/__tests__/cypress/cypress/utils/modelServingUtils';
import { hardwareProfileSection } from '#~/__tests__/cypress/cypress/pages/components/HardwareProfileSection';
import { modelDetails } from '#~/__tests__/cypress/cypress/pages/modelRegistry/modelDetails';
import { modelVersionDetails } from '#~/__tests__/cypress/cypress/pages/modelRegistry/modelVersionDetails';

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
const modelArtifactMocked = mockModelArtifact();

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

  cy.interceptK8sList(
    ServiceModel,
    mockK8sResourceList([mockModelRegistryService({ name: 'modelregistry-sample' })]),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models',
    { path: { serviceName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION } },
    mockRegisteredModelList({ size: registeredModelsSize }),
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

  it('OCI info alert is visible in case of OCI models', () => {
    initIntercepts({});
    modelVersionDetails.visit(undefined, undefined, '4');
    modelVersionDetails.findDeployModelButton().click();
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));
    cy.findByTestId('oci-deploy-kserve-alert').should('exist');
  });

  it('Selects Create Connection in case of no matching OCI connections and verifies the prepopulation of Pull Access type', () => {
    initIntercepts({});
    modelVersionDetails.visit(undefined, undefined, '4');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The format of the source model is').should('not.exist');

    // Validate connection section
    kserveModal.findModelURITextBox().should('have.value', 'test.io/test/private:test');
    kserveModal
      .findConnectionFieldInput('ACCESS_TYPE')
      .click()
      .then(() => {
        kserveModal.verifyPullSecretCheckbox();
      });
  });

  it('Selects Current URI in case of built-in registry OCI connections', () => {
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
            OCI_HOST: 'cmVnaXN0cnkucmVkaGF0LmlvL3JoZWw=',
          },
        }),
      ]),
    );
    modelVersionDetails.visit(undefined, undefined, '5');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The format of the source model is').should('not.exist');

    // Validate connection section
    kserveModal.findExistingUriOption().should('be.checked');
    // There is one in the modal and one in the details page
    cy.findAllByText('oci://registry.redhat.io/rhel/private:test').should('have.length', 2);
  });

  it('Display project specific serving runtimes while deploying', () => {
    initIntercepts({ disableProjectScoped: false });
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
            OCI_HOST: 'cmVnaXN0cnkucmVkaGF0LmlvL3JoZWw=',
          },
        }),
      ]),
    );
    modelVersionDetails.visit(undefined, undefined, '5');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    kserveModal.findModelNameInput().should('exist');

    kserveModal.findServingRuntimeTemplateSearchSelector().click();

    // Verify both groups are initially visible
    cy.contains('Project-scoped serving runtimes').should('be.visible');
    cy.contains('Global serving runtimes').should('be.visible');

    // Search for a value that exists in Project-scoped serving runtimes but not in Global serving runtimes
    kserveModal.findServingRuntimeTemplateSearchInput().should('be.visible').type('OpenVino local');

    // Wait for and verify the groups are visible
    cy.contains('Project-scoped serving runtimes').should('be.visible');
    kserveModal.getGlobalServingRuntimesLabel().should('not.exist');

    // Search for a value that doesn't exist in either Global serving runtimes or Project-scoped serving runtimes
    kserveModal.findServingRuntimeTemplateSearchInput().should('be.visible').clear().type('sample');

    // Wait for and verify that no results are found
    cy.contains('No results found').should('be.visible');
    kserveModal.getGlobalServingRuntimesLabel().should('not.exist');
    kserveModal.getProjectScopedServingRuntimesLabel().should('not.exist');
    kserveModal.findServingRuntimeTemplateSearchInput().should('be.visible').clear();

    // Check for project specific serving runtimes
    kserveModal.findProjectScopedTemplateOption('Caikit').click();
    kserveModal.findProjectScopedLabel().should('exist');
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    kserveModal.findModelFrameworkSelect().should('have.text', 'openvino_ir - opset1');
    cy.findByText(
      `The format of the source model is ${modelArtifactMocked.modelFormatName ?? ''} - ${
        modelArtifactMocked.modelFormatVersion ?? ''
      }`,
    ).should('exist');

    // Check for global specific serving runtimes
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('OpenVINO').click();
    kserveModal.findGlobalScopedLabel().should('exist');
    kserveModal.findModelFrameworkSelect().should('be.enabled');
    kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
    cy.findByText(
      `The format of the source model is ${modelArtifactMocked.modelFormatName ?? ''} - ${
        modelArtifactMocked.modelFormatVersion ?? ''
      }`,
    ).should('exist');

    // check model framework selection when serving runtime changes
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('OpenVINO').click();
    kserveModal.findModelFrameworkSelect().should('have.text', 'onnx - 1');

    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('Caikit').click();
    kserveModal.findModelFrameworkSelect().should('be.enabled');
    kserveModal.findModelFrameworkSelect().should('have.text', 'Select a framework');

    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findProjectScopedTemplateOption('Caikit').click();
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    kserveModal.findModelFrameworkSelect().should('have.text', 'openvino_ir - opset1');
  });

  it('Display project specific hardware profile while deploying', () => {
    initIntercepts({ disableProjectScoped: false });
    modelVersionDetails.visit(undefined, undefined, '5');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    kserveModal.findModelNameInput().should('exist');

    // Verify hardware profile section exists
    hardwareProfileSection.findSelect().should('exist');
    hardwareProfileSection.findSelect().click();
    // Read visible menu options from the open PF v6 menu and verify expected text
  });

  it('Selects Create Connection in case of no matching connections', () => {
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

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The format of the source model is').should('not.exist');
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('OpenVINO').click();
    kserveModal.findModelFrameworkSelect().should('be.enabled');
    cy.findByText(
      `The format of the source model is ${modelArtifactMocked.modelFormatName ?? ''} - ${
        modelArtifactMocked.modelFormatVersion ?? ''
      }`,
    ).should('exist');

    // Validate connection section
    kserveModal.findNewConnectionOption().should('be.checked');
    kserveModal.findConnectionNameInput().should('have.value', 'test storage key');
    kserveModal.findLocationBucketInput().should('have.value', 'test-bucket');
    kserveModal.findLocationEndpointInput().should('have.value', 'test-endpoint');
    kserveModal.findLocationRegionInput().should('have.value', 'test-region');
    kserveModal.findLocationPathInput().should('have.value', 'demo-models/test-path');
  });

  it('Selects Create Connection in case of no connections in project', () => {
    initIntercepts({});
    modelVersionDetails.visit(undefined, undefined, '2');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The format of the source model is').should('not.exist');
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('OpenVINO').click();
    kserveModal.findModelFrameworkSelect().should('be.enabled');
    cy.findByText(
      `The format of the source model is ${modelArtifactMocked.modelFormatName ?? ''} - ${
        modelArtifactMocked.modelFormatVersion ?? ''
      }`,
    ).should('exist');

    // Validate connection section
    kserveModal.findConnectionNameInput().should('have.value', 'test storage key');
    kserveModal.findLocationBucketInput().should('have.value', 'test-bucket');
    kserveModal.findLocationEndpointInput().should('have.value', 'test-endpoint');
    kserveModal.findLocationRegionInput().should('have.value', 'test-region');
    kserveModal.findLocationPathInput().should('have.value', 'demo-models/test-path');
  });

  it('Selects Create Connection in case of no matching URI connections', () => {
    initIntercepts({});
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockCustomSecretK8sResource({
          namespace: 'kserve-project',
          name: 'test-secret',
          annotations: {
            'opendatahub.io/connection-type': 'uri-v1-1',
            'openshift.io/display-name': 'Test Secret-1',
          },
          data: { URI: 'aHR0cDovL3Rlc3Rz' },
        }),
      ]),
    );
    modelVersionDetails.visit(undefined, undefined, '3');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    kserveModal
      .findConnectionFieldInput('URI')
      .should('have.value', 'https://demo-models/some-path.zip');
    kserveModal.selectConnectionType(
      'OCI compliant registry - v1 Connection type description Category: Database, Testing',
    );
    kserveModal.findOCIModelURI().should('have.value', '');
  });

  it('Check whether all data is still persistent, if user changes connection types', () => {
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

    // Validate connection section
    kserveModal.findNewConnectionOption().should('be.checked');
    kserveModal.findLocationBucketInput().should('have.value', 'test-bucket');
    kserveModal.findLocationEndpointInput().should('have.value', 'test-endpoint');
    kserveModal.findLocationRegionInput().should('have.value', 'test-region');
    kserveModal.findLocationPathInput().should('have.value', 'demo-models/test-path');
    kserveModal.findLocationAccessKeyInput().type('test-access-key');
    kserveModal.findLocationSecretKeyInput().type('test-secret-key');

    kserveModal.selectConnectionType(
      'URI - v1 Connection type description Category: existing-category',
    );

    kserveModal.findConnectionFieldInput('URI').type('http://test-uri');

    // switch the connection type to OCI and fill data
    kserveModal.selectConnectionType(
      'OCI compliant registry - v1 Connection type description Category: Database, Testing',
    );

    kserveModal.findBaseURL().type('oci://test');
    kserveModal.findModelURITextBox().type('test.io/test/private:test');

    // switch the connection type to s3 to check whether all the data is still persistent
    kserveModal.selectConnectionType(
      'S3 compatible object storage - v1 description 2 Category: existing-category',
    );

    kserveModal.findLocationBucketInput().should('have.value', 'test-bucket');
    kserveModal.findLocationEndpointInput().should('have.value', 'test-endpoint');
    kserveModal.findLocationRegionInput().should('have.value', 'test-region');
    kserveModal.findLocationPathInput().should('have.value', 'demo-models/test-path');
    kserveModal.findLocationAccessKeyInput().should('have.value', 'test-access-key');
    kserveModal.findLocationSecretKeyInput().should('have.value', 'test-secret-key');

    //switch it back to uri
    kserveModal.selectConnectionType(
      'URI - v1 Connection type description Category: existing-category',
    );

    kserveModal.findConnectionFieldInput('URI').should('have.value', 'http://test-uri');
    // oci-connection
    kserveModal.selectConnectionType(
      'OCI compliant registry - v1 Connection type description Category: Database, Testing',
    );

    kserveModal.findModelURITextBox().should('have.value', 'test.io/test/private:test');
    kserveModal.findBaseURL().should('have.value', 'oci://test');
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

    // Validate connection section
    kserveModal.findExistingConnectionOption().should('be.checked');
    kserveModal.findExistingConnectionSelectValueField().should('have.value', 'Test Secret');
    kserveModal.findLocationPathInput().should('have.value', 'demo-models/test-path');
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

    // Validate connection section
    kserveModal.findExistingConnectionOption().should('be.checked');
    kserveModal.findExistingConnectionSelectValueField().should('have.value', 'Test Secret');
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

    // Validate connection section
    kserveModal.findExistingConnectionOption().should('be.checked');
    cy.findByText('test.io/test').should('exist');
    kserveModal.findModelURITextBox().should('have.value', 'test.io/test/private:test');
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

    // Validate connection section
    kserveModal.findExistingConnectionOption().should('be.checked');
    kserveModal.findExistingConnectionSelectValueField().should('be.empty');
    kserveModal
      .findExistingConnectionSelectValueField()
      .findSelectOption('Test Secret Recommended Type: URI - v1')
      .should('exist');
    kserveModal
      .findExistingConnectionSelectValueField()
      .findSelectOption('Test Secret Match 2 Recommended Type: URI - v1')
      .should('exist');
  });

  it('Deploy modal will show spinner, if the data is still loading', () => {
    initIntercepts({ isEmpty: true });
    modelVersionDetails.visit(undefined, undefined, '4');
    modelVersionDetails.findDeployModelButton().click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    kserveModal.findSpinner().should('exist');
  });
});
