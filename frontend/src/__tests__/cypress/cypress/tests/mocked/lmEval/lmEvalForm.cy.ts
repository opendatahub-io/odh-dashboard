import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { InferenceServiceModel } from '#~/api/models';
import { lmEvalFormPage } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEvalFormPage';
import { createVLLMInferenceService, setupBasicMocks } from './lmEvalTestUtils';

describe('LMEval Form', () => {
  const namespace = 'test-project';

  it('should have the correct URL and basic page elements', () => {
    setupBasicMocks(namespace);
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: namespace },
      mockK8sResourceList([createVLLMInferenceService('test-model', namespace, 'Test Model')]),
    );

    lmEvalFormPage.visit(namespace, true);

    lmEvalFormPage
      .shouldHaveCorrectUrl(namespace)
      .shouldHavePageTitle('Start an evaluation run')
      .shouldHavePageDescription()
      .shouldHaveFormSections();
  });

  it('should load and display form elements correctly', () => {
    setupBasicMocks(namespace);
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: namespace },
      mockK8sResourceList([
        createVLLMInferenceService('granite-model', namespace, 'Granite 8B Code'),
        createVLLMInferenceService('llama-model', namespace, 'Llama 2 7B'),
      ]),
    );

    lmEvalFormPage.visit(namespace, true);

    lmEvalFormPage.findModelNameDropdown().should('exist').and('not.be.disabled');
    lmEvalFormPage.findEvaluationNameInput().should('exist');
    lmEvalFormPage.findSubmitButton().should('exist');
    lmEvalFormPage.findCancelButton().should('exist');
  });

  it('should populate model arguments when model is selected', () => {
    setupBasicMocks(namespace);

    const models = [
      createVLLMInferenceService(
        'granite-8b-code',
        namespace,
        'Granite 8B Code Instruct',
        'https://granite-model.example.com/v1/models/granite-8b-code',
      ),
      createVLLMInferenceService(
        'llama-2-7b-chat',
        namespace,
        'Llama 2 7B Chat',
        'https://llama-model.example.com/v1/models/llama-2-7b-chat',
      ),
    ];

    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: namespace },
      mockK8sResourceList(models),
    );

    lmEvalFormPage.visit(namespace, true);

    // Initially, model arguments should be empty
    lmEvalFormPage.shouldHaveEmptyModelArguments();

    // Select first model and verify arguments
    lmEvalFormPage
      .selectModelFromDropdown('Granite 8B Code Instruct')
      .shouldHaveModelArgumentName('Granite 8B Code Instruct')
      .shouldHaveModelArgumentUrl('https://granite-model.example.com/v1/models/granite-8b-code');

    // Select second model and verify arguments update
    lmEvalFormPage
      .selectModelFromDropdown('Llama 2 7B Chat')
      .shouldHaveModelArgumentName('Llama 2 7B Chat')
      .shouldHaveModelArgumentUrl('https://llama-model.example.com/v1/models/llama-2-7b-chat');
  });

  it('should handle security section radio button interactions', () => {
    setupBasicMocks(namespace);
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: namespace },
      mockK8sResourceList([
        createVLLMInferenceService('granite-8b-code', namespace, 'Granite 8B Code Instruct'),
      ]),
    );

    lmEvalFormPage.visit(namespace, true);

    // Verify security section is accessible and functional
    lmEvalFormPage
      .shouldHaveSecuritySectionVisible()
      .shouldHaveSecurityRadioButtonsEnabled()
      .shouldHaveAvailableOnlineSelected(false)
      .shouldHaveTrustRemoteCodeSelected(false);

    // Test state changes
    lmEvalFormPage
      .setAvailableOnline(true)
      .shouldHaveAvailableOnlineSelected(true)
      .setTrustRemoteCode(true)
      .shouldHaveTrustRemoteCodeSelected(true)
      .setAvailableOnline(false)
      .shouldHaveAvailableOnlineSelected(false)
      .setTrustRemoteCode(false)
      .shouldHaveTrustRemoteCodeSelected(false);

    // Test both can be true simultaneously
    lmEvalFormPage
      .setAvailableOnline(true)
      .setTrustRemoteCode(true)
      .shouldHaveAvailableOnlineSelected(true)
      .shouldHaveTrustRemoteCodeSelected(true);
  });

  it('should handle form input and validation correctly', () => {
    setupBasicMocks(namespace);
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: namespace },
      mockK8sResourceList([
        createVLLMInferenceService('granite-8b-code', namespace, 'Granite 8B Code Instruct'),
      ]),
    );

    lmEvalFormPage.visit(namespace, true);

    // Test form input and validation
    lmEvalFormPage
      .shouldHaveEnabledInputs()
      .shouldHaveEnabledButtons()
      .shouldHaveSubmitButtonDisabled()
      .typeEvaluationName('test-evaluation')
      .shouldHaveEvaluationName('test-evaluation')
      .shouldHaveSubmitButtonDisabled(); // Still disabled - other required fields missing

    // Try model selection for validation
    lmEvalFormPage.trySelectModelFromDropdown('Granite 8B Code Instruct');

    // Check the final button state after the attempt
    lmEvalFormPage.checkSubmitButtonState();
  });

  it('should handle edge cases correctly', () => {
    setupBasicMocks(namespace);
    cy.interceptK8sList({ model: InferenceServiceModel, ns: namespace }, mockK8sResourceList([]));

    lmEvalFormPage.visit(namespace, true);

    // Test empty model list state
    lmEvalFormPage.shouldHaveCorrectUrl(namespace).findModelNameDropdown().should('exist');
  });

  it('should navigate back to model evaluations home when Cancel is clicked', () => {
    setupBasicMocks(namespace);
    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: namespace },
      mockK8sResourceList([
        createVLLMInferenceService('granite-8b-code', namespace, 'Granite 8B Code Instruct'),
      ]),
    );

    lmEvalFormPage.visit(namespace, true);

    // Test cancel navigation
    lmEvalFormPage
      .shouldHaveCorrectUrl(namespace)
      .clickCancelButton()
      .shouldNavigateToModelEvaluationsHome();
  });
});
