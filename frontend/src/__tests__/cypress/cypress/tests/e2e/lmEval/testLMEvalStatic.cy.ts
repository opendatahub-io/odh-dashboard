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
let staticTestSetup: ReturnType<typeof createModelTestSetup>;
let staticConfig: ModelTestConfig;
let staticEvaluationName: string;

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
    tags: ['@Sanity', '@SanitySet3', '@LMEval', '@RHOAIENG-26716', '@Featureflagged'],
  },
  () => {
    // Load test configuration in before hook
    before(() => {
      loadTestConfig('static').then((config) => {
        staticConfig = config;
        staticTestSetup = createModelTestSetup(config);
        staticTestSetup.setupTest();
        // Set evaluation name for static test - generate it once and use it consistently
        staticEvaluationName = `test-lmeval-${generateTestUUID()}`;
        // Update the config to use this name
        if (staticConfig.lmEval) {
          staticConfig.lmEval.evaluationName = staticEvaluationName;
        }
      });
    });

    it(
      'should complete LMEval evaluation workflow for static model',
      {
        tags: ['@Sanity', '@SanitySet3', '@LMEval', '@RHOAIENG-26716', '@Featureflagged'],
      },
      () => {
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
        const staticProjectName = staticTestSetup.testProjectName || 'test-project';
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

        // Verify page accessibility
        cy.step('Verify page accessibility');
        lmEvalFormPage.testA11y();

        cy.step(
          `Fill in evaluation form fields for new job '${
            staticEvaluationName || 'test-evaluation'
          }'`,
        );
        if (staticEvaluationName) {
          lmEvalFormPage.typeEvaluationName(staticEvaluationName);
        }

        // Select tasks (static config - ultra-fast evaluation for testing)
        cy.step('Select evaluation tasks for static config');
        if (staticConfig.lmEval?.taskName) {
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
        lmEvalFormPage.selectModelFromDropdown(staticTestSetup.modelName);

        // Set security settings
        cy.step('Set security settings');
        // TODO: Offline Tokenizer is not supported yet. Once it is, we should test Available Online = false
        lmEvalFormPage.setAvailableOnline(true);
        lmEvalFormPage.setTrustRemoteCode(true);

        // Set tokenizer URL
        cy.step('Set tokenizer URL');
        const { tokenizerUrl } = staticConfig;
        if (tokenizerUrl) {
          lmEvalFormPage.typeTokenizerUrl(tokenizerUrl);
        }

        // Verify form is partially filled
        cy.step('Verify form fields are filled');
        lmEvalFormPage.shouldHaveEvaluationName(staticEvaluationName);

        // WORKAROUND: Intercept missing LMEval job parameters, since the UI doesn't support them yet
        configureMissingParams(staticConfig);

        // Submit the evaluation form
        submitJobForm();

        // Verify evaluation run was created successfully
        if (staticConfig.lmEval?.lmEvalTimeoutSeconds) {
          verifyJob(staticTestSetup, staticConfig.lmEval.lmEvalTimeoutSeconds, staticConfig);
        }
      },
    );

    // Cleanup function that will be called at the end of this test suite
    after(() => {
      staticTestSetup.cleanupTest();
    });
  },
);
