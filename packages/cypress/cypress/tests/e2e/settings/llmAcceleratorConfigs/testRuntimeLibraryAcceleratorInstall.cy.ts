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

      cy.step('Search for LLMInferenceServiceConfig and open the first displayed result');
      runtimeCatalogPage.findSearchInput().clear().type(testData.searchTerm);
      runtimeCatalogPage.findSearchButton().click();
      runtimeCatalogPage.findCardDetailLinks().should('have.length.greaterThan', 0).first().click();

      cy.step('Read the full configuration shown to the user, then start installation');
      runtimeCatalogDetailsPage.findLlmInferenceServiceTab().should('be.visible').click();
      stubClipboard('acceleratorYAML');
      runtimeCatalogDetailsPage.findLlmInferenceServiceCopyButton().click();
      getClipboardContent('acceleratorYAML')
        .should('have.length', 1)
        .then((copied) => {
          source = parseLibraryResource(
            YAML.load(copied[0], { schema: YAML.JSON_SCHEMA }),
            testData,
          );
        });
      runtimeCatalogDetailsPage
        .findRuntimeHeading()
        .invoke('text')
        .then((runtimeImageName) => {
          runtimeCatalogDetailsPage.findInstallAction().should('be.visible').click();
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
      // Read its complete YAML through the existing copy control instead of relying on that global.
      llmAcceleratorConfigurations.findYAMLCodeEditor().copyToClipboard().click();
      getClipboardContent('acceleratorYAML')
        .should('have.length', 2)
        .then((copied) => {
          const prefill = parseLibraryResource(
            YAML.load(copied[1], { schema: YAML.JSON_SCHEMA }),
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
        expect(config.spec, 'Complete persisted accelerator spec').to.deep.equal(source.spec);
        expect(config.metadata.name).to.equal(resourceName);
        expect(config.metadata.namespace).to.equal(namespace);
        expect(config.metadata.labels).to.include(expectedMetadata.labels);
        expect(config.metadata.annotations).to.include(expectedMetadata.annotations);
      });
    },
  );
});
