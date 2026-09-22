import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import {
  mockConnectionTypeConfigMap,
  mockOciConnectionTypeConfigMap,
} from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mock404Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { IdentifierResourceType } from '@odh-dashboard/k8s-core';
import {
  mockGlobalScopedHardwareProfiles,
  mockHardwareProfile,
} from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import { mockStandardModelServingTemplateK8sResources } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { ServingRuntimeModelType } from '@odh-dashboard/model-serving/shared/types';
import {
  HF_TOKEN_ENV_NAME,
  HF_TOKEN_SECRET_ANNOTATION,
} from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import {
  mockCustomSecretK8sResource,
  mockURISecretK8sResource,
} from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import { asProductAdminUser } from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  ProjectModel,
  PVCModel,
  ServingRuntimeModel,
  TemplateModel,
} from '@odh-dashboard/cypress/cypress/utils/models';
import {
  RoleBindingModel,
  RoleModel,
  SecretModel,
  ServiceAccountModel,
} from '@odh-dashboard/k8s-core/api/models';
import { modelDetailsPage } from '@odh-dashboard/cypress/cypress/pages/modelCatalog/modelDetailsPage';
import { modelCatalog } from '@odh-dashboard/cypress/cypress/pages/modelCatalog/modelCatalog';
import {
  modelServingGlobal,
  modelServingWizard,
  modelServingWizardEdit,
} from '@odh-dashboard/cypress/cypress/pages/modelServing';
import { hardwareProfileSection } from '@odh-dashboard/cypress/cypress/pages/components/HardwareProfileSection';

const API_VERSION = 'v1';
const SOURCE_ID = 'huggingface';
const MODEL_NAME = 'test-hf-model';
const REGISTRIES_NAMESPACE = 'odh-model-registries';
const MODEL_URI = 'hf://org/test-hf-model';
const HF_TOKEN_SECRET_NAME = 'hf-token-secret';
const HF_API_KEY = 'hf_test_token';

type HfAccessType = 'private' | 'gated_auto' | undefined;

/* eslint-disable camelcase -- catalog API payloads use snake_case field names */
const buildCatalogModel = (hfAccessType?: HfAccessType) => ({
  source_id: SOURCE_ID,
  name: MODEL_NAME,
  description: 'Catalog model for Hugging Face API key deploy tests.',
  provider: 'Hugging Face',
  license: 'apache-2.0',
  tasks: ['text-generation'],
  customProperties: hfAccessType
    ? {
        hf_access_type: {
          metadataType: 'MetadataStringValue',
          string_value: hfAccessType,
        },
        ...(hfAccessType.startsWith('gated_')
          ? {
              hf_gated_access_granted: {
                metadataType: 'MetadataStringValue',
                string_value: 'true',
              },
            }
          : {}),
      }
    : {},
});
/* eslint-enable camelcase */

