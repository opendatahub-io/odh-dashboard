/* eslint-disable camelcase */
import {
  mockCustomSecretK8sResource,
  mockDashboardConfig,
  mockK8sResourceList,
  mockSecretK8sResource,
} from '#~/__mocks__';
import { mockRegisteredModelList } from '#~/__mocks__/mockRegisteredModelsList';
import {
  AcceleratorProfileModel,
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
import { mockModelRegistryService } from '#~/__mocks__/mockModelRegistryService';
import { modelVersionDeployModal } from '#~/__tests__/cypress/cypress/pages/modelRegistry/modelVersionDeployModal';
import { mockModelArtifactList } from '#~/__mocks__/mockModelArtifactList';
import { kserveModal } from '#~/__tests__/cypress/cypress/pages/modelServing';
import { mockModelArtifact } from '#~/__mocks__/mockModelArtifact';
import { initDeployPrefilledModelIntercepts } from '#~/__tests__/cypress/cypress/utils/modelServingUtils';
import { hardwareProfileSection } from '#~/__tests__/cypress/cypress/pages/components/HardwareProfileSection';
import {
  mockGlobalScopedAcceleratorProfiles,
  mockProjectScopedAcceleratorProfiles,
} from '#~/__mocks__/mockAcceleratorProfile';
import { acceleratorProfileSection } from '#~/__tests__/cypress/cypress/pages/components/subComponents/AcceleratorProfileSection';

const MODEL_REGISTRY_API_VERSION = 'v1alpha3';

type HandlersProps = {
  registeredModelsSize?: number;
  modelVersions?: ModelVersion[];
  modelMeshInstalled?: boolean;
  kServeInstalled?: boolean;
  disableProjectScoped?: boolean;
  disableHardwareProfiles?: boolean;
  isEmpty?: boolean;
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
  modelMeshInstalled = true,
  kServeInstalled = true,
  disableProjectScoped = true,
  disableHardwareProfiles = true,
  isEmpty = false,
}: HandlersProps) => {
  initDeployPrefilledModelIntercepts({
    modelMeshInstalled,
    kServeInstalled,
    disableProjectScoped,
    disableHardwareProfiles,
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
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    mockModelVersionList({
      items: modelVersions,
    }),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    registeredModelMocked,
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    modelVersionMocked,
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 2,
      },
    },
    modelVersionMocked2,
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    mockModelArtifactList({}),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 3,
      },
    },
    mockModelArtifactList({
      items: [mockModelArtifact({ uri: 'https://demo-models/some-path.zip' })],
    }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 4,
      },
    },
    mockModelArtifactList({
      items: [mockModelArtifact({ uri: 'oci://test.io/test/private:test' })],
    }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 5,
      },
    },
    mockModelArtifactList({
      items: [mockModelArtifact({ uri: 'oci://registry.redhat.io/rhel/private:test' })],
    }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 2,
      },
    },
    mockModelArtifactList({}),
  );

  // Mock accelerator profiles
  cy.interceptK8sList(
    { model: AcceleratorProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockGlobalScopedAcceleratorProfiles),
  ).as('acceleratorProfiles');

  cy.interceptK8sList(
    { model: AcceleratorProfileModel, ns: 'test-project' },
    mockK8sResourceList(mockProjectScopedAcceleratorProfiles),
  ).as('acceleratorProfiles');
};

