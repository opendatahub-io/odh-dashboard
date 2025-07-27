import { lmEvalPage } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEvalPage';
import { lmEvalFormPage } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEvalFormPage';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  createModelTestSetup,
  loadTestConfig,
  type ModelTestConfig,
} from '#~/__tests__/cypress/cypress/utils/modelTestSetup';
import {
  verifyJob,
  submitJobForm,
  navigateToLMEvalEvaluationForm,
  configureMissingParams,
} from '#~/__tests__/cypress/cypress/utils/lmEvalJob';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

// Global variables to track test setup
let dynamicTestSetup: ReturnType<typeof createModelTestSetup>;
let dynamicConfig: ModelTestConfig;
let dynamicEvaluationName: string;

/**
 * Tests LMEval functionality with dynamically downloaded models.
 *
 * - Uses 'dynamic' config that downloads models during deployment
 * - Models (e.g., gpt2) are downloaded by vLLM when the container starts
 * - Tests the full model deployment pipeline including download and initialization
 * - Slower execution due to model download time but uses minimal resources
 * - Tokenizer URL points to tiny-untrained-granite for compatibility with small models
 * - Uses gpt2 which is vLLM-compatible and has a smaller footprint than larger models
 * - Tests multiple UI scenarios: lightweight evaluation (single task) and security-focused evaluation (multiple tasks)
 * - Tests different radio button combinations for Available Online and Trust Remote Code settings
 */
describe(
  '[Product Bug RHOAIENG-30642] Verify LMEval Functionality with Downloaded Models',
  {
    tags: ['@Smoke', '@SmokeSet3', '@LMEval', '@RHOAIENG-26716', '@Featureflagged', '@Bug'],
  },
  () => {
    // Load test configuration in before hook
    before(() => {
      loadTestConfig('dynamic').then((config) => {
        dynamicConfig = config;
        dynamicTestSetup = createModelTestSetup(config);
        dynamicTestSetup.setupTest();
        // Set evaluation name for dynamic test - generate it once and use it consistently
        dynamicEvaluationName = `test-lmeval-${generateTestUUID()}`;
        // Update the config to use this name
        if (dynamicConfig.lmEval) {
          dynamicConfig.lmEval.evaluationName = dynamicEvaluationName;
        }
      });
    });

    it(
      'should complete LMEval evaluation workflow for dynamic model',
      {
        tags: ['@Smoke', '@SmokeSet3', '@LMEval', '@RHOAIENG-26716', '@Featureflagged', '@Bug'],
      },
      () => {
        // Login to the application
        cy.step('Login to the application');
        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

        // Navigate to LMEval page
        cy.step('Navigate to LMEval page');
        lmEvalPage.visit();

        // Navigate to evaluation form and fill in form fields
        const dynamicProjectName = dynamicTestSetup.testProjectName || 'test-project';
        navigateToLMEvalEvaluationForm(dynamicProjectName);

        // Fill in form fields to start evaluation
        cy.step(
          `Fill in evaluation form fields for new job '${
            dynamicEvaluationName || 'test-evaluation'
          }'`,
        );
        lmEvalFormPage.typeEvaluationName(dynamicEvaluationName);

        // Select tasks (dynamic config - lightweight evaluation)
        cy.step('Select evaluation tasks for dynamic config');
        if (dynamicConfig.lmEval?.taskName) {
          lmEvalFormPage.selectTasks([dynamicConfig.lmEval.taskName]);
        }

        // Select model type (dynamic config - Local completion)
        cy.step('Select model type for dynamic config');
        lmEvalFormPage.selectModelType('Local completion');

        // Select model from dropdown
        cy.step('Select model from dropdown');
        lmEvalFormPage.selectModelFromDropdown(dynamicTestSetup.modelName);

        // Set security settings
        cy.step('Set security settings');
        lmEvalFormPage.setAvailableOnline(true);
        lmEvalFormPage.setTrustRemoteCode(true);

        // Set tokenizer URL
        cy.step('Set tokenizer URL');
        const tokenizerUrl = dynamicConfig.tokenizerUrl || 'rgeada/tiny-untrained-granite';
        lmEvalFormPage.typeTokenizerUrl(tokenizerUrl);

        // Verify form is partially filled
        cy.step('Verify form fields are filled');
        if (dynamicEvaluationName) {
          lmEvalFormPage.shouldHaveEvaluationName(dynamicEvaluationName);
        }

        // WORKAROUND: Intercept missing LMEval job parameters, since the UI doesn't support them yet
        configureMissingParams(dynamicConfig);

        // Submit the evaluation form
        submitJobForm();

        // Verify evaluation run was created successfully
        if (dynamicConfig.lmEval?.lmEvalTimeoutSeconds) {
          verifyJob(dynamicTestSetup, dynamicConfig.lmEval.lmEvalTimeoutSeconds, dynamicConfig);
        }
      },
    );

    // Cleanup function that will be called at the end of this test suite
    after(() => {
      dynamicTestSetup.cleanupTest();
    });
  },
);
