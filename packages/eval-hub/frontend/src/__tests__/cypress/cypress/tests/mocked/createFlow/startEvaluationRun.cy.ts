/* eslint-disable camelcase */
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import { mockProvider } from '~/__mocks__/mockProvider';
import { mockBenchmark } from '~/__mocks__/mockBenchmark';
import { mockEvaluationJob } from '~/__mocks__/mockEvaluationJob';
import { startEvaluationRunPage } from '~/__tests__/cypress/cypress/pages/startEvaluationRunPage';
import { singleBenchmarkWizardPage } from '~/__tests__/cypress/cypress/pages/singleBenchmarkWizardPage';
import { ToastNotification } from '~/__tests__/cypress/cypress/pages/components/Notification';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

const NAMESPACE = 'test-namespace';
const API_VERSION = { apiVersion: CLIENT_API_VERSION };

const mockMlflowExperiments = (experiments: { id: string; name: string }[] = []) => {
  cy.intercept('GET', '/_bff/mlflow/api/v1/experiments*', {
    body: { data: { experiments } },
  }).as('mlflowExperiments');
};

const mockInferenceServices = (
  items: {
    name: string;
    url?: string;
    ready: boolean;
    model_format_name?: string;
    api_protocol?: 'REST' | 'gRPC';
  }[] = [],
) => {
  cy.interceptApi('GET /api/:apiVersion/inferenceservices', { path: API_VERSION }, { items });
};

const mockVerifyConnectionSuccess = () => {
  cy.interceptApi(
    'POST /api/:apiVersion/evaluations/verify-connection',
    { path: API_VERSION },
    {
      success: true,
      message: 'Connection established successfully.',
      response_time_ms: 120,
      openai_compatible: true,
    },
  ).as('verifyConnection');
};

const testProvider = mockProvider({
  id: 'test-provider',
  name: 'test-provider',
  title: 'Test Provider',
  benchmarks: [
    mockBenchmark({
      id: 'bench-alpha',
      name: 'Alpha Bench',
      category: 'Reasoning',
      metrics: ['accuracy', 'f1'],
      primaryScoreMetric: 'accuracy',
      lowerIsBetter: false,
      threshold: 0.25,
    }),
  ],
});

const rawMetricProvider = mockProvider({
  id: 'guidellm',
  name: 'guidellm',
  title: 'GuideLLM',
  benchmarks: [
    mockBenchmark({
      id: 'constant',
      name: 'Constant load',
      metrics: ['output_tokens_per_second', 'mean_ttft_ms'],
      primaryScoreMetric: 'output_tokens_per_second',
      lowerIsBetter: false,
      threshold: 10,
    }),
  ],
});

