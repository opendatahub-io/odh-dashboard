import YAML from 'js-yaml';
import { runtimeCatalogPage } from '../../../../pages/runtimeCatalog';
import { runtimeCatalogDetailsPage } from '../../../../pages/runtimeCatalogDetails';
import { runtimeImageInstallPage } from '../../../../pages/modelDeploymentSettings/runtimeImageInstall';
import { llmAcceleratorConfigurations } from '../../../../pages/modelDeploymentSettings/llmAcceleratorConfigurations';
import { LDAP_ADMIN_USER } from '../../../../utils/e2eUsers';
import { loadRuntimeLibraryAcceleratorFixture } from '../../../../utils/dataLoader';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { getClipboardContent, stubClipboard } from '../../../../utils/clipboardUtils';
import {
  checkLLMInferenceServiceConfigState,
  cleanupLLMInferenceServiceConfig,
} from '../../../../utils/oc_commands/llmInferenceServiceConfig';
import { parseLibraryResource } from '../../../../utils/runtimeLibrary';
import type { LibraryResource, LibraryResourceMetadata } from '../../../../utils/runtimeLibrary';
import type { RuntimeLibraryAcceleratorTestData } from '../../../../types';

const uuid = generateTestUUID();
const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
let testData: RuntimeLibraryAcceleratorTestData;
let resourceName: string;
let displayName: string;
let editedVersion: string;
let source: LibraryResource;
let expectedMetadata: LibraryResourceMetadata;

// Install strips server metadata, but unlike the nested ServingRuntime retains namespace until submit.
const strippedConfigMetadata = [
  'resourceVersion',
  'uid',
  'creationTimestamp',
  'generation',
  'managedFields',
  'ownerReferences',
];

const normalizeAddedEmptyContainerResources = (
  sourceValue: unknown,
  persistedValue: unknown,
  isContainer = false,
): unknown => {
  if (Array.isArray(persistedValue)) {
    const sourceItems = Array.isArray(sourceValue) ? sourceValue : [];
    return persistedValue.map((item, index) =>
      normalizeAddedEmptyContainerResources(sourceItems[index], item, isContainer),
    );
  }
  if (typeof persistedValue !== 'object' || persistedValue === null) {
    return persistedValue;
  }

  const persistedRecord = persistedValue as Record<string, unknown>;
  const sourceRecord =
    typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)
      ? (sourceValue as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    Object.entries(persistedRecord).flatMap(([key, value]) => {
      if (
        isContainer &&
        key === 'resources' &&
        !Object.prototype.hasOwnProperty.call(sourceRecord, key) &&
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0
      ) {
        return [];
      }
      return [
        [
          key,
          normalizeAddedEmptyContainerResources(sourceRecord[key], value, key === 'containers'),
        ],
      ];
    }),
  );
};

