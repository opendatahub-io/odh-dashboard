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
  RoleBindingModel,
  RoleModel,
  SecretModel,
  ServiceAccountModel,
  ServingRuntimeModel,
  TemplateModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { ServingRuntimeModelType, ServingRuntimePlatform } from '#~/types';
import { mockGlobalScopedHardwareProfiles } from '#~/__mocks__/mockHardwareProfile';
import { mockConnectionTypeConfigMap } from '../../../../../../__mocks__/mockConnectionType';

const initIntercepts = ({ modelType }: { modelType?: ServingRuntimeModelType }) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        kserve: true,
        'model-mesh': false,
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelMesh: true,
      disableNIMModelServing: true,
      disableKServe: false,
      disableDeploymentWizard: false,
    }),
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
      fields: [
        {
          type: 'short-text',
          name: 'AWS_ACCESS_KEY_ID',
          envVar: 'AWS_ACCESS_KEY_ID',
          required: true,
          properties: {},
        },
        {
          type: 'short-text',
          name: 'AWS_SECRET_ACCESS_KEY',
          envVar: 'AWS_SECRET_ACCESS_KEY',
          required: true,
          properties: {},
        },
        {
          type: 'short-text',
          name: 'AWS_S3_ENDPOINT',
          envVar: 'AWS_S3_ENDPOINT',
          required: true,
          properties: {},
        },
        {
          type: 'short-text',
          name: 'AWS_S3_BUCKET',
          envVar: 'AWS_S3_BUCKET',
          required: true,
          properties: {},
        },
        {
          type: 'short-text',
          name: 'AWS_DEFAULT_REGION',
          envVar: 'AWS_DEFAULT_REGION',
          required: false,
          properties: {},
        },
      ],
    }),
  ]).as('getConnectionTypes');

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList(mockGlobalScopedHardwareProfiles),
  );

  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(
      [
        mockServingRuntimeTemplateK8sResource({
          name: 'template-2',
          displayName: 'OpenVINO',
          platforms: [ServingRuntimePlatform.SINGLE],
          modelTypes: [ServingRuntimeModelType.PREDICTIVE],
        }),
        mockServingRuntimeTemplateK8sResource({
          name: 'template-3',
          displayName: 'Caikit',
          platforms: [ServingRuntimePlatform.SINGLE],
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
          platforms: [ServingRuntimePlatform.SINGLE],
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
          platforms: [ServingRuntimePlatform.SINGLE],
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

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: false })]),
  );

  cy.interceptK8s(
    'POST',
    {
      model: InferenceServiceModel,
      ns: 'test-project',
    },
    {
      statusCode: 200,
      body: mockInferenceServiceK8sResource({ name: 'test-model', modelType }),
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

    // TODO: visit directly when plugin is enabled
    cy.visitWithLogin('/modelServing/test-project?devFeatureFlags=Model+Serving+Plugin%3Dtrue');
    modelServingGlobal.findDeployModelButton().click();
    cy.findByRole('heading', { name: 'Deploy a model' }).should('exist');
    cy.findByRole('button', { name: 'Cancel' }).click();
    cy.url().should('include', '/modelServing/test-project');

    cy.visitWithLogin(
      '/projects/test-project?section=model-server&devFeatureFlags=Model+Serving+Plugin%3Dtrue',
    );
    modelServingSection.findDeployModelButton().click();
    cy.findByRole('heading', { name: 'Deploy a model' }).should('exist');
    cy.findByRole('button', { name: 'Cancel' }).click();
    cy.url().should('include', '/projects/test-project');
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

    // TODO: visit directly when plugin is enabled
    cy.visitWithLogin('/modelServing/test-project?devFeatureFlags=Model+Serving+Plugin%3Dtrue');
    modelServingGlobal.findDeployModelButton().click();

    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist');
    modelServingWizard
      .findModelTypeSelectOption('Generative AI model (e.g. LLM)')
      .should('exist')
      .click();
    modelServingWizard.findModelLocationSelect().should('exist');
    modelServingWizard.findModelLocationSelectOption('URI - v1').should('exist').click();
    modelServingWizard.findUrilocationInput().should('exist').type('https://test');
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
    modelServingWizard.findNextButton().should('be.enabled');

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
          'networking.kserve.io/visibility': 'exposed',
        },
        annotations: {
          'openshift.io/display-name': 'test-model',
          'openshift.io/description': 'test-description',
          'opendatahub.io/hardware-profile-namespace': 'opendatahub',
          'opendatahub.io/hardware-profile-name': 'small-profile',
          'opendatahub.io/model-type': 'generative',
          'security.opendatahub.io/enable-auth': 'true',
          'opendatahub.io/genai-asset': 'true',
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

    // TODO: visit directly when plugin is enabled
    cy.visitWithLogin('/modelServing/test-project?devFeatureFlags=Model+Serving+Plugin%3Dtrue');
    modelServingGlobal.findDeployModelButton().click();

    // Step 1: Model source
    modelServingWizard.findModelSourceStep().should('be.enabled');
    modelServingWizard.findModelDeploymentStep().should('be.disabled');
    modelServingWizard.findNextButton().should('be.disabled');
    modelServingWizard.findModelTypeSelectOption('Generative AI model (e.g. LLM)').should('exist');
    modelServingWizard.findModelTypeSelectOption('Predictive model').should('exist').click();
    modelServingWizard.findModelLocationSelect().should('exist');
    modelServingWizard.findModelLocationSelectOption('URI - v1').should('exist').click();
    modelServingWizard.findUrilocationInput().should('exist').type('https://test');
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

  it('Edit an existing deployment', () => {
    initIntercepts({ modelType: ServingRuntimeModelType.PREDICTIVE });
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([
        mockInferenceServiceK8sResource({
          modelType: ServingRuntimeModelType.PREDICTIVE,
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
          storageUri: 'https://test',
        }),
      ]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    // TODO: visit directly when plugin is enabled
    cy.visitWithLogin('/modelServing/test-project?devFeatureFlags=Model+Serving+Plugin%3Dtrue');
    modelServingGlobal.getModelRow('Test Inference Service').findKebabAction('Edit').click();

    // Step 1: Model source
    modelServingWizardEdit.findModelLocationSelect().should('exist');
    modelServingWizardEdit.findUrilocationInput().should('have.value', 'https://test');
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
  });
});
