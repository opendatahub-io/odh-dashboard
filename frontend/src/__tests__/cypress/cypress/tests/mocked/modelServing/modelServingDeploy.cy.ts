import { hardwareProfileSection } from '#~/__tests__/cypress/cypress/pages/components/HardwareProfileSection';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mock404Error } from '#~/__mocks__/mockK8sStatus';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeK8sResource } from '#~/__mocks__/mockServingRuntimeK8sResource';
import {
  mockInvalidTemplateK8sResource,
  mockServingRuntimeTemplateK8sResource,
} from '#~/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
  modelServingWizardEdit,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  ProjectModel,
  PVCModel,
  RoleBindingModel,
  RoleModel,
  SecretModel,
  ServiceAccountModel,
  ServingRuntimeModel,
  TemplateModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { ServingRuntimeModelType } from '#~/types';
import { mockGlobalScopedHardwareProfiles } from '#~/__mocks__/mockHardwareProfile';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
  mockOciConnectionTypeConfigMap,
} from '#~/__mocks__/mockConnectionType';
import { DataScienceStackComponent } from '#~/concepts/areas/types';
import {
  mockCustomSecretK8sResource,
  mockURISecretK8sResource,
  mockSecretK8sResource,
} from '../../../../../../__mocks__/mockSecretK8sResource';
import { mockPVCK8sResource } from '../../../../../../__mocks__/mockPVCK8sResource';
import { isGeneratedSecretName } from '../../../../../../api/k8s/secrets';

const initIntercepts = ({
  modelType,
  rejectAddSupportServingPlatformProject = false,
}: {
  modelType?: ServingRuntimeModelType;
  rejectAddSupportServingPlatformProject?: boolean;
}) => {
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
      disableNIMModelServing: true,
      disableKServe: false,
    }),
  );
  // used by addSupportServingPlatformProject
  cy.interceptOdh(
    'GET /api/namespaces/:namespace/:context',
    { path: { namespace: 'test-project', context: '*' } },
    rejectAddSupportServingPlatformProject ? { statusCode: 401 } : { applied: true },
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
  ]).as('getConnectionTypes');

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockGlobalScopedHardwareProfiles),
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
    mockK8sResourceList(
      [
        mockServingRuntimeTemplateK8sResource({
          name: 'template-2',
          displayName: 'OpenVINO',
          modelTypes: [ServingRuntimeModelType.PREDICTIVE],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-3',
          displayName: 'Caikit',
          modelTypes: [ServingRuntimeModelType.PREDICTIVE],
          supportedModelFormats: [
            {
              name: 'openvino_ir',
              version: 'opset1',
            },
          ],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-4',
          displayName: 'vLLM AMD',
          modelTypes: [ServingRuntimeModelType.GENERATIVE],
          supportedModelFormats: [
            {
              name: 'vLLM',
            },
          ],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-5',
          displayName: 'vLLM NVIDIA',
          modelTypes: [ServingRuntimeModelType.GENERATIVE],
          supportedModelFormats: [
            {
              name: 'vLLM',
            },
          ],
        }),
        mockInvalidTemplateK8sResource({}),
      ],
      { namespace: 'opendatahub' },
    ),
  );

  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));

  cy.interceptK8sList(PVCModel, mockK8sResourceList([mockPVCK8sResource({})]));

  cy.interceptK8s(
    'POST',
    {
      model: InferenceServiceModel,
      ns: 'test-project',
    },
    {
      statusCode: 200,
      body: mockInferenceServiceK8sResource({
        name: 'test-model',
        modelType,
      }),
    },
  ).as('createInferenceService');

  cy.interceptK8s(
    'POST',
    {
      model: ServingRuntimeModel,
      ns: 'test-project',
    },
    {
      statusCode: 200,
      body: mockServingRuntimeK8sResource({}),
    },
  ).as('createServingRuntime');

  cy.interceptK8s(
    'POST',
    {
      model: ServiceAccountModel,
      ns: 'test-project',
    },
    {
      statusCode: 200,
      body: {
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        metadata: { name: 'test-model-sa', namespace: 'test-project' },
      },
    },
  ).as('createServiceAccount');

  cy.interceptK8s(
    'POST',
    {
      model: RoleModel,
      ns: 'test-project',
    },
    {
      statusCode: 200,
      body: {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'Role',
        metadata: { name: 'test-model-view-role', namespace: 'test-project' },
      },
    },
  ).as('createRole');

  cy.interceptK8s(
    'POST',
    {
      model: RoleBindingModel,
      ns: 'test-project',
    },
    {
      statusCode: 200,
      body: {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'RoleBinding',
        metadata: { name: 'test-model-view', namespace: 'test-project' },
      },
    },
  ).as('createRoleBinding');

  cy.interceptK8s(
    'POST',
    {
      model: SecretModel,
      ns: 'test-project',
    },
    {
      statusCode: 200,
      body: {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: { name: 'test-model-token', namespace: 'test-project' },
      },
    },
  ).as('createSecret');

  cy.interceptK8s(
    'GET',
    {
      model: ServiceAccountModel,
      ns: 'test-project',
      name: 'test-model-sa',
    },
    {
      statusCode: 404,
      body: mock404Error({}),
    },
  ).as('getServiceAccount');

  cy.interceptK8s(
    'GET',
    {
      model: RoleModel,
      ns: 'test-project',
      name: 'test-model-view-role',
    },
    {
      statusCode: 404,
      body: mock404Error({}),
    },
  ).as('getRole');

  cy.interceptK8s(
    'GET',
    {
      model: RoleBindingModel,
      ns: 'test-project',
      name: 'test-model-view',
    },
    {
      statusCode: 404,
      body: mock404Error({}),
    },
  ).as('getRoleBinding');
};