const initBaseIntercepts = () => {
  cy.interceptApi(
    'GET /api/:apiVersion/user',
    { path: API_VERSION },
    mockUserSettings({ userId: 'test-user' }),
  );

  cy.interceptApi('GET /api/:apiVersion/namespaces', { path: API_VERSION }, [
    mockNamespace({ name: NAMESPACE }),
  ]);

  cy.interceptApi(
    'GET /api/:apiVersion/evalhub/health',
    { path: API_VERSION },
    mockEvalHubHealth(),
  );

  cy.interceptApi('GET /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, []);

  mockInferenceServices([]);
  mockVerifyConnectionSuccess();
};

const selectExternalEndpoint = () => {
  startEvaluationRunPage.findModelPickerToggle().click();
  cy.findByTestId('model-option-external').click();
};

const fillExternalModelFields = (modelName: string, endpointUrl: string) => {
  selectExternalEndpoint();
  startEvaluationRunPage.findModelNameInput().type(modelName);
  startEvaluationRunPage.findEndpointUrlInput().type(endpointUrl);
  startEvaluationRunPage.findValidateConnectionButton().click();
  cy.wait('@verifyConnection');
};

const navigateToBenchmarkConfiguration = (
  provider = testProvider,
  benchmarkId = testProvider.benchmarks?.[0].id ?? '',
) => {
  cy.interceptApi('GET /api/:apiVersion/evaluations/providers', { path: API_VERSION }, [provider]);

  singleBenchmarkWizardPage.visit(NAMESPACE);
  singleBenchmarkWizardPage.findBreadcrumb().should('contain.text', 'Benchmarks');
  singleBenchmarkWizardPage
    .findSelectBenchmarkButton({ providerId: provider.resource.id, benchmarkId })
    .click();
  startEvaluationRunPage.findForm().should('exist');
  startEvaluationRunPage
    .findActiveBreadcrumb()
    .should('contain.text', provider.benchmarks?.find(({ id }) => id === benchmarkId)?.name);
};

const navigateToBenchmarkStart = (
  provider = testProvider,
  benchmarkId = testProvider.benchmarks?.[0].id ?? '',
) => {
  navigateToBenchmarkConfiguration(provider, benchmarkId);
  startEvaluationRunPage.findForm().should('exist');
};

describe('Start Evaluation Run - Benchmark Mode', () => {
  beforeEach(() => {
    initBaseIntercepts();
    mockMlflowExperiments([]);
  });

  it('should render form with correct benchmark summary and default fields', () => {
    navigateToBenchmarkStart();

    startEvaluationRunPage.findBenchmarkNameDisplay().should('contain.text', 'Alpha Bench');
    startEvaluationRunPage.findBenchmarkParameterInput('num_examples').should('have.value', '817');
    startEvaluationRunPage.findBenchmarkParameterInput('num_few_shot').should('have.value', '0');
    startEvaluationRunPage.findEvaluationNameInput().should('not.have.value', '');
    startEvaluationRunPage.findSourceModeToggle().should('not.exist');
    startEvaluationRunPage.findModelPickerToggle().should('exist');
    startEvaluationRunPage.findEvaluationRunDetailsHeading().should('not.exist');
    startEvaluationRunPage
      .findAdvancedConfigurationToggle()
      .should('contain.text', 'Advanced configuration');
    startEvaluationRunPage.findBenchmarkSettingsHeading().should('be.visible');
    startEvaluationRunPage
      .findTestDataSourceHeading()
      .should('be.visible')
      .and('have.class', 'pf-v6-u-font-size-md');
    startEvaluationRunPage.findSubmitButton().should('exist');
    startEvaluationRunPage.findCancelButton().should('exist');
  });

  it('should expand advanced benchmark parameters at the bottom of benchmark settings', () => {
    navigateToBenchmarkStart();

    startEvaluationRunPage
      .findAdvancedBenchmarkParametersToggle()
      .should('contain.text', 'Show advanced benchmark parameters')
      .click();

    startEvaluationRunPage
      .findAdvancedBenchmarkParametersToggle()
      .should('contain.text', 'Hide advanced benchmark parameters');
    startEvaluationRunPage.findAdvancedBenchmarkParametersContent().should('be.visible');
    startEvaluationRunPage.findAdditionalArgsUpload().should('be.visible');
  });

  it('should default to new experiment mode when no experiments exist', () => {
    navigateToBenchmarkStart();

    startEvaluationRunPage.findExperimentModeNew().should('be.checked');
    startEvaluationRunPage.findNewExperimentNameInput().should('have.value', 'EvalHub');
  });

  it('should disable submit when required fields are empty', () => {
    navigateToBenchmarkStart();

    startEvaluationRunPage.findEvaluationNameInput().clear();
    startEvaluationRunPage.findSubmitButton().should('be.disabled');
  });

  it('should not render a source mode selector', () => {
    navigateToBenchmarkStart();

    startEvaluationRunPage.findSourceModeToggle().should('not.exist');
    startEvaluationRunPage.findModelPickerToggle().should('exist');
  });

  it('should show external model fields when selecting Other (External endpoint)', () => {
    navigateToBenchmarkStart();

    selectExternalEndpoint();
    startEvaluationRunPage.findModelNameInput().should('exist');
    startEvaluationRunPage.findEndpointUrlInput().should('exist');
    startEvaluationRunPage.findApiKeyInput().should('exist');
    startEvaluationRunPage.findValidateConnectionButton().should('exist');
    cy.findByTestId('external-endpoint-compatibility-alert').should('exist');
  });

  it('should submit evaluation job and show success toast', () => {
    const createdJob = mockEvaluationJob({
      id: 'new-eval-001',
      name: 'test-eval',
      state: 'running',
    });

    cy.interceptApi('POST /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, createdJob).as(
      'createJob',
    );

    navigateToBenchmarkStart();

    fillExternalModelFields('my-model', 'https://api.example.com/v1');
    startEvaluationRunPage.findSubmitButton().should('be.enabled');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@createJob').then((interception) => {
      expect(interception.request.body).to.have.property('name');
      expect(interception.request.body).to.have.property('model');
      expect(interception.request.body.model).to.have.property('name', 'my-model');
      expect(interception.request.body.model).to.have.property('url', 'https://api.example.com/v1');
      expect(interception.request.body).to.have.property('benchmarks');
    });

    const successToast = new ToastNotification('Evaluation started');
    successToast.find().should('exist');

    cy.url().should('include', `/evaluation/${NAMESPACE}`);
    cy.url().should('not.include', '/create');
  });
});