describe('Install an LLM accelerator configuration from the Runtime library', () => {
  retryableBefore(() =>
    loadRuntimeLibraryAcceleratorFixture(
      'e2e/settings/llmAcceleratorConfigs/testRuntimeLibraryAcceleratorInstall.yaml',
    ).then((fixture) => {
      testData = fixture;
      resourceName = `${testData.resourceNamePrefix}-${uuid}`;
      displayName = `${testData.displayNamePrefix} ${uuid}`;
      editedVersion = `${testData.editedVersion}-${uuid}`;
      return cleanupLLMInferenceServiceConfig(resourceName);
    }),
  );

  after(() => {
    if (resourceName) {
      cleanupLLMInferenceServiceConfig(resourceName);
    }
  });

  it(
    'should install the first LLMInferenceServiceConfig search result as an accelerator configuration',
    {
      tags: ['@Dashboard', '@ModelServing', '@ModelServingCI', '@LLMDServingCI', '@Featureflagged'],
    },
    () => {
      cy.step('Log in as a platform administrator with the accelerator feature enabled');
      cy.visitWithLogin('/?devFeatureFlags=vLLMDeploymentOnMaaS=true', LDAP_ADMIN_USER);
      runtimeCatalogPage.navigate();

      cy.step(
        'Wait for library results, search for LLMInferenceServiceConfig, and open the first result',
      );
      runtimeCatalogPage.findCardDetailLinks().should('have.length.greaterThan', 0);
      runtimeCatalogPage.findSearchInput().clear();
      runtimeCatalogPage.findSearchInput().type(testData.searchTerm);
      runtimeCatalogPage.findSearchButton().click();
      runtimeCatalogPage.findFirstCardName().should('contain.text', testData.searchTerm);
      runtimeCatalogPage.findCardDetailLinks().first().click();

      cy.step('Read the full configuration shown to the user, then start installation');
      runtimeCatalogDetailsPage.findLlmInferenceServiceTab().should('be.visible').click();
      runtimeCatalogDetailsPage.readLlmInferenceServiceConfigYAML().then((sourceYAML) => {
        source = parseLibraryResource(
          YAML.load(sourceYAML, { schema: YAML.JSON_SCHEMA }),
          testData,
        );
      });
      runtimeCatalogDetailsPage
        .findRuntimeHeading()
        .invoke('text')
        .then((runtimeImageName) => {
          runtimeCatalogDetailsPage.findInstallAction().scrollIntoView().click();
          runtimeImageInstallPage.findPageTitle(runtimeImageName).should('be.visible');
        });

      cy.step('Verify complete YAML, name, resource name, and optional version prefill');
      runtimeImageInstallPage.findAcceleratorRadio().should('be.enabled').check();
      runtimeImageInstallPage.findNext().should('be.enabled').click();
      cy.then(() => {
        llmAcceleratorConfigurations
          .findNameInput()
          .should(
            'have.value',
            source.metadata.annotations?.['openshift.io/display-name'] || source.metadata.name,
          );
        llmAcceleratorConfigurations
          .findVersionInput()
          .should(
            'have.value',
            source.metadata.annotations?.['opendatahub.io/runtime-version'] ?? '',
          );
        llmAcceleratorConfigurations.findEditResourceNameLink().click();
        llmAcceleratorConfigurations
          .findResourceNameInput()
          .should('have.value', source.metadata.name);
      });
      // This editor does not use the dashboard wrapper that exposes window.monaco.
      // Stub the existing copy action to read complete YAML without browser clipboard permissions.
      stubClipboard('acceleratorPrefillYAML');
      llmAcceleratorConfigurations.findYAMLCodeEditor().copyToClipboard().click();
      getClipboardContent('acceleratorPrefillYAML')
        .should('have.length', 1)
        .then((copied) => {
          const prefill = parseLibraryResource(
            YAML.load(copied[0], { schema: YAML.JSON_SCHEMA }),
            testData,
          );
          expect(prefill.spec, 'Complete prefilled accelerator spec').to.deep.equal(source.spec);
          expect(prefill.metadata, 'Install-specific metadata cleanup').to.deep.equal({
            ...Cypress._.omit(source.metadata, strippedConfigMetadata),
            annotations: source.metadata.annotations ?? {},
          });
          expectedMetadata = {
            ...prefill.metadata,
            name: resourceName,
            namespace,
            labels: {
              ...prefill.metadata.labels,
              'opendatahub.io/dashboard': 'true',
              'opendatahub.io/config-type': testData.configType,
            },
            annotations: {
              ...prefill.metadata.annotations,
              'openshift.io/display-name': displayName,
              'opendatahub.io/runtime-version': editedVersion,
            },
          };
        });

      cy.step('Edit explicit name/version fields without replacing the catalog YAML');
      llmAcceleratorConfigurations.findNameInput().clear().type(displayName);
      llmAcceleratorConfigurations.findResourceNameInput().clear().type(resourceName);
      llmAcceleratorConfigurations.findVersionInput().clear().type(editedVersion);

      cy.step('Create the accelerator configuration through the user interface');
      llmAcceleratorConfigurations.findSubmitButton().should('be.enabled').click();

      cy.step('Verify the settings row and actual persisted accelerator configuration');
      cy.location('pathname').should('eq', testData.listPath);
      llmAcceleratorConfigurations.getRowByName(resourceName).find().should('be.visible');
      checkLLMInferenceServiceConfigState(resourceName, namespace).then(({ stdout }) => {
        const config = parseLibraryResource(JSON.parse(stdout), testData);
        const persistedSpec = Cypress._.cloneDeep(config.spec);
        if (!Object.prototype.hasOwnProperty.call(source.spec, 'model')) {
          // The live API defaulted the optional model to an empty URI during installation.
          expect(persistedSpec.model, 'API-defaulted optional model').to.deep.equal({ uri: '' });
          delete persistedSpec.model;
        }
        const normalizedPersistedSpec = normalizeAddedEmptyContainerResources(
          source.spec,
          persistedSpec,
        );
        expect(
          normalizedPersistedSpec,
          'Complete persisted accelerator spec (allowing only API-added empty container resources)',
        ).to.deep.equal(source.spec);
        expect(config.metadata.name).to.equal(resourceName);
        expect(config.metadata.namespace).to.equal(namespace);
        expect(config.metadata.labels).to.include(expectedMetadata.labels);
        expect(config.metadata.annotations).to.include(expectedMetadata.annotations);
      });
    },
  );
});