const initBaseIntercepts = (hfAccessType?: HfAccessType) => {
  asProductAdminUser();

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        [DataScienceStackComponent.MODEL_REGISTRY]: {
          managementState: 'Managed',
          registriesNamespace: REGISTRIES_NAMESPACE,
        },
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableNIMModelServing: true,
      disableKServe: false,
      disableModelCatalog: false,
      disableModelRegistry: false,
      disableModelServing: false,
      vLLMDeploymentOnMaaS: true,
    }),
  );
  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));
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
    mockOciConnectionTypeConfigMap(),
  ]);
  cy.interceptOdh(
    'GET /api/namespaces/:namespace/:context',
    { path: { namespace: 'test-project', context: '*' } },
    { applied: true },
  );

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList([
      mockGlobalScopedHardwareProfiles[0],
      mockGlobalScopedHardwareProfiles[1],
      mockHardwareProfile({
        name: 'nvidia-profile',
        displayName: 'NVIDIA GPU Profile',
        identifiers: [
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: '4',
            maxCount: '8',
            defaultCount: '4',
            resourceType: IdentifierResourceType.CPU,
          },
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: '8Gi',
            maxCount: '16Gi',
            defaultCount: '8Gi',
            resourceType: IdentifierResourceType.MEMORY,
          },
          {
            displayName: 'GPU',
            identifier: 'nvidia.com/gpu',
            minCount: 1,
            maxCount: 4,
            defaultCount: 1,
            resourceType: IdentifierResourceType.ACCELERATOR,
          },
        ],
      }),
    ]),
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
    { model: SecretModel, ns: 'test-project' },
    mockK8sResourceList([mockURISecretK8sResource({ namespace: 'test-project' })]),
  );

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/user',
    { path: { apiVersion: API_VERSION } },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );
  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/namespaces',
    { path: { apiVersion: API_VERSION } },
    { data: [{ metadata: { name: REGISTRIES_NAMESPACE } }] },
  );
  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/model_registry',
    { path: { apiVersion: API_VERSION } },
    { data: [] },
  );
  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/model_catalog/sources',
    { path: { apiVersion: API_VERSION } },
    {
      data: {
        items: [
          {
            id: SOURCE_ID,
            name: 'Hugging Face',
            enabled: true,
            labels: ['Community'],
            status: 'available',
            hfUsername: 'test-user',
            hasApiKey: true,
            authenticated: true,
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  );
  cy.intercept(
    'GET',
    `**/model-registry/api/${API_VERSION}/model_catalog/sources/${SOURCE_ID}/models/**`,
    { body: { data: buildCatalogModel(hfAccessType) } },
  );
  cy.intercept(
    'GET',
    `**/model-registry/api/${API_VERSION}/model_catalog/sources/${SOURCE_ID}/artifacts/**`,
    {
      body: {
        data: {
          items: [
            {
              artifactType: 'model-artifact',
              createTimeSinceEpoch: '1739210683000',
              lastUpdateTimeSinceEpoch: '1739210683000',
              uri: MODEL_URI,
              customProperties: {},
            },
          ],
          size: 1,
          pageSize: 10,
          nextPageToken: '',
        },
      },
    },
  );
};

const initDeployIntercepts = () => {
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: 'test-project' },
    mockK8sResourceList([]),
  );
  cy.interceptK8sList({ model: ServingRuntimeModel, ns: 'test-project' }, mockK8sResourceList([]));

  cy.interceptK8s(
    'POST',
    { model: InferenceServiceModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: mockInferenceServiceK8sResource({
        name: MODEL_NAME,
        modelType: ServingRuntimeModelType.GENERATIVE,
      }),
    },
  ).as('createInferenceService');

  cy.interceptK8s(
    'POST',
    { model: ServingRuntimeModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: mockServingRuntimeK8sResource({}),
    },
  ).as('createServingRuntime');

  cy.interceptK8s('POST', { model: SecretModel, ns: 'test-project' }, (req) => {
    if (req.body.stringData?.[HF_TOKEN_ENV_NAME]) {
      req.reply({
        statusCode: 200,
        body: mockCustomSecretK8sResource({
          name: HF_TOKEN_SECRET_NAME,
          namespace: 'test-project',
          data: {},
        }),
      });
      return;
    }
    req.reply({
      statusCode: 200,
      body: mockCustomSecretK8sResource({
        name: req.body.metadata?.name ?? 'generated-secret',
        namespace: 'test-project',
        data: {},
      }),
    });
  }).as('createSecret');

  // Connection create does createSecret then getSecret by the generated name.
  // Without this, the real deploy aborts after the dry-run HF Secret POST.
  cy.intercept('GET', '/api/k8s/api/v1/namespaces/test-project/secrets/*', (req) => {
    const secretName = req.url.split('/').pop()?.split('?')[0];
    if (!secretName) {
      req.continue();
      return;
    }
    req.reply({
      statusCode: 200,
      body: mockCustomSecretK8sResource({
        name: secretName,
        namespace: 'test-project',
        data: {},
      }),
    });
  });

  cy.interceptK8s(
    'GET',
    { model: SecretModel, ns: 'test-project', name: HF_TOKEN_SECRET_NAME },
    {
      statusCode: 200,
      body: mockCustomSecretK8sResource({
        name: HF_TOKEN_SECRET_NAME,
        namespace: 'test-project',
        data: {},
      }),
    },
  );

  cy.interceptK8s('POST', { model: ServiceAccountModel, ns: 'test-project' }, (req) => {
    req.reply({
      statusCode: 200,
      body: {
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        metadata: {
          name: req.body.metadata?.name ?? `${MODEL_NAME}-sa`,
          namespace: 'test-project',
        },
        secrets: req.body.secrets,
      },
    });
  }).as('createServiceAccount');

  cy.interceptK8s(
    'POST',
    { model: RoleModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'Role',
        metadata: { name: `${MODEL_NAME}-view-role`, namespace: 'test-project' },
      },
    },
  ).as('createRole');

  cy.interceptK8s(
    'POST',
    { model: RoleBindingModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'RoleBinding',
        metadata: { name: `${MODEL_NAME}-view`, namespace: 'test-project' },
      },
    },
  ).as('createRoleBinding');

  cy.interceptK8s(
    'GET',
    {
      model: ServiceAccountModel,
      ns: 'test-project',
      name: `${MODEL_NAME}-sa`,
    },
    { statusCode: 404, body: mock404Error({}) },
  );
  cy.interceptK8s(
    'GET',
    {
      model: ServiceAccountModel,
      ns: 'test-project',
      name: `${MODEL_NAME}-hf-sa`,
    },
    { statusCode: 404, body: mock404Error({}) },
  );
  cy.interceptK8s(
    'GET',
    {
      model: RoleModel,
      ns: 'test-project',
      name: `${MODEL_NAME}-view-role`,
    },
    { statusCode: 404, body: mock404Error({}) },
  );
  cy.interceptK8s(
    'GET',
    {
      model: RoleBindingModel,
      ns: 'test-project',
      name: `${MODEL_NAME}-view`,
    },
    { statusCode: 404, body: mock404Error({}) },
  );
};

