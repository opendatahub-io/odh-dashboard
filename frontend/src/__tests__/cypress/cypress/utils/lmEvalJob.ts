import { lmEvalPage } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEvalPage';
import { lmEvalFormPage } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEval';
import { execWithOutput } from './oc_commands/baseCommands';
import type { createModelTestSetup } from './modelTestSetup';
import { generateTestUUID } from './uuidGenerator';

// Direct type assertions for test data structures
type ModelArg = {
  name: string;
  value: string;
};

/**
 * WORKAROUND: Configures missing LMEval job parameters via network intercepts
 *
 * This function is needed because the UI doesn't support all LMEval job parameters yet.
 * We use network intercepts to modify the request before it's sent to the API.
 *
 * Common fixes applied:
 * - Sets optimized concurrency and retry settings for efficient testing
 * - Adjusts evaluation parameters for better test performance
 * - Configures job limits and other parameters not available in UI
 *
 * TODO: Remove this workaround once the UI supports all LMEval job parameters
 *
 * @param testConfig Object containing test configuration with optional lmEval settings
 */
export const configureMissingParams = (testConfig: {
  lmEval?: {
    modelPath: string;
    servicePort: number;
    numConcurrent: number;
    maxRetries: number;
    lmEvalTimeoutSeconds: number;
    limit: number;
    maxSamples: number;
    numFewshot: number;
    requestInterval?: number;
    evaluationName?: string;
    taskName: string;
  };
  modelName?: string;
}): void => {
  // Set up network intercept to configure LMEval job parameters
  cy.step('Set up network intercept to configure LMEval job parameters');
  cy.intercept('POST', '**/lmevaljobs**', (req) => {
    // Get LMEval configuration from test config
    const lmEvalConfig = testConfig.lmEval;

    // Early return if no LMEval config is provided
    if (!lmEvalConfig) {
      req.continue();
      return;
    }

    // Create a deep copy of the request body to avoid modifying the parameter directly
    const requestBody = JSON.parse(JSON.stringify(req.body));

    // WORKAROUND: Tweak LMEval job parameters via API, since the UI doesn't support it yet
    const numConcurrentArg = requestBody.spec.modelArgs.find(
      (arg: ModelArg) => arg.name === 'num_concurrent',
    );
    if (numConcurrentArg) {
      numConcurrentArg.value = lmEvalConfig.numConcurrent.toString();
    } else {
      // Add num_concurrent parameter if it doesn't exist
      requestBody.spec.modelArgs.push({
        name: 'num_concurrent',
        value: lmEvalConfig.numConcurrent.toString(),
      });
    }

    const maxRetriesArg = requestBody.spec.modelArgs.find(
      (arg: ModelArg) => arg.name === 'max_retries',
    );
    if (maxRetriesArg) {
      maxRetriesArg.value = lmEvalConfig.maxRetries.toString();
    } else {
      // Add max_retries parameter if it doesn't exist
      requestBody.spec.modelArgs.push({
        name: 'max_retries',
        value: lmEvalConfig.maxRetries.toString(),
      });
    }

    // Set limit parameter as direct spec property (most important for test performance)
    requestBody.spec.limit = lmEvalConfig.limit.toString();

    // Log the final configuration for debugging
    console.log('🚀 Final LMEval Job Configuration:');
    console.log('📋 Task:', requestBody.spec.taskList.taskNames);
    console.log('🔧 Model Args:');
    requestBody.spec.modelArgs.forEach((arg: ModelArg) => {
      console.log(`  - ${arg.name}: ${arg.value}`);
    });

    // Update the request with the modified body
    Object.assign(req, { body: requestBody });
    req.continue();
  }).as('lmEvalJobCreate');
};

/**
 * Submits the LMEval job form and verifies navigation
 * @param config Optional test configuration for job parameter optimization
 */
export const submitJobForm = (): void => {
  // Verify submit button is enabled after filling required fields
  cy.step('Verify submit button is enabled after filling required fields');
  lmEvalFormPage.findSubmitButton().should('not.be.disabled');

  // Submit the evaluation form
  cy.step('Submit evaluation form');
  lmEvalFormPage.clickSubmitButton();

  // Verify navigation to model evaluations page after submission
  cy.step('Verify navigation after form submission');
  cy.url().should('include', '/modelEvaluations');
  cy.url().should('not.include', '/evaluate');
};

/**
 * Verifies the downloaded JSON file contains valid LMEval results
 * @param evaluationName The name of the evaluation
 */