// TODO: Fix these tests
describe.skip('Deploy model version', () => {
  it('Deploy model version on unsupported multi-model platform', () => {
    initIntercepts({ modelMeshInstalled: false });
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version');
    modelVersionRow.findKebabAction('Deploy').click();
    cy.wait('@getProjects');
    modelVersionDeployModal.selectProjectByName('Model mesh project');
    cy.findByText('Multi-model platform is not installed').should('exist');
  });

  it('Deploy model version on unsupported single-model platform', () => {
    initIntercepts({ kServeInstalled: false });
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version');
    modelVersionRow.findKebabAction('Deploy').click();
    cy.wait('@getProjects');
    modelVersionDeployModal.selectProjectByName('KServe project');
    cy.findByText('Single-model platform is not installed').should('exist');
  });

  it('Deploy model version on a project which platform is not selected', () => {
    initIntercepts({});
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('Test project');
    cy.findByText(
      'To deploy a model, you must first select a model serving platform for this project.',
    ).should('exist');
  });

  it('Deploy model version on a model mesh project that has no model servers', () => {
    initIntercepts({});
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version');
    modelVersionRow.findKebabAction('Deploy').click();
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));
    modelVersionDeployModal.selectProjectByName('Model mesh project');
    cy.findByText('To deploy a model, you must first configure a model server.').should('exist');
  });

  it('OCI info alert is visible in case of OCI models', () => {
    initIntercepts({});
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 3');
    modelVersionRow.findKebabAction('Deploy').click();
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));
    cy.findByTestId('oci-deploy-kserve-alert').should('exist');
  });

  it('Selects Create Connection in case of no matching OCI connections and verifies the prepopulation of Pull Access type', () => {
    initIntercepts({});
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 3');
    modelVersionRow.findKebabAction('Deploy').click();
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
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 4');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The format of the source model is').should('not.exist');

    // Validate connection section
    kserveModal.findExistingUriOption().should('be.checked');
    cy.findByText('oci://registry.redhat.io/rhel/private:test').should('exist');
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
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 4');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    kserveModal.findModelNameInput().should('exist');

    kserveModal.findServingRuntimeTemplateSearchSelector().click();

    // Verify both groups are initially visible
    cy.contains('Project-scoped serving runtimes').should('be.visible');
    cy.contains('Global serving runtimes').should('be.visible');

    // Search for a value that exists in Project-scoped serving runtimes but not in Global serving runtimes
    kserveModal.findServingRuntimeTemplateSearchInput().should('be.visible').type('OpenVino');

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
    acceleratorProfileSection.findProjectScopedLabel().should('exist');
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    kserveModal.findModelFrameworkSelect().should('have.text', 'openvino_ir - opset1');
    cy.findByText(
      `The format of the source model is ${modelArtifactMocked.modelFormatName ?? ''} - ${
        modelArtifactMocked.modelFormatVersion ?? ''
      }`,
    ).should('exist');

    // Check for global specific serving runtimes
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('Multi Platform').click();
    acceleratorProfileSection.findGlobalScopedLabel().should('exist');
    kserveModal.findModelFrameworkSelect().should('be.enabled');
    kserveModal.findModelFrameworkSelect().findSelectOption('onnx - 1').click();
    cy.findByText(
      `The format of the source model is ${modelArtifactMocked.modelFormatName ?? ''} - ${
        modelArtifactMocked.modelFormatVersion ?? ''
      }`,
    ).should('exist');

    // check model framework selection when serving runtime changes
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('Multi Platform').click();
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
    initIntercepts({ disableProjectScoped: false, disableHardwareProfiles: false });
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 4');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    kserveModal.findModelNameInput().should('exist');

    // Verify hardware profile section exists
    hardwareProfileSection.findSelect().should('exist');
    hardwareProfileSection.findSelect().click();
    // Read visible menu options from the open PF v6 menu and verify expected text
  });

  it('Display project specific accelerator profile while deploying', () => {
    initIntercepts({ disableProjectScoped: false });
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 4');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('Test project');
    kserveModal.findModelNameInput().should('exist');

    // Verify accelerator profile section exists
    acceleratorProfileSection.findAcceleratorProfileSearchSelector().should('exist');
    acceleratorProfileSection.findAcceleratorProfileSearchSelector().click();

    // verify available project-scoped accelerator profile
    const projectScopedAcceleratorProfile =
      acceleratorProfileSection.getProjectScopedAcceleratorProfile();
    projectScopedAcceleratorProfile
      .find()
      .findByRole('menuitem', {
        name: 'Small Profile nvidia.com/gpu',
        hidden: true,
      })
      .click();
    acceleratorProfileSection.findProjectScopedLabel().should('exist');

    // verify available global-scoped accelerator profile
    acceleratorProfileSection.findAcceleratorProfileSearchSelector().click();
    const globalScopedAcceleratorProfile =
      acceleratorProfileSection.getGlobalScopedAcceleratorProfile();
    globalScopedAcceleratorProfile
      .find()
      .findByRole('menuitem', {
        name: 'Small Profile Global nvidia.com/gpu',
        hidden: true,
      })
      .click();
    acceleratorProfileSection.findGlobalScopedLabel().should('exist');
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
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow(modelVersionMocked2.name);
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The format of the source model is').should('not.exist');
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('Multi Platform').click();
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
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow(modelVersionMocked2.name);
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The format of the source model is').should('not.exist');
    kserveModal.findServingRuntimeTemplateSearchSelector().click();
    kserveModal.findGlobalScopedTemplateOption('Multi Platform').click();
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
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 2');
    modelVersionRow.findKebabAction('Deploy').click();
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
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow(modelVersionMocked2.name);
    modelVersionRow.findKebabAction('Deploy').click();
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

    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version');
    modelVersionRow.findKebabAction('Deploy').click();
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

    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 2');
    modelVersionRow.findKebabAction('Deploy').click();
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

    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 3');
    modelVersionRow.findKebabAction('Deploy').click();
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

    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 2');
    modelVersionRow.findKebabAction('Deploy').click();
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
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 3');
    modelVersionRow.findKebabAction('Deploy').click();
    modelVersionDeployModal.selectProjectByName('KServe project');
    kserveModal.findSpinner().should('exist');
  });

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
    initIntercepts({ kServeInstalled: false });
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    cy.visit(`/ai-hub/registry/modelregistry-sample/registered-models/1/versions`);
    const modelVersionRow = modelRegistry.getModelVersionRow('test model version 4');
    modelVersionRow.findKebabAction('Deploy').click();
    cy.findByRole('tooltip').should(
      'contain.text',
      'To deploy this model, an administrator must first enable single-model serving in the cluster settings.',
    );
  });
});
