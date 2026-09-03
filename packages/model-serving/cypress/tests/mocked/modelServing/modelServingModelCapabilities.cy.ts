import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mock404Error } from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import { mockStandardModelServingTemplateK8sResources } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { IdentifierResourceType } from '@odh-dashboard/k8s-core';
import { ServingRuntimeModelType } from '@odh-dashboard/model-serving/shared/types';
import {
  mockGlobalScopedHardwareProfiles,
  mockHardwareProfile,
} from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
  mockOciConnectionTypeConfigMap,
} from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { mockURISecretK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPVCK8sResource';
import {
  RoleBindingModel,
  RoleModel,
  SecretModel,
  ServiceAccountModel,
} from '@odh-dashboard/k8s-core/api/models';
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
  modelServingWizardEdit,
} from '@odh-dashboard/cypress/cypress/pages/modelServing';

const MODEL_CAPABILITIES_ANNOTATION = 'opendatahub.io/model-capabilities';

const initIntercepts = ({
  modelCapabilitiesEnabled = true,
  vLLMDeploymentOnMaaS = true,
}: {
  modelCapabilitiesEnabled?: boolean;
  vLLMDeploymentOnMaaS?: boolean;
} = {}) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' },
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableNIMModelServing: true,
      disableKServe: false,
      vLLMDeploymentOnMaaS,
      genAiStudio: true,
      modelCapabilities: modelCapabilitiesEnabled,
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
        ],
      }),
    ]),
  );

  cy.interceptK8sList(
    { model: SecretModel, ns: 'test-project' },
    mockK8sResourceList([
      mockURISecretK8sResource({ namespace: 'test-project' }),
      mockURISecretK8sResource({
        namespace: 'test-project',
        name: 'test-uri-secret-2',
        displayName: 'Test URI Secret 2',
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

  cy.interceptK8s(
    'POST',
    { model: InferenceServiceModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: mockInferenceServiceK8sResource({
        name: 'test-model',
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
  );

  cy.interceptK8s(
    'POST',
    { model: ServiceAccountModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: {
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        metadata: { name: 'test-model-sa', namespace: 'test-project' },
      },
    },
  );

  cy.interceptK8s(
    'POST',
    { model: RoleModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'Role',
        metadata: { name: 'test-model-view-role', namespace: 'test-project' },
      },
    },
  );

  cy.interceptK8s(
    'POST',
    { model: RoleBindingModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'RoleBinding',
        metadata: { name: 'test-model-view', namespace: 'test-project' },
      },
    },
  );

  cy.interceptK8s(
    'POST',
    { model: SecretModel, ns: 'test-project' },
    {
      statusCode: 200,
      body: {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: { name: 'test-model-token', namespace: 'test-project' },
      },
    },
  );

  cy.interceptK8s(
    'GET',
    { model: ServiceAccountModel, ns: 'test-project', name: 'test-model-sa' },
    { statusCode: 404, body: mock404Error({}) },
  );

  cy.interceptK8s(
    'GET',
    { model: RoleModel, ns: 'test-project', name: 'test-model-view-role' },
    { statusCode: 404, body: mock404Error({}) },
  );

  cy.interceptK8s(
    'GET',
    { model: RoleBindingModel, ns: 'test-project', name: 'test-model-view' },
    { statusCode: 404, body: mock404Error({}) },
  );
};

const setupDeploymentLists = () => {
  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: 'test-project' },
    mockK8sResourceList([mockInferenceServiceK8sResource({})]),
  );
  cy.interceptK8sList(
    { model: ServingRuntimeModel, ns: 'test-project' },
    mockK8sResourceList([mockServingRuntimeK8sResource({})]),
  );
};

const setupEditDeployment = (capabilities: string[]) => {
  const inferenceService = mockInferenceServiceK8sResource({
    modelType: ServingRuntimeModelType.GENERATIVE,
    hasExternalRoute: true,
    secretName: 'test-uri-secret',
    hardwareProfileName: 'small-profile',
    hardwareProfileNamespace: 'opendatahub',
    description: 'test-description',
  });
  inferenceService.metadata.annotations = {
    ...inferenceService.metadata.annotations,
    [MODEL_CAPABILITIES_ANNOTATION]: JSON.stringify(capabilities),
  };

  cy.interceptK8sList(
    { model: InferenceServiceModel, ns: 'test-project' },
    mockK8sResourceList([inferenceService]),
  );
  cy.interceptK8sList(
    { model: ServingRuntimeModel, ns: 'test-project' },
    mockK8sResourceList([
      mockServingRuntimeK8sResource({
        scope: 'global',
        templateDisplayName: 'vLLM NVIDIA',
      }),
    ]),
  );

  return inferenceService;
};

describe('Model capabilities in deployment wizard', () => {
  it('should hide the model capabilities field when the feature flag is disabled', () => {
    initIntercepts({ modelCapabilitiesEnabled: false });
    setupDeploymentLists();

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();

    modelServingWizard.findModelCapabilitiesField().should('not.exist');
  });

  it('should check model capabilities submit', () => {
    initIntercepts({ modelCapabilitiesEnabled: true });
    setupDeploymentLists();

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();
    modelServingWizard.selectWellKnownCapability('Vision');
    modelServingWizard.selectWellKnownCapability('Transcription');
    modelServingWizard.findNextButton().click();
    modelServingWizard.findSubmitButton().click();

    cy.wait('@createInferenceService').then((interception) => {
      expect(
        interception.request.body.metadata.annotations?.[MODEL_CAPABILITIES_ANNOTATION],
      ).to.equal(JSON.stringify(['Vision', 'Transcription']));
    });
  });

  it('should show existing model capabilities when editing a deployment', () => {
    initIntercepts({ modelCapabilitiesEnabled: true });
    setupEditDeployment(['Vision', 'Existing Custom']);

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();

    modelServingWizardEdit.findNextButton().click();
    modelServingWizardEdit.findNextButton().click();

    modelServingWizardEdit.findModelCapabilitiesField().should('exist');
    modelServingWizardEdit.findCapabilityLabel('Vision').should('exist');
    modelServingWizardEdit.findCapabilityLabel('Existing Custom').should('exist');
  });

  it('should add a custom capability and submit', () => {
    initIntercepts({ modelCapabilitiesEnabled: true });
    setupDeploymentLists();

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();
    modelServingWizard.addCustomCapability('MyCustomCap');
    modelServingWizard.findCapabilityLabel('MyCustomCap').should('exist');
    modelServingWizard.findNextButton().click();
    modelServingWizard.findSubmitButton().click();

    cy.wait('@createInferenceService').then((interception) => {
      expect(
        interception.request.body.metadata.annotations?.[MODEL_CAPABILITIES_ANNOTATION],
      ).to.equal(JSON.stringify(['MyCustomCap']));
    });
  });

  it('should remove a capability', () => {
    initIntercepts({ modelCapabilitiesEnabled: true });
    setupDeploymentLists();

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();
    modelServingWizard.selectWellKnownCapability('Vision');
    modelServingWizard.addCustomCapability('ToRemove');
    modelServingWizard.findCapabilityLabel('ToRemove').should('exist');
    modelServingWizard.removeCapability('ToRemove');
    modelServingWizard.findCapabilityLabel('ToRemove').should('not.exist');
    modelServingWizard.findNextButton().click();
    modelServingWizard.findSubmitButton().click();

    cy.wait('@createInferenceService').then((interception) => {
      expect(
        interception.request.body.metadata.annotations?.[MODEL_CAPABILITIES_ANNOTATION],
      ).to.equal(JSON.stringify(['Vision']));
    });
  });

  it('should persist changed model capabilities on edit submit', () => {
    initIntercepts({ modelCapabilitiesEnabled: true });
    const inferenceService = setupEditDeployment(['Vision']);
    cy.interceptK8s(
      'PUT',
      { model: InferenceServiceModel, ns: 'test-project', name: 'test-inference-service' },
      {
        statusCode: 200,
        body: inferenceService,
      },
    ).as('updateInferenceService');

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();

    modelServingWizardEdit.findNextButton().click();
    modelServingWizardEdit.findNextButton().click();
    modelServingWizardEdit.selectWellKnownCapability('Transcription');
    modelServingWizardEdit.findNextButton().click();
    modelServingWizardEdit.findUpdateDeploymentButton().click();

    cy.wait('@updateInferenceService').then((interception) => {
      expect(
        interception.request.body.metadata.annotations?.[MODEL_CAPABILITIES_ANNOTATION],
      ).to.equal(JSON.stringify(['Vision', 'Transcription']));
    });
  });
});
