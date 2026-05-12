import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceK8sResource';
import { mockMaaSModelRef } from '@odh-dashboard/internal/__mocks__/mockMaaSModelRefResource';
import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockSecretK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mockGlobalScopedHardwareProfiles } from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import { mockStandardModelServingTemplateK8sResources } from '@odh-dashboard/internal/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockConnectionTypeConfigMap } from '@odh-dashboard/internal/__mocks__/mockConnectionType';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import {
  ModelLocationSelectOption,
  ModelTypeLabel,
} from '@odh-dashboard/model-serving/components/deploymentWizard/types';
import { hardwareProfileSection } from '../../../pages/components/HardwareProfileSection';
import { maasWizardField } from '../../../pages/modelsAsAService';
import {
  modelServingGlobal,
  modelServingWizard,
  modelServingWizardEdit,
} from '../../../pages/modelServing';
import { initMockGatewayIntercepts } from '../../../utils/modelServingUtils';
import {
  HardwareProfileModel,
  InferenceServiceModel,
  LLMInferenceServiceModel,
  ProjectModel,
  SecretModel,
  ServingRuntimeModel,
  TemplateModel,
} from '../../../utils/models';

describe('MaaS Deployment Wizard', () => {
  const initMaaSDeploymentIntercepts = () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
          [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
        },
        conditions: [{ type: 'ModelsAsServiceReady', status: 'True', reason: 'Ready' }],
      }),
    );
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableNIMModelServing: true,
        disableKServe: false,
        genAiStudio: true,
        modelAsService: true,
        disableLLMd: false,
        llmGatewayField: true,
      }),
    );

    initMockGatewayIntercepts({
      gateways: [
        {
          name: 'maas-default-gateway',
          namespace: 'openshift-ingress',
          listener: 'http',
          status: 'Ready',
        },
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
    ]).as('getConnectionTypes');
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
      {
        model: LLMInferenceServiceModel,
        ns: 'test-project',
      },
      {
        statusCode: 200,
        body: mockLLMInferenceServiceK8sResource({
          name: 'test-llm-inference-service',
          displayName: 'Test LLM Inference Service',
          description: 'Test LLM Inference Service Description',
        }),
      },
    ).as('createLLMInferenceService');
    cy.intercept('PUT', '**/llminferenceservices/test-llm-inference-service*', (req) => {
      req.reply({ statusCode: 200, body: req.body });
    }).as('updateLLMInferenceService');
    cy.interceptOdh('POST /maas/api/v1/maasmodel', {
      data: mockMaaSModelRef({
        name: 'test-maas-model-ref',
        namespace: 'test-project',
        modelRef: { name: 'test-llm-inference-service', kind: 'LLMInferenceService' },
        displayName: 'Test LLM Inference Service',
        description: 'Test LLM Inference Service Description',
      }),
    }).as('createMaaSModelRef');
    cy.interceptOdh(
      'DELETE /maas/api/v1/maasmodel/:namespace/:name',
      { path: { namespace: 'test-project', name: 'test-llm-inference-service' } },
      { data: { message: 'Deleted successfully' } },
    ).as('deleteMaaSModelRef');
    cy.interceptOdh(
      'PUT /maas/api/v1/maasmodel/:namespace/:name',
      { path: { namespace: '*', name: '*' } },
      {
        data: mockMaaSModelRef({
          name: 'test-maas-model-ref',
          namespace: 'test-project',
          modelRef: { name: 'test-llm-inference-service', kind: 'LLMInferenceService' },
        }),
      },
    ).as('updateMaaSModelRef');
  };

  it('should create an LLMD deployment with MaaS enabled and create a MaaSModelRef', () => {
    initMaaSDeploymentIntercepts();

    // Navigate to wizard and set up basic deployment
    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();

    // Quick setup: Model source and deployment
    modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.EXISTING).click();
    modelServingWizard.findExistingConnectionValue().should('have.value', 'test-s3-secret');
    modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
    modelServingWizard.findNextButton().click();

    modelServingWizard.findModelDeploymentNameInput().type('test-llm-inference-service');
    modelServingWizard
      .findModelDeploymentDescriptionInput()
      .type('Test LLM Inference Service Description');
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.findGlobalScopedTemplateOption('Distributed inference with llm-d').click();
    modelServingWizard.findNextButton().click();

    // Focus on MaaS feature testing
    // uncheck token auth to simplify test
    modelServingWizard.findTokenAuthenticationCheckbox().click();

    // Verify gateway select exists and that maas-default-gateway is hidden when MaaS is unchecked
    modelServingWizard.findGatewaySelect().should('exist').click();
    cy.findByRole('option', { name: 'maas-default-gateway | openshift-ingress' }).should(
      'not.exist',
    );
    // Select a non-MaaS gateway
    cy.findByRole('option', { name: 'test-gateway | test-ns' }).click();

    // Verify MaaS checkbox is unchecked by default
    maasWizardField.findSaveAsMaaSCheckbox().should('exist').should('not.be.checked');

    // Check the MaaS checkbox — the gateway field should become disabled and show the MaaS gateway
    maasWizardField.findSaveAsMaaSCheckbox().click();
    maasWizardField.findSaveAsMaaSCheckbox().should('be.checked');

    modelServingWizard
      .findGatewaySelect()
      .should('be.disabled')
      .should('contain.text', 'maas-default-gateway | openshift-ingress');

    modelServingWizard.findNextButton().should('be.enabled').click();

    // Submit and verify MaaS-specific annotations and gateway refs
    modelServingWizard.findSubmitButton().click();

    cy.wait('@createMaaSModelRef').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=true');
      expect(interception.request.body.data.name).to.equal('test-llm-inference-service');
      expect(interception.request.body.data.namespace).to.equal('test-project');
    });

    cy.wait('@createLLMInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');

      expect(interception.request.body.spec.router.gateway.refs).to.deep.equal([
        {
          name: 'maas-default-gateway',
          namespace: 'openshift-ingress',
        },
      ]);

      expect(interception.request.body.metadata.annotations).to.not.have.property(
        'security.opendatahub.io/enable-auth',
      );
    });

    cy.wait('@createLLMInferenceService');
    cy.get('@createLLMInferenceService.all').should('have.length', 2);
    cy.wait('@createMaaSModelRef').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=true');
      expect(interception.request.body.data.name).to.equal('test-llm-inference-service');
      expect(interception.request.body.data.namespace).to.equal('test-project');
      expect(interception.request.body.data.displayName).to.equal('Test LLM Inference Service');
      expect(interception.request.body.data.description).to.equal(
        'Test LLM Inference Service Description',
      );
    });
    cy.get('@createMaaSModelRef.all').should('have.length', 2);
  });
  it('should update the MaaSModelRef when editing an existing deployment', () => {
    initMaaSDeploymentIntercepts();

    const savedURIModel = mockLLMInferenceServiceK8sResource({
      isMaaS: true,
      replicas: 2,
    });
    cy.interceptK8sList(
      { model: LLMInferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([savedURIModel]),
    );
    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test LLM Inference Service').findKebabAction('Edit').click();
    modelServingWizardEdit
      .findModelLocationSelectOption('Existing connection')
      .should('exist')
      .click();
    modelServingWizardEdit.findNextButton().should('be.enabled').click();
    modelServingWizardEdit.findModelDeploymentNameInput().clear().type('test-llmd-model-2');
    modelServingWizardEdit.findModelDeploymentDescriptionInput().type('test-llmd-description-2');
    hardwareProfileSection.findSelect().should('exist');
    hardwareProfileSection.findSelect().should('contain.text', 'Small');
    hardwareProfileSection.selectProfile(
      'Large Profile Compatible CPU: Request = 4 Cores; Limit = 4 Cores; Memory: Request = 8 GiB; Limit = 8 GiB',
    );
    modelServingWizardEdit.findNextButton().should('be.enabled').click();

    // MaaS checkbox is checked (from existing deployment), gateway should be disabled showing MaaS gateway
    maasWizardField.findSaveAsMaaSCheckbox().should('exist').should('be.checked');
    modelServingWizardEdit
      .findGatewaySelect()
      .should('be.disabled')
      .should('contain.text', 'maas-default-gateway | openshift-ingress');

    modelServingWizardEdit.findNextButton().should('be.enabled').click();
    modelServingWizardEdit.findSubmitButton().click();
    cy.wait('@updateMaaSModelRef').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=true');
      expect(interception.request.url).to.include('/test-project/test-llm-inference-service');
      expect(interception.request.body.data.displayName).to.equal('test-llmd-model-2');
      expect(interception.request.body.data.description).to.equal('test-llmd-description-2');
    });
    cy.wait('@updateLLMInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
    });

    cy.wait('@updateLLMInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@updateLLMInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2);
    });
    cy.wait('@updateMaaSModelRef').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=true');
    });
    cy.get('@updateMaaSModelRef.all').then((interceptions) => {
      expect(interceptions).to.have.length(2);
    });
  });
  it('should delete the MaaSModelRef when the MaaS checkbox is unchecked', () => {
    initMaaSDeploymentIntercepts();

    const savedURIModel = mockLLMInferenceServiceK8sResource({
      isMaaS: true,
      replicas: 2,
    });
    cy.interceptK8sList(
      { model: LLMInferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([savedURIModel]),
    );

    modelServingGlobal.visit('test-project');
    modelServingGlobal.getModelRow('Test LLM Inference Service').findKebabAction('Edit').click();
    modelServingWizardEdit
      .findModelLocationSelectOption('Existing connection')
      .should('exist')
      .click();
    modelServingWizardEdit.findExistingConnectionValue().should('have.value', 'test-s3-secret');
    modelServingWizardEdit
      .findModelTypeSelect()
      .should('be.disabled')
      .should('have.text', ModelTypeLabel.GENERATIVE);
    modelServingWizardEdit.findNextButton().should('be.enabled').click();

    hardwareProfileSection.findSelect().should('exist');
    hardwareProfileSection.findSelect().should('contain.text', 'Small');
    hardwareProfileSection.selectProfile(
      'Large Profile Compatible CPU: Request = 4 Cores; Limit = 4 Cores; Memory: Request = 8 GiB; Limit = 8 GiB',
    );
    modelServingWizardEdit.findNextButton().should('be.enabled').click();

    // MaaS is checked, gateway should be disabled showing MaaS gateway
    maasWizardField.findSaveAsMaaSCheckbox().should('exist').should('be.checked');
    modelServingWizardEdit
      .findGatewaySelect()
      .should('be.disabled')
      .should('contain.text', 'maas-default-gateway | openshift-ingress');

    // Uncheck MaaS — gateway should become enabled and no longer show the MaaS gateway
    maasWizardField.findSaveAsMaaSCheckbox().click();
    maasWizardField.findSaveAsMaaSCheckbox().should('not.be.checked');

    // Gateway should now be enabled; open it to verify maas-default-gateway is hidden
    modelServingWizardEdit.findGatewaySelect().should('not.be.disabled').click();
    cy.findByRole('option', { name: 'maas-default-gateway | openshift-ingress' }).should(
      'not.exist',
    );
    cy.findByRole('option', { name: 'other-gateway | other-ns' }).should('exist');
    // Close dropdown without selecting — no gateway selected
    modelServingWizardEdit.findGatewaySelect().click();

    modelServingWizardEdit.findNextButton().should('be.enabled').click();
    modelServingWizardEdit.findSubmitButton().click();
    cy.wait('@deleteMaaSModelRef').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=true');
      expect(interception.request.url).to.include('/test-project/test-llm-inference-service');
    });
    cy.wait('@updateLLMInferenceService').then((interception) => {
      expect(interception.request.url).to.include('?dryRun=All');
      expect(interception.request.body.spec.router.gateway).to.deep.equal({});
    });

    cy.wait('@updateLLMInferenceService').then((interception) => {
      expect(interception.request.url).not.to.include('?dryRun=All');
    });

    cy.get('@updateLLMInferenceService.all').then((interceptions) => {
      expect(interceptions).to.have.length(2);
    });
    cy.get('@deleteMaaSModelRef.all').should('have.length', 2);
  });
  it('should show an error if the MaaSModelRef dry run fails', () => {
    initMaaSDeploymentIntercepts();
    cy.intercept(
      { method: 'POST', url: '**/maas/api/v1/maasmodel*', query: { dryRun: 'true' } },
      {
        statusCode: 409,
        body: {
          error: {
            code: '409',
            message: "MaaSModelRef 'test-llm-inference-service' already exists",
          },
        },
      },
    ).as('createMaaSModelRefDryRun');

    // Navigate to wizard and set up basic deployment
    modelServingGlobal.visit('test-project');
    modelServingGlobal.findDeployModelButton().click();

    // Quick setup: Model source and deployment
    modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.EXISTING).click();
    modelServingWizard.findExistingConnectionValue().should('have.value', 'test-s3-secret');
    modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
    modelServingWizard.findNextButton().click();

    modelServingWizard.findModelDeploymentNameInput().type('test-llm-inference-service');
    modelServingWizard
      .findModelDeploymentDescriptionInput()
      .type('Test LLM Inference Service Description');
    modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
    modelServingWizard.findGlobalScopedTemplateOption('Distributed inference with llm-d').click();
    modelServingWizard.findNextButton().click();

    // Focus on MaaS feature testing
    // uncheck token auth to simplify test
    modelServingWizard.findTokenAuthenticationCheckbox().click();

    // Verify MaaS checkbox is unchecked by default
    maasWizardField.findSaveAsMaaSCheckbox().should('exist').should('not.be.checked');

    // Check the MaaS checkbox
    maasWizardField.findSaveAsMaaSCheckbox().click();
    maasWizardField.findSaveAsMaaSCheckbox().should('be.checked');

    modelServingWizard.findNextButton().should('be.enabled').click();

    // Submit and verify MaaS-specific annotations and gateway refs
    modelServingWizard.findSubmitButton().click();
    cy.wait('@createMaaSModelRefDryRun');
    // Wizard stayed open and shows the error
    modelServingWizard.findErrorMessageAlert().should('be.visible').contains('Error');
    // no LLMInferenceService should be created but the LLMInferenceService dry run should have been called
    cy.get('@createLLMInferenceService.all').should('have.length', 1);
  });
});
