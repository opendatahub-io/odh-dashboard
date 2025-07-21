import { lmEvalPage } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEvalPage';
import { lmEvalFormPage } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEval';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  createModelTestSetup,
  loadTestConfig,
  type ModelTestConfig,
} from '#~/__tests__/cypress/cypress/utils/modelTestSetup';
import {
  configureJob,
  verifyJob,
  waitForJobCreation,
  navigateToLMEvalEvaluationForm,
} from '#~/__tests__/cypress/cypress/utils/lmEvalJob';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

// Extended config type that includes lmEval properties
interface LMEvalTestConfig extends ModelTestConfig {
  lmEval: {
    numConcurrent: number;
    maxRetries: number;
    lmEvalTimeoutSeconds: number;
    limit: number;
    maxSamples: number;
    numFewshot: number;
    requestInterval: number;
    modelPath: string;
    servicePort: number;
    evaluationName?: string;
    taskName: string;
  };
}

// Global variables to track test setups across all describe blocks
let staticTestSetup: ReturnType<typeof createModelTestSetup> | undefined;
let dynamicTestSetup: ReturnType<typeof createModelTestSetup> | undefined;
let staticConfig: LMEvalTestConfig | undefined;
let dynamicConfig: LMEvalTestConfig | undefined;
let staticEvaluationName: string | undefined;
let dynamicEvaluationName: string | undefined;

// Global cleanup function that will be called at the end of all tests
after(() => {
  if (staticTestSetup) {
    staticTestSetup.cleanupTest();
  }
  if (dynamicTestSetup) {
    dynamicTestSetup.cleanupTest();
  }
});

/**
 * Tests LMEval functionality with pre-baked models.
 *
 * - Uses 'static' config with pre-baked models in storage for faster tests
 * - Models (e.g., Qwen) are already available in MinIO, skipping download
 * - Tokenizer URL points to bert-base-uncased for compatibility with larger models
 * - Provides faster test execution but requires more storage resources
 * - Tests multiple UI scenarios: basic evaluation (single task) and comprehensive evaluation (multiple tasks)
 * - Tests different radio button combinations for Available Online and Trust Remote Code settings
 */
