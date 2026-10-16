import YAML from 'js-yaml';
import { ServingRuntimeModelType } from '@odh-dashboard/model-serving/shared';
import { runtimeCatalogPage } from '../../../../pages/runtimeCatalog';
import { runtimeCatalogDetailsPage } from '../../../../pages/runtimeCatalogDetails';
import { runtimeImageInstallPage } from '../../../../pages/modelDeploymentSettings/runtimeImageInstall';
import { servingRuntimeTemplates } from '../../../../pages/modelDeploymentSettings/servingRuntimeTemplates';
import { LDAP_ADMIN_USER } from '../../../../utils/e2eUsers';
import { loadRuntimeLibraryTemplateFixture } from '../../../../utils/dataLoader';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { getClipboardContent, stubClipboard } from '../../../../utils/clipboardUtils';
import {
  checkServingRuntimeAbsent,
  cleanupTemplates,
  getTemplatesByServingRuntimeName,
  waitForTemplateByServingRuntimeName,
} from '../../../../utils/oc_commands/templates';
import {
  getLibraryTemplateSelections,
  parseLibraryResource,
  parseLibraryTemplate,
} from '../../../../utils/runtimeLibrary';
import type { LibraryResource, LibraryTemplate } from '../../../../utils/runtimeLibrary';
import type { RuntimeLibraryTemplateTestData } from '../../../../types';

const uuid = generateTestUUID();
const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
let testData: RuntimeLibraryTemplateTestData;
let resourceName: string;
let displayName: string;
let source: LibraryTemplate;
let editedRuntime: LibraryResource;

// These fields are removed from the nested runtime during install prefill, not from its spec.
const strippedRuntimeMetadata = [
  'resourceVersion',
  'uid',
  'managedFields',
  'ownerReferences',
  'creationTimestamp',
  'generation',
  'namespace',
];

describe('Install a Serving runtime template from the Runtime library', () => {
  retryableBefore(() =>
    loadRuntimeLibraryTemplateFixture(
      'e2e/settings/servingRuntimes/testRuntimeLibraryServingRuntimeInstall.yaml',
    ).then((fixture) => {
      testData = fixture;
      resourceName = `${testData.resourceNamePrefix}-${uuid}`;
      displayName = `${testData.displayNamePrefix} ${uuid}`;
      return cleanupTemplates(resourceName, { failOnError: true });
    }),
  );

  after(() => {
    if (resourceName) {
      cleanupTemplates(resourceName);
    }
  });

  it(
    'should install the first ServingRuntime search result as a reusable template',
    { tags: ['@Dashboard', '@ModelServing', '@ModelServingCI', '@KServeCI'] },
    () => {
      cy.step('Log in as a platform administrator and open the Runtime library');
      cy.visitWithLogin('/', LDAP_ADMIN_USER);
      runtimeCatalogPage.navigate();

      cy.step('Search for ServingRuntime and open the first displayed result');
      runtimeCatalogPage.findSearchInput().clear().type(testData.searchTerm);
      runtimeCatalogPage.findSearchButton().click();
      runtimeCatalogPage.findCardDetailLinks().should('have.length.greaterThan', 0).first().click();

      cy.step('Read the full Template shown to the user, then start installation');
      runtimeCatalogDetailsPage.findServingRuntimeTab().should('be.visible').click();
      stubClipboard('runtimeTemplateSourceYAML');
      runtimeCatalogDetailsPage.findServingRuntimeCopyButton().click();
      getClipboardContent('runtimeTemplateSourceYAML')
        .should('have.length', 1)
        .then((copied) => {
          source = parseLibraryTemplate(
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

      cy.step('Verify the source configuration and its protocol/model-type prefill');
      runtimeImageInstallPage.findServingRuntimeRadio().should('be.enabled').check();
      runtimeImageInstallPage.findNext().should('be.enabled').click();
      cy.then(() => {
        const { apiProtocol, modelTypes } = getLibraryTemplateSelections(source);
        runtimeImageInstallPage.findServingRuntimeProtocol().should('contain.text', apiProtocol);
        servingRuntimeTemplates.findSelectModelTypes().click();
        servingRuntimeTemplates
          .findPredictiveModelOption()
          .should(
            modelTypes.includes(ServingRuntimeModelType.PREDICTIVE)
              ? 'be.checked'
              : 'not.be.checked',
          );
        servingRuntimeTemplates
          .findGenerativeAIModelOption()
          .should(
            modelTypes.includes(ServingRuntimeModelType.GENERATIVE)
              ? 'be.checked'
              : 'not.be.checked',
          );
        servingRuntimeTemplates.findSelectModelTypes().click();
      });
      runtimeImageInstallPage
        .findServingRuntimeEditor()
        .getValue()
        .then((content) => {
          const prefill = parseLibraryResource(
            YAML.load(content, { schema: YAML.JSON_SCHEMA }),
            testData,
          );
          expect(prefill.spec, 'Complete prefilled ServingRuntime spec').to.deep.equal(
            source.objects[0].spec,
          );
          expect(prefill.metadata, 'Cleaned nested runtime metadata').to.deep.equal(
            Cypress._.omit(source.objects[0].metadata, strippedRuntimeMetadata),
          );
          editedRuntime = {
            ...prefill,
            metadata: {
              ...prefill.metadata,
              name: resourceName,
              annotations: {
                ...prefill.metadata.annotations,
                'openshift.io/display-name': displayName,
              },
            },
          };
          runtimeImageInstallPage
            .findServingRuntimeEditor()
            .setValue(YAML.dump(editedRuntime, { schema: YAML.JSON_SCHEMA }));
        });

      cy.step('Create the template through the user interface');
      runtimeImageInstallPage.findCreate().should('be.enabled').click();

      cy.step('Verify the settings row and the persisted Template, without deploying a model');
      cy.location('pathname').should('eq', testData.listPath);
      servingRuntimeTemplates.getRowById(resourceName).find().should('be.visible');
      waitForTemplateByServingRuntimeName(resourceName);
      getTemplatesByServingRuntimeName(resourceName).then((templates) => {
        expect(templates, 'Exactly one test-owned Template').to.have.length(1);
        const [template] = templates;
        const { apiProtocol, modelTypes } = getLibraryTemplateSelections(source);
        expect(template.kind).to.equal(testData.templateKind);
        expect(template.apiVersion).to.equal(testData.templateApiVersion);
        expect(template.metadata.namespace).to.equal(namespace);
        expect(template.metadata.labels).to.include({ 'opendatahub.io/dashboard': 'true' });
        expect(template.objects, 'One installed ServingRuntime').to.have.length(1);
        expect(template.objects[0].spec, 'Complete persisted runtime spec').to.deep.equal(
          source.objects[0].spec,
        );
        expect(template.objects[0].metadata, 'Persisted nested runtime metadata').to.deep.equal(
          editedRuntime.metadata,
        );
        expect(template.objects[0].kind).to.equal(testData.resourceKind);
        expect(template.objects[0].apiVersion).to.equal(testData.resourceApiVersion);
        const { annotations } = template.metadata;
        expect(annotations?.['opendatahub.io/apiProtocol']).to.equal(apiProtocol);
        expect(JSON.parse(annotations?.['opendatahub.io/model-type'] as string)).to.deep.equal(
          modelTypes,
        );
        expect(
          JSON.parse(annotations?.['opendatahub.io/modelServingSupport'] as string),
        ).to.deep.equal(testData.modelServingSupport);
      });
      checkServingRuntimeAbsent(resourceName);
    },
  );
});
