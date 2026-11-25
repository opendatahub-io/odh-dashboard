import type { Interception } from 'cypress/types/net-stubbing';
import YAML from 'js-yaml';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockSecretK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockSecretK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockGlobalScopedHardwareProfiles } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockStandardModelServingTemplateK8sResources } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockConnectionTypeConfigMap } from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceK8sResource';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ConfigType, TopologyType } from '@odh-dashboard/llmd-serving/types';
import { MODELS_AS_A_SERVICE_READY } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { SecretModel } from '@odh-dashboard/k8s-core/api/models';
import { mockSelfSubjectAccessReview } from '@odh-dashboard/internal/__mocks__/mockSelfSubjectAccessReview';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { ModelLocationSelectOption, ModelTypeLabel } from '../../../utils/modelServingConstants';
import {
  modelServingGlobal,
  modelServingWizard,
  modelServingWizardEdit,
} from '../../../pages/modelServing';
import { hardwareProfileSection } from '../../../pages/components/HardwareProfileSection';
import { initMockGatewayIntercepts } from '../../../utils/modelServingUtils';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  LLMInferenceServiceConfigModel,
  LLMInferenceServiceModel,
  ProjectModel,
  SelfSubjectAccessReviewModel,
  ServingRuntimeModel,
  TemplateModel,
} from '../../../utils/models';

const MODEL_NAME = 'test-yaml-model';

/** The parts of the LLMInferenceService YAML that wizard fields read and write */
type WizardYamlResource = {
  metadata: { annotations?: Record<string, string>; labels?: Record<string, string> };
  spec: {
    replicas?: unknown;
    router?: { gateway?: { refs?: { name: string; namespace: string }[] } };
    template?: { containers?: { name: string; env?: { name: string; value?: string }[] }[] };
  };
};

type EnvVar = { name: string; value?: string };

const withAnnotations = (
  resource: WizardYamlResource,
  annotations: Record<string, string>,
): WizardYamlResource => ({
  ...resource,
  metadata: {
    ...resource.metadata,
    annotations: { ...resource.metadata.annotations, ...annotations },
  },
});

const withLabels = (
  resource: WizardYamlResource,
  labels: Record<string, string>,
): WizardYamlResource => ({
  ...resource,
  metadata: { ...resource.metadata, labels: { ...resource.metadata.labels, ...labels } },
});

const withSpec = (
  resource: WizardYamlResource,
  spec: Partial<WizardYamlResource['spec']>,
): WizardYamlResource => ({ ...resource, spec: { ...resource.spec, ...spec } });

/** The form reads environment variables and runtime arguments from the `main` container */
const getMainContainerEnv = (resource: WizardYamlResource): EnvVar[] =>
  resource.spec.template?.containers?.find((container) => container.name === 'main')?.env ?? [];

const withMainContainerEnv = (resource: WizardYamlResource, env: EnvVar[]): WizardYamlResource => {
  const containers = resource.spec.template?.containers ?? [];
  const hasMain = containers.some((container) => container.name === 'main');
  return withSpec(resource, {
    template: {
      ...resource.spec.template,
      containers: hasMain
        ? containers.map((container) =>
            container.name === 'main' ? { ...container, env } : container,
          )
        : [...containers, { name: 'main', env }],
    },
  });
};

