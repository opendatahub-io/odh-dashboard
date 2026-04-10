/* eslint-disable camelcase */
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import { mockProvider } from '~/__mocks__/mockProvider';
import { mockBenchmark } from '~/__mocks__/mockBenchmark';
import { mockCollection, mockCollectionsListResponse } from '~/__mocks__/mockCollection';
import { mockEvaluationJob } from '~/__mocks__/mockEvaluationJob';
import { startEvaluationRunPage } from '~/__tests__/cypress/cypress/pages/startEvaluationRunPage';
import { chooseBenchmarkPage } from '~/__tests__/cypress/cypress/pages/chooseBenchmarkPage';
import { chooseCollectionPage } from '~/__tests__/cypress/cypress/pages/chooseCollectionPage';
import { ToastNotification } from '~/__tests__/cypress/cypress/pages/components/Notification';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

const NAMESPACE = 'test-namespace';
const API_VERSION = { apiVersion: CLIENT_API_VERSION };

const mockMlflowExperiments = (experiments: { id: string; name: string }[] = []) => {
  cy.intercept('GET', '/_bff/mlflow/api/v1/experiments*', {
    body: { data: { experiments } },
  });
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
    }),
  ],
});

const testCollection = mockCollection({
  id: 'col-safety',
  name: 'Safety Suite',
  category: 'Safety',
  description: 'Safety evaluation collection.',
  benchmarkIds: ['harmful_request_refusal', 'toxigen'],
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

  cy.interceptApi(
    'GET /api/:apiVersion/evaluations/collections',
    { path: API_VERSION },
    mockCollectionsListResponse([]),
  );
};

const navigateToBenchmarkStart = () => {
  cy.interceptApi('GET /api/:apiVersion/evaluations/providers', { path: API_VERSION }, [
    testProvider,
  ]);

  chooseBenchmarkPage.visit(NAMESPACE);
  chooseBenchmarkPage
    .findBenchmarkCard('test-provider', 'bench-alpha')
    .findByText('Use this benchmark')
    .click();

  startEvaluationRunPage.findForm().should('exist');
};

const navigateToCollectionStart = () => {
  cy.interceptApi(
    'GET /api/:apiVersion/evaluations/collections',
    { path: API_VERSION },
    mockCollectionsListResponse([testCollection]),
  );

  chooseCollectionPage.visit(NAMESPACE);
  chooseCollectionPage.findUseBenchmarkSuiteButton('col-safety').click();

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
    startEvaluationRunPage.findEvaluationNameInput().should('not.have.value', '');
    startEvaluationRunPage.findInputModeInference().should('be.checked');
    startEvaluationRunPage.findModelNameInput().should('exist');
    startEvaluationRunPage.findEndpointUrlInput().should('exist');
    startEvaluationRunPage.findApiKeyInput().should('exist');
    startEvaluationRunPage.findSubmitButton().should('exist');
    startEvaluationRunPage.findCancelButton().should('exist');
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

  it('should toggle between inference and pre-recorded input modes', () => {
    navigateToBenchmarkStart();

    startEvaluationRunPage.findInputModeInference().should('be.checked');
    startEvaluationRunPage.findModelNameInput().should('exist');
    startEvaluationRunPage.findEndpointUrlInput().should('exist');

    startEvaluationRunPage.findInputModePrerecorded().click();
    startEvaluationRunPage.findSourceNameInput().should('exist');
    startEvaluationRunPage.findDatasetUrlInput().should('exist');
    startEvaluationRunPage.findAccessTokenInput().should('exist');
    startEvaluationRunPage.findModelNameInput().should('not.exist');
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

    startEvaluationRunPage.findModelNameInput().type('my-model');
    startEvaluationRunPage.findEndpointUrlInput().type('https://api.example.com/v1');
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

    startEvaluationRunPage.findModelNameInput().type('my-model');
    startEvaluationRunPage.findEndpointUrlInput().type('https://api.example.com/v1');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@createJobFail');

    startEvaluationRunPage.findForm().should('exist');
    startEvaluationRunPage.findSubmitButton().should('be.enabled');
    cy.url().should('include', '/create/start');
  });
});

