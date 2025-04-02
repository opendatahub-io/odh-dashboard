/* eslint-disable camelcase */
import {
  mockCustomSecretK8sResource,
  mockK8sResourceList,
  mockSecretK8sResource,
} from '~/__mocks__';
import {
  ConfigMapModel,
  SecretModel,
  ServingRuntimeModel,
} from '~/__tests__/cypress/cypress/utils/models';
import { modelDetailsPage } from '~/__tests__/cypress/cypress/pages/modelCatalog/modelDetailsPage';
import { kserveModal } from '~/__tests__/cypress/cypress/pages/modelServing';
import { initDeployPrefilledModelIntercepts } from '~/__tests__/cypress/cypress/utils/modelServingUtils';
import type { ModelCatalogSource } from '~/concepts/modelCatalog/types';
import { mockModelCatalogSource } from '~/__mocks__/mockModelCatalogSource';
import { mockModelCatalogConfigMap } from '~/__mocks__/mockModelCatalogConfigMap';
import { modelCatalogDeployModal } from '~/__tests__/cypress/cypress/pages/modelCatalog/modelCatalogDeployModal';

type HandlersProps = {
  catalogModels?: ModelCatalogSource[];
  modelMeshInstalled?: boolean;
  kServeInstalled?: boolean;
};

const initIntercepts = ({
  catalogModels = [mockModelCatalogSource({})],
  modelMeshInstalled = true,
  kServeInstalled = true,
}: HandlersProps) => {
  initDeployPrefilledModelIntercepts({ modelMeshInstalled, kServeInstalled });

  cy.interceptK8s(
    {
      model: ConfigMapModel,
      ns: 'opendatahub',
      name: 'model-catalog-sources',
    },
    mockModelCatalogConfigMap(catalogModels),
  );
};

describe('Deploy catalog model', () => {
  it('Deploy catalog model on unsupported multi-model platform', () => {
    initIntercepts({ modelMeshInstalled: false });
    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    cy.wait('@getProjects');
    modelCatalogDeployModal.selectProjectByName('Model mesh project');
    cy.findByText('Multi-model platform is not installed').should('exist');
  });

  it('Deploy catalog model on unsupported single-model platform', () => {
    initIntercepts({ kServeInstalled: false });
    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    cy.wait('@getProjects');
    modelCatalogDeployModal.selectProjectByName('KServe project');
    cy.findByText('Single-model platform is not installed').should('exist');
  });

  it('Deploy catalog model on a project which platform is not selected', () => {
    initIntercepts({});
    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    modelCatalogDeployModal.selectProjectByName('Test project');
    cy.findByText(
      'To deploy a model, you must first select a model serving platform for this project.',
    ).should('exist');
  });

  it('Deploy catalog model on a model mesh project that has no model servers', () => {
    initIntercepts({});
    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));
    modelCatalogDeployModal.selectProjectByName('Model mesh project');
    cy.findByText('To deploy a model, you must first configure a model server.').should('exist');
  });

  it('OCI info alert is visible in case of OCI models', () => {
    initIntercepts({});
    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));
    cy.findByTestId('oci-deploy-kserve-alert').should('exist');
  });

  it('Selects Create Connection in case of no matching OCI connections', () => {
    initIntercepts({});
    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    modelCatalogDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The format of the source model is').should('not.exist');

    // Validate connection section
    kserveModal.findNewConnectionOption().should('be.checked');
    kserveModal.findModelURITextBox().should('have.value', 'test.io/test/private:test');
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
    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    modelCatalogDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    cy.findByText('The format of the source model is').should('not.exist');

    // Validate connection section
    kserveModal.findExistingUriOption().should('be.checked');
    cy.findByText('oci://registry.redhat.io/rhel/private:test').should('exist');
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
    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    modelCatalogDeployModal.selectProjectByName('KServe project');

    // Validate name input field
    kserveModal.findModelNameInput().should('exist');

    // Validate model framework section
    kserveModal.findModelFrameworkSelect().should('be.disabled');
    kserveModal.findServingRuntimeTemplateDropdown().findSelectOption('Multi Platform').click();
    kserveModal.findModelFrameworkSelect().should('be.enabled');

    // Validate connection section
    kserveModal.findNewConnectionOption().should('be.checked');
    kserveModal.findLocationBucketInput().should('have.value', 'test-bucket');
    kserveModal.findLocationEndpointInput().should('have.value', 'test-endpoint');
    kserveModal.findLocationRegionInput().should('have.value', 'test-region');
    kserveModal.findLocationPathInput().should('have.value', 'demo-models/test-path');
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
    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    modelCatalogDeployModal.selectProjectByName('KServe project');

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

    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    modelCatalogDeployModal.selectProjectByName('KServe project');

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

    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    modelCatalogDeployModal.selectProjectByName('KServe project');

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
          },
        }),
      ]),
    );

    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    modelCatalogDeployModal.selectProjectByName('KServe project');

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

    modelDetailsPage.visit();
    modelDetailsPage.findDeployModelButton().click();
    modelCatalogDeployModal.selectProjectByName('KServe project');

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
});