describe('Start Evaluation Run - Benchmark Threshold & Primary Metric', () => {
  beforeEach(() => {
    initBaseIntercepts();
    mockMlflowExperiments([]);
  });

  it('should display threshold slider pre-populated from benchmark metadata', () => {
    navigateToBenchmarkConfiguration();

    startEvaluationRunPage.findBenchmarkThreshold().should('exist');
    startEvaluationRunPage.findBenchmarkThresholdInput().should('have.value', '25');
  });

  it('should submit benchmark-declared parameter values from their dedicated fields', () => {
    const createdJob = mockEvaluationJob({
      id: 'new-eval-benchmark-parameters',
      name: 'benchmark-parameters-eval',
      state: 'running',
    });

    cy.interceptApi('POST /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, createdJob).as(
      'createJobWithBenchmarkParameters',
    );

    navigateToBenchmarkStart();
    startEvaluationRunPage.findBenchmarkParameterInput('num_examples').clear().type('42');

    fillExternalModelFields('my-model', 'https://api.example.com/v1');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@createJobWithBenchmarkParameters').then((interception) => {
      expect(interception.request.body.benchmarks[0].parameters).to.deep.include({
        num_examples: 42,
        num_few_shot: 0,
      });
    });
  });

  it('should display primary scorer metric dropdown with correct default', () => {
    navigateToBenchmarkConfiguration();

    startEvaluationRunPage.findPrimaryScorerMetricToggle().should('exist');
    startEvaluationRunPage.findPrimaryScorerMetricToggle().should('contain.text', 'Accuracy');
  });

  it('should allow changing the primary scorer metric', () => {
    navigateToBenchmarkConfiguration();

    startEvaluationRunPage.findPrimaryScorerMetricToggle().click();
    startEvaluationRunPage.findPrimaryScorerMetricOption('f1').click();
    startEvaluationRunPage.findPrimaryScorerMetricToggle().should('contain.text', 'F1');
  });

  it('should include pass_criteria in submission when threshold is set from metadata', () => {
    const createdJob = mockEvaluationJob({
      id: 'new-eval-threshold',
      name: 'threshold-eval',
      state: 'running',
    });

    cy.interceptApi('POST /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, createdJob).as(
      'createJobWithThreshold',
    );

    navigateToBenchmarkStart();

    fillExternalModelFields('my-model', 'https://api.example.com/v1');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@createJobWithThreshold').then((interception) => {
      expect(interception.request.body.benchmarks[0]).to.have.property('pass_criteria');
      expect(interception.request.body.benchmarks[0].pass_criteria).to.have.property(
        'threshold',
        0.25,
      );
      expect(interception.request.body.benchmarks[0]).to.have.property('primary_score');
      expect(interception.request.body.benchmarks[0].primary_score).to.have.property(
        'metric',
        'accuracy',
      );
    });
  });

  it('should preserve an untouched raw metric threshold in submission', () => {
    const createdJob = mockEvaluationJob({
      id: 'new-raw-metric-eval',
      name: 'raw-metric-eval',
      state: 'running',
    });

    cy.interceptApi('POST /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, createdJob).as(
      'createRawMetricJob',
    );

    navigateToBenchmarkConfiguration(rawMetricProvider, 'constant');
    startEvaluationRunPage.findBenchmarkThresholdInput().should('have.value', '10');

    fillExternalModelFields('my-model', 'https://api.example.com/v1');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@createRawMetricJob').then((interception) => {
      expect(interception.request.body.benchmarks[0].pass_criteria).to.have.property(
        'threshold',
        10,
      );
    });
  });

  it('should submit overridden threshold when user modifies the slider value', () => {
    const createdJob = mockEvaluationJob({
      id: 'new-eval-threshold-override',
      name: 'threshold-override-eval',
      state: 'running',
    });

    cy.interceptApi('POST /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, createdJob).as(
      'createJobThresholdOverride',
    );

    navigateToBenchmarkConfiguration();

    startEvaluationRunPage.findBenchmarkThresholdInput().type('{selectall}50');

    fillExternalModelFields('my-model', 'https://api.example.com/v1');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@createJobThresholdOverride').then((interception) => {
      expect(interception.request.body.benchmarks[0].pass_criteria).to.have.property(
        'threshold',
        0.5,
      );
    });
  });

  it('should include overridden primary_score when user changes metric', () => {
    const createdJob = mockEvaluationJob({
      id: 'new-eval-metric',
      name: 'metric-eval',
      state: 'running',
    });

    cy.interceptApi('POST /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, createdJob).as(
      'createJobWithMetric',
    );

    navigateToBenchmarkConfiguration();

    startEvaluationRunPage.findPrimaryScorerMetricToggle().click();
    startEvaluationRunPage.findPrimaryScorerMetricOption('f1').click();

    fillExternalModelFields('my-model', 'https://api.example.com/v1');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@createJobWithMetric').then((interception) => {
      expect(interception.request.body.benchmarks[0].primary_score).to.have.property(
        'metric',
        'f1',
      );
    });
  });

  it('should preserve the threshold when the primary metric changes', () => {
    navigateToBenchmarkConfiguration(rawMetricProvider, 'constant');
    startEvaluationRunPage.findBenchmarkThresholdInput().should('have.value', '10');

    startEvaluationRunPage.findPrimaryScorerMetricToggle().click();
    startEvaluationRunPage.findPrimaryScorerMetricOption('mean_ttft_ms').click();

    startEvaluationRunPage.findBenchmarkThresholdInput().should('have.value', '10');
  });
});