describe('Model Serving Deploy Wizard', () => {
  it('Navigate into and out of the wizard', () => {
    initIntercepts({});
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    cy.url().should('include', 'ai-hub/deployments/test-project/deploy');
    cy.findByRole('heading', { name: 'Deploy a model' }).should('exist');
    cy.findByRole('button', { name: 'Cancel' }).click();
    modelServingWizard.findCancelButton().click();
    cy.url().should('include', 'ai-hub/deployments/test-project/deploy');
    cy.findByRole('button', { name: 'Cancel' }).click();
    modelServingWizard.findDiscardButton().click();
    cy.url().should('eq', `${Cypress.config().baseUrl ?? ''}/ai-hub/deployments/test-project`);

    modelServingSection.visit('test-project');
    modelServingSection.findDeployModelButton().click();
    cy.findByRole('heading', { name: 'Deploy a model' }).should('exist');
    cy.findByRole('button', { name: 'Cancel' }).click();
    modelServingWizard.findCancelButton().click();
    cy.url().should('not.include', 'projects/test-project?section=model-server');
    cy.findByRole('button', { name: 'Cancel' }).click();
    modelServingWizard.findDiscardButton().click();
    cy.url().should('include', 'projects/test-project?section=model-server');
  });

  it('Create a new generative deployment and submit', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.GENERATIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist');
    modelServingWizard
      .findModelTypeSelectOption('Generative AI model (Example, LLM)')
      .should('exist')
      .click();
    modelServingWizard.findModelLocationSelect().should('exist');
    modelServingWizard.findModelLocationSelectOption('Existing connection').should('exist').click();
    modelServingWizard.findExistingConnectionSelect().should('exist').click();
    modelServingWizard
      .findExistingConnectionSelectOption('Test URI Secret')
      .should('exist')
      .click();

    modelServingWizard.findSaveConnectionCheckbox().should('not.exist');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizard.findModelDeploymentStep().should('be.enabled');
    modelServingWizard.findAdvancedOptionsStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    modelServingWizard.findModelDeploymentDescriptionInput().type('test-description');
    hardwareProfileSection.findSelect().should('contain.text', 'Small');

    // hardwareProfileSection.findGlobalScopedLabel().should('exist');
    modelServingWizard.findModelFormatSelect().should('not.exist');
    modelServingWizard.findServingRuntimeTemplateSearchSelector().should('exist');
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.findGlobalScopedTemplateOption('vLLM NVIDIA').should('exist').click();

    modelServingWizard.findNumReplicasInput().should('exist');
    modelServingWizard.findNumReplicasInputField().should('have.value', '1');
    modelServingWizard.findNumReplicasMinusButton().should('be.disabled');
    modelServingWizard.findNumReplicasPlusButton().click();
    modelServingWizard.findNumReplicasInputField().should('have.value', '2');
    modelServingWizard.findNumReplicasMinusButton().should('be.enabled');
    modelServingWizard.findNumReplicasInputField().clear().type('99');
    modelServingWizard.findNumReplicasInputField().should('have.value', '99');
    modelServingWizard.findNumReplicasPlusButton().should('be.disabled');

    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 3: Advanced Options
    // Model access & Token authentication
    modelServingWizard.findAdvancedOptionsStep().should('be.enabled');
    // AI Asset
    modelServingWizard.findSaveAiAssetCheckbox().should('exist');
    modelServingWizard.findSaveAiAssetCheckbox().should('not.be.checked');
    modelServingWizard.findUseCaseInput().should('not.exist');
    modelServingWizard.findSaveAiAssetCheckbox().click();
    modelServingWizard.findUseCaseInput().should('exist');
    modelServingWizard.findUseCaseInput().should('be.enabled');
    modelServingWizard.findUseCaseInput().type('test');

    modelServingWizard.findExternalRouteCheckbox().click();
    modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
    modelServingWizard.findTokenAuthenticationCheckbox().click();
    modelServingWizard.findTokenWarningAlert().should('exist');
    modelServingWizard.findTokenAuthenticationCheckbox().click();
    modelServingWizard.findServiceAccountByIndex(0).should('have.value', 'default-name');
    modelServingWizard.findAddServiceAccountButton().click();
    modelServingWizard.findServiceAccountByIndex(1).should('have.value', 'default-name');
    modelServingWizard.findServiceNameAlert().should('exist');
    modelServingWizard.findServiceAccountByIndex(1).clear().type('new-name');
    modelServingWizard.findServiceNameAlert().should('not.exist');
    modelServingWizard.findRemoveServiceAccountByIndex(1).click();
    modelServingWizard.findServiceAccountByIndex(0).clear();
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findServiceAccountByIndex(0).clear().type('new name');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 4: Summary
    modelServingWizard.findSubmitButton().should('be.enabled').click();

    // dry run request
    const expectedInferenceServiceBody = {
      metadata: {
        name: 'test-model',
        namespace: 'test-project',
        labels: {
          'opendatahub.io/dashboard': 'true',
          'opendatahub.io/genai-asset': 'true',
          'networking.kserve.io/visibility': 'exposed',
        },
        annotations: {
          'openshift.io/display-name': 'test-model',
          'openshift.io/description': 'test-description',
          'opendatahub.io/hardware-profile-namespace': 'opendatahub',
          'opendatahub.io/hardware-profile-name': 'small-profile',
          'opendatahub.io/model-type': 'generative',
          'security.opendatahub.io/enable-auth': 'true',
          'opendatahub.io/genai-use-case': 'test',
        },
      },
      spec: {
        predictor: {
          minReplicas: 99,
          maxReplicas: 99,
          model: {
            modelFormat: {
              name: 'vLLM',
            },
            resources: {
              requests: {
                cpu: '4',
                memory: '8Gi',
              },
              limits: {
                cpu: '4',
                memory: '8Gi',
              },
            },
          },
        },
      },
    };

    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');

      // Check metadata separately
      expect(interception.request.body.metadata).to.containSubset(
        expectedInferenceServiceBody.metadata,
      );

      // Check spec structure without the model details
      expect(interception.request.body.spec.predictor.minReplicas).to.equal(99);
      expect(interception.request.body.spec.predictor.maxReplicas).to.equal(99);

      // Check model format exists
      expect(interception.request.body.spec.predictor.model.modelFormat.name).to.equal('vLLM');
    });

    // Actual request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });

    cy.wait('@createServingRuntime').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          name: 'test-model',
          annotations: {
            'opendatahub.io/apiProtocol': 'REST',
            'opendatahub.io/runtime-version': '1.0.0',
            'opendatahub.io/template-display-name': 'vLLM NVIDIA',
            'openshift.io/display-name': 'vLLM NVIDIA',
          },
          labels: { 'opendatahub.io/dashboard': 'true' },
          namespace: 'test-project',
        },
      });
      expect(interception.request.body.spec).to.containSubset({
        supportedModelFormats: [{ name: 'vLLM' }],
      });
    });

    // Actual request
    cy.wait('@createServingRuntime').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    // the serving runtime should have been created
    cy.get('@createServingRuntime.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });

    // dry run request
    cy.wait('@createServiceAccount').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        apiVersion: 'v1',
        kind: 'ServiceAccount',
        metadata: {
          name: 'test-model-sa',
          namespace: 'test-project',
          ownerReferences: [{ kind: 'InferenceService' }],
        },
      });
    });

    //Actual request
    cy.wait('@createServiceAccount').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createServiceAccount.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); //1 dry run request and 1 actual request
    });

    //dry run request
    cy.wait('@createRole').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          name: 'test-model-view-role',
          namespace: 'test-project',
          ownerReferences: [{ kind: 'InferenceService' }],
        },
        rules: [
          {
            verbs: ['get'],
            apiGroups: ['serving.kserve.io'],
            resources: ['inferenceservices'],
            resourceNames: ['test-model'],
          },
        ],
      });
    });

    //Actual request
    cy.wait('@createRole').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createRole.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); //1 dry run request and 1 actual request
    });

    cy.wait('@createRoleBinding').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          name: 'test-model-view',
          namespace: 'test-project',
          ownerReferences: [{ kind: 'InferenceService' }],
        },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: 'test-model-view-role',
        },
        subjects: [{ kind: 'ServiceAccount', name: 'test-model-sa' }],
      });
    });

    //Actual request
    cy.wait('@createRoleBinding').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createRoleBinding.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); //1 dry run request and 1 actual request
    });

    //dry run request
    cy.wait('@createSecret').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: 'new-name-test-model-sa',
          namespace: 'test-project',
          ownerReferences: [{ kind: 'InferenceService' }],
        },
      });
    });

    //Actual request
    cy.wait('@createSecret').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createSecret.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); //1 dry run request and 1 actual request
    });
  });

  it('Create a new predictive deployment and submit', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.PREDICTIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard
      .findModelTypeSelectOption('Generative AI model (Example, LLM)')
      .should('exist');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist').click();
    modelServingWizard.findModelLocationSelect().should('exist');
    modelServingWizard.findModelLocationSelectOption('Existing connection').should('exist').click();
    modelServingWizard.findExistingConnectionSelect().should('exist').click();
    modelServingWizard
      .findExistingConnectionSelectOption('Test URI Secret')
      .should('exist')
      .click();
    modelServingWizard.findExistingConnectionValue().should('have.value', 'Test URI Secret');
    modelServingWizard.findSaveConnectionCheckbox().should('not.exist');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizard.findModelDeploymentStep().should('be.enabled');
    modelServingWizard.findAdvancedOptionsStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    modelServingWizard.findAdvancedOptionsStep().should('be.disabled');
    hardwareProfileSection.findSelect().click();
    hardwareProfileSection.selectProfileContaining('Large Profile');

    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelFormatSelect().should('exist');
    modelServingWizard.findModelFormatSelectOption('vLLM').should('not.exist');
    modelServingWizard.findModelFormatSelectOption('openvino_ir - opset1').should('exist').click();
    modelServingWizard.findServingRuntimeTemplateSearchSelector().should('exist');
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.findGlobalScopedTemplateOption('OpenVINO').should('exist').click();
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 3: Advanced Options
    // Model access & Token authentication
    modelServingWizard.findAdvancedOptionsStep().should('be.enabled');

    modelServingWizard.findSaveAiAssetCheckbox().should('not.exist');
    modelServingWizard.findUseCaseInput().should('not.exist');

    modelServingWizard.findExternalRouteCheckbox().click();
    modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
    modelServingWizard.findTokenAuthenticationCheckbox().click();
    modelServingWizard.findTokenWarningAlert().should('exist');

    //Configuration Parameters
    modelServingWizard.findRuntimeArgsCheckbox().should('exist').click();
    modelServingWizard.findRuntimeArgsTextBox().type('--arg=value1');
    modelServingWizard.findEnvVariablesCheckbox().should('exist').click();
    modelServingWizard.findAddVariableButton().should('exist').click();
    modelServingWizard.findEnvVariableName('0').clear().type('valid_name');
    modelServingWizard.findEnvVariableValue('0').type('test-value');

    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 4: Summary

    modelServingWizard.findSubmitButton().should('be.enabled').click();

    // dry run request
    const expectedPredictiveInferenceServiceBody = {
      metadata: {
        name: 'test-model',
        namespace: 'test-project',
        labels: {
          'opendatahub.io/dashboard': 'true',
          'networking.kserve.io/visibility': 'exposed',
        },
        annotations: {
          'openshift.io/display-name': 'test-model',
          'opendatahub.io/hardware-profile-namespace': 'opendatahub',
          'opendatahub.io/hardware-profile-name': 'large-profile',
          'opendatahub.io/model-type': 'predictive',
        },
      },
      spec: {
        predictor: {
          model: {
            modelFormat: {
              name: 'openvino_ir',
              version: 'opset1',
            },
            args: ['--arg=value1'],
            env: [{ name: 'valid_name', value: 'test-value' }],
            resources: {
              requests: {
                cpu: '4',
                memory: '8Gi',
              },
              limits: {
                cpu: '4',
                memory: '8Gi',
              },
            },
          },
        },
      },
    };

    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');

      // Check metadata separately
      expect(interception.request.body.metadata).to.containSubset(
        expectedPredictiveInferenceServiceBody.metadata,
      );

      // Check spec structure
      expect(interception.request.body.spec.predictor.model.modelFormat.name).to.equal(
        'openvino_ir',
      );
      expect(interception.request.body.spec.predictor.model.modelFormat.version).to.equal('opset1');
    });

    // Actual request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@createInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });

    // dry run request
    cy.wait('@createServingRuntime').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          name: 'test-model',
          annotations: {
            'opendatahub.io/apiProtocol': 'REST',
            'opendatahub.io/runtime-version': '1.0.0',
            'opendatahub.io/template-display-name': 'OpenVINO',
            'openshift.io/display-name': 'OpenVINO',
          },
          labels: { 'opendatahub.io/dashboard': 'true' },
          namespace: 'test-project',
        },
      });
      expect(interception.request.body.spec).to.containSubset({
        supportedModelFormats: [{ name: 'openvino_ir', version: 'opset1' }],
      });
    });

    // Actual request
    cy.wait('@createServingRuntime').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    // the serving runtime should have been created
    cy.get('@createServingRuntime.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });
  });

  it('Do not deploy KServe model when user cannot edit namespace (only one serving platform enabled)', () => {
    // If only one platform is enabled, project platform selection has not happened yet and patching the namespace with the platform happens at deploy time.
    initIntercepts({
      modelType: ServingRuntimeModelType.PREDICTIVE,
      rejectAddSupportServingPlatformProject: true,
    });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    // test filling in minimum required fields
    modelServingWizard.findModelLocationSelectOption('URI').should('exist').click();
    modelServingWizard.findUrilocationInput().should('exist').type('https://test');
    modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
    modelServingWizard.findSaveConnectionCheckbox().click();
    modelServingWizard.findSaveConnectionCheckbox().should('not.be.checked');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist').click();
    modelServingWizard.findNextButton().should('be.enabled').click();
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    modelServingWizard.findModelFormatSelectOption('openvino_ir - opset1').should('exist').click();
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.findGlobalScopedTemplateOption('OpenVINO').should('exist').click();
    modelServingWizard.findNextButton().should('be.enabled').click();
    modelServingWizard.findNextButton().should('be.enabled').click();

    // test submitting form, an error should appear
    modelServingWizard.findSubmitButton().should('be.enabled').click();

    // dry run request
    cy.wait('@createServingRuntime').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
    });

    // dry run request
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
    });

    // error message validation
    modelServingWizard.findErrorMessageAlert().should('be.visible').contains('Error');

    // the serving runtime should NOT have been created
    cy.get('@createServingRuntime.all').then((interceptions) => {
      expect(interceptions).to.have.length(1); // 1 dry-run request only
    });

    // the inference service should NOT have been created
    cy.get('@createInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(1); // 1 dry-run request only
    });
  });

  it('Check Kserve Auth Section', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.PREDICTIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    // Step 1: Model Source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelLocationSelectOption('URI').should('exist').click();
    modelServingWizard.findUrilocationInput().should('exist').type('https://test');
    modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
    modelServingWizard.findSaveConnectionCheckbox().click();
    modelServingWizard.findSaveConnectionCheckbox().should('not.be.checked');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist').click();
    modelServingWizard.findNextButton().should('be.enabled').click();
    // Step 2: Model Deployment
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    modelServingWizard.findModelFormatSelectOption('openvino_ir - opset1').should('exist').click();
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.findGlobalScopedTemplateOption('OpenVINO').should('exist').click();
    modelServingWizard.findNextButton().should('be.enabled').click();
    // Step 3: Advanced Options
    // check external route, token should be checked and no alert
    modelServingWizard.findTokenAuthenticationCheckbox().should('exist');
    modelServingWizard.findExternalRouteCheckbox().should('exist').click();
    modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
    cy.findAllByText(
      'The actual tokens will be created and displayed when the model server is configured.',
    ).should('be.visible');
    modelServingWizard.findTokenAuthenticationCheckbox().should('exist').click();
    modelServingWizard.findTokenWarningAlert().should('be.visible');
  });

  it('Check path error in KServe Wizard', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.PREDICTIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    // Step 1: Model Source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist').click();
    modelServingWizard.findNextButton().should('be.disabled');

    modelServingWizard.findModelLocationSelect().should('exist');
    modelServingWizard.findModelLocationSelectOption('URI').should('exist').click();

    modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
    modelServingWizard.findSaveConnectionCheckbox().click();
    modelServingWizard.findSaveConnectionCheckbox().should('not.be.checked');

    modelServingWizard.findUrilocationInput().should('exist').type('https://test');
    // Trigger blur event to activate validation
    modelServingWizard.findUrilocationInput().blur();
    modelServingWizard.findUrilocationInputError().should('not.exist');
    modelServingWizard.findNextButton().should('be.enabled');
    modelServingWizard.findUrilocationInput().clear();

    modelServingWizard.findUrilocationInput().type('test-model/');
    // Trigger blur event to activate validation
    modelServingWizard.findUrilocationInput().blur();
    modelServingWizard.findUrilocationInputError().should('be.visible').contains('Invalid URI');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findUrilocationInput().clear();

    // Check with root path
    modelServingWizard.findUrilocationInput().type('/');
    // Trigger blur event to activate validation
    modelServingWizard.findUrilocationInput().blur();
    modelServingWizard.findUrilocationInputError().should('be.visible').contains('Invalid URI');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findUrilocationInput().clear();

    // Check path with special characters
    modelServingWizard.findUrilocationInput().type('invalid/path/@#%#@%');
    // Trigger blur event to activate validation
    modelServingWizard.findUrilocationInput().blur();
    modelServingWizard.findUrilocationInputError().should('be.visible').contains('Invalid URI');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findUrilocationInput().clear();

    // Check path with extra slashes in between
    modelServingWizard.findUrilocationInput().type('invalid/path///test');
    // Trigger blur event to activate validation
    modelServingWizard.findUrilocationInput().blur();
    modelServingWizard.findUrilocationInputError().should('be.visible').contains('Invalid URI');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findUrilocationInput().clear();

    modelServingWizard.findUrilocationInput().type('https://test');
    modelServingWizard.findNextButton().should('be.enabled');
  });

  it('Check environment variables validation in KServe Wizard', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.PREDICTIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    // Step 1: Model Source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist').click();
    modelServingWizard.findModelLocationSelectOption('URI').should('exist').click();
    modelServingWizard.findUrilocationInput().should('exist').type('https://test');
    modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
    modelServingWizard.findSaveConnectionCheckbox().click();
    modelServingWizard.findSaveConnectionCheckbox().should('not.be.checked');
    modelServingWizard.findNextButton().should('be.enabled').click();
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    modelServingWizard.findModelFormatSelectOption('openvino_ir - opset1').should('exist').click();
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.findGlobalScopedTemplateOption('Caikit').should('exist').click();
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Verify submit is enabled before testing env vars
    modelServingWizard.findNextButton().should('be.enabled');

    // Add environment variable with invalid name
    modelServingWizard.findEnvVariablesCheckbox().click();
    modelServingWizard.findAddVariableButton().click();
    modelServingWizard.findEnvVariableName('0').type('1invalid-name');
    cy.findByText(
      'Environment variable name must start with a letter or underscore and contain only letters, numbers, and underscores',
    ).should('be.visible');
    // Verify submit is disabled with invalid env var
    modelServingWizard.findNextButton().should('be.disabled');

    // Test invalid env var name with special characters
    modelServingWizard.findEnvVariableName('0').clear().type('invalid@name');
    cy.findByText(
      'Environment variable name must start with a letter or underscore and contain only letters, numbers, and underscores',
    ).should('be.visible');
    // Verify submit is disabled with invalid env var
    modelServingWizard.findNextButton().should('be.disabled');

    // Test valid env var name
    modelServingWizard.findEnvVariableName('0').clear().type('VALID_NAME');
    cy.findByText(
      'Environment variable name must start with a letter or underscore and contain only letters, numbers, and underscores',
    ).should('not.exist');
    // Verify submit is enabled with valid env var
    modelServingWizard.findNextButton().should('be.enabled');
  });

  it('Deploy OCI Model and check paste functionality', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.PREDICTIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockCustomSecretK8sResource({
          type: 'kubernetes.io/dockerconfigjson',
          namespace: 'test-project',
          name: 'test-secret',
          annotations: {
            'opendatahub.io/connection-type': 'oci-v1',
            'openshift.io/display-name': 'Test Secret',
          },
          data: {
            '.dockerconfigjson':
              'eyJhdXRocyI6IHsidGVzdC5pbyI6IHsiYXV0aCI6ICJibGFoYmxhaGJsYWgifX19Cg==',
            OCI_HOST: 'dGVzdC5pby9vcmdhbml6YXRpb24K',
            ACCESS_TYPE: 'WyJQdWxsIl0',
          },
        }),
      ]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    // Step 1: Model Source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.disabled');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist').click();
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findBackButton().should('be.disabled');
    modelServingWizard.findCancelButton().should('be.enabled');
    modelServingWizard.findModelLocationSelectOption('Existing connection').should('exist').click();
    modelServingWizard.findExistingConnectionValue().should('have.value', 'Test Secret');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findOCIModelURI().click();
    modelServingWizard.findOCIModelURI().trigger('paste', {
      clipboardData: {
        getData: () => 'https://test.io/organization/test-model:latest',
      },
    });
    modelServingWizard.findNextButton().should('be.enabled').click();
    //Step 2: Model Deployment
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    modelServingWizard.findModelFormatSelectOption('openvino_ir - opset1').should('exist').click();
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.findGlobalScopedTemplateOption('OpenVINO').should('exist').click();
    modelServingWizard.findNextButton().should('be.enabled').click();
    //Step 3: Advanced Options
    modelServingWizard.findNextButton().should('be.enabled').click();
    //Step 4: Summary
    modelServingWizard.findSubmitButton().should('be.enabled').click();

    // dry run request for ServingRuntime
    cy.wait('@createServingRuntime').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          name: 'test-model',
          annotations: {
            'opendatahub.io/apiProtocol': 'REST',
            'opendatahub.io/runtime-version': '1.0.0',
            'opendatahub.io/template-display-name': 'OpenVINO',
            'openshift.io/display-name': 'OpenVINO',
          },
          labels: { 'opendatahub.io/dashboard': 'true' },
          namespace: 'test-project',
        },
      });
      expect(interception.request.body.spec).to.containSubset({
        supportedModelFormats: [{ name: 'openvino_ir', version: 'opset1' }],
      });
    });

    // dry run request for InferenceService
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: 'test-model',
          namespace: 'test-project',
          annotations: {
            'openshift.io/display-name': 'test-model',
            'opendatahub.io/model-type': 'predictive',
          },
          labels: {
            'opendatahub.io/dashboard': 'true',
          },
        },
        spec: {
          predictor: {
            minReplicas: 1,
            maxReplicas: 1,
            model: {
              modelFormat: { name: 'openvino_ir', version: 'opset1' },
              runtime: 'test-model',
            },
          },
        },
      });
    });

    // Actual request for ServingRuntime
    cy.wait('@createServingRuntime').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    // Actual request for InferenceService
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    // Verify both requests were made
    cy.get('@createServingRuntime.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });

    cy.get('@createInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });
  });

  it('Deploy model with PVC', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.PREDICTIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );
    cy.interceptK8s(
      'GET',
      { model: SecretModel, ns: 'test-project', name: 'test-model-token' },
      {
        statusCode: 200,
        body: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'test-model-token', namespace: 'test-project' },
          data: { token: btoa('test-token') },
        },
      },
    ).as('getTokenSecret');

    cy.intercept(
      'GET',
      '**/namespaces/test-project/persistentvolumeclaims?labelSelector=opendatahub.io%2Fdashboard%3Dtrue',
      mockK8sResourceList([
        mockPVCK8sResource({
          name: 'test-pvc',
          namespace: 'test-project',
          displayName: 'Test PVC',
          storageClassName: 'openshift-default-sc',
          annotations: {
            'dashboard.opendatahub.io/model-name': 'test-model',
            'dashboard.opendatahub.io/model-path': 'test-path',
          },
          labels: {
            'opendatahub.io/dashboard': 'true',
          },
        }),
      ]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    // Step 1: Model Source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findBackButton().should('be.disabled');
    modelServingWizard.findCancelButton().should('be.enabled');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist').click();
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelLocationSelectOption('Cluster storage').should('exist').click();
    modelServingWizard.findPVCSelectValue().should('have.value', 'Test PVC');
    modelServingWizard.findPVCPathPrefix().should('contain.text', 'pvc://test-pvc/');
    modelServingWizard.findLocationPathInput().should('have.value', 'test-path');
    modelServingWizard.findNextButton().should('be.enabled').click();
    //Step 2: Model Deployment
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    modelServingWizard.findModelFormatSelectOption('openvino_ir - opset1').should('exist').click();
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.findGlobalScopedTemplateOption('OpenVINO').should('exist').click();
    modelServingWizard.findNextButton().should('be.enabled').click();
    //Step 3: Advanced Options
    modelServingWizard.findNextButton().should('be.enabled').click();
    //Step 4: Summary
    modelServingWizard.findSubmitButton().should('be.enabled').click();

    // dry run request for ServingRuntime
    cy.wait('@createServingRuntime').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        metadata: {
          name: 'test-model',
          annotations: {
            'opendatahub.io/apiProtocol': 'REST',
            'opendatahub.io/runtime-version': '1.0.0',
            'opendatahub.io/template-display-name': 'OpenVINO',
            'openshift.io/display-name': 'OpenVINO',
          },
          labels: { 'opendatahub.io/dashboard': 'true' },
          namespace: 'test-project',
        },
      });
      expect(interception.request.body.spec).to.containSubset({
        supportedModelFormats: [{ name: 'openvino_ir', version: 'opset1' }],
      });
    });

    // dry run request for InferenceService
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body).to.containSubset({
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: 'test-model',
          namespace: 'test-project',
          annotations: {
            'openshift.io/display-name': 'test-model',
            'opendatahub.io/model-type': 'predictive',
          },
          labels: {
            'opendatahub.io/dashboard': 'true',
          },
        },
        spec: {
          predictor: {
            minReplicas: 1,
            maxReplicas: 1,
            model: {
              modelFormat: { name: 'openvino_ir', version: 'opset1' },
              runtime: 'test-model',
            },
          },
        },
      });
    });

    // Actual request for ServingRuntime
    cy.wait('@createServingRuntime').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    // Actual request for InferenceService
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    // Verify both requests were made
    cy.get('@createServingRuntime.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });

    cy.get('@createInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2); // 1 dry-run request and 1 actual request
    });
  });

  it('Edit an existing deployment', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.PREDICTIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([
        mockInferenceServiceK8sResource({
          modelType: ServingRuntimeModelType.PREDICTIVE,
          hasExternalRoute: true,
          secretName: 'test-uri-secret',
          hardwareProfileName: 'large-profile',
          hardwareProfileNamespace: 'opendatahub',
          description: 'test-description',
          resources: {
            requests: {
              cpu: '4',
              memory: '8Gi',
            },
            limits: {
              cpu: '8',
              memory: '16Gi',
            },
          },
        }),
      ]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();

    // Step 1: Model source
    modelServingWizardEdit.findModelLocationSelect().should('exist');
    modelServingWizardEdit.findModelLocationSelectOption('Existing connection').should('exist');
    modelServingWizardEdit.findExistingConnectionSelect().should('exist');
    modelServingWizardEdit.findExistingConnectionValue().should('have.value', 'Test URI Secret');
    modelServingWizardEdit.findSaveConnectionCheckbox().should('not.exist');
    modelServingWizardEdit.findModelSourceStep().should('be.enabled');
    modelServingWizardEdit.findNextButton().should('be.enabled');

    modelServingWizardEdit
      .findModelTypeSelect()
      .should('have.text', 'Predictive model')
      .should('be.disabled');

    modelServingWizardEdit.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizardEdit
      .findModelDeploymentDescriptionInput()
      .should('contain.text', 'test-description');
    modelServingWizardEdit.findModelDeploymentStep().should('be.enabled');
    modelServingWizardEdit.findAdvancedOptionsStep().should('be.enabled');
    modelServingWizardEdit.findNextButton().should('be.enabled');

    modelServingWizardEdit
      .findModelDeploymentNameInput()
      .should('have.value', 'Test Inference Service');
    modelServingWizardEdit.findModelDeploymentNameInput().type('test-model');
    hardwareProfileSection.findSelect().should('be.visible');
    hardwareProfileSection.findSelect().should('contain.text', 'Large Profile');
    modelServingWizardEdit.findServingRuntimeTemplateSearchSelector().should('exist');
    modelServingWizardEdit
      .findServingRuntimeTemplateSearchSelector()
      .should('contain.text', 'OpenVINO');
    modelServingWizardEdit.findNextButton().should('be.enabled').click();

    // Step 3: Advanced options
    modelServingWizardEdit.findAdvancedOptionsStep().should('be.enabled');
    modelServingWizardEdit.findExternalRouteCheckbox().should('be.checked');
    modelServingWizardEdit.findTokenAuthenticationCheckbox().click();
    modelServingWizardEdit.findServiceAccountByIndex(0).should('have.value', 'default-name');
    modelServingWizardEdit.findNextButton().should('be.enabled').click();

    modelServingWizardEdit.findUpdateDeploymentButton().should('be.enabled').click();
  });

  it('Verify cpu and memory request and limits values when editing KServe model', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.PREDICTIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([
        mockInferenceServiceK8sResource({
          modelType: ServingRuntimeModelType.PREDICTIVE,
          hasExternalRoute: true,
          hardwareProfileName: 'large-profile',
          hardwareProfileNamespace: 'opendatahub',
          description: 'test-description',
          resources: {
            requests: {
              cpu: '6',
              memory: '10Gi',
            },
            limits: {
              cpu: '6',
              memory: '10Gi',
            },
          },
          storageUri: 'https://test',
        }),
      ]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();
    // Step 1: Model source
    modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
    modelServingWizard.findSaveConnectionCheckbox().click();
    modelServingWizard.findSaveConnectionCheckbox().should('not.be.checked');
    modelServingWizardEdit.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    hardwareProfileSection.findSelect().should('contain.text', 'Large Profile');
    hardwareProfileSection.findCustomizeButton().should('exist').click();
    modelServingWizardEdit.findCPURequestedInput().should('have.value', '6');
    modelServingWizardEdit.findCPULimitInput().should('have.value', '6');
    modelServingWizardEdit.findMemoryRequestedInput().should('have.value', '10');
    modelServingWizardEdit.findMemoryLimitInput().should('have.value', '10');
    modelServingWizardEdit.findNextButton().should('be.enabled');

    // Test validation: CPU request cannot exceed CPU limit
    modelServingWizardEdit.findCPURequestedButton('Plus').click(); // set request to 7
    modelServingWizardEdit.findNextButton().should('be.disabled');
    cy.findAllByText('Limit must be greater than or equal to request').first().should('be.visible');
    modelServingWizardEdit.findCPURequestedButton('Minus').click();
    modelServingWizardEdit.findNextButton().should('be.enabled');

    // Test validation: Memory request cannot exceed memory limit
    modelServingWizardEdit.findMemoryRequestedButton('Plus').click(); // set request to 11
    modelServingWizardEdit.findNextButton().should('be.disabled');
    cy.findAllByText('Limit must be greater than or equal to request').first().should('be.visible');
    modelServingWizardEdit.findMemoryRequestedButton('Minus').click();
    modelServingWizardEdit.findNextButton().should('be.enabled');

    // Test validation: CPU and memory limit cannot be less than CPU and memory request
    modelServingWizardEdit.findCPULimitButton('Minus').click();
    modelServingWizardEdit.findNextButton().should('be.disabled');
    cy.findAllByText('Limit must be greater than or equal to request').first().should('be.visible');
    modelServingWizardEdit.findCPULimitButton('Plus').click();
    modelServingWizardEdit.findMemoryLimitButton('Minus').click();
    modelServingWizardEdit.findNextButton().should('be.disabled');
    cy.findAllByText('Limit must be greater than or equal to request').first().should('be.visible');
    modelServingWizardEdit.findMemoryLimitButton('Plus').click();
    modelServingWizardEdit.findNextButton().should('be.enabled');
  });

  it('Should create a new connection with a generated secret name', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.GENERATIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    cy.interceptK8s('POST', { model: SecretModel, ns: 'test-project' }, (req) => {
      const secretName = req.body.metadata.name;
      req.reply(mockSecretK8sResource({ name: secretName }));
    }).as('createSecret');
    cy.interceptK8s('GET', { model: SecretModel, ns: 'test-project' }, (req) => {
      const secretName = req.url.split('/').pop();

      if (secretName?.startsWith('secret-')) {
        req.reply({
          statusCode: 200,
          body: mockSecretK8sResource({ name: secretName }),
        });
      } else {
        req.reply({
          statusCode: 200,
          body: { apiVersion: 'v1', items: [], kind: 'SecretList', metadata: {} },
        });
      }
    }).as('getSecret');
    cy.intercept('GET', '/api/k8s/api/v1/namespaces/test-project/secrets/*', (req) => {
      const secretName = req.url.split('/').pop();
      if (secretName?.startsWith('secret-')) {
        req.reply({
          statusCode: 200,
          body: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: { name: secretName, namespace: 'test-project' },
            stringData: {},
          },
        });
      } else {
        req.continue();
      }
    }).as('fetchGeneratedSecretGets');

    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();

    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist');
    modelServingWizard
      .findModelTypeSelectOption('Generative AI model (Example, LLM)')
      .should('exist')
      .click();
    modelServingWizard.findModelLocationSelect().should('exist');
    modelServingWizard.findModelLocationSelectOption('URI').should('exist').click();
    modelServingWizard.findUrilocationInput().type('https://testinguri');

    modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
    modelServingWizard.findSaveConnectionCheckbox().click();
    modelServingWizard.findSaveConnectionCheckbox().should('not.be.checked');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 2: Model deployment
    modelServingWizard.findModelDeploymentStep().should('be.enabled');
    modelServingWizard.findAdvancedOptionsStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelDeploymentNameInput().type('test-model');
    hardwareProfileSection.findSelect().should('contain.text', 'Small');

    modelServingWizard.findModelFormatSelect().should('not.exist');
    modelServingWizard.findServingRuntimeTemplateSearchSelector().should('exist');
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.findGlobalScopedTemplateOption('vLLM NVIDIA').should('exist').click();

    modelServingWizard.findNumReplicasInput().should('exist');
    modelServingWizard.findNumReplicasInputField().should('have.value', '1');

    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 3: Advanced Options
    modelServingWizard.findAdvancedOptionsStep().should('be.enabled');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Step 4: Summary
    modelServingWizard.findSubmitButton().should('be.enabled').click();

    cy.wait('@createSecret').then((interception) => {
      expect(interception.request.body.metadata.name).to.satisfy(isGeneratedSecretName);
      expect(interception.request.body.metadata.namespace).to.equal('test-project');
      expect(interception.request.body.metadata.labels['opendatahub.io/dashboard']).to.equal(
        'false',
      );
      expect(
        interception.request.body.metadata.annotations['opendatahub.io/connection-type-protocol'],
      ).to.equal('uri');
      expect(interception.request.body.stringData.URI).to.equal('https://testinguri');
    });
    cy.wait('@createInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
    });

    cy.wait('@createInferenceService').then((interception) => {
      const { annotations } = interception.request.body.metadata;
      expect(annotations).to.have.property('opendatahub.io/connections');
      expect(isGeneratedSecretName(annotations['opendatahub.io/connections'])).to.equal(true);
    });
  });

  describe('redirect from v2 to v3 route', () => {
    beforeEach(() => {
      initIntercepts({});
    });

    it('deploy create', () => {
      cy.visitWithLogin(`/modelServing/test-project/deploy`);
      cy.findByTestId('app-page-title').contains('Deploy a model');
      cy.url().should('include', '/ai-hub/deployments/test-project/deploy');
    });
  });
});