const openWizardFromCatalog = (hfAccessType?: HfAccessType) => {
  initBaseIntercepts(hfAccessType);
  modelDetailsPage.visit(SOURCE_ID, MODEL_NAME);
  modelCatalog.clickDeployModelButtonWithRetry();
  modelServingWizard.findPreconfigureStep().should('be.enabled');
};

const navigateToModelSourceStep = () => {
  modelServingWizard.findPreconfigureProjectSelector().click();
  modelServingWizard.findPreconfigureProjectSelectorOption('Test Project').click();
  modelServingWizard.findNextButton().should('be.enabled').click();
  modelServingWizard.findModelSourceStep().should('be.enabled');
};

const completeWizardFromModelSource = () => {
  modelServingWizard.findNextButton().should('be.enabled').click();

  modelServingWizard.findModelDeploymentStep().should('be.enabled');
  modelServingWizard.selectDeploymentMethodByKey('legacy');
  hardwareProfileSection.findSelect().click();
  hardwareProfileSection.selectProfileContaining('Large Profile');
  modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
  modelServingWizard.selectGlobalScopedTemplateOption('vLLM NVIDIA');
  modelServingWizard.findNextButton().should('be.enabled').click();

  modelServingWizard.findAdvancedOptionsStep().should('be.enabled');
  // Token auth stays unchecked unless rolebinding create is permitted; leave it
  // alone so we do not create SA/Role/RoleBinding noise for HF-token assertions.
  modelServingWizard.findNextButton().should('be.enabled').click();

  modelServingWizard.findReviewStep().should('be.enabled');
};

