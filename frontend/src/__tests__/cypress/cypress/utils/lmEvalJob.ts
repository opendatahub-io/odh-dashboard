import { lmEvalPage } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEvalPage';
import { execWithOutput } from './oc_commands/baseCommands';
import type { createModelTestSetup } from './modelTestSetup';
import { generateTestUUID } from './uuidGenerator';

// Types for LMEval job configuration
interface LMEvalConfig {
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
}

interface TestConfig {
  lmEval?: LMEvalConfig;
  modelName?: string;
}

interface ModelArg {
  name: string;
  value: string;
}

interface LMEvalJobRequest {
  body: {
    spec: {
      modelArgs: ModelArg[];
      taskList: {
        taskNames: string[];
      };
      limit?: string;
    };
    security?: {
      allowOnline?: boolean;
      trustRemoteCode?: boolean;
    };
  };
}

interface LMEvalJobResult {
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
}

/**
 * Configures LMEval job parameters based on the test configuration
 *
 * This function customizes job parameters based on test configuration:
 *
 * Common fixes applied:
 * - Fixes service port in URL to ensure proper connectivity
 * - Adds appropriate security parameters based on UI settings
 * - Adjusts evaluation parameters for efficient testing
 * - Sets optimized concurrency and retry settings
 *
 * @param req The request object to modify
 * @param testConfig The test configuration object containing LMEval settings
 */
export const configureJob = (req: LMEvalJobRequest, testConfig: TestConfig): LMEvalJobRequest => {
  // Get LMEval configuration from test config
  const lmEvalConfig = testConfig.lmEval;

  // Early return if no LMEval config is provided
  if (!lmEvalConfig) {
    return req;
  }

  // Create a deep copy of the request body to avoid modifying the parameter directly
  const requestBody = JSON.parse(JSON.stringify(req.body));

  // Fix model name to use correct model ID from configuration
  const modelArg = requestBody.spec.modelArgs.find((arg: ModelArg) => arg.name === 'model');
  if (modelArg) {
    if (testConfig.modelName) {
      modelArg.value = testConfig.modelName;
    } else {
      modelArg.value = lmEvalConfig.modelPath || modelArg.value;
    }
  }

  // Tweak LMEval job parameters via API, since the UI doesn't support it yet
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

  // Return the modified request
  return { ...req, body: requestBody };
};

/**
 * Waits for LMEval job creation and logs the configuration
 * @param alias The Cypress alias for the intercepted request
 */