describe('Start Evaluation Run - Submission Error', () => {
  beforeEach(() => {
    initBaseIntercepts();
    mockMlflowExperiments([]);
  });

  it('should remain on start page and re-enable submit after failure', () => {
    navigateToBenchmarkStart();

    cy.intercept(
      { method: 'POST', pathname: '/eval-hub/api/v1/evaluations/jobs' },
      { statusCode: 500, body: { message: 'Internal server error' } },
    ).as('createJobFail');

    fillExternalModelFields('my-model', 'https://api.example.com/v1');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@createJobFail');

    startEvaluationRunPage.findForm().should('exist');
    startEvaluationRunPage.findSubmitButton().should('be.enabled');
    cy.url().should('include', `/create/start?type=benchmark`);
  });
});

describe('Start Evaluation Run - MLflow Experiment', () => {
  beforeEach(() => {
    initBaseIntercepts();
  });

  it('should auto-select existing experiment when experiments are available', () => {
    mockMlflowExperiments([
      { id: 'exp-1', name: 'EvalHub' },
      { id: 'exp-2', name: 'My Other Experiment' },
    ]);

    navigateToBenchmarkStart();
    startEvaluationRunPage.findAdvancedConfigurationToggle().click();

    startEvaluationRunPage.findExperimentModeExisting().should('be.checked');
  });

  it('should allow switching to create new experiment mode', () => {
    mockMlflowExperiments([{ id: 'exp-1', name: 'EvalHub' }]);

    navigateToBenchmarkStart();
    cy.wait('@mlflowExperiments');
    startEvaluationRunPage.findAdvancedConfigurationToggle().click();

    startEvaluationRunPage.findExperimentModeExisting().should('be.checked');
    startEvaluationRunPage.findExperimentModeNew().click();
    startEvaluationRunPage.findNewExperimentNameInput().should('exist');
    startEvaluationRunPage.findNewExperimentNameInput().clear().type('My New Experiment');
    startEvaluationRunPage.findNewExperimentNameInput().should('have.value', 'My New Experiment');
  });

  it('should keep new mode selected when experiments arrive after user switches', () => {
    let resolveExperiments: ((value: unknown) => void) | undefined;
    const delayed = new Promise((resolve) => {
      resolveExperiments = resolve;
    });

    cy.intercept('GET', '/_bff/mlflow/api/v1/experiments*', (req) => {
      return delayed.then(() => {
        req.reply({
          body: { data: { experiments: [{ id: 'exp-1', name: 'EvalHub' }] } },
        });
      });
    }).as('mlflowExperimentsDelayed');

    navigateToBenchmarkStart();
    startEvaluationRunPage.findAdvancedConfigurationToggle().click();

    startEvaluationRunPage.findExperimentModeNew().click();
    startEvaluationRunPage.findExperimentModeNew().should('be.checked');

    cy.then(() => {
      resolveExperiments!(undefined);
    });

    cy.wait('@mlflowExperimentsDelayed');

    startEvaluationRunPage.findExperimentModeNew().should('be.checked');
    startEvaluationRunPage.findExperimentModeExisting().should('not.be.checked');
  });

  it('should select an existing experiment when switching back while experiments load', () => {
    let resolveExperiments: ((value: unknown) => void) | undefined;
    const delayed = new Promise((resolve) => {
      resolveExperiments = resolve;
    });

    cy.intercept('GET', '/_bff/mlflow/api/v1/experiments*', (req) => {
      return delayed.then(() => {
        req.reply({
          body: { data: { experiments: [{ id: 'exp-1', name: 'EvalHub' }] } },
        });
      });
    }).as('mlflowExperimentsDelayed');

    navigateToBenchmarkStart();
    startEvaluationRunPage.findAdvancedConfigurationToggle().click();

    startEvaluationRunPage.findExperimentModeNew().click();
    startEvaluationRunPage.findExperimentModeExisting().click();
    startEvaluationRunPage.findExperimentModeExisting().should('be.checked');

    cy.then(() => {
      resolveExperiments!(undefined);
    });

    cy.wait('@mlflowExperimentsDelayed');

    cy.findByTestId('mlflow-experiment-selector-toggle').should('contain.text', 'EvalHub');
  });
});