export const verifyDownloadedJsonFile = (evaluationName: string): void => {
  cy.step('Verify downloaded file content');
  cy.readFile(`cypress/downloads/${evaluationName}-results.json`, { timeout: 5000 }).then(
    (jsonData: {
      results: Record<
        string,
        {
          alias: string;
          'acc,none': number;
          'acc_stderr,none': number;
        }
      >;
      config: {
        model: string;
        model_args: Record<string, unknown>;
        device: string;
        random_seed: number;
      };
      configs: Record<string, unknown>;
      versions: Record<string, unknown>;
      'n-shot': number;
      higher_is_better: boolean;
      'n-samples': number;
      date: string;
      total_evaluation_time_seconds: string;
    }) => {
      cy.log('📁 Downloaded file content verified');

      // Verify expected JSON structure for LMEval results
      expect(jsonData).to.have.property('results');
      expect(jsonData).to.have.property('config');
      expect(jsonData).to.have.property('configs');
      expect(jsonData).to.have.property('versions');
      expect(jsonData).to.have.property('n-shot');
      expect(jsonData).to.have.property('higher_is_better');
      expect(jsonData).to.have.property('n-samples');
      expect(jsonData).to.have.property('date');
      expect(jsonData).to.have.property('total_evaluation_time_seconds');

      // Verify results structure
      expect(jsonData.results).to.be.an('object');
      const taskName = Object.keys(jsonData.results)[0]; // e.g., 'copa'
      expect(jsonData.results[taskName]).to.have.property('alias');
      expect(jsonData.results[taskName]).to.have.property('acc,none');
      expect(jsonData.results[taskName]).to.have.property('acc_stderr,none');

      // Verify config structure
      expect(jsonData.config).to.have.property('model');
      expect(jsonData.config).to.have.property('model_args');
      expect(jsonData.config).to.have.property('device');
      expect(jsonData.config).to.have.property('random_seed');

      // Verify specific values for the test
      expect(jsonData.config.model).to.equal('local-completions');
      expect(jsonData.config.device).to.equal('cpu');
      expect(jsonData.config.random_seed).to.equal(0);

      // Verify evaluation metrics are numeric and reasonable
      expect(jsonData.results[taskName]['acc,none']).to.be.a('number');
      expect(jsonData.results[taskName]['acc,none']).to.be.at.least(0);
      expect(jsonData.results[taskName]['acc,none']).to.be.at.most(1);
      expect(jsonData.results[taskName]['acc_stderr,none']).to.be.a('number');
      expect(jsonData.results[taskName]['acc_stderr,none']).to.be.at.least(0);

      // Verify evaluation time is reasonable
      const evalTime = parseFloat(jsonData.total_evaluation_time_seconds);
      expect(evalTime).to.be.a('number');
      expect(evalTime).to.be.at.least(0);
      expect(evalTime).to.be.at.most(3600); // Should complete within 1 hour

      // Log the JSON structure for debugging
      cy.log('📄 Downloaded JSON structure:', JSON.stringify(jsonData, null, 2));
      cy.log(
        `📊 Task: ${taskName}, Accuracy: ${jsonData.results[taskName]['acc,none']}, StdErr: ${jsonData.results[taskName]['acc_stderr,none']}`,
      );
      cy.log(`⏱️ Evaluation time: ${jsonData.total_evaluation_time_seconds} seconds`);
      cy.log(
        `📁 File verification: Task ${taskName}, Accuracy: ${jsonData.results[taskName]['acc,none']}`,
      );
    },
  );
};

/**
 * Waits for evaluation to appear in the table and switches to all projects view
 * @param evaluationName The name of the evaluation to wait for
 */
const waitForEvaluationToAppear = (evaluationName: string): void => {
  cy.step('Wait for Evaluation page to load after form submission');
  lmEvalPage.findEvaluationTable().should('be.visible');

  // Switch to All projects view
  cy.step('Switch to All projects view');
  lmEvalPage.selectAllProjects();

  // Log all evaluation runs
  lmEvalPage.findEvaluationTableRows().then(($elements) => {
    $elements.each((index, element) => {
      const textContent = element.textContent || '';
      cy.log(`Evaluation run ${index}: "${textContent}"`);
    });
  });

  // Filter for the evaluation to make sure it's there
  cy.step(`Filter for the evaluation run '${evaluationName}'`);
  lmEvalPage.filterByName(evaluationName);
  lmEvalPage.findEvaluationRow(evaluationName).should('be.visible');
  lmEvalPage.findEvaluationDataLabel('Evaluation').should('contain.text', evaluationName);
};

/**
 * Verifies backend status using oc commands
 * @param projectName The name of the project
 * @param evaluationName The name of the evaluation
 * @param timeoutSeconds Timeout in seconds
 */
const verifyBackendStatus = (
  projectName: string,
  evaluationName: string,
  timeoutSeconds: number,
): void => {
  cy.step('Wait for the evaluation resource to be running');
  execWithOutput(
    `set +e; RC=0;
    oc wait --for=jsonpath='{.status.state}'=Running --timeout=${timeoutSeconds}s lmevaljobs/${evaluationName} -n ${projectName} || RC=$?;
    oc describe lmevaljobs/${evaluationName} -n ${projectName};
    exit $RC`,
    timeoutSeconds + 3,
  ).then((result) => {
    cy.log(`oc wait output: ${result.stdout}`);
    if (result.code !== 0) {
      cy.log(`oc wait failed with code ${result.code}: ${result.stderr}`);
    }
  });
};