export const waitForJobCreation = (alias: string): void => {
  // Wait for LMEval job creation
  cy.step('Wait for LMEval job creation');
  cy.wait(alias).then((interception) => {
    const modelArgs = interception.request.body?.spec?.modelArgs;
    cy.step('✅ LMEval Job Created with Optimized Configuration');

    // Log key optimization parameters
    const baseUrl = modelArgs?.find((arg: ModelArg) => arg.name === 'base_url')?.value;
    const concurrent = modelArgs?.find((arg: ModelArg) => arg.name === 'num_concurrent')?.value;
    const maxRetries = modelArgs?.find((arg: ModelArg) => arg.name === 'max_retries')?.value;
    const model = modelArgs?.find((arg: ModelArg) => arg.name === 'model')?.value;
    const limit = interception.request.body?.spec?.limit;

    cy.log(`🔗 Base URL: ${baseUrl}`);
    cy.log(`⚡ Concurrent Requests: ${concurrent}`);
    cy.log(`🔄 Max Retries: ${maxRetries}`);
    cy.log(`📊 Limit: ${limit}`);
    cy.log(`🤖 Model: ${model}`);
  });

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
    (jsonData: LMEvalJobResult) => {
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
  lmEvalPage.shouldHaveEvaluationRunInTable(evaluationName);

  cy.step('Switch to All projects view');
  lmEvalPage.selectAllProjects();

  // List evaluation runs for debugging
  cy.step('Log evaluation runs in table');
  lmEvalPage.findEvaluationTableRows().then(($elements) => {
    $elements.each((index, element) => {
      const textContent = element.textContent || '';
      cy.log(`Evaluation run ${index}: "${textContent}"`);
    });
  });
};

/**
 * Verifies backend status using oc commands
 * @param testSetup The test setup object
 * @param evaluationName The name of the evaluation
 * @param timeout Timeout in seconds
 */
const verifyBackendStatus = (
  testSetup: ReturnType<typeof createModelTestSetup> | undefined,
  evaluationName: string,
  timeout: number,
): void => {
  if (!testSetup?.modelName) {
    return;
  }

  cy.step('Wait for the evaluation resource to be running');
  execWithOutput(
    `set +e; RC=0;
    oc wait --for=jsonpath='{.status.state}'=Running --timeout=${timeout}s lmevaljobs/${evaluationName} -n ${testSetup.testProjectName} || RC=$?;
    oc describe lmevaljobs/${evaluationName} -n ${testSetup.testProjectName};
    exit $RC`,
    timeout + 3,
  ).then((result) => {
    cy.log(`oc wait output: ${result.stdout}`);
    if (result.code !== 0) {
      cy.log(`oc wait failed with code ${result.code}: ${result.stderr}`);
    }
  });

  cy.step('Wait for evaluation run to reach a stable state');
  waitForEvaluationRun(
    evaluationName,
    ['In Progress', 'Complete'],
    testSetup.modelName,
    timeout * 1000,
  );

  // Print pod logs at the end
  cy.step('Print LMEval job pod logs');
  execWithOutput(`oc logs -n ${testSetup.testProjectName} ${evaluationName}`, 30).then((result) => {
    cy.log(`📝 LMEval Job Logs:\n${result.stdout}\n${result.stderr}`);
  });
};

/**
 * Navigates to evaluation details and downloads results
 * @param testSetup The test setup object
 * @param evaluationName The name of the evaluation
 * @param timeout Timeout in milliseconds
 */
const downloadAndVerifyResults = (
  testSetup: ReturnType<typeof createModelTestSetup> | undefined,
  evaluationName: string,
  timeout: number,
): void => {
  if (!testSetup?.testProjectName) {
    return;
  }

  // Switch to the correct project first to ensure we click on the right evaluation
  cy.step('Switch to the correct project to find the evaluation');
  lmEvalPage.selectProjectByName(testSetup.testProjectName);

  // Wait for and click on the evaluation run link (select the completed one)
  cy.step('Wait for evaluation run link to be available and click it');
  waitForEvaluationRunComplete(evaluationName, timeout);

  // Verify navigation to the evaluation details page
  cy.step('Verify navigation to evaluation details page');
  lmEvalPage.verifyEvaluationDetailsPage(evaluationName, testSetup.testProjectName);

  // Log the actual URL for debugging
  cy.url().then((currentUrl) => {
    const url = currentUrl || 'unknown';
    cy.log(`📍 Actual evaluation details URL: ${url}`);
  });

  // Click the download button and verify the downloaded file
  cy.step('Download and verify JSON file');
  lmEvalPage.downloadJsonResults();

  // Verify the downloaded file using the new function
  verifyDownloadedJsonFile(evaluationName);
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
  testConfig?: TestConfig,
): void => {
  // Get the LMEval configuration from test config or use empty object as fallback
  const lmEvalConfig = testConfig?.lmEval || ({} as LMEvalConfig);

  // Get values with defaults
  const evaluationName = lmEvalConfig.evaluationName || `test-lmeval-${generateTestUUID()}`;

  // Use default timeout if not specified
  const timeout = lmEvalTimeoutSeconds || 300;

  // Wait for evaluation to appear and switch to all projects view
  waitForEvaluationToAppear(evaluationName);

  // Verify backend status using oc commands
  verifyBackendStatus(testSetup, evaluationName, timeout);

  // Navigate to details and download results
  downloadAndVerifyResults(testSetup, evaluationName, timeout * 1000);
};

/**
 * Waits for evaluation run to be complete and clickable
 * @param evaluationName The name of the evaluation to wait for
 * @param timeout Timeout in milliseconds
 */
export const waitForEvaluationRunComplete = (evaluationName: string, timeout: number): void => {
  // First wait for the status to be "Complete"
  lmEvalPage.findEvaluationRunStatus(timeout).should('contain.text', 'Complete');

  // Then wait for the link to be available and clickable
  cy.get(`[data-testid="lm-eval-link-${evaluationName}"]`, { timeout })
    .should('be.visible')
    .and('contain.text', evaluationName)
    .click();
};

/**
 * Wait for evaluation run to reach a specific status and verify it exists
 *
 * This function contains complex polling and verification logic that was moved
 * from the page object to keep page objects focused on simple finder methods.
 *
 * @param evaluationName - The name of the evaluation run to wait for
 * @param expectedStatus - The expected status or array of statuses to wait for
 * @param modelName - Optional model name to verify in the table
 * @param timeout - Timeout in milliseconds (default: 60000)
 * @returns The page object for method chaining
 */
export const waitForEvaluationRun = (
  evaluationName: string,
  expectedStatus: string | string[],
  modelName?: string,
  timeout = 60000, // 60 seconds by default
): typeof lmEvalPage => {
  // Wait for the table to be visible and loaded
  cy.get('table').should('be.visible');

  // Wait for the evaluation run to appear in the table first
  // Use a more specific approach to handle multiple entries with same name
  cy.get('tr').contains(evaluationName).should('be.visible');

  // Convert expectedStatus to array for consistent handling
  const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

  // Poll for status change using Cypress's built-in retry mechanism
  cy.get('body', { timeout }).should(($body: JQuery<HTMLElement>) => {
    // Find all rows containing the evaluation name
    const evaluationRows = $body.find(`tr:contains("${evaluationName}")`);

    // Check if status matches any of the expected statuses
    const statusText = evaluationRows.text();
    const hasExpectedStatus = expectedStatuses.some((status) => statusText.includes(status));

    // Use Cypress assertions instead of throwing errors
    expect(evaluationRows.length).to.be.greaterThan(0);
    expect(hasExpectedStatus).to.equal(true);
  });

  // Verify the evaluation run exists with all required elements
  lmEvalPage.shouldHaveEvaluationRunInTable(evaluationName);
  if (modelName) {
    lmEvalPage.shouldHaveModelNameInTable(modelName);
  }
  lmEvalPage.shouldHaveEvaluationRunStatus();
  lmEvalPage.shouldHaveEvaluationRunStartTime();
  lmEvalPage.shouldHaveEvaluationRunActionsMenu();

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