describe('Deployment wizard YAML view', () => {
  const initIntercepts = () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
          [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' },
        },
        conditions: [{ type: MODELS_AS_A_SERVICE_READY, status: 'True', reason: 'Ready' }],
      }),
    );
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableKServe: false,
        disableLLMd: false,
        deploymentWizardYAMLViewer: true,
        bidirectionalYamlWizardGa: true,
      }),
    );
    initMockGatewayIntercepts({
      gateways: [
        { name: 'test-gateway', namespace: 'test-ns', listener: 'http', status: 'Ready' },
        { name: 'other-gateway', namespace: 'other-ns', listener: 'http', status: 'Ready' },
      ],
    });
    cy.interceptOdh('GET /api/components', null, []);
    cy.interceptK8sList(
      { model: HardwareProfileModel, ns: 'opendatahub' },
      mockK8sResourceList(mockGlobalScopedHardwareProfiles),
    );
    cy.interceptK8sList(
      { model: SecretModel, ns: 'test-project' },
      mockK8sResourceList([
        mockSecretK8sResource({ name: 'test-s3-secret', displayName: 'test-s3-secret' }),
      ]),
    );
    cy.interceptOdh('GET /api/connection-types', [
      mockConnectionTypeConfigMap({
        displayName: 'URI - v1',
        name: 'uri-v1',
        category: ['existing-category'],
        fields: [{ type: 'uri', name: 'URI', envVar: 'URI', required: true, properties: {} }],
      }),
    ]);
    cy.interceptK8sList(
      TemplateModel,
      mockK8sResourceList(mockStandardModelServingTemplateK8sResources(), {
        namespace: 'opendatahub',
      }),
    );
    cy.interceptK8sList(
      ProjectModel,
      mockK8sResourceList([mockProjectK8sResource({ enableKServe: true })]),
    );
    cy.interceptK8sList(LLMInferenceServiceModel, mockK8sResourceList([]));
    cy.interceptK8sList(InferenceServiceModel, mockK8sResourceList([]));
    cy.interceptK8sList(ServingRuntimeModel, mockK8sResourceList([]));
    cy.interceptK8s(
      'POST',
      { model: LLMInferenceServiceModel, ns: 'test-project' },
      {
        statusCode: 200,
        body: mockLLMInferenceServiceK8sResource({
          name: MODEL_NAME,
          displayName: MODEL_NAME,
        }),
      },
    ).as('createLLMInferenceService');
  };

  /** Reach the deployment-details step with an LLMD method selected so form -> YAML generation works. */
  const setupWizardWithFormData = () => {
    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();
    modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.EXISTING).click();
    modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
    modelServingWizard.findNextButton().click();
    modelServingWizard.findModelDeploymentNameInput().type(MODEL_NAME);
    modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
  };

  /**
   * With the GA flag on, the YAML toggle opens the editor directly in edit mode.
   * Rewrites the editor content so the exact quote style emitted by `stringify` does not matter.
   * `expectedText` must appear in the rewritten YAML; waiting for it confirms the app has applied
   * the edit before the test switches views (the editor is fed by an uploaded file, asynchronously).
   */
  const editYaml = (mutate: (yaml: string) => string, expectedText: string) => {
    const editor = modelServingWizard.yaml.findYAMLCodeEditor();
    editor.getValue().then((current) => {
      const updated = mutate(current);
      // Guards against a no-op edit silently passing the test
      expect(updated, 'editor content should change').to.not.equal(current);
      editor.setValue(updated);
      editor.shouldContainTextInModel(expectedText);
    });
  };

  const interceptConfigWithoutMaaS = () =>
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableKServe: false,
        disableLLMd: false,
        deploymentWizardYAMLViewer: true,
        bidirectionalYamlWizardGa: true,
        modelAsService: false,
      }),
    );

  /**
   * Token authentication is editable when MaaS is off (MaaS manages authentication) and the user
   * can create role bindings; it then starts checked for llm-d.
   */
  const enableTokenAuthenticationField = () => {
    interceptConfigWithoutMaaS();
    // Product admins can't create role bindings in projects; allow only that review here and let
    // every other review fall through to the product admin mock
    cy.interceptK8s('POST', SelfSubjectAccessReviewModel, (req) => {
      const { resourceAttributes } = req.body.spec;
      if (resourceAttributes.resource === 'rolebindings') {
        req.reply(mockSelfSubjectAccessReview({ ...resourceAttributes, allowed: true }));
      }
    });
  };

  /** Edits the editor YAML as a parsed resource, so the editor's formatting does not matter. */
  const editYamlResource = (
    update: (resource: WizardYamlResource) => WizardYamlResource,
    expectedText: string,
  ) =>
    editYaml(
      (current) => YAML.dump(update(YAML.load(current) as WizardYamlResource), { lineWidth: -1 }),
      expectedText,
    );

  /** Asserts on the editor YAML as a parsed resource. */
  const expectYamlResource = (assert: (resource: WizardYamlResource) => void) =>
    modelServingWizard.yaml
      .findYAMLCodeEditor()
      .getValue()
      .then((current) => assert(YAML.load(current) as WizardYamlResource));

  const setDisplayName = (name: string) =>
    editYaml(
      (yaml) =>
        yaml.replace(
          /^(\s*).*openshift\.io\/display-name.*$/m,
          `$1openshift.io/display-name: ${name}`,
        ),
      name,
    );

  /**
   * The gateway field is an extension-backed (reducer) field, while replicas and the display name
   * are core field hooks. Re-initializing the form from YAML must repopulate both kinds.
   */
  const setGatewayRefOnYaml = (yaml: string, name: string, namespace: string) =>
    yaml.replace(
      /\n(\s*)gateway: \{\}/,
      `\n$1gateway:\n$1  refs:\n$1    - name: ${name}\n$1      namespace: ${namespace}`,
    );

  const setGatewayRef = (name: string, namespace: string) =>
    editYaml((yaml) => setGatewayRefOnYaml(yaml, name, namespace), name);

  const setReplicasOnYaml = (yaml: string, replicas: string) =>
    yaml.replace(/^(\s*)replicas: .*$/m, `$1replicas: ${replicas}`);

  /** Removing the connections annotation makes form extraction fail while the rest stays readable. */
  const removeConnectionAnnotation = (yaml: string) =>
    yaml.replace(/^\s*.*opendatahub\.io\/connections.*\n/m, '');

  beforeEach(() => {
    asProductAdminUser();
    initIntercepts();
  });

  it('regenerates YAML from the current form state when switching to YAML view', () => {
    setupWizardWithFormData();

    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();
    const editor = modelServingWizard.yaml.findYAMLCodeEditor();
    editor.waitForReady();
    editor.containsText('kind: LLMInferenceService');
    editor.containsText(`openshift.io/display-name: ${MODEL_NAME}`);

    // Change the form, re-enter YAML: the editor must reflect the new form state
    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();
    modelServingWizard.findModelDeploymentNameInput().clear().type(`${MODEL_NAME}-2`);
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();
    modelServingWizard.yaml
      .findYAMLCodeEditor()
      .containsText(`openshift.io/display-name: ${MODEL_NAME}-2`);
  });

  it('applies valid YAML edits to the form when switching back to Form', () => {
    setupWizardWithFormData();
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();

    setGatewayRef('other-gateway', 'other-ns');

    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();
    modelServingWizard.findNextButton().should('be.enabled').click();
    modelServingWizard.findGatewaySelect().should('contain.text', 'other-gateway | other-ns');
  });

  it('applies a YAML edit made from the review step and stays on the review step', () => {
    setupWizardWithFormData();
    modelServingWizard.findNextButton().click();
    modelServingWizard.findNextButton().click();
    modelServingWizard.findReviewStepModelDeploymentSection().should('contain.text', MODEL_NAME);

    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();
    setDisplayName('edited-on-review');
    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();

    modelServingWizard
      .findReviewStepModelDeploymentSection()
      .should('contain.text', 'edited-on-review');
  });

  it('applies YAML edits to each model details and deployment field and keeps them', () => {
    setupWizardWithFormData();
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();

    editYamlResource(
      (resource) =>
        withSpec(
          withAnnotations(resource, {
            'openshift.io/display-name': 'renamed-in-yaml',
            'openshift.io/description': 'described in yaml',
            'opendatahub.io/connections': 'other-s3-secret',
            'opendatahub.io/hardware-profile-name': 'large-profile',
          }),
          { replicas: 3 },
        ),
      'renamed-in-yaml',
    );
    // A second connection for the YAML to point at; the re-initialized form fetches it
    cy.interceptK8sList(
      { model: SecretModel, ns: 'test-project' },
      mockK8sResourceList([
        mockSecretK8sResource({ name: 'test-s3-secret', displayName: 'test-s3-secret' }),
        mockSecretK8sResource({ name: 'other-s3-secret', displayName: 'other-s3-secret' }),
      ]),
    );

    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();

    // Model deployment step (the current step)
    modelServingWizard.findModelDeploymentNameInput().should('have.value', 'renamed-in-yaml');
    modelServingWizard
      .findModelDeploymentDescriptionInput()
      .should('have.value', 'described in yaml');
    modelServingWizard.findNumReplicasInputField().should('have.value', '3');
    hardwareProfileSection.findSelect().should('contain.text', 'Large Profile');

    // Model details step
    modelServingWizard.findBackButton().click();
    modelServingWizard.findExistingConnectionValue().should('have.value', 'other-s3-secret');

    // The form must not write its old values back into the YAML
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();
    expectYamlResource((resource) => {
      expect(resource.spec.replicas).to.equal(3);
      expect(resource.metadata.annotations).to.containSubset({
        'openshift.io/display-name': 'renamed-in-yaml',
        'openshift.io/description': 'described in yaml',
        'opendatahub.io/connections': 'other-s3-secret',
        'opendatahub.io/hardware-profile-name': 'large-profile',
      });
    });
  });

  it('applies a YAML edit to the topology type and keeps it', () => {
    // The topology type field needs llm-d templates
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableKServe: false,
        disableLLMd: false,
        deploymentWizardYAMLViewer: true,
        bidirectionalYamlWizardGa: true,
        llmdTemplates: true,
      }),
    );
    cy.interceptK8sList(
      { model: LLMInferenceServiceConfigModel, ns: 'opendatahub' },
      mockK8sResourceList([]),
    );
    setupWizardWithFormData();
    modelServingWizard.findTopologyTypeSelect().should('contain.text', 'Single node');

    // The form writes its topology type into the YAML
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();
    modelServingWizard.yaml
      .findYAMLCodeEditor()
      .shouldContainTextInModel(`opendatahub.io/topology-type: ${TopologyType.SINGLE_NODE}`);

    editYamlResource(
      (resource) =>
        withAnnotations(resource, { 'opendatahub.io/topology-type': TopologyType.MULTI_NODE }),
      TopologyType.MULTI_NODE,
    );

    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();
    modelServingWizard.findTopologyTypeSelect().should('contain.text', 'Multi-node');

    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();
    expectYamlResource((resource) => {
      expect(resource.metadata.annotations).to.containSubset({
        'opendatahub.io/topology-type': TopologyType.MULTI_NODE,
      });
    });
  });

  it('applies YAML edits to each advanced settings field and keeps them', () => {
    enableTokenAuthenticationField();
    setupWizardWithFormData();
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();

    editYamlResource(
      (resource) =>
        withMainContainerEnv(
          withSpec(
            withLabels(
              withAnnotations(resource, {
                'security.opendatahub.io/enable-auth': 'false',
                'opendatahub.io/genai-use-case': 'chat-from-yaml',
              }),
              { 'opendatahub.io/genai-asset': 'true' },
            ),
            {
              router: {
                ...resource.spec.router,
                gateway: { refs: [{ name: 'other-gateway', namespace: 'other-ns' }] },
              },
            },
          ),
          [
            { name: 'FROM_YAML', value: 'yaml-value' },
            { name: 'VLLM_ADDITIONAL_ARGS', value: '--max-model-len=4096' },
          ],
        ),
      'chat-from-yaml',
    );

    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();
    modelServingWizard.findNextButton().should('be.enabled').click();

    modelServingWizard.findTokenAuthenticationCheckbox().should('not.be.checked');
    // The text area keeps a trailing newline for the next argument
    modelServingWizard
      .findRuntimeArgsTextBox()
      .invoke('val')
      .should((value) => expect(String(value).trim()).to.equal('--max-model-len=4096'));
    modelServingWizard.findEnvVariablesCheckbox().should('be.checked');
    modelServingWizard.findEnvVariableName('0').should('have.value', 'FROM_YAML');
    modelServingWizard.findEnvVariableValue('0').should('have.value', 'yaml-value');
    modelServingWizard.findSaveAiAssetCheckbox().should('be.checked');
    modelServingWizard.findUseCaseInput().should('have.value', 'chat-from-yaml');
    modelServingWizard.findGatewaySelect().should('contain.text', 'other-gateway | other-ns');

    // The form must not write its old values back into the YAML
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();
    expectYamlResource((resource) => {
      expect(resource.metadata.annotations).to.containSubset({
        'security.opendatahub.io/enable-auth': 'false',
        'opendatahub.io/genai-use-case': 'chat-from-yaml',
      });
      expect(resource.metadata.labels).to.containSubset({ 'opendatahub.io/genai-asset': 'true' });
      expect(resource.spec.router?.gateway?.refs).to.deep.equal([
        { name: 'other-gateway', namespace: 'other-ns' },
      ]);
      expect(getMainContainerEnv(resource)).to.deep.equal([
        { name: 'FROM_YAML', value: 'yaml-value' },
        { name: 'VLLM_ADDITIONAL_ARGS', value: '--max-model-len=4096' },
      ]);
    });
  });

  it('writes each form field into the YAML', () => {
    enableTokenAuthenticationField();
    setupWizardWithFormData();

    // Model deployment step
    modelServingWizard.findModelDeploymentDescriptionInput().type('described in form');
    modelServingWizard.findNumReplicasPlusButton().click();
    modelServingWizard.findNumReplicasInputField().should('have.value', '2');
    modelServingWizard.selectProfileContaining('Large Profile');
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Advanced settings step
    modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked').click();
    modelServingWizard.findTokenAuthenticationCheckbox().should('not.be.checked');
    modelServingWizard.findRuntimeArgsTextBox().type('--max-model-len=2048');
    modelServingWizard.findEnvVariablesCheckbox().click();
    modelServingWizard.findAddVariableButton().click();
    modelServingWizard.findEnvVariableName('0').clear().type('FROM_FORM');
    modelServingWizard.findEnvVariableValue('0').type('form-value');
    modelServingWizard.findSaveAiAssetCheckbox().should('be.checked');
    modelServingWizard.findUseCaseInput().type('chat-from-form');
    modelServingWizard.findGatewaySelectOption('other-gateway | other-ns').click();
    modelServingWizard.findGatewaySelect().closeSelectMenu();

    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();
    modelServingWizard.yaml.findYAMLCodeEditor().shouldContainTextInModel('chat-from-form');
    expectYamlResource((resource) => {
      expect(resource.spec.replicas).to.equal(2);
      expect(resource.metadata.annotations).to.containSubset({
        'openshift.io/display-name': MODEL_NAME,
        'openshift.io/description': 'described in form',
        'opendatahub.io/hardware-profile-name': 'large-profile',
        'security.opendatahub.io/enable-auth': 'false',
        'opendatahub.io/genai-use-case': 'chat-from-form',
      });
      expect(resource.metadata.labels).to.containSubset({ 'opendatahub.io/genai-asset': 'true' });
      expect(resource.spec.router?.gateway?.refs).to.deep.include({
        name: 'other-gateway',
        namespace: 'other-ns',
      });
      expect(getMainContainerEnv(resource)).to.deep.equal([
        { name: 'FROM_FORM', value: 'form-value' },
        { name: 'VLLM_ADDITIONAL_ARGS', value: '--max-model-len=2048' },
      ]);
    });
  });

  it('keeps Next disabled when a YAML edit gives a form field the wrong type', () => {
    setupWizardWithFormData();
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();

    editYaml((yaml) => setReplicasOnYaml(yaml, '"abc"'), 'replicas: "abc"');

    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();
    modelServingWizard.findNumReplicasInput().should('exist');
    modelServingWizard.findNextButton().should('be.disabled');
  });

  it('preserves annotations added in YAML through form edits and submit', () => {
    // Plain llm-d deployment: turn MaaS off so submitting only updates the LLMInferenceService
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableKServe: false,
        disableLLMd: false,
        deploymentWizardYAMLViewer: true,
        bidirectionalYamlWizardGa: true,
        modelAsService: false,
      }),
    );
    // Existing llm-d deployment, plus a connection so the form can read it
    cy.interceptK8sList(
      { model: LLMInferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([
        mockLLMInferenceServiceK8sResource({
          name: 'test-llm-inference-service',
          displayName: 'Test LLM Inference Service',
          secretName: 'test-s3-secret',
        }),
      ]),
    );
    cy.intercept('PUT', '**/llminferenceservices/test-llm-inference-service*', (req) => {
      req.reply({ statusCode: 200, body: req.body });
    }).as('updateLLMInferenceService');

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test LLM Inference Service').findKebabAction('Edit').click();

    // A scheduler means llm-d, so the form selects it from the existing deployment
    modelServingWizardEdit.findNextButton().should('be.enabled').click();
    modelServingWizardEdit
      .findDeploymentMethodRadio('llm-inference-service-llmd')
      .should('be.checked');

    // Add a base resource annotation and a scheduler annotation in YAML
    modelServingWizardEdit.yaml.findYAMLViewerToggle('YAML').click();
    editYaml(
      (yaml) =>
        yaml
          .replace(/^(\s*)annotations:$/m, '$1annotations:\n$1  custom.example.com/hello: base')
          .replace(/^(\s*)scheduler:$/m, '$1scheduler:\n$1  annotations:\n$1    hello: hello'),
      'custom.example.com/hello: base',
    );

    // Back to the form: llm-d is still selected, and editing the form must not drop the annotations
    modelServingWizardEdit.yaml.findYAMLViewerToggle('Form').click();
    modelServingWizardEdit
      .findDeploymentMethodRadio('llm-inference-service-llmd')
      .should('be.checked');
    modelServingWizardEdit
      .findModelDeploymentDescriptionInput()
      .clear()
      .type('updated from the form');

    modelServingWizardEdit.yaml.findYAMLViewerToggle('YAML').click();
    modelServingWizardEdit.yaml
      .findYAMLCodeEditor()
      .shouldContainTextInModel('custom.example.com/hello: base');
    modelServingWizardEdit.yaml.findYAMLCodeEditor().shouldContainTextInModel('hello: hello');

    // Submit from the form and confirm the annotations survive into the update request
    modelServingWizardEdit.yaml.findYAMLViewerToggle('Form').click();
    modelServingWizardEdit.findNextButton().should('be.enabled').click();
    modelServingWizardEdit.findNextButton().should('be.enabled').click();
    modelServingWizardEdit.findSubmitButton().click();

    cy.wait('@updateLLMInferenceService'); // dry run
    cy.wait('@updateLLMInferenceService').then((interception) => {
      expect(interception.request.body.metadata.annotations['custom.example.com/hello']).to.equal(
        'base',
      );
      expect(interception.request.body.spec.router.scheduler.annotations).to.deep.equal({
        hello: 'hello',
      });
    });
  });

  it('uses the accelerator and resource name picked in the form after a YAML round-trip', () => {
    // Enable the accelerator field (needs vLLM-on-MaaS) without the MaaS side effects
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableKServe: false,
        disableLLMd: false,
        deploymentWizardYAMLViewer: true,
        bidirectionalYamlWizardGa: true,
        vLLMDeploymentOnMaaS: true,
        modelAsService: false,
      }),
    );
    const acceleratorConfigs = [
      mockLLMInferenceServiceConfigK8sResource({
        name: 'vllm-rocm',
        displayName: 'vLLM ROCm',
        configType: ConfigType.ACCELERATOR,
        supportedTopologies: [TopologyType.SINGLE_NODE],
      }),
      mockLLMInferenceServiceConfigK8sResource({
        name: 'vllm-cuda',
        displayName: 'vLLM CUDA',
        configType: ConfigType.ACCELERATOR,
        supportedTopologies: [TopologyType.SINGLE_NODE],
      }),
    ];
    cy.interceptK8sList(
      { model: LLMInferenceServiceConfigModel, ns: 'opendatahub' },
      mockK8sResourceList(acceleratorConfigs),
    );
    cy.interceptK8sList(
      { model: LLMInferenceServiceConfigModel, ns: 'test-project' },
      mockK8sResourceList([]),
    );
    cy.interceptK8s(
      'POST',
      { model: LLMInferenceServiceConfigModel, ns: 'test-project' },
      (req) => {
        req.reply({ statusCode: 200, body: req.body });
      },
    ).as('createLLMInferenceServiceConfig');

    const RENAMED = 'renamed-after-yaml';
    setupWizardWithFormData();

    // Pick accelerator A
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.selectGlobalScopedTemplateOption('vLLM ROCm');
    modelServingWizard
      .findServingRuntimeTemplateSearchSelector()
      .should('contain.text', 'vLLM ROCm');

    // Make a YAML-only change (not represented in the form) and come back to the form
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();
    editYaml(
      (yaml) =>
        yaml.replace(/(\n\s*)annotations:/, '$1annotations:\n$1  example.com/yaml-only: kept'),
      'example.com/yaml-only: kept',
    );
    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();

    // The YAML edit remounted the form from the YAML; the new deployment's name stays editable
    modelServingWizard.findResourceNameButton().click();
    modelServingWizard.findResourceNameInput().should('be.enabled').clear().type(RENAMED);

    // Switch accelerator A -> B
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.selectGlobalScopedTemplateOption('vLLM CUDA');
    modelServingWizard
      .findServingRuntimeTemplateSearchSelector()
      .should('contain.text', 'vLLM CUDA');

    modelServingWizard.findNextButton().should('be.enabled').click();
    modelServingWizard.findNextButton().should('be.enabled').click();
    modelServingWizard.findSubmitButton().should('be.enabled').click();

    // Config copies are named after the resource, so they follow the rename
    const rocmRef = `${RENAMED}-vllm-rocm`;
    const cudaRef = `${RENAMED}-vllm-cuda`;

    cy.wait('@createLLMInferenceService').then((interception) => {
      expect(interception.request.body.metadata.name).to.equal(RENAMED);
      // The served model name followed the resource name, so it follows the rename too
      expect(interception.request.body.spec.model.name).to.equal(RENAMED);
      expect(interception.request.body.metadata.annotations).to.containSubset({
        'opendatahub.io/accelerator-config-ref': cudaRef,
      });
      expect(interception.request.body.spec.baseRefs).to.deep.equal([{ name: cudaRef }]);
    });

    // Only the accelerator chosen in the form gets copied into the project
    cy.get<Interception[]>('@createLLMInferenceServiceConfig.all').then((interceptions) => {
      const names = interceptions.map((i) => i.request.body.metadata.name);
      expect(names).to.include(cudaRef);
      expect(names).not.to.include(rocmRef);
      expect(names).not.to.include(`${MODEL_NAME}-vllm-cuda`);
    });
  });

  it('shows the YAML errors modal and stays in YAML when cancelled', () => {
    setupWizardWithFormData();
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();

    // Break the YAML syntax entirely
    const editor = modelServingWizard.yaml.findYAMLCodeEditor();
    editor.setValue('::: not yaml [');
    editor.shouldContainTextInModel('::: not yaml [');

    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();
    modelServingWizard.yaml.findYamlErrorsModal().should('exist');
    modelServingWizard.yaml.findCancelSwitchToFormButton().click();
    modelServingWizard.yaml.findYamlErrorsModal().should('not.exist');
    // Still in YAML view
    modelServingWizard.yaml.findYAMLCodeEditor().find().should('be.visible');
  });

  it('force continue applies the readable YAML values to the form', () => {
    setupWizardWithFormData();
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();

    // Valid YAML and K8s resource, but the form cannot resolve the model location:
    // dropping the connections annotation fails extraction while the rest stays readable
    editYaml((yaml) => setReplicasOnYaml(removeConnectionAnnotation(yaml), '2'), 'replicas: 2');

    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();
    modelServingWizard.yaml.findYamlErrorsModal().should('exist');
    modelServingWizard.yaml.findForceContinueToFormButton().click();
    // The readable values from YAML were applied to the form
    modelServingWizard.findNumReplicasInputField().should('have.value', '2');
    // The unreadable model location is not silently kept from before the YAML edit
    modelServingWizard.findNextButton().should('be.disabled');
  });

  it('use saved form inputs keeps the form values from before the YAML edits', () => {
    setupWizardWithFormData();
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();

    editYaml(
      (yaml) => setGatewayRefOnYaml(removeConnectionAnnotation(yaml), 'other-gateway', 'other-ns'),
      'other-gateway',
    );

    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();
    modelServingWizard.yaml.findYamlErrorsModal().should('exist');
    modelServingWizard.yaml.findUseSavedFormInputsButton().click();
    // YAML edits discarded; the saved form state is intact
    modelServingWizard.findModelDeploymentNameInput().should('have.value', MODEL_NAME);
    modelServingWizard.findNextButton().click();
    modelServingWizard.findGatewaySelect().should('not.contain.text', 'other-gateway');
  });

  it('submits the YAML-edited values when the last change was in the YAML editor', () => {
    setupWizardWithFormData();
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();

    setDisplayName('submitted-from-yaml');

    modelServingWizard.findDeployButton().click();
    cy.wait('@createLLMInferenceService').then((interception) => {
      expect(interception.request.body.metadata.annotations['openshift.io/display-name']).to.equal(
        'submitted-from-yaml',
      );
    });
  });

  it('disables the Form toggle in YAML edit mode when the GA feature flag is off', () => {
    // Re-mock config without the GA flag
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableKServe: false,
        disableLLMd: false,
        deploymentWizardYAMLViewer: true,
      }),
    );

    setupWizardWithFormData();
    // Without the GA flag, YAML opens in preview and requires the manual edit modal
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();
    modelServingWizard.yaml.findManualEditModeButton().click();
    modelServingWizard.yaml.findSwitchToYAMLEditorConfirmButton().click();
    modelServingWizard.yaml.findYAMLCodeEditor().waitForReady();

    modelServingWizard.yaml.findYAMLViewerToggle('Form').should('be.disabled');
  });

  it('reports an unreadable spec instead of crashing the wizard', () => {
    setupWizardWithFormData();
    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();

    // Valid resource shell, but no spec: the platform extractors cannot read it
    const editor = modelServingWizard.yaml.findYAMLCodeEditor();
    editor.waitForReady();
    editor.setValue(`apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceService
metadata:
  name: ${MODEL_NAME}
  namespace: test-project
spec: {}
`);
    editor.shouldContainTextInModel('spec: {}');

    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();
    modelServingWizard.yaml.findYamlErrorsModal().should('exist');
    // No form data could be extracted, so force continue is not offered
    modelServingWizard.yaml.findForceContinueToFormButton().should('not.exist');
    modelServingWizard.yaml.findUseSavedFormInputsButton().click();
    // The wizard is still usable instead of being replaced by a runtime error
    modelServingWizard.findModelDeploymentNameInput().should('exist');
  });

  it('falls back to YAML edit mode when an existing deployment cannot be displayed in the form', () => {
    // Default mock has an hf:// uri and no connections annotation -> extraction fails validation
    cy.interceptK8sList(
      LLMInferenceServiceModel,
      mockK8sResourceList([mockLLMInferenceServiceK8sResource({})]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test LLM Inference Service').findKebabAction('Edit').click();

    modelServingWizard.yaml.findYAMLEditFallbackAlert().should('be.visible');
    const editor = modelServingWizard.yaml.findYAMLCodeEditor();
    editor.waitForReady();
    editor.containsText('kind: LLMInferenceService');
    // Auto-fallback lands directly in editable YAML (upload is only enabled in yaml-edit mode)
    editor.upload().should('exist');
  });

  it('turns opted-out settings back on from a YAML edit', () => {
    enableTokenAuthenticationField();
    setupWizardWithFormData();
    modelServingWizard.findNextButton().should('be.enabled').click();

    // Both start on; opt out in the form
    modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked').click();
    modelServingWizard.findSaveAiAssetCheckbox().should('be.checked').click();
    modelServingWizard.findTokenAuthenticationCheckbox().should('not.be.checked');
    modelServingWizard.findSaveAiAssetCheckbox().should('not.be.checked');

    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();
    expectYamlResource((resource) => {
      expect(resource.metadata.annotations).to.containSubset({
        'security.opendatahub.io/enable-auth': 'false',
      });
      expect(resource.metadata.labels).not.to.have.property('opendatahub.io/genai-asset');
    });
    editYamlResource((resource) => {
      const annotations: Record<string, string> = { ...resource.metadata.annotations };
      delete annotations['security.opendatahub.io/enable-auth'];
      return withLabels(
        { ...resource, metadata: { ...resource.metadata, annotations } },
        { 'opendatahub.io/genai-asset': 'true' },
      );
    }, 'opendatahub.io/genai-asset');

    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();
    modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
    modelServingWizard.findSaveAiAssetCheckbox().should('be.checked');
  });

  it('keeps the selected deployment method through a YAML edit', () => {
    // The simple vLLM method is offered with vLLM-on-MaaS
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableKServe: false,
        disableLLMd: false,
        deploymentWizardYAMLViewer: true,
        bidirectionalYamlWizardGa: true,
        modelAsService: false,
        vLLMDeploymentOnMaaS: true,
      }),
    );
    setupWizardWithFormData();
    modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-simple-vllm');
    modelServingWizard
      .findDeploymentMethodRadio('llm-inference-service-simple-vllm')
      .should('be.checked');

    modelServingWizard.yaml.findYAMLViewerToggle('YAML').click();
    editYamlResource((resource) => withSpec(resource, { replicas: 2 }), 'replicas: 2');
    modelServingWizard.yaml.findYAMLViewerToggle('Form').click();

    modelServingWizard.findNumReplicasInputField().should('have.value', '2');
    modelServingWizard
      .findDeploymentMethodRadio('llm-inference-service-simple-vllm')
      .should('be.checked');
  });
});