describe('Start Evaluation Run - Collection Mode', () => {
  beforeEach(() => {
    initBaseIntercepts();
    mockMlflowExperiments([]);
  });

  it('should render form with correct collection summary', () => {
    navigateToCollectionStart();

    startEvaluationRunPage.findBenchmarkNameDisplay().should('contain.text', 'Safety Suite');
    startEvaluationRunPage.findEvaluationNameInput().should('not.have.value', '');
    startEvaluationRunPage.findSubmitButton().should('exist');
  });

  it('should submit collection evaluation job with correct payload', () => {
    const createdJob = mockEvaluationJob({
      id: 'new-eval-002',
      name: 'collection-eval',
      state: 'running',
      collectionId: 'col-safety',
    });

    cy.interceptApi('POST /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, createdJob).as(
      'createCollectionJob',
    );

    navigateToCollectionStart();

    startEvaluationRunPage.findModelNameInput().type('safety-model');
    startEvaluationRunPage.findEndpointUrlInput().type('https://safety.example.com/v1');
    startEvaluationRunPage.findSubmitButton().should('be.enabled');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@createCollectionJob').then((interception) => {
      expect(interception.request.body).to.have.property('collection');
      expect(interception.request.body.collection).to.have.property('id', 'col-safety');
      expect(interception.request.body.collection).to.have.property('benchmarks');
      expect(interception.request.body.collection.benchmarks).to.have.length(2);
      expect(interception.request.body.collection.benchmarks[0]).to.have.property(
        'id',
        'harmful_request_refusal',
      );
      expect(interception.request.body).to.not.have.property('benchmarks');
    });

    const successToast = new ToastNotification('Evaluation started');
    successToast.find().should('exist');

    cy.url().should('include', `/evaluation/${NAMESPACE}`);
    cy.url().should('not.include', '/create');
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

    startEvaluationRunPage.findExperimentModeExisting().should('be.checked');
  });

  it('should allow switching to create new experiment mode', () => {
    mockMlflowExperiments([{ id: 'exp-1', name: 'EvalHub' }]);

    navigateToBenchmarkStart();

    startEvaluationRunPage.findExperimentModeExisting().should('be.checked');
    startEvaluationRunPage.findExperimentModeNew().click();
    startEvaluationRunPage.findNewExperimentNameInput().should('exist');
    startEvaluationRunPage.findNewExperimentNameInput().clear().type('My New Experiment');
    startEvaluationRunPage.findNewExperimentNameInput().should('have.value', 'My New Experiment');
  });
});

describe('Start Evaluation Run - Pre-recorded Mode', () => {
  beforeEach(() => {
    initBaseIntercepts();
    mockMlflowExperiments([]);
  });

  it('should submit with pre-recorded responses fields', () => {
    const createdJob = mockEvaluationJob({
      id: 'new-eval-003',
      name: 'prerecorded-eval',
      state: 'running',
    });

    cy.interceptApi('POST /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, createdJob).as(
      'createPrerecordedJob',
    );

    navigateToBenchmarkStart();

    startEvaluationRunPage.findInputModePrerecorded().click();
    startEvaluationRunPage.findSourceNameInput().type('gpt-4-responses');
    startEvaluationRunPage.findDatasetUrlInput().type('s3://bucket/dataset.jsonl');
    startEvaluationRunPage.findSubmitButton().should('be.enabled');
    startEvaluationRunPage.findSubmitButton().click();

    cy.wait('@createPrerecordedJob').then((interception) => {
      expect(interception.request.body.model).to.have.property('name', 'gpt-4-responses');
    });
  });
});

describe('Start Evaluation Run - Cancel', () => {
  beforeEach(() => {
    initBaseIntercepts();
    mockMlflowExperiments([]);
  });

  it('should navigate back to evaluations on cancel', () => {
    navigateToBenchmarkStart();

    startEvaluationRunPage.findCancelButton().click();

    cy.url().should('include', `/evaluation/${NAMESPACE}`);
    cy.url().should('not.include', '/create');
  });
});
/* eslint-enable camelcase */