/**
 * Downloads evaluation results from the details page
 * @param evaluationName The name of the evaluation
 * @param projectName Optional project name for URL verification
 * @param timeoutSeconds Optional timeout in seconds
 */
const downloadEvaluationResults = (evaluationName: string, projectName = ''): void => {
  cy.step(`Wait for '${evaluationName}' to complete and download results`);

  // Click the evaluation link to navigate to details
  lmEvalPage.findEvaluationRunLink(evaluationName).click();

  // Verify navigation to the evaluation details page
  cy.url().should('include', `/modelEvaluations/${projectName}/${evaluationName}`);
  lmEvalPage.findEvaluationDetailsTitle().should('contain.text', evaluationName);

  // Click the download button and verify the downloaded file
  lmEvalPage.findDownloadJsonButton().should('be.visible').and('not.be.disabled').click();
};

/**
 * Verifies that an evaluation run was created and is in progress
 * @param testSetup The test setup object
 * @param lmEvalTimeoutSeconds Timeout in seconds for the evaluation
 * @param testConfig Optional test configuration object
 */
export const verifyJob = (
  testSetup: ReturnType<typeof createModelTestSetup> | undefined,
  lmEvalTimeoutSeconds: number,
  testConfig?: {
    lmEval?: {
      modelPath: string;
      servicePort: number;
      numConcurrent: number;
      maxRetries: number;
      lmEvalTimeoutSeconds: number;
      limit: number;
      maxSamples: number;
      numFewshot: number;
      requestInterval?: number;
      evaluationName?: string;
      taskName: string;
    };
    modelName?: string;
  },
): void => {
  // Get the LMEval configuration from test config or use empty object as fallback
  const lmEvalConfig = testConfig?.lmEval || {
    modelPath: '',
    servicePort: 0,
    numConcurrent: 1,
    maxRetries: 3,
    lmEvalTimeoutSeconds: 300,
    limit: 10,
    maxSamples: 10,
    numFewshot: 0,
    taskName: '',
  };

  // Get values with defaults
  const evaluationName = lmEvalConfig.evaluationName || `test-lmeval-${generateTestUUID()}`;
  const projectName = testSetup?.testProjectName || '';

  // Wait for evaluation to appear
  waitForEvaluationToAppear(evaluationName);

  // Wait for evaluation run to reach a valid state (In Progress or Complete)
  waitForEvaluationRun(projectName, evaluationName, 'Complete', lmEvalTimeoutSeconds);

  // Navigate to details and download results
  downloadEvaluationResults(evaluationName, projectName);

  // Verify the downloaded file
  verifyDownloadedJsonFile(evaluationName);
};

/**
 * Wait for evaluation run to reach a specific status and verify it exists
 *
 * This function contains complex polling and verification logic that was moved
 * from the page object to keep page objects focused on simple finder methods.
 *
 * @param evaluationName - The name of the evaluation run to wait for
 * @param status - The expected status or array of statuses to wait for
 * @param timeoutSeconds - Optional timeout in seconds (default: 60)
 * @returns The page object for method chaining
 */
export const waitForEvaluationRun = (
  projectName: string,
  evaluationName: string,
  status: string,
  timeoutSeconds = 60,
): typeof lmEvalPage => {
  const timeout = timeoutSeconds * 1000;

  // Verify backend status using oc commands
  verifyBackendStatus(projectName, evaluationName, timeoutSeconds);

  // Switch to the correct project and filter for the evaluation run
  cy.step(`Switch to the evaluation project '${projectName}'`);
  lmEvalPage.selectProjectByName(projectName);

  cy.step(`Filter for the evaluation run '${evaluationName}'`);
  lmEvalPage.filterByName(evaluationName);

  // Wait for the evaluation run to reach the expected status
  cy.step(`Wait for evaluation run '${evaluationName}' to reach ${status}`);

  // Wait for the evaluation status to change with custom timeout
  cy.get('body', { timeout }).should(($body) => {
    const row = $body.find(`tr:contains("${evaluationName}")`);
    const rowText = row.text();
    expect(row.length).to.be.greaterThan(0);
    expect(rowText, `Expected '${status}' but found: ${rowText}`).to.include(status);
  });

  return lmEvalPage;
};

/**
 * Helper function to navigate to the LMEval evaluation form
 * @param projectName - Optional project name to select before navigation
 */
export const navigateToLMEvalEvaluationForm = (projectName?: string): void => {
  const projectText = projectName || 'default';
  cy.step(`Navigate to evaluation form of project ${projectText}`);

  // Select project if provided
  if (projectName) {
    lmEvalPage.selectProjectByName(projectName);
  }

  // Click evaluate button and verify navigation
  lmEvalPage.findEvaluateModelButton().should('exist').click();

  // Add URL and form verifications in the test
  if (projectName) {
    cy.url().should('include', `/modelEvaluations/${projectName}/evaluate`);
  } else {
    cy.url().should('include', '/evaluate');
  }
  lmEvalPage.findLMEvaluationForm().should('exist');
};
