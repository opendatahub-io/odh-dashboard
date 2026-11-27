/* eslint-disable camelcase */
import * as React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import { useInferenceServices } from '~/app/hooks/useInferenceServices';
import { useNotification } from '~/app/hooks/useNotification';
import { useProviders } from '~/app/hooks/useProviders';
import { useCollectionsContext } from '~/app/context/CollectionsContext';
import CreateCollectionFromGoalPage from '~/app/pages/CreateCollectionFromGoalPage';
import {
  createCollection,
  createCollectionGeneration,
  createEvaluationJob,
  deleteCollectionGeneration,
  getCollectionGeneration,
  verifyConnection,
} from '~/app/api/k8s';
import type {
  Collection,
  CollectionGenerationResource,
  InferenceServiceItem,
  Provider,
} from '~/app/types';

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ...require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule({
    includeBreadcrumb: true,
  }),
}));

jest.mock('~/app/hooks/useInferenceServices', () => ({
  useInferenceServices: jest.fn(),
}));

jest.mock('~/app/hooks/useProviders', () => ({
  useProviders: jest.fn(),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(),
}));

jest.mock('~/app/context/CollectionsContext', () => ({
  useCollectionsContext: jest.fn(),
}));

jest.mock('~/app/api/k8s', () => ({
  ...jest.requireActual('~/app/api/k8s'),
  createCollection: jest.fn(),
  createCollectionGeneration: jest.fn(),
  createEvaluationJob: jest.fn(),
  deleteCollectionGeneration: jest.fn(),
  getCollectionGeneration: jest.fn(),
  verifyConnection: jest.fn(),
}));

jest.mock('~/app/hooks/useNamespaceSelectorWithPersistence', () => ({
  useNamespaceSelectorWithPersistence: () => ({
    namespaces: [{ name: 'test-project', displayName: 'Test Project' }],
  }),
}));

const mockUseInferenceServices = jest.mocked(useInferenceServices);
const mockUseProviders = jest.mocked(useProviders);
const mockUseNotification = jest.mocked(useNotification);
const mockUseCollectionsContext = jest.mocked(useCollectionsContext);
const mockCreateCollection = jest.mocked(createCollection);
const mockCreateCollectionGeneration = jest.mocked(createCollectionGeneration);
const mockCreateEvaluationJob = jest.mocked(createEvaluationJob);
const mockDeleteCollectionGeneration = jest.mocked(deleteCollectionGeneration);
const mockGetCollectionGeneration = jest.mocked(getCollectionGeneration);
const mockVerifyConnection = jest.mocked(verifyConnection);
const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
const notification = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  remove: jest.fn(),
};
const refreshCollections = jest.fn();
const TrackingWrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
  <AnalyticsTrackingProvider value={tracking}>{children}</AnalyticsTrackingProvider>
);

const inferenceServiceFixtures: InferenceServiceItem[] = [
  {
    name: 'granite-3b',
    url: 'https://granite.example.com',
    ready: true,
    model_format_name: 'vLLM',
  },
  {
    name: 'llama-3.2-1b-instruct',
    url: 'https://llama.example.com/v1',
    ready: true,
    model_format_name: 'vLLM',
  },
  {
    name: 'mistral-7b-instruct',
    url: 'https://mistral.example.com/base/',
    ready: true,
    model_format_name: 'vLLM',
  },
  { name: 'missing-url', ready: true, model_format_name: 'vLLM' },
];

const providerFixtures: Provider[] = [
  {
    resource: { id: 'provider-a' },
    name: 'provider-a',
    title: 'Provider A',
    benchmarks: [
      {
        id: 'truthfulqa_mc1',
        name: 'TruthfulQA',
        category: 'trustworthiness',
        description: 'Measures factual accuracy.',
        metrics: ['accuracy'],
        primary_score: { metric: 'accuracy', lower_is_better: false },
        pass_criteria: { threshold: 0.8 },
      },
      {
        id: 'hellaswag',
        name: 'HellaSwag',
        category: 'knowledge_and_reasoning',
        description: 'Measures commonsense reasoning.',
        metrics: ['accuracy'],
        primary_score: { metric: 'accuracy', lower_is_better: false },
        pass_criteria: { threshold: 0.7 },
      },
    ],
  },
];

const completedGeneration: CollectionGenerationResource = {
  resource: {
    id: 'generation-1',
    tenant: 'test-project',
    owner: 'test-user',
    created_at: '2026-11-17T12:00:00Z',
    updated_at: '2026-11-17T12:00:00Z',
  },
  request: {
    evaluation_goal: 'Assess answer quality.',
    model: { name: 'granite-3b', url: 'https://granite.example.com' },
    max_benchmarks: 12,
    strictness: 'moderate',
    generation_effort: 'standard',
  },
  status: { state: 'completed' },
  result: {
    collection: {
      name: 'Answer quality recommendations',
      domains: ['trustworthiness'],
      benchmarks: [
        {
          id: 'truthfulqa_mc1',
          provider_id: 'provider-a',
          primary_score: { metric: 'accuracy', lower_is_better: false },
          pass_criteria: { threshold: 0.8 },
          parameters: {
            sample_count: 12,
            random_seed: 21,
            batch_size: 4,
            options: { modes: ['strict'] },
          },
        },
      ],
    },
    yaml: 'name: Answer quality recommendations',
    rationale: 'This benchmark directly evaluates factual accuracy.',
    explanation: {
      selected_benchmarks: [
        {
          provider_id: 'provider-a',
          id: 'truthfulqa_mc1',
          reason: 'It checks whether generated answers remain truthful.',
        },
      ],
      rejected_benchmarks: [
        {
          provider_id: 'provider-a',
          id: 'hellaswag',
          reason: 'It focuses on commonsense completion rather than answer factuality.',
        },
      ],
    },
    actions: [],
  },
};

const pendingGeneration: CollectionGenerationResource = {
  ...completedGeneration,
  status: { state: 'pending' },
  result: undefined,
};

const failedGeneration: CollectionGenerationResource = {
  ...pendingGeneration,
  status: {
    state: 'failed',
    error: {
      code: 'model_failed',
      message: 'The recommendation model failed.',
    },
  },
};

const LocationDisplay: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <>
      <div data-testid="location-pathname">{pathname}</div>
      <Link to="/evaluation/other-project/create-suite/from-goal">Switch project</Link>
    </>
  );
};