describe('Start Evaluation Run - Cancel', () => {
  beforeEach(() => {
    initBaseIntercepts();
    mockMlflowExperiments([]);
  });

  it('should return to the benchmark selector with the benchmark still selected on cancel', () => {
    navigateToBenchmarkStart();

    startEvaluationRunPage.findCancelButton().click();

    cy.url().should('include', `/evaluation/${NAMESPACE}/create/single-benchmark`);
    singleBenchmarkWizardPage
      .findBenchmarkCard({ providerId: testProvider.resource.id, benchmarkId: 'bench-alpha' })
      .should('have.attr', 'data-selected', 'true');
  });
});

describe('Start Evaluation Run - Cluster Model Selection', () => {
  beforeEach(() => {
    initBaseIntercepts();
    mockMlflowExperiments([]);
  });

  it('should allow selecting a cluster InferenceService and enable submit without validation', () => {
    mockInferenceServices([
      { name: 'llama-3.2-1b-instruct', url: 'http://llama.svc.cluster.local:8080/v1', ready: true },
      { name: 'mistral-7b-instruct', url: 'http://mistral.svc.cluster.local:8080/v1', ready: true },
    ]);

    const createdJob = mockEvaluationJob({
      id: 'new-eval-cluster',
      name: 'cluster-eval',
      state: 'running',
    });

    cy.interceptApi('POST /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, createdJob).as(
      'createClusterJob',
    );

    navigateToBenchmarkStart();

    startEvaluationRunPage.findModelPickerToggle().click();
    cy.findByTestId('model-option-llama-3.2-1b-instruct').click();

    startEvaluationRunPage.findSubmitButton().should('be.enabled');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@createClusterJob').then((interception) => {
      expect(interception.request.body.model).to.have.property('name', 'llama-3.2-1b-instruct');
    });
  });

  it('should disable incompatible models in the dropdown', () => {
    mockInferenceServices([
      {
        name: 'vllm-model',
        url: 'http://vllm.svc.cluster.local:8080/v1',
        ready: true,
        model_format_name: 'vLLM',
      },
      {
        name: 'autogluon-model',
        url: 'http://autogluon.svc.cluster.local:8080/v1',
        ready: true,
        model_format_name: 'AutoGluon',
      },
    ]);

    navigateToBenchmarkStart();

    startEvaluationRunPage.findModelPickerToggle().click();
    cy.findByTestId('model-option-vllm-model').click();
    startEvaluationRunPage.findModelPickerToggle().should('contain.text', 'vllm-model');

    startEvaluationRunPage.findModelPickerToggle().click();
    cy.findByTestId('model-option-autogluon-model')
      .should('contain.text', 'autogluon-model')
      .and('contain.text', 'not compatible with evaluation benchmarks');
  });

  it('should allow selecting models without a model_format_name', () => {
    mockInferenceServices([
      {
        name: 'legacy-model',
        url: 'http://legacy.svc.cluster.local:8080/v1',
        ready: true,
      },
    ]);

    navigateToBenchmarkStart();

    startEvaluationRunPage.findModelPickerToggle().click();
    cy.findByTestId('model-option-legacy-model').click();

    startEvaluationRunPage.findSubmitButton().should('be.enabled');
  });
});