describe(
  'Verify LMEval Functionality with Pre-existing Models',
  {
    tags: ['@Sanity', '@SanitySet3', '@LMEval', '@Featureflagged'],
  },
  () => {
    // Load test configuration in retryableBefore hook
    retryableBefore(async () => {
      loadTestConfig('static').then((config) => {
        staticConfig = config as LMEvalTestConfig;
        staticTestSetup = createModelTestSetup(config);
        staticTestSetup.setupTest();
        // Set evaluation name for static test - generate it once and use it consistently
        staticEvaluationName = `test-lmeval-${generateTestUUID()}`;
        // Update the config to use this name
        staticConfig.lmEval.evaluationName = staticEvaluationName;
      });
    });

    it('should complete LMEval evaluation workflow for static model', () => {
      // Login to the application
      cy.step('Login to the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to LMEval page
      cy.step('Navigate to LMEval page');
      lmEvalPage.visit();

      // Verify project selector is present
      cy.step('Verify project selector is present');
      lmEvalPage.findProjectSelector().should('contain.text', 'All projects');

      // Navigate to evaluation form and fill in form fields
      const staticProjectName = staticTestSetup?.testProjectName || 'test-project';
      navigateToLMEvalEvaluationForm(staticProjectName);

      // Verify form fields are present
      cy.step('Verify LMEval form fields are present');
      lmEvalFormPage.findEvaluationNameInput().should('exist');
      lmEvalFormPage.findModelNameDropdown().should('exist');
      lmEvalFormPage.shouldHaveFormSections();
      lmEvalFormPage.shouldHaveSecuritySectionVisible();

      // Verify submit button is disabled initially (form validation)
      cy.step('Verify submit button is disabled initially');
      lmEvalFormPage.shouldHaveSubmitButtonDisabled();

      // Verify breadcrumbs are present
      cy.step('Verify breadcrumbs are present');
      lmEvalPage.findBreadcrumb().should('exist');
      lmEvalPage.findBreadcrumbModelEvaluationRuns().should('exist');
      lmEvalPage.findBreadcrumbStartEvaluationRun().should('exist');

      // Verify page accessibility
      cy.step('Verify page accessibility');
      cy.testA11y();

      cy.step(
        `Fill in evaluation form fields for new job '${staticEvaluationName || 'test-evaluation'}'`,
      );
      if (staticEvaluationName) {
        lmEvalFormPage.typeEvaluationName(staticEvaluationName);
      }

      // Select tasks (static config - ultra-fast evaluation for testing)
      cy.step('Select evaluation tasks for static config');
      if (staticConfig?.lmEval.taskName) {
        lmEvalFormPage.selectTasks([staticConfig.lmEval.taskName]);
      }

      // Select model type (static config - local completion)
      // IMPORTANT: Using 'Local completion' instead of 'Local chat completion' is required because:
      // 1. The "wnli" task uses "loglikelihood" evaluation which requires the "completions API"
      // 2. The "chat completions API" doesn't support "loglikelihood" evaluation
      // 3. Using 'Local chat completion' will result in "exit status 1" errors when running the evaluation
      cy.step('Select model type for static config');
      lmEvalFormPage.selectModelType('Local completion');

      // Select model from dropdown
      cy.step('Select model from dropdown');
      if (staticTestSetup?.modelName) {
        lmEvalFormPage.selectModelFromDropdown(staticTestSetup.modelName);
      }

      // Set security settings
      cy.step('Set security settings');
      // TODO: Offline Tokenizer is not supported yet. Once it is, we should test Available Online = false
      lmEvalFormPage.setAvailableOnline(true);
      lmEvalFormPage.setTrustRemoteCode(true);

      // Set tokenizer URL
      cy.step('Set tokenizer URL');
      const { tokenizerUrl } = staticConfig || {};
      if (tokenizerUrl) {
        lmEvalFormPage.typeTokenizerUrl(tokenizerUrl);
      }

      // Verify form is partially filled
      cy.step('Verify form fields are filled');
      if (staticEvaluationName) {
        lmEvalFormPage.shouldHaveEvaluationName(staticEvaluationName);
      }

      // Verify submit button is enabled after filling required fields
      cy.step('Verify submit button is enabled after filling required fields');
      lmEvalFormPage.findSubmitButton().should('not.be.disabled');

      // Set up network intercept to fix LMEval job parameters
      cy.step('Set up network intercept to fix LMEval job parameters');

      cy.intercept('POST', '**/lmevaljobs**', (req) => {
        if (staticConfig) {
          const modifiedReq = configureJob(req, staticConfig);
          // Update the request with the modified version
          Object.assign(req, modifiedReq);
        }
        req.continue();
      }).as('lmEvalJobCreate');

      // Submit the evaluation form
      cy.step('Submit evaluation form');
      lmEvalFormPage.clickSubmitButton();

      // Wait for LMEval job creation and verify navigation
      waitForJobCreation('@lmEvalJobCreate');

      // Verify evaluation run was created successfully
      if (staticTestSetup && staticConfig?.lmEval.lmEvalTimeoutSeconds) {
        verifyJob(staticTestSetup, staticConfig.lmEval.lmEvalTimeoutSeconds, staticConfig);
      }
    });
  },
);

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
  'Verify LMEval Functionality with Downloaded Models',
  {
    tags: ['@Smoke', '@SmokeSet3', '@LMEval', '@Featureflagged'],
  },
  () => {
    // Load test configuration in retryableBefore hook
    retryableBefore(async () => {
      loadTestConfig('dynamic').then((config) => {
        dynamicConfig = config as LMEvalTestConfig;
        dynamicTestSetup = createModelTestSetup(config);
        dynamicTestSetup.setupTest();
        // Set evaluation name for dynamic test - generate it once and use it consistently
        dynamicEvaluationName = `test-lmeval-${generateTestUUID()}`;
        // Update the config to use this name
        dynamicConfig.lmEval.evaluationName = dynamicEvaluationName;
      });
    });

    it('should complete LMEval evaluation workflow for dynamic model', () => {
      // Login to the application
      cy.step('Login to the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to LMEval page
      cy.step('Navigate to LMEval page');
      lmEvalPage.visit();

      // Navigate to evaluation form and fill in form fields
      const dynamicProjectName = dynamicTestSetup?.testProjectName || 'test-project';
      navigateToLMEvalEvaluationForm(dynamicProjectName);

      // Fill in form fields to start evaluation
      cy.step(
        `Fill in evaluation form fields for new job '${
          dynamicEvaluationName || 'test-evaluation'
        }'`,
      );
      if (dynamicEvaluationName) {
        lmEvalFormPage.typeEvaluationName(dynamicEvaluationName);
      }

      // Select tasks (dynamic config - lightweight evaluation)
      cy.step('Select evaluation tasks for dynamic config');
      if (dynamicConfig?.lmEval.taskName) {
        lmEvalFormPage.selectTasks([dynamicConfig.lmEval.taskName]);
      }

      // Select model type (dynamic config - Local completion)
      cy.step('Select model type for dynamic config');
      lmEvalFormPage.selectModelType('Local completion');

      // Select model from dropdown
      cy.step('Select model from dropdown');
      if (dynamicTestSetup?.modelName) {
        lmEvalFormPage.selectModelFromDropdown(dynamicTestSetup.modelName);
      }

      // Set security settings
      cy.step('Set security settings');
      lmEvalFormPage.setAvailableOnline(true);
      lmEvalFormPage.setTrustRemoteCode(true);

      // Set tokenizer URL
      cy.step('Set tokenizer URL');
      const tokenizerUrl = dynamicConfig?.tokenizerUrl || 'rgeada/tiny-untrained-granite';
      lmEvalFormPage.typeTokenizerUrl(tokenizerUrl);

      // Verify form is partially filled
      cy.step('Verify form fields are filled');
      if (dynamicEvaluationName) {
        lmEvalFormPage.shouldHaveEvaluationName(dynamicEvaluationName);
      }

      // Verify submit button is enabled after filling required fields
      cy.step('Verify submit button is enabled after filling required fields');
      lmEvalFormPage.findSubmitButton().should('not.be.disabled');

      // Set up network intercept to fix LMEval job parameters
      cy.step('Set up network intercept to fix LMEval job parameters');

      cy.intercept('POST', '**/lmevaljobs**', (req) => {
        if (dynamicConfig) {
          const modifiedReq = configureJob(req, dynamicConfig);
          // Update the request with the modified version
          Object.assign(req, modifiedReq);
        }
        req.continue();
      }).as('lmEvalJobCreate');

      // Submit the evaluation form
      cy.step('Submit evaluation form');
      lmEvalFormPage.clickSubmitButton();

      // Wait for LMEval job creation and verify navigation
      waitForJobCreation('@lmEvalJobCreate');

      // Verify evaluation run was created successfully
      if (dynamicTestSetup && dynamicConfig?.lmEval.lmEvalTimeoutSeconds) {
        verifyJob(dynamicTestSetup, dynamicConfig.lmEval.lmEvalTimeoutSeconds, dynamicConfig);
      }
    });
  },
);
