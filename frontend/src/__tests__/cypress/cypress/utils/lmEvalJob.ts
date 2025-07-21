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
  lmEval: LMEvalConfig;
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
 *
 * @param req The request object to modify
 * @param testConfig The test configuration object containing LMEval settings
 */
export const configureJob = (req: LMEvalJobRequest, testConfig: TestConfig): void => {
  // Check if modelArgs is an array (it's always defined in the interface)
  if (Array.isArray(req.body.spec.modelArgs)) {
    // Get LMEval configuration from test config (it's always defined in the interface)
    const lmEvalConfig = testConfig.lmEval;

    // Fix model name to use correct model ID from configuration
    const modelArg = req.body.spec.modelArgs.find((arg: ModelArg) => arg.name === 'model');
    if (modelArg && lmEvalConfig.modelPath) {
      modelArg.value = lmEvalConfig.modelPath;
    }

    // IMPORTANT: This workaround is necessary because:
    // 1. KServe generates the URL without a port (e.g., http://service.namespace.svc.cluster.local)
    // 2. KServe overrides our service config, setting port to 80 despite YAML specifying 8032
    // 3. The container actually listens on port 8032
    // 4. Without this fix, the client tries port 80 and fails with "Connection refused"
    const baseUrlArg = req.body.spec.modelArgs.find((arg: ModelArg) => arg.name === 'base_url');
    if (baseUrlArg && baseUrlArg.value.includes('.svc.cluster.local')) {
      if (!baseUrlArg.value.includes('.svc.cluster.local:')) {
        // Use default port 8032 if not specified in config
        const servicePort = lmEvalConfig.servicePort || 8032;
        baseUrlArg.value = baseUrlArg.value.replace(
          '.svc.cluster.local',
          `.svc.cluster.local:${servicePort}`,
        );
      }
    }

    // Log the final configuration for debugging
    console.log('🚀 Final LMEval Job Configuration:');
    console.log('📋 Task:', req.body.spec.taskList.taskNames);
    console.log('🔧 Model Args:');
    req.body.spec.modelArgs.forEach((arg: ModelArg) => {
      console.log(`  - ${arg.name}: ${arg.value}`);
    });
  }
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
    const limit = modelArgs?.find((arg: ModelArg) => arg.name === 'limit')?.value;
    const model = modelArgs?.find((arg: ModelArg) => arg.name === 'model')?.value;

    cy.log(`🔗 Base URL: ${baseUrl}`);
    cy.log(`⚡ Concurrent Requests: ${concurrent}`);
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
  const modelPath = lmEvalConfig.modelPath || '';

  // Use default timeout if not specified
  const timeout = lmEvalTimeoutSeconds || 300;

  // Wait for the page to load completely after form submission
  cy.step('Wait for Evaluation page to load after form submission');
  cy.get('table').should('be.visible');

  // Wait for the evaluation run to appear in the table
  cy.step('Wait for evaluation run to appear in table');
  cy.get('[data-label="Evaluation"]', { timeout: timeout * 1000 }).should(
    'contain.text',
    evaluationName,
  );

  cy.step('Switch to All projects view');
  lmEvalPage.switchToAllProjectsView();

  // List evaluation runs
  cy.step('Log evaluation runs in table');
  cy.get('[data-label="Evaluation"]').then(($elements) => {
    $elements.each((index, element) => {
      const textContent = element.textContent || '';
      cy.log(`Evaluation run ${index}: "${textContent}"`);
    });
  });

  // Wait for evaluation run to reach a stable state
  if (testSetup?.modelName) {
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
    lmEvalPage.waitForEvaluationRun(
      evaluationName,
      ['In Progress', 'Complete'], // Should now work with the patched URL
      modelPath, // Use the corrected model name from network intercept
      timeout * 1000, // Convert to milliseconds for UI wait
    );

    // Print pod logs at the end
    cy.step('Print LMEval job pod logs');
    execWithOutput(`oc logs -n ${testSetup.testProjectName} ${evaluationName}`, 30).then(
      (result) => {
        cy.log(`📝 LMEval Job Logs:\n${result.stdout}\n${result.stderr}`);
      },
    );

    // Switch to the correct project first to ensure we click on the right evaluation
    cy.step('Switch to the correct project to find the evaluation');
    if (testSetup.testProjectName) {
      lmEvalPage.selectProjectByName(testSetup.testProjectName);
    }

    // Wait for and click on the evaluation run link (select the completed one)
    cy.step('Wait for evaluation run link to be available and click it');

    // Wait for complete status and click the link
    cy.get('[data-testid="evaluation-run-status"]', {
      timeout: timeout * 1000,
    }).should('contain.text', 'Complete');

    cy.get(`[data-testid="lm-eval-link-${evaluationName}"]`, {
      timeout: timeout * 1000,
    })
      .should('be.visible')
      .and('contain.text', evaluationName)
      .click();

    // Verify navigation to the evaluation details page
    cy.step('Verify navigation to evaluation details page');
    cy.url().should('include', `/modelEvaluations/${testSetup.testProjectName}/${evaluationName}`);

    // Log the actual URL for debugging
    cy.url().then((currentUrl) => {
      cy.log(`📍 Actual evaluation details URL: ${currentUrl}`);
    });

    // Verify we're on the evaluation details page
    cy.step('Verify evaluation details page content');
    cy.get('h1').should('contain.text', evaluationName);

    // Verify Download JSON button is available and functional
    cy.step('Verify Download JSON button is present and clickable');
    cy.get('button').contains('Download JSON').should('be.visible').and('not.be.disabled');

    // Click the download button and verify the downloaded file
    cy.step('Download and verify JSON file');
    cy.get('button').contains('Download JSON').click();

    // Verify the downloaded file using the new function
    verifyDownloadedJsonFile(evaluationName);
  }
};