describe('Start Evaluation Run - Connection Validation', () => {
  beforeEach(() => {
    initBaseIntercepts();
    mockMlflowExperiments([]);
  });

  it('should show validate connection button for external model', () => {
    navigateToBenchmarkStart();

    selectExternalEndpoint();
    startEvaluationRunPage.findValidateConnectionButton().should('exist');
  });

  it('should not show validate connection button for cluster model', () => {
    mockInferenceServices([
      { name: 'llama-3.2-1b-instruct', url: 'http://llama.svc.cluster.local:8080/v1', ready: true },
    ]);

    navigateToBenchmarkStart();

    startEvaluationRunPage.findModelPickerToggle().click();
    cy.findByTestId('model-option-llama-3.2-1b-instruct').click();

    startEvaluationRunPage.findValidateConnectionButton().should('not.exist');
  });

  it('should allow submit when external fields are filled without requiring validation', () => {
    navigateToBenchmarkStart();

    selectExternalEndpoint();
    startEvaluationRunPage.findModelNameInput().type('my-model');
    startEvaluationRunPage.findEndpointUrlInput().type('https://api.example.com/v1');

    startEvaluationRunPage.findSubmitButton().should('be.enabled');
  });
});
describe('Start Evaluation Run - Benchmark Test Data', () => {
  beforeEach(() => {
    initBaseIntercepts();
    mockMlflowExperiments([]);
  });

  it('should render the test data section for a single benchmark run', () => {
    navigateToBenchmarkConfiguration();
    startEvaluationRunPage.findTestDataRefSourceToggle().should('exist');
  });

  it('should submit a test data ref with the job request', () => {
    const createdJob = mockEvaluationJob({
      id: 'new-eval-test-data',
      name: 'test-data-eval',
      state: 'running',
    });

    cy.interceptApi('POST /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, createdJob).as(
      'createJobWithTestData',
    );

    navigateToBenchmarkConfiguration();

    startEvaluationRunPage.findTestDataRefSourceToggle().click();
    startEvaluationRunPage.findTestDataRefOption('Persistent volume claim (PVC)').click();
    startEvaluationRunPage.findTestDataRefField('claimName').type('eval-datasets-pvc');
    startEvaluationRunPage.findTestDataRefField('subPath').type('benchmark-a');

    fillExternalModelFields('my-model', 'https://api.example.com/v1');
    startEvaluationRunPage.findSubmitButton().should('be.enabled');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@createJobWithTestData').then((interception) => {
      expect(interception.request.body.benchmarks[0].test_data_ref).to.deep.equal({
        type: 'data_set',
        pvc: { claim_name: 'eval-datasets-pvc', sub_path: 'benchmark-a' },
      });
    });
  });

  it('should block submission when required test data fields are empty', () => {
    navigateToBenchmarkConfiguration();

    startEvaluationRunPage.findTestDataRefSourceToggle().click();
    startEvaluationRunPage.findTestDataRefOption('Persistent volume claim (PVC)').click();
    startEvaluationRunPage.findTestDataRefField('claimName').type('eval-datasets-pvc').clear();

    startEvaluationRunPage
      .findTestDataRefFieldError('claimName')
      .should('contain.text', 'Claim name is required.');

    startEvaluationRunPage.findSubmitButton().should('be.disabled');
  });
});
/* eslint-enable camelcase */