const createPageElement = () => (
  <MemoryRouter initialEntries={['/evaluation/test-project/create-suite/from-goal']}>
    <LocationDisplay />
    <Routes>
      <Route
        path="/evaluation/:namespace/create-suite/from-goal"
        element={<CreateCollectionFromGoalPage />}
      />
      <Route
        path="/evaluation/:namespace/create-suite"
        element={<div data-testid="suite-chooser-route" />}
      />
    </Routes>
  </MemoryRouter>
);

const renderPage = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <TrackingWrapper>{children}</TrackingWrapper>
    </QueryClientProvider>
  );
  const rendered = render(createPageElement(), { wrapper: Wrapper });
  await act(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });
  return rendered;
};

const selectRecommendationModel = async (name = 'granite-3b'): Promise<void> => {
  fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
  fireEvent.click(
    within(await screen.findByTestId(`recommendation-model-option-${name}`)).getByRole('option', {
      hidden: true,
    }),
  );
};

const completeGenerationToReview = async () => {
  const rendered = await renderPage();
  fireEvent.change(screen.getByTestId('goal-suite-name'), {
    target: { value: '  Answer quality suite  ' },
  });
  fireEvent.change(screen.getByTestId('goal-suite-description'), {
    target: { value: '  Collection description  ' },
  });
  await selectRecommendationModel();
  fireEvent.click(screen.getByTestId('next-suite-settings'));
  fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
    target: { value: 'Assess answer quality.' },
  });
  await waitFor(() => expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeEnabled());
  fireEvent.click(screen.getByTestId('recommend-benchmarks-with-ai'));
  await waitFor(() => expect(mockGetCollectionGeneration).toHaveBeenCalledTimes(1));
  expect(await screen.findByTestId('benchmark-overview-step')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByTestId('next-benchmark-overview')).toBeEnabled());
  fireEvent.click(screen.getByTestId('next-benchmark-overview'));
  expect(await screen.findByTestId('goal-suite-review-step')).toBeInTheDocument();
  return rendered;
};

const submitRecommendationRequest = async (): Promise<void> => {
  await renderPage();
  fireEvent.change(screen.getByTestId('goal-suite-name'), {
    target: { value: 'Answer quality suite' },
  });
  await selectRecommendationModel();
  fireEvent.click(screen.getByTestId('next-suite-settings'));
  fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
    target: { value: 'Assess answer quality.' },
  });
  await waitFor(() => expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeEnabled());
  fireEvent.click(screen.getByTestId('recommend-benchmarks-with-ai'));
};

const startPendingGeneration = async (): Promise<void> => {
  await submitRecommendationRequest();
  expect(await screen.findByText('Initializing recommendations')).toBeInTheDocument();
};

const startCompletedGeneration = async (
  generation: CollectionGenerationResource = completedGeneration,
) => {
  mockCreateCollectionGeneration.mockReturnValue(() => Promise.resolve(generation));
  mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(generation));
  const rendered = await renderPage();
  fireEvent.change(screen.getByTestId('goal-suite-name'), {
    target: { value: 'Answer quality suite' },
  });
  await selectRecommendationModel();
  fireEvent.click(screen.getByTestId('next-suite-settings'));
  fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
    target: { value: 'Assess answer quality.' },
  });
  await waitFor(() => expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeEnabled());
  fireEvent.click(screen.getByTestId('recommend-benchmarks-with-ai'));
  expect(await screen.findByTestId('benchmark-overview-step')).toBeInTheDocument();
  return rendered;
};

describe('CreateCollectionFromGoalPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInferenceServices.mockReturnValue({
      inferenceServices: inferenceServiceFixtures,
      loaded: true,
      loadError: undefined,
      warning: undefined,
    });
    mockUseProviders.mockReturnValue({
      providers: providerFixtures,
      loaded: true,
      loadError: undefined,
    });
    mockUseNotification.mockReturnValue(notification as ReturnType<typeof useNotification>);
    mockUseCollectionsContext.mockReturnValue({
      response: { items: [] },
      loaded: true,
      loadError: undefined,
      refresh: refreshCollections,
    });
    mockCreateCollectionGeneration.mockReturnValue(() => Promise.resolve(pendingGeneration));
    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(completedGeneration));
    mockDeleteCollectionGeneration.mockReturnValue(() => Promise.resolve());
  });

  it('should require the collection name and recommendation model before allowing the next step', async () => {
    await renderPage();

    expect(screen.getByRole('button', { name: /Define goal/ })).toBeDisabled();
    expect(screen.getByTestId('page-title')).toHaveTextContent('Create collection');
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Configure your collection, describe your goal, and choose benchmarks.',
    );
    expect(
      screen.getByText('Set the collection name, description, and number of benchmarks.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Collection settings', level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Collection details', level: 3 }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Collection name')).toBeInTheDocument();
    expect(screen.getByText('Create collection', { selector: 'li' })).toBeInTheDocument();
    expect(screen.getByLabelText('Collection creation steps')).toBeInTheDocument();
    const maxBenchmarksSlider = screen.getByRole('slider', { name: 'Max number of benchmarks' });
    expect(maxBenchmarksSlider).toHaveAttribute('aria-valuemin', '1');
    expect(maxBenchmarksSlider).toHaveAttribute('aria-valuemax', '20');
    expect(maxBenchmarksSlider).toHaveAttribute('aria-valuenow', '12');
    expect(screen.getByRole('spinbutton', { name: 'Max number of benchmarks' })).toHaveValue(12);
    expect(screen.getByRole('heading', { name: 'Generation settings' })).toBeInTheDocument();
    expect(screen.getByTestId('recommendation-model-toggle')).toHaveTextContent('Select a model');
    expect(screen.getByText('Recommendation model')).toBeInTheDocument();
    expect(
      screen.getByText('Set the maximum number of benchmarks AI should recommend, from 1 to 20.'),
    ).toBeInTheDocument();
    expect(maxBenchmarksSlider).toHaveAttribute(
      'aria-describedby',
      'suite-builder-max-benchmarks-helper',
    );
    expect(screen.getByTestId('goal-suite-strictness')).not.toBeVisible();
    expect(screen.getByTestId('goal-suite-generation-effort')).not.toBeVisible();
    expect(screen.queryByTestId('goal-suite-evaluates')).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /default/i })).not.toBeInTheDocument();
    expect(
      screen.queryByText('Leave blank to use the default of 12 (1–20).'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Leave blank to use the default of Moderate.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: '   ' },
    });
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();

    expect(await screen.findByTestId('suite-builder-name-error')).toHaveTextContent(
      'Enter a collection name.',
    );
    fireEvent.submit(screen.getByTestId('suite-settings-form'));
    expect(screen.queryByTestId('define-goal-step')).not.toBeInTheDocument();
  });

  it('should update the maximum benchmarks slider with the keyboard and preserve it on return', async () => {
    await renderPage();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Reasoning suite' },
    });
    await selectRecommendationModel();
    const maxBenchmarksSlider = screen.getByRole('slider', { name: 'Max number of benchmarks' });
    fireEvent.keyDown(maxBenchmarksSlider, { key: 'ArrowRight' });
    expect(maxBenchmarksSlider).toHaveAttribute('aria-valuenow', '13');
    expect(screen.getByRole('spinbutton', { name: 'Max number of benchmarks' })).toHaveValue(13);
    await waitFor(() => expect(screen.getByTestId('next-suite-settings')).toBeEnabled());
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    expect(await screen.findByTestId('define-goal-step')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Collection settings/ }));
    expect(screen.getByRole('slider', { name: 'Max number of benchmarks' })).toHaveAttribute(
      'aria-valuenow',
      '13',
    );
  });

  it('should require a recommendation model and preserve generation settings across steps', async () => {
    await renderPage();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Reasoning suite' },
    });
    fireEvent.change(screen.getByTestId('goal-suite-description'), {
      target: { value: 'Check general reasoning performance.' },
    });
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();

    await selectRecommendationModel();
    await waitFor(() => expect(screen.getByTestId('next-suite-settings')).toBeEnabled());
    expect(screen.getByTestId('recommendation-model-toggle')).toHaveTextContent('granite-3b');

    fireEvent.click(screen.getByRole('button', { name: 'Show advanced settings' }));
    expect(screen.getByRole('slider', { name: 'Recommendation strictness' })).toHaveAttribute(
      'aria-valuetext',
      'Balanced',
    );
    expect(screen.getByRole('slider', { name: 'Recommendation depth' })).toHaveAttribute(
      'aria-valuetext',
      'Balanced',
    );
    expect(screen.getByTestId('framework-filter-toggle')).toHaveTextContent('Select frameworks');
    expect(screen.getByTestId('framework-filter-helper')).toHaveTextContent(
      'Select frameworks to limit recommendations; leave empty to include them all.',
    );
    fireEvent.click(screen.getByTestId('framework-filter-toggle'));
    fireEvent.click(
      within(screen.getByTestId('framework-filter-option-provider-a')).getByRole('checkbox'),
    );
    expect(screen.getByTestId('framework-filter-toggle')).toHaveTextContent('Provider A');

    fireEvent.click(screen.getByTestId('next-suite-settings'));
    expect(await screen.findByTestId('define-goal-step')).toBeInTheDocument();
    expect(screen.getByTestId('goal-suite-evaluation-goal')).toHaveValue('');
    expect(screen.getByTestId('goal-suite-evaluation-goal')).toHaveAttribute('maxlength', '10000');
    expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeDisabled();

    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: '   ' },
    });
    expect(await screen.findByTestId('suite-builder-evaluation-goal-error')).toHaveTextContent(
      'Enter an evaluation goal.',
    );
    const exampleGoal = 'Assess a model’s accuracy and truthfulness across common questions.';
    fireEvent.click(screen.getByTestId('define-goal-example-answer-quality'));
    expect(screen.getByTestId('goal-suite-evaluation-goal')).toHaveValue(exampleGoal);
    expect(screen.getByTestId('define-goal-example-answer-quality')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: /Collection settings/ }));
    expect(screen.getByTestId('goal-suite-name')).toHaveValue('Reasoning suite');
    expect(screen.getByTestId('goal-suite-description')).toHaveValue(
      'Check general reasoning performance.',
    );
    expect(screen.getByTestId('recommendation-model-toggle')).toHaveTextContent('granite-3b');
    expect(screen.getByTestId('framework-filter-toggle')).toHaveTextContent('Provider A');
    fireEvent.click(screen.getByRole('button', { name: /Define goal/ }));
    expect(screen.getByTestId('goal-suite-evaluation-goal')).toHaveValue(exampleGoal);
  });

  it('should block a project model whose endpoint changed after selection', async () => {
    const { rerender } = await renderPage();
    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Stale model suite' },
    });
    await selectRecommendationModel();

    mockUseInferenceServices.mockReturnValue({
      inferenceServices: inferenceServiceFixtures.map((service) =>
        service.name === 'granite-3b'
          ? { ...service, url: 'https://updated-granite.example.com' }
          : service,
      ),
      loaded: true,
      loadError: undefined,
      warning: undefined,
    });
    rerender(createPageElement());

    expect(await screen.findByTestId('selected-recommendation-model-stale')).toHaveTextContent(
      'no longer available or its endpoint has changed',
    );
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();
  });

  it('should keep completed recommendations saveable when model discovery goes offline', async () => {
    const { rerender } = await startCompletedGeneration();

    mockUseInferenceServices.mockReturnValue({
      inferenceServices: [],
      loaded: true,
      loadError: new Error('offline'),
      warning: undefined,
    });
    rerender(createPageElement());

    expect(screen.getByTestId('next-benchmark-overview')).toBeEnabled();
    fireEvent.click(screen.getByTestId('next-benchmark-overview'));
    expect(await screen.findByTestId('goal-suite-review-step')).toBeInTheDocument();
    expect(screen.getByTestId('goal-suite-save')).toBeEnabled();
    expect(screen.getByTestId('goal-suite-save-and-run')).toBeEnabled();
  });

  it('should keep a selected framework ID visible if provider discovery later fails', async () => {
    const { rerender } = await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Show advanced settings' }));
    fireEvent.click(screen.getByTestId('framework-filter-toggle'));
    fireEvent.click(
      within(screen.getByTestId('framework-filter-option-provider-a')).getByRole('checkbox'),
    );

    mockUseProviders.mockReturnValue({
      providers: [],
      loaded: true,
      loadError: new Error('offline'),
    });
    rerender(createPageElement());

    expect(screen.getByTestId('framework-filter-toggle')).toHaveTextContent('provider-a');
    const showAdvancedSettings = screen.queryByRole('button', { name: 'Show advanced settings' });
    if (showAdvancedSettings) {
      fireEvent.click(showAdvancedSettings);
    }
    expect(screen.getByTestId('framework-filter-helper')).toHaveTextContent(
      'Selected framework IDs will still be used.',
    );
  });

  it('should mark recommendations stale when the selected frameworks change', async () => {
    mockCreateCollectionGeneration.mockReturnValue(() => Promise.resolve(completedGeneration));
    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(completedGeneration));
    await renderPage();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Filtered suite' },
    });
    await selectRecommendationModel();
    fireEvent.click(screen.getByRole('button', { name: 'Show advanced settings' }));
    fireEvent.click(screen.getByTestId('framework-filter-toggle'));
    fireEvent.click(
      within(screen.getByTestId('framework-filter-option-provider-a')).getByRole('checkbox'),
    );
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: 'Assess answer quality.' },
    });
    fireEvent.click(screen.getByTestId('recommend-benchmarks-with-ai'));

    expect(await screen.findByTestId('benchmark-overview-step')).toBeInTheDocument();
    expect(mockCreateCollectionGeneration).toHaveBeenCalledWith(
      '',
      'test-project',
      expect.objectContaining({ provider_filter: 'provider-a' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Collection settings/ }));
    const showAdvancedSettings = screen.queryByRole('button', { name: 'Show advanced settings' });
    if (showAdvancedSettings) {
      fireEvent.click(showAdvancedSettings);
    }
    fireEvent.click(screen.getByTestId('framework-filter-toggle'));
    fireEvent.click(
      within(screen.getByTestId('framework-filter-option-provider-a')).getByRole('checkbox'),
    );
    fireEvent.click(screen.getByRole('button', { name: /Benchmark overview/ }));

    expect(await screen.findByTestId('collection-generation-stale-warning')).toBeInTheDocument();
  });

  it.each([
    ['collection name', 'goal-suite-name', 'Updated collection name'],
    ['collection description', 'goal-suite-description', 'Updated collection description'],
  ])('should not mark recommendations stale when the %s changes', async (_, fieldId, value) => {
    await startCompletedGeneration();
    fireEvent.click(screen.getByRole('button', { name: 'Collection settings' }));
    expect(await screen.findByTestId('suite-settings-step')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId(fieldId), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Benchmark overview' }));

    expect(await screen.findByTestId('benchmark-overview-step')).toBeInTheDocument();
    expect(screen.queryByTestId('collection-generation-stale-warning')).not.toBeInTheDocument();
  });

  it('should allow a validated external recommendation model when project model discovery fails', async () => {
    mockUseInferenceServices.mockReturnValue({
      inferenceServices: [],
      loaded: true,
      loadError: new Error('offline'),
      warning: undefined,
    });
    await renderPage();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'External model suite' },
    });
    fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
    fireEvent.click(
      within(screen.getByTestId('recommendation-model-option-external')).getByRole('option', {
        hidden: true,
      }),
    );
    expect(screen.getByText(/Could not load project models/)).toBeInTheDocument();
    expect(screen.getByTestId('validate-connection-button')).toBeDisabled();

    fireEvent.change(screen.getByTestId('model-name-input'), {
      target: { value: 'external-chat-model' },
    });
    fireEvent.change(screen.getByTestId('endpoint-url-input'), {
      target: { value: 'https://api.example.com/v1' },
    });
    fireEvent.change(screen.getByTestId('api-key-input'), {
      target: { value: 'evalhub-api-secret' },
    });
    expect(screen.getByTestId('validate-connection-button')).toBeEnabled();
    fireEvent.blur(screen.getByTestId('endpoint-url-input'));
    expect(mockVerifyConnection).not.toHaveBeenCalled();
    mockVerifyConnection.mockReturnValue(() =>
      Promise.resolve({ success: true, message: 'Request completed.' }),
    );
    fireEvent.click(screen.getByTestId('validate-connection-button'));
    await waitFor(() =>
      expect(mockVerifyConnection).toHaveBeenCalledWith(
        '',
        'test-project',
        expect.objectContaining({
          source_type: 'model',
          base_url: 'https://api.example.com/v1',
          model_id: 'external-chat-model',
          secret_name: 'evalhub-api-secret',
        }),
      ),
    );
    expect(await screen.findByText('Connection established successfully.')).toBeInTheDocument();
    expect(screen.getByTestId('external-endpoint-compatibility-alert')).toHaveTextContent(
      'This model must expose an OpenAI-compatible chat/completions endpoint.',
    );
    await waitFor(() => expect(screen.getByTestId('next-suite-settings')).toBeEnabled());
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    expect(await screen.findByTestId('define-goal-step')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Collection settings/ }));
    expect(screen.getByTestId('recommendation-model-toggle')).toHaveTextContent(
      'Other (External endpoint)',
    );
    expect(screen.getByTestId('model-name-input')).toHaveValue('external-chat-model');
    expect(screen.getByTestId('endpoint-url-input')).toHaveValue('https://api.example.com/v1');
    expect(screen.getByTestId('api-key-input')).toHaveValue('evalhub-api-secret');
  });

  it('should trim external model fields and omit collection metadata from generation', async () => {
    await renderPage();
    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: '  External model suite  ' },
    });
    fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
    fireEvent.click(
      within(screen.getByTestId('recommendation-model-option-external')).getByRole('option', {
        hidden: true,
      }),
    );
    fireEvent.change(screen.getByTestId('model-name-input'), {
      target: { value: '  external-chat-model  ' },
    });
    fireEvent.change(screen.getByTestId('endpoint-url-input'), {
      target: { value: '  https://api.example.com/v1  ' },
    });
    fireEvent.change(screen.getByTestId('api-key-input'), {
      target: { value: '  external-secret  ' },
    });
    await waitFor(() => expect(screen.getByTestId('next-suite-settings')).toBeEnabled());
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: 'Assess answer quality.' },
    });
    await waitFor(() => expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeEnabled());
    fireEvent.click(screen.getByTestId('recommend-benchmarks-with-ai'));

    await waitFor(() => expect(mockCreateCollectionGeneration).toHaveBeenCalledTimes(1));
    expect(mockCreateCollectionGeneration).toHaveBeenCalledWith('', 'test-project', {
      evaluation_goal: 'Assess answer quality.',
      model: {
        name: 'external-chat-model',
        url: 'https://api.example.com/v1',
        auth: { secret_ref: 'external-secret' },
      },
      max_benchmarks: 12,
      strictness: 'moderate',
      generation_effort: 'standard',
    });
    expect(mockDeleteCollectionGeneration).not.toHaveBeenCalled();
  });

  it('should submit non-default strictness and generation effort values', async () => {
    await renderPage();
    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Answer quality suite' },
    });
    await selectRecommendationModel();
    fireEvent.click(screen.getByRole('button', { name: 'Show advanced settings' }));

    const strictnessSlider = screen.getByRole('slider', { name: 'Recommendation strictness' });
    const generationEffortSlider = screen.getByRole('slider', { name: 'Recommendation depth' });
    fireEvent.keyDown(strictnessSlider, { key: 'ArrowLeft' });
    fireEvent.keyDown(generationEffortSlider, { key: 'ArrowRight' });
    expect(strictnessSlider).toHaveAttribute('aria-valuenow', '0');
    expect(generationEffortSlider).toHaveAttribute('aria-valuenow', '100');

    fireEvent.click(screen.getByTestId('next-suite-settings'));
    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: 'Assess answer quality.' },
    });
    await waitFor(() => expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeEnabled());
    fireEvent.click(screen.getByTestId('recommend-benchmarks-with-ai'));

    await waitFor(() => expect(mockCreateCollectionGeneration).toHaveBeenCalledTimes(1));
    expect(mockCreateCollectionGeneration).toHaveBeenCalledWith('', 'test-project', {
      evaluation_goal: 'Assess answer quality.',
      model: { name: 'granite-3b', url: 'https://granite.example.com' },
      max_benchmarks: 12,
      strictness: 'lenient',
      generation_effort: 'high',
    });
  });

  it('should generate, poll, edit, and preserve the benchmark recommendation before Review', async () => {
    await renderPage();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Answer quality suite' },
    });
    fireEvent.change(screen.getByTestId('goal-suite-description'), {
      target: { value: '  Collection description for the final collection.  ' },
    });
    await selectRecommendationModel();
    fireEvent.click(screen.getByRole('button', { name: 'Show advanced settings' }));
    fireEvent.click(screen.getByTestId('framework-filter-toggle'));
    fireEvent.click(
      within(screen.getByTestId('framework-filter-option-provider-a')).getByRole('checkbox'),
    );
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: 'Assess answer quality.' },
    });

    await waitFor(() => expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeEnabled());
    fireEvent.click(screen.getByTestId('recommend-benchmarks-with-ai'));
    await waitFor(() => expect(mockCreateCollectionGeneration).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockGetCollectionGeneration).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('benchmark-overview-step')).toBeInTheDocument();
    expect(await screen.findByTestId('collection-generation-selected-list')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('benchmark-overview-step')).getByRole('heading', {
        name: 'Benchmark overview',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('AI recommendation review complete')).toBeInTheDocument();
    expect(
      screen.getByText('This benchmark directly evaluates factual accuracy.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('collection-generation-selection-count')).toHaveTextContent(
      'Selected benchmarks · 1 of 20',
    );
    expect(mockCreateCollectionGeneration).toHaveBeenCalledWith('', 'test-project', {
      evaluation_goal: 'Assess answer quality.',
      model: { name: 'granite-3b', url: 'https://granite.example.com' },
      max_benchmarks: 12,
      strictness: 'moderate',
      generation_effort: 'standard',
      provider_filter: 'provider-a',
    });
    expect(mockGetCollectionGeneration).toHaveBeenCalledWith('', 'test-project', 'generation-1');
    expect(mockDeleteCollectionGeneration).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled();

    fireEvent.click(screen.getByTestId('collection-generation-why-truthfulqa_mc1'));
    expect(
      await screen.findByText('It checks whether generated answers remain truthful.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('collection-generation-review-alternatives'));
    expect(screen.getByText('Other benchmarks to review')).toBeInTheDocument();
    expect(screen.getByText('Why it’s an alternative')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('collection-generation-add-hellaswag'));
    expect(screen.getByTestId('collection-generation-selection-count')).toHaveTextContent(
      'Selected benchmarks · 2 of 20',
    );
    expect(screen.getByTestId('collection-generation-recommended-count')).toHaveTextContent(
      '1 recommended',
    );
    fireEvent.click(screen.getByTestId('collection-generation-close-alternatives'));
    fireEvent.click(screen.getByTestId('collection-generation-remove-truthfulqa_mc1'));
    expect(screen.getByTestId('collection-generation-selection-count')).toHaveTextContent(
      'Selected benchmarks · 1 of 20',
    );
    fireEvent.click(screen.getByTestId('collection-generation-review-alternatives'));
    expect(screen.getByText('Why this benchmark was recommended')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('suite-builder-back'));
    expect(screen.getByTestId('define-goal-step')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Benchmark overview/ }));
    expect(screen.getByTestId('collection-generation-selected-list')).toBeInTheDocument();
    expect(screen.getByTestId('collection-generation-selection-count')).toHaveTextContent(
      'Selected benchmarks · 1 of 20',
    );
    expect(screen.getByTestId('next-benchmark-overview')).toBeEnabled();
    fireEvent.click(screen.getByTestId('next-benchmark-overview'));
    expect(screen.getByTestId('goal-suite-review-step')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Review' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Check the collection details and benchmark settings before saving or running the collection.',
        { exact: true },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Collection details')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Generation settings' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Review collection' })).not.toBeInTheDocument();
    expect(screen.getByTestId('goal-suite-review-name')).toHaveTextContent('Answer quality suite');
    expect(screen.getByTestId('goal-suite-review-evaluates')).toHaveTextContent('Model');
    expect(screen.getByTestId('goal-suite-review-category')).toHaveTextContent('Trustworthiness');
    expect(screen.getByTestId('goal-suite-review-model')).toHaveTextContent('granite-3b');
    expect(screen.getByTestId('goal-suite-review-frameworks')).toHaveTextContent('Provider A');
    expect(screen.getByRole('heading', { level: 3, name: 'Benchmarks' })).toBeInTheDocument();
    expect(screen.queryByText('Evaluation goal')).not.toBeInTheDocument();
    expect(screen.queryByText('Maximum benchmarks')).not.toBeInTheDocument();
    expect(screen.getByTestId('goal-suite-review-benchmarks')).toHaveTextContent('HellaSwag');
    expect(screen.getByTestId('goal-suite-save')).toBeEnabled();
    expect(mockDeleteCollectionGeneration).not.toHaveBeenCalled();
  });

  it('should remove a provider-less benchmark from its details drawer', async () => {
    const providerlessGeneration: CollectionGenerationResource = {
      ...completedGeneration,
      result: {
        ...completedGeneration.result,
        collection: {
          ...completedGeneration.result.collection,
          benchmarks: [{ id: 'truthfulqa_mc1' }],
        },
      },
    };
    await startCompletedGeneration(providerlessGeneration);

    fireEvent.click(screen.getByTestId('collection-generation-benchmark-name-truthfulqa_mc1'));
    expect(await screen.findByTestId('benchmark-drawer-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('select-benchmark-button'));

    expect(screen.getByTestId('collection-generation-selection-count')).toHaveTextContent(
      'Selected benchmarks · 0 of 20',
    );
  });

  it('should delete the generation when navigating from Benchmark overview to Define goal', async () => {
    await startCompletedGeneration();

    expect(mockDeleteCollectionGeneration).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('suite-builder-back'));

    expect(await screen.findByTestId('define-goal-step')).toBeInTheDocument();
    await waitFor(() =>
      expect(mockDeleteCollectionGeneration).toHaveBeenCalledWith(
        '',
        'test-project',
        'generation-1',
      ),
    );
  });

  it('should show the stopped state when returning after cancelling an active generation', async () => {
    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(pendingGeneration));
    await renderPage();
    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Answer quality suite' },
    });
    await selectRecommendationModel();
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: 'Assess answer quality.' },
    });
    fireEvent.click(screen.getByTestId('recommend-benchmarks-with-ai'));
    expect(await screen.findByText('Initializing recommendations')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('suite-builder-back'));
    await waitFor(() => expect(mockDeleteCollectionGeneration).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Benchmark overview' }));
    expect(await screen.findByTestId('collection-generation-cancelled')).toBeInTheDocument();
  });

  it('should delete a generation whose POST finishes after the page unmounts', async () => {
    let resolveGeneration: ((resource: CollectionGenerationResource) => void) | undefined;
    mockCreateCollectionGeneration.mockReturnValue(
      () =>
        new Promise<CollectionGenerationResource>((resolve) => {
          resolveGeneration = resolve;
        }),
    );
    const rendered = await renderPage();
    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Answer quality suite' },
    });
    await selectRecommendationModel();
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: 'Assess answer quality.' },
    });
    fireEvent.click(screen.getByTestId('recommend-benchmarks-with-ai'));
    await waitFor(() => expect(resolveGeneration).toBeDefined());

    rendered.unmount();
    await act(async () => {
      resolveGeneration?.(pendingGeneration);
    });
    await waitFor(() =>
      expect(mockDeleteCollectionGeneration).toHaveBeenCalledWith(
        '',
        'test-project',
        'generation-1',
      ),
    );
  });

  it('should delete a pending generation in its original project after switching projects', async () => {
    let resolveGeneration: ((resource: CollectionGenerationResource) => void) | undefined;
    mockCreateCollectionGeneration.mockReturnValue(
      () =>
        new Promise<CollectionGenerationResource>((resolve) => {
          resolveGeneration = resolve;
        }),
    );
    await submitRecommendationRequest();
    await waitFor(() => expect(resolveGeneration).toBeDefined());

    fireEvent.click(screen.getByRole('link', { name: 'Switch project' }));
    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/other-project/create-suite/from-goal',
    );
    expect(screen.getByTestId('goal-suite-name')).toHaveValue('');

    await act(async () => {
      resolveGeneration?.(pendingGeneration);
    });
    await waitFor(() =>
      expect(mockDeleteCollectionGeneration).toHaveBeenCalledWith(
        '',
        'test-project',
        'generation-1',
      ),
    );
    expect(mockGetCollectionGeneration).not.toHaveBeenCalled();
  });

  it('should close alternatives when the area outside the panel is clicked', async () => {
    await startCompletedGeneration();
    fireEvent.click(screen.getByTestId('collection-generation-review-alternatives'));
    expect(screen.getByText('Other benchmarks to review')).toBeInTheDocument();
    const drawerHost = document.querySelector('.evalhub-collection-generation-drawer__host');
    expect(drawerHost).not.toBeNull();
    fireEvent.click(drawerHost as Element);
    expect(screen.getByTestId('collection-generation-alternatives-backdrop')).not.toHaveClass(
      'evalhub-collection-generation-drawer__backdrop--open',
    );
  });

  it('should delete the generation when navigating from Benchmark overview to Collection settings', async () => {
    await startCompletedGeneration();

    fireEvent.click(screen.getByRole('button', { name: 'Collection settings' }));

    expect(await screen.findByTestId('suite-settings-step')).toBeInTheDocument();
    await waitFor(() =>
      expect(mockDeleteCollectionGeneration).toHaveBeenCalledWith(
        '',
        'test-project',
        'generation-1',
      ),
    );
  });

  it('should keep the generation when navigating from Benchmark overview to Review', async () => {
    await startCompletedGeneration();

    fireEvent.click(screen.getByTestId('next-benchmark-overview'));

    expect(await screen.findByTestId('goal-suite-review-step')).toBeInTheDocument();
    expect(mockDeleteCollectionGeneration).not.toHaveBeenCalled();
  });

  it('should keep the generation when the page rerenders from Benchmark overview', async () => {
    const rendered = await startCompletedGeneration();

    rendered.rerender(createPageElement());

    expect(screen.getByTestId('benchmark-overview-step')).toBeInTheDocument();
    expect(mockDeleteCollectionGeneration).not.toHaveBeenCalled();
  });

  it('should delete the generation when the page unmounts from Benchmark overview', async () => {
    const rendered = await startCompletedGeneration();

    rendered.unmount();

    await waitFor(() =>
      expect(mockDeleteCollectionGeneration).toHaveBeenCalledWith(
        '',
        'test-project',
        'generation-1',
      ),
    );
  });

  it('should delete the generation when the page unmounts from Review', async () => {
    const rendered = await completeGenerationToReview();

    expect(mockDeleteCollectionGeneration).not.toHaveBeenCalled();
    rendered.unmount();

    await waitFor(() =>
      expect(mockDeleteCollectionGeneration).toHaveBeenCalledWith(
        '',
        'test-project',
        'generation-1',
      ),
    );
  });

  it('should disable AI wizard sidebar navigation while saving', async () => {
    let resolveCollectionSave: ((collection: Collection) => void) | undefined;
    mockCreateCollection.mockReturnValue(
      () =>
        new Promise<Collection>((resolve) => {
          resolveCollectionSave = resolve;
        }),
    );
    await completeGenerationToReview();

    fireEvent.click(screen.getByTestId('goal-suite-save'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Benchmark overview' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Define goal' })).toBeDisabled();
    });
    expect(mockDeleteCollectionGeneration).not.toHaveBeenCalled();
    await waitFor(() => expect(resolveCollectionSave).toBeDefined());

    await act(async () => {
      resolveCollectionSave?.({
        resource: { id: 'created-collection' },
        name: 'Answer quality suite',
      });
    });
    await waitFor(() => expect(mockDeleteCollectionGeneration).toHaveBeenCalledTimes(1));
  });

  it('should save the reviewed collection and navigate to collections', async () => {
    mockCreateCollection.mockReturnValue(() =>
      Promise.resolve({
        resource: { id: 'created-collection' },
        name: 'Updated answer quality suite',
        benchmarks: [],
      }),
    );
    await completeGenerationToReview();
    expect(screen.getByTestId('goal-suite-review-name')).toHaveTextContent('Answer quality suite');
    expect(screen.getByTestId('goal-suite-review-description')).toHaveTextContent(
      'Collection description',
    );
    expect(screen.getByTestId('goal-suite-review-model')).toHaveTextContent('granite-3b');
    expect(screen.getByTestId('goal-suite-review-strictness')).toHaveTextContent('Balanced');
    expect(screen.getByTestId('goal-suite-review-effort')).toHaveTextContent('Balanced');
    expect(screen.getByTestId('goal-suite-review-frameworks')).toHaveTextContent('All frameworks');
    const benchmarkReview = screen.getByTestId('goal-suite-review-benchmarks');
    expect(benchmarkReview).toHaveTextContent('truthfulqa_mc1 · Provider A');
    expect(benchmarkReview).toHaveTextContent('Accuracy');
    expect(benchmarkReview).toHaveTextContent('80%');
    expect(benchmarkReview).not.toHaveTextContent(/Samples|Random seed|Batch size/);

    fireEvent.click(screen.getByRole('button', { name: 'Collection settings' }));
    expect(await screen.findByTestId('suite-settings-step')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: '  Updated answer quality suite  ' },
    });
    fireEvent.change(screen.getByTestId('goal-suite-description'), {
      target: { value: '  Updated collection description  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Benchmark overview' }));
    expect(await screen.findByTestId('benchmark-overview-step')).toBeInTheDocument();
    expect(screen.queryByTestId('collection-generation-stale-warning')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('next-benchmark-overview'));
    expect(await screen.findByTestId('goal-suite-review-step')).toBeInTheDocument();
    expect(mockCreateCollectionGeneration).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('goal-suite-save'));

    await waitFor(() => expect(mockCreateCollection).toHaveBeenCalledTimes(1));
    expect(mockCreateCollection).toHaveBeenCalledWith(
      '',
      'test-project',
      expect.objectContaining({
        name: 'Updated answer quality suite',
        description: 'Updated collection description',
        domains: ['trustworthiness'],
        evaluation_targets: ['model'],
        benchmarks: [
          expect.objectContaining({
            id: 'truthfulqa_mc1',
            provider_id: 'provider-a',
            parameters: {
              sample_count: 12,
              random_seed: 21,
              batch_size: 4,
              options: { modes: ['strict'] },
            },
          }),
        ],
      }),
    );
    expect(notification.success).toHaveBeenCalledWith(
      'Collection created',
      '"Updated answer quality suite" has been added to your collections.',
    );
    expect(refreshCollections).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/test-project/collections',
    );
  });

  it('should display and save catalog settings when the proposal omits them', async () => {
    const { result } = completedGeneration;
    const idProviderOnlyGeneration: CollectionGenerationResource = {
      ...completedGeneration,
      result: {
        ...result,
        collection: {
          ...result.collection,
          benchmarks: [{ id: 'truthfulqa_mc1', provider_id: 'provider-a' }],
        },
      },
    };
    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(idProviderOnlyGeneration));
    mockCreateCollection.mockReturnValue(() =>
      Promise.resolve({ resource: { id: 'created-collection' }, name: 'Answer quality suite' }),
    );

    await completeGenerationToReview();

    const benchmarkReview = screen.getByTestId('goal-suite-review-benchmarks');
    expect(benchmarkReview).toHaveTextContent('TruthfulQA');
    expect(benchmarkReview).toHaveTextContent('truthfulqa_mc1 · Provider A');
    expect(benchmarkReview).toHaveTextContent('Accuracy');
    expect(benchmarkReview).toHaveTextContent('80%');
    fireEvent.click(screen.getByTestId('goal-suite-save'));
    await waitFor(() => expect(mockCreateCollection).toHaveBeenCalledTimes(1));
    expect(mockCreateCollection).toHaveBeenCalledWith(
      '',
      'test-project',
      expect.objectContaining({
        benchmarks: [
          expect.objectContaining({
            id: 'truthfulqa_mc1',
            primary_score: { metric: 'accuracy', lower_is_better: false },
            pass_criteria: { threshold: 0.8 },
          }),
        ],
      }),
    );
  });

  it('should show an error when saving the reviewed collection fails', async () => {
    mockCreateCollection.mockReturnValue(() => Promise.reject(new Error('Save failed')));
    await completeGenerationToReview();

    fireEvent.click(screen.getByTestId('goal-suite-save'));

    await waitFor(() =>
      expect(notification.error).toHaveBeenCalledWith('Failed to create collection', 'Save failed'),
    );
    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/test-project/create-suite/from-goal',
    );
  });

  it('should open the collection run modal from Review', async () => {
    await completeGenerationToReview();

    fireEvent.click(screen.getByTestId('goal-suite-save-and-run'));

    expect(await screen.findByTestId('goal-suite-run-evaluation-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Start evaluation run' })).toBeInTheDocument();
    expect(await screen.findByTestId('evaluation-name-input')).toHaveValue('Answer quality suite');
    fireEvent.click(screen.getByTestId('start-evaluation-cancel'));

    await waitFor(() =>
      expect(screen.queryByTestId('goal-suite-run-evaluation-modal')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('goal-suite-review-step')).toBeInTheDocument();
    expect(mockCreateCollection).not.toHaveBeenCalled();
  });

  it('should reuse the created collection when a failed run is retried', async () => {
    mockCreateCollection.mockReturnValue(() =>
      Promise.resolve({ resource: { id: 'created-collection' }, name: 'Answer quality suite' }),
    );
    mockCreateEvaluationJob.mockReturnValue(() => Promise.reject(new Error('Run failed')));
    await completeGenerationToReview();

    fireEvent.click(screen.getByTestId('goal-suite-save-and-run'));
    fireEvent.click(await screen.findByTestId('model-picker-toggle'));
    fireEvent.click(
      within(screen.getByTestId('model-option-granite-3b')).getByRole('option', { hidden: true }),
    );
    fireEvent.click(screen.getByTestId('start-evaluation-run-advanced-toggle'));
    fireEvent.click(screen.getByTestId('experiment-mode-new'));
    await waitFor(() => expect(screen.getByTestId('start-evaluation-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('start-evaluation-submit'));
    await waitFor(() => expect(mockCreateEvaluationJob).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('start-evaluation-submit')).toBeEnabled());

    fireEvent.click(screen.getByTestId('start-evaluation-submit'));
    await waitFor(() => expect(mockCreateEvaluationJob).toHaveBeenCalledTimes(2));
    expect(mockCreateCollection).toHaveBeenCalledTimes(1);
  });

  it('should delete an active generation before cancelling to the suite chooser', async () => {
    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(pendingGeneration));
    await renderPage();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Answer quality suite' },
    });
    await selectRecommendationModel();
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: 'Assess answer quality.' },
    });
    await waitFor(() => expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeEnabled());
    fireEvent.click(screen.getByTestId('recommend-benchmarks-with-ai'));

    expect(await screen.findByTestId('benchmark-overview-step')).toBeInTheDocument();
    expect(screen.getByText('Initializing recommendations')).toBeInTheDocument();
    expect(screen.getByTestId('next-benchmark-overview')).toBeDisabled();
    await waitFor(() => expect(screen.getByTestId('suite-builder-cancel')).toBeEnabled());
    fireEvent.click(screen.getByTestId('suite-builder-cancel'));

    await waitFor(() =>
      expect(screen.getByTestId('location-pathname')).toHaveTextContent(
        /^\/evaluation\/test-project\/create-suite$/,
      ),
    );
    expect(mockDeleteCollectionGeneration).toHaveBeenCalledWith('', 'test-project', 'generation-1');
    expect(await screen.findByTestId('suite-chooser-route')).toBeInTheDocument();
  });

  it('should allow cancelling an active generation when status polling fails', async () => {
    mockGetCollectionGeneration.mockReturnValue(() =>
      Promise.reject(new Error('The status request failed.')),
    );

    await startPendingGeneration();
    await waitFor(() =>
      expect(screen.getByTestId('collection-generation-poll-error')).toBeInTheDocument(),
    );

    expect(screen.queryByRole('button', { name: 'Stop generating' })).not.toBeInTheDocument();
    expect(screen.getByTestId('collection-generation-retry-poll')).toBeEnabled();
    expect(screen.getByTestId('next-benchmark-overview')).toBeDisabled();
    fireEvent.click(screen.getByTestId('suite-builder-cancel'));

    await waitFor(() =>
      expect(screen.getByTestId('location-pathname')).toHaveTextContent(
        /^\/evaluation\/test-project\/create-suite$/,
      ),
    );
    expect(mockDeleteCollectionGeneration).toHaveBeenCalledWith('', 'test-project', 'generation-1');
  });

  it('should clean up a failed generation and allow recommendations to be retried', async () => {
    mockCreateCollectionGeneration
      .mockReturnValueOnce(() => Promise.resolve(failedGeneration))
      .mockReturnValueOnce(() => Promise.resolve(pendingGeneration));
    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(failedGeneration));

    await submitRecommendationRequest();

    expect(await screen.findByTestId('collection-generation-error')).toHaveTextContent(
      'The recommendation model failed.',
    );
    await waitFor(() => expect(mockDeleteCollectionGeneration).toHaveBeenCalledTimes(1));
    expect(mockDeleteCollectionGeneration).toHaveBeenCalledWith('', 'test-project', 'generation-1');
    expect(screen.getByTestId('collection-generation-error')).toHaveTextContent(
      'The recommendation model failed.',
    );
    expect(screen.getByTestId('collection-generation-retry')).toBeEnabled();

    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(pendingGeneration));
    fireEvent.click(screen.getByTestId('collection-generation-retry'));

    expect(await screen.findByText('Initializing recommendations')).toBeInTheDocument();
    expect(mockCreateCollectionGeneration).toHaveBeenCalledTimes(2);
    expect(mockDeleteCollectionGeneration).toHaveBeenCalledTimes(1);
  });

  it('should allow retrying failed generation cleanup before requesting recommendations again', async () => {
    mockCreateCollectionGeneration
      .mockReturnValueOnce(() => Promise.resolve(failedGeneration))
      .mockReturnValueOnce(() => Promise.resolve(pendingGeneration));
    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(failedGeneration));
    mockDeleteCollectionGeneration
      .mockReturnValueOnce(() =>
        Promise.reject(new Error('The failed generation could not be deleted.')),
      )
      .mockReturnValueOnce(() => Promise.resolve());

    await submitRecommendationRequest();

    expect(await screen.findByTestId('collection-generation-error')).toHaveTextContent(
      'The recommendation model failed.',
    );
    await waitFor(() => expect(mockDeleteCollectionGeneration).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('collection-generation-error')).toHaveTextContent(
      'The recommendation model failed.',
    );
    expect(screen.getByTestId('collection-generation-retry')).toBeEnabled();

    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(pendingGeneration));
    fireEvent.click(screen.getByTestId('collection-generation-retry'));

    expect(await screen.findByText('Initializing recommendations')).toBeInTheDocument();
    expect(mockDeleteCollectionGeneration).toHaveBeenCalledTimes(2);
    expect(mockCreateCollectionGeneration).toHaveBeenCalledTimes(2);
  });

  it('should surface a cancellation error and allow Cancel to retry', async () => {
    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(pendingGeneration));
    mockDeleteCollectionGeneration
      .mockReturnValueOnce(() =>
        Promise.reject(new Error('The generation could not be cancelled.')),
      )
      .mockReturnValueOnce(() => Promise.resolve());
    await renderPage();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Answer quality suite' },
    });
    await selectRecommendationModel();
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: 'Assess answer quality.' },
    });
    await waitFor(() => expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeEnabled());
    fireEvent.click(screen.getByTestId('recommend-benchmarks-with-ai'));

    expect(await screen.findByText('Initializing recommendations')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('suite-builder-cancel')).toBeEnabled());
    fireEvent.click(screen.getByTestId('suite-builder-cancel'));

    expect(await screen.findByTestId('collection-generation-cancel-error')).toHaveTextContent(
      'The generation could not be cancelled.',
    );
    expect(screen.getByTestId('suite-builder-cancel')).toBeEnabled();
    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/test-project/create-suite/from-goal',
    );
    expect(screen.getByTestId('next-benchmark-overview')).toBeDisabled();

    fireEvent.click(screen.getByTestId('suite-builder-cancel'));
    await waitFor(() =>
      expect(screen.getByTestId('location-pathname')).toHaveTextContent(
        /^\/evaluation\/test-project\/create-suite$/,
      ),
    );
    expect(mockDeleteCollectionGeneration).toHaveBeenCalledTimes(2);
  });
});