describe('Hugging Face API key in catalog deployment wizard', () => {
  it('should require an API key and show gated alert for gated catalog models', () => {
    openWizardFromCatalog('gated_auto');
    navigateToModelSourceStep();

    modelServingWizard.findHfApiKeyField().should('be.visible');
    modelServingWizard.findHfGatedAccessAlert().should('be.visible');
    modelServingWizard.findHfApiKeyInput().should('have.value', '');
    modelServingWizard.findNextButton().should('be.disabled');

    modelServingWizard.findHfApiKeyInput().type(HF_API_KEY);
    modelServingWizard.findNextButton().should('be.enabled');

    completeWizardFromModelSource();

    modelServingWizard.findReviewStepModelDetailsSection().should('exist');
    modelServingWizard.findReviewStepModelDetailsSection().within(() => {
      cy.contains('Hugging Face API key').should('exist');
      cy.contains('Provided').should('exist');
    });
  });

  it('should require an API key without gated alert for private catalog models', () => {
    openWizardFromCatalog('private');
    navigateToModelSourceStep();

    modelServingWizard.findHfApiKeyField().should('be.visible');
    modelServingWizard.findHfGatedAccessAlert().should('not.exist');
    modelServingWizard.findNextButton().should('be.disabled');

    modelServingWizard.findHfApiKeyInput().type('hf_private_token');
    modelServingWizard.findNextButton().should('be.enabled');
  });

  it('should not show the Hugging Face API key field for public catalog models', () => {
    openWizardFromCatalog();
    navigateToModelSourceStep();

    modelServingWizard.findHfApiKeyField().should('not.exist');
    modelServingWizard.findHfGatedAccessAlert().should('not.exist');
    modelServingWizard.findNextButton().should('be.enabled');
  });

  it('should create an HF token Secret and ServiceAccount on submit', () => {
    openWizardFromCatalog('private');
    initDeployIntercepts();
    navigateToModelSourceStep();

    modelServingWizard.findHfApiKeyInput().type(HF_API_KEY);
    completeWizardFromModelSource();

    modelServingWizard.findSubmitButton().should('be.enabled').click();

    // Retry until both HF token Secret creates are present (other secrets may
    // also be POSTed during deploy, so do not assert on @createSecret order).
    cy.get('@createSecret.all').should((interceptions) => {
      const hfTokenSecrets = (
        interceptions as unknown as Array<{
          request: {
            url: string;
            body: {
              stringData?: Record<string, string>;
              metadata: { labels?: Record<string, string> };
            };
          };
        }>
      ).filter((interception) => interception.request.body.stringData?.[HF_TOKEN_ENV_NAME]);
      expect(hfTokenSecrets).to.have.length(2);

      expect(hfTokenSecrets[0].request.url).to.include('?dryRun=All');
      expect(hfTokenSecrets[0].request.body.stringData).to.deep.equal({
        [HF_TOKEN_ENV_NAME]: HF_API_KEY,
      });
      expect(hfTokenSecrets[0].request.body.metadata.labels).to.containSubset({
        'opendatahub.io/dashboard': 'true',
      });

      expect(hfTokenSecrets[1].request.url).not.to.include('?dryRun=All');
      expect(hfTokenSecrets[1].request.body.stringData).to.deep.equal({
        [HF_TOKEN_ENV_NAME]: HF_API_KEY,
      });
    });

    cy.get('@createServiceAccount.all').should((interceptions) => {
      const hfServiceAccounts = (
        interceptions as unknown as Array<{
          request: {
            url: string;
            body: {
              metadata: { name?: string };
              secrets?: Array<{ name: string }>;
            };
          };
        }>
      ).filter((interception) =>
        interception.request.body.secrets?.some((secret) => secret.name === HF_TOKEN_SECRET_NAME),
      );
      expect(hfServiceAccounts).to.have.length(2);
      expect(hfServiceAccounts[0].request.url).to.include('?dryRun=All');
      expect(hfServiceAccounts[0].request.body.metadata.name).to.equal(`${MODEL_NAME}-hf-sa`);
      expect(hfServiceAccounts[1].request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createInferenceService.all').should((interceptions) => {
      const isvcCreates = interceptions as unknown as Array<{
        request: {
          url: string;
          body: {
            metadata: { annotations?: Record<string, string> };
            spec: {
              predictor: {
                serviceAccountName?: string;
                model: { env?: Array<Record<string, unknown>> };
              };
            };
          };
        };
      }>;
      expect(isvcCreates).to.have.length(2);
      expect(isvcCreates[0].request.url).to.include('?dryRun=All');
      expect(isvcCreates[0].request.body.spec.predictor.serviceAccountName).to.equal(
        `${MODEL_NAME}-hf-sa`,
      );
      expect(isvcCreates[0].request.body.metadata.annotations).to.containSubset({
        [HF_TOKEN_SECRET_ANNOTATION]: HF_TOKEN_SECRET_NAME,
      });
      expect(
        isvcCreates[0].request.body.spec.predictor.model.env?.find(
          (env) => env.name === HF_TOKEN_ENV_NAME,
        ),
      ).to.equal(undefined);
      expect(isvcCreates[1].request.url).not.to.include('?dryRun=All');
    });
  });

  it('should show a configured HF API key without exposing the secret value when editing', () => {
    initBaseIntercepts();
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([
        mockInferenceServiceK8sResource({
          modelType: ServingRuntimeModelType.GENERATIVE,
          secretName: 'test-uri-secret',
          storageUri: MODEL_URI,
          hardwareProfileName: 'large-profile',
          hardwareProfileNamespace: 'opendatahub',
          additionalAnnotations: {
            [HF_TOKEN_SECRET_ANNOTATION]: HF_TOKEN_SECRET_NAME,
          },
          serviceAccountName: 'test-inference-service-hf-sa',
          env: [],
        }),
      ]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([
        mockServingRuntimeK8sResource({
          scope: 'global',
        }),
      ]),
    );
    cy.interceptK8sList(
      { model: SecretModel, ns: 'test-project' },
      mockK8sResourceList([
        mockURISecretK8sResource({ namespace: 'test-project' }),
        mockCustomSecretK8sResource({
          name: HF_TOKEN_SECRET_NAME,
          namespace: 'test-project',
          data: {},
        }),
      ]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();

    modelServingWizardEdit.findModelSourceStep().should('be.enabled');
    modelServingWizardEdit.findHfApiKeyField().should('be.visible');
    modelServingWizardEdit.findHfApiKeyConfiguredHelper().should('be.visible');
    modelServingWizardEdit.findHfApiKeyInput().should('have.value', '*******');
    modelServingWizardEdit.findNextButton().should('be.enabled');
  });
});
