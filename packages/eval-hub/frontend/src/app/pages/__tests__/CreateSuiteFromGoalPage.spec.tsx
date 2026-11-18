/* eslint-disable camelcase */
import * as React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import { useInferenceServices } from '~/app/hooks/useInferenceServices';
import { useProviders } from '~/app/hooks/useProviders';
import CreateSuiteFromGoalPage from '~/app/pages/CreateSuiteFromGoalPage';
import {
  createCollectionGeneration,
  deleteCollectionGeneration,
  getCollectionGeneration,
  verifyConnection,
} from '~/app/api/k8s';
import type { CollectionGenerationResource, InferenceServiceItem, Provider } from '~/app/types';

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

jest.mock('~/app/api/k8s', () => ({
  ...jest.requireActual('~/app/api/k8s'),
  createCollectionGeneration: jest.fn(),
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
const mockCreateCollectionGeneration = jest.mocked(createCollectionGeneration);
const mockDeleteCollectionGeneration = jest.mocked(deleteCollectionGeneration);
const mockGetCollectionGeneration = jest.mocked(getCollectionGeneration);
const mockVerifyConnection = jest.mocked(verifyConnection);
const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
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

const LocationDisplay: React.FC = () => {
  const { pathname } = useLocation();
  return <div data-testid="location-pathname">{pathname}</div>;
};

const createPageElement = () => (
  <MemoryRouter initialEntries={['/evaluation/test-project/create-suite/from-goal']}>
    <LocationDisplay />
    <Routes>
      <Route
        path="/evaluation/:namespace/create-suite/from-goal"
        element={<CreateSuiteFromGoalPage />}
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

const startPendingGeneration = async (): Promise<void> => {
  await renderPage();
  fireEvent.change(screen.getByTestId('goal-suite-name'), {
    target: { value: 'Answer quality suite' },
  });
  fireEvent.click(screen.getByTestId('next-suite-settings'));
  fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
    target: { value: 'Assess answer quality.' },
  });
  fireEvent.click(screen.getByTestId('edit-recommendation-model'));
  fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
  fireEvent.click(
    within(await screen.findByTestId('recommendation-model-option-granite-3b')).getByRole(
      'option',
      { hidden: true },
    ),
  );
  fireEvent.click(screen.getByTestId('save-recommendation-model'));
  await waitFor(() => expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeEnabled());
  fireEvent.click(screen.getByTestId('recommend-benchmarks-with-ai'));
  expect(await screen.findByText('Initializing recommendations')).toBeInTheDocument();
};

describe('CreateSuiteFromGoalPage', () => {
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
    mockCreateCollectionGeneration.mockReturnValue(() => Promise.resolve(pendingGeneration));
    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(completedGeneration));
    mockDeleteCollectionGeneration.mockReturnValue(() => Promise.resolve());
  });

  it('should require only a collection name before allowing the next step', async () => {
    await renderPage();

    expect(screen.getByRole('button', { name: /Define goal/ })).toBeDisabled();
    expect(screen.getByTestId('page-title')).toHaveTextContent('Create collection');
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Configure your collection, describe your goal, and choose benchmarks.',
    );
    expect(
      screen.getByText(
        'Set the collection name, description, and optional recommendation settings.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Collection name')).toBeInTheDocument();
    expect(screen.getByText('Create collection', { selector: 'li' })).toBeInTheDocument();
    expect(screen.getByLabelText('Collection creation steps')).toBeInTheDocument();
    expect(screen.getByTestId('goal-suite-evaluates')).toHaveTextContent('Model');
    const maxBenchmarksSlider = screen.getByRole('slider', { name: 'Number of benchmarks' });
    expect(maxBenchmarksSlider).toHaveAttribute('aria-valuemin', '1');
    expect(maxBenchmarksSlider).toHaveAttribute('aria-valuemax', '20');
    expect(maxBenchmarksSlider).toHaveAttribute('aria-valuenow', '12');
    expect(screen.getByTestId('goal-suite-max-benchmarks-summary')).toHaveTextContent(
      '12 of 20 benchmarks',
    );
    expect(
      screen.getByText('Set the maximum number of benchmarks AI can recommend, up to 20.'),
    ).toBeInTheDocument();
    expect(maxBenchmarksSlider).toHaveAttribute(
      'aria-describedby',
      'suite-builder-max-benchmarks-helper',
    );
    expect(screen.getByTestId('goal-suite-strictness')).toHaveValue('moderate');
    expect(screen.getByTestId('goal-suite-generation-effort')).toHaveValue('standard');
    expect(screen.queryByRole('option', { name: /default/i })).not.toBeInTheDocument();
    expect(
      screen.queryByText('Leave blank to use the default of 12 (1–20).'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Leave blank to use the default of Moderate.'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('The recommended benchmarks are configured to evaluate models.'),
    ).toBeInTheDocument();
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

  it('should update the maximum benchmarks slider with the keyboard and preserve settings', async () => {
    await renderPage();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Reasoning suite' },
    });
    const maxBenchmarksSlider = screen.getByRole('slider', { name: 'Number of benchmarks' });
    fireEvent.keyDown(maxBenchmarksSlider, { key: 'ArrowRight' });
    expect(maxBenchmarksSlider).toHaveAttribute('aria-valuenow', '13');
    expect(screen.getByTestId('goal-suite-max-benchmarks-summary')).toHaveTextContent(
      '13 of 20 benchmarks',
    );
    fireEvent.change(screen.getByTestId('goal-suite-strictness'), {
      target: { value: 'strict' },
    });
    fireEvent.change(screen.getByTestId('goal-suite-generation-effort'), {
      target: { value: 'high' },
    });
    await waitFor(() => expect(screen.getByTestId('next-suite-settings')).toBeEnabled());
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    expect(await screen.findByTestId('define-goal-step')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Collection settings/ }));
    expect(screen.getByRole('slider', { name: 'Number of benchmarks' })).toHaveAttribute(
      'aria-valuenow',
      '13',
    );
    expect(screen.getByTestId('goal-suite-strictness')).toHaveValue('strict');
    expect(screen.getByTestId('goal-suite-generation-effort')).toHaveValue('high');
  });

  it('should advance after valid settings and preserve values when returning', async () => {
    const { rerender } = await renderPage();
    expect(screen.getByRole('button', { name: /Define goal/ })).toBeDisabled();
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Reasoning suite' },
    });
    expect(screen.getByTestId('next-suite-settings')).toBeEnabled();
    fireEvent.change(screen.getByTestId('goal-suite-description'), {
      target: { value: 'Check general reasoning performance.' },
    });
    await waitFor(() => expect(screen.getByTestId('next-suite-settings')).toBeEnabled());
    fireEvent.click(screen.getByTestId('next-suite-settings'));

    expect(await screen.findByTestId('define-goal-step')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Define goal/ })).toBeEnabled();
    expect(
      screen.getByText(
        'Describe what you want to test. AI will suggest benchmarks from the available catalog.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('goal-suite-evaluation-goal')).toHaveValue('');
    expect(screen.getByTestId('goal-suite-evaluation-goal')).toHaveAttribute('maxlength', '10000');
    expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeDisabled();
    expect(screen.getByTestId('selected-recommendation-model')).toHaveTextContent(
      'No model selected',
    );
    const recommendationModelSummary = screen.getByTestId('recommendation-model-summary');
    const recommendationModelRequired = within(recommendationModelSummary).getByTestId(
      'recommendation-model-required',
    );
    expect(recommendationModelRequired).toHaveClass('pf-v6-c-form__label-required');
    expect(recommendationModelRequired).toHaveAttribute('aria-hidden', 'true');
    expect(recommendationModelRequired).toHaveTextContent('*');

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
    expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeDisabled();

    fireEvent.click(screen.getByTestId('define-goal-view-examples'));
    expect(screen.getByTestId('define-goal-example-adversarial-content')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('define-goal-view-examples'));
    expect(screen.queryByTestId('define-goal-example-code-generation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Collection settings/ }));
    fireEvent.click(screen.getByRole('button', { name: /Define goal/ }));
    expect(screen.getByTestId('define-goal-example-answer-quality')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByTestId('edit-recommendation-model'));
    expect(screen.getByText('Choose a recommendation model')).toBeInTheDocument();
    expect(
      screen.getByText('Choose the model that suggests benchmarks for your goal.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
    expect(
      within(screen.getByTestId('recommendation-model-option-missing-url')).getByRole('option', {
        hidden: true,
      }),
    ).toBeDisabled();
    expect(screen.getByTestId('recommendation-model-option-external')).toBeInTheDocument();
    fireEvent.click(
      within(
        await screen.findByTestId('recommendation-model-option-llama-3.2-1b-instruct'),
      ).getByRole('option', { hidden: true }),
    );
    fireEvent.click(screen.getByTestId('cancel-recommendation-model'));
    expect(screen.getByTestId('selected-recommendation-model')).toHaveTextContent(
      'No model selected',
    );
    expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeDisabled();

    fireEvent.click(screen.getByTestId('edit-recommendation-model'));
    fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
    fireEvent.click(
      within(await screen.findByTestId('recommendation-model-option-granite-3b')).getByRole(
        'option',
        { hidden: true },
      ),
    );
    fireEvent.click(screen.getByTestId('save-recommendation-model'));
    await waitFor(() =>
      expect(screen.getByTestId('selected-recommendation-model')).toHaveTextContent('granite-3b'),
    );
    expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeEnabled();

    fireEvent.click(screen.getByTestId('edit-recommendation-model'));
    fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
    fireEvent.click(
      within(screen.getByTestId('recommendation-model-option-external')).getByRole('option', {
        hidden: true,
      }),
    );
    expect(screen.getByTestId('recommendation-model-toggle')).toHaveTextContent(
      'Other (External endpoint)',
    );
    fireEvent.click(screen.getByTestId('cancel-recommendation-model'));
    expect(screen.getByTestId('selected-recommendation-model')).toHaveTextContent('granite-3b');
    fireEvent.click(screen.getByTestId('edit-recommendation-model'));
    expect(screen.getByTestId('recommendation-model-toggle')).toHaveTextContent('granite-3b');
    fireEvent.click(screen.getByTestId('cancel-recommendation-model'));

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
    await waitFor(() => expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeDisabled());
    expect(screen.getByTestId('selected-recommendation-model-stale')).toHaveTextContent(
      'no longer available or its endpoint has changed',
    );
    fireEvent.click(screen.getByTestId('edit-recommendation-model'));
    expect(screen.getByTestId('save-recommendation-model')).toBeDisabled();
    fireEvent.click(screen.getByTestId('cancel-recommendation-model'));

    mockUseInferenceServices.mockReturnValue({
      inferenceServices: inferenceServiceFixtures,
      loaded: true,
      loadError: undefined,
      warning: undefined,
    });
    rerender(createPageElement());
    await waitFor(() => expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeEnabled());

    fireEvent.click(screen.getByTestId('edit-recommendation-model'));
    fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
    fireEvent.click(
      within(
        await screen.findByTestId('recommendation-model-option-mistral-7b-instruct'),
      ).getByRole('option', { hidden: true }),
    );
    fireEvent.click(screen.getByTestId('save-recommendation-model'));
    await waitFor(() =>
      expect(screen.getByTestId('selected-recommendation-model')).toHaveTextContent(
        'mistral-7b-instruct',
      ),
    );

    const evaluationGoal = `${exampleGoal} Add a custom check.`;
    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: evaluationGoal },
    });
    expect(screen.getByTestId('define-goal-example-answer-quality')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: /Collection settings/ }));

    expect(screen.getByTestId('goal-suite-name')).toHaveValue('Reasoning suite');
    expect(screen.getByTestId('goal-suite-description')).toHaveValue(
      'Check general reasoning performance.',
    );
    fireEvent.change(screen.getByTestId('goal-suite-name'), { target: { value: '' } });
    await waitFor(() => expect(screen.getByTestId('next-suite-settings')).toBeDisabled());
    expect(screen.getByRole('button', { name: /Define goal/ })).toBeDisabled();
    fireEvent.change(screen.getByTestId('goal-suite-name'), { target: { value: '  ' } });
    await waitFor(() => expect(screen.getByTestId('next-suite-settings')).toBeDisabled());
    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Reasoning suite' },
    });
    await waitFor(() => expect(screen.getByTestId('next-suite-settings')).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Define goal/ }));
    expect(screen.getByTestId('define-goal-step')).toBeInTheDocument();
    expect(screen.getByTestId('goal-suite-evaluation-goal')).toHaveValue(evaluationGoal);
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
    await waitFor(() => expect(screen.getByTestId('next-suite-settings')).toBeEnabled());
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: 'Evaluate answer quality.' },
    });
    expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeDisabled();

    fireEvent.click(screen.getByTestId('edit-recommendation-model'));
    fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
    expect(screen.getByText(/Could not load project models/)).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByTestId('recommendation-model-option-external')).getByRole('option', {
        hidden: true,
      }),
    );
    expect(screen.getByTestId('recommendation-model-toggle')).toHaveTextContent(
      'Other (External endpoint)',
    );
    fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
    expect(
      within(screen.getByTestId('recommendation-model-option-external')).getByRole('option', {
        hidden: true,
      }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('validate-connection-button')).toBeDisabled();
    expect(screen.getByTestId('save-recommendation-model')).toBeDisabled();
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
    expect(screen.getByTestId('save-recommendation-model')).toBeEnabled();
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
    expect(screen.getByTestId('save-recommendation-model')).toBeEnabled();
    fireEvent.click(screen.getByTestId('save-recommendation-model'));

    expect(screen.getByTestId('selected-recommendation-model')).toHaveTextContent(
      'external-chat-model',
    );
    expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeEnabled();
    fireEvent.click(screen.getByTestId('edit-recommendation-model'));
    expect(screen.getByTestId('recommendation-model-toggle')).toHaveTextContent(
      'Other (External endpoint)',
    );
    expect(screen.getByTestId('model-name-input')).toHaveValue('external-chat-model');
    expect(screen.getByTestId('endpoint-url-input')).toHaveValue('https://api.example.com/v1');
    expect(screen.getByTestId('api-key-input')).toHaveValue('evalhub-api-secret');
    expect(screen.getByTestId('external-endpoint-compatibility-alert')).toHaveTextContent(
      'This model must expose an OpenAI-compatible chat/completions endpoint.',
    );
    expect(screen.getByRole('dialog')).not.toHaveTextContent(/Enter the provider's API base URL/i);
    fireEvent.click(screen.getByTestId('cancel-recommendation-model'));
    expect(screen.getByTestId('selected-recommendation-model')).toHaveTextContent(
      'external-chat-model',
    );
  });

  it('should generate, poll, edit, and preserve the benchmark recommendation before Review', async () => {
    await renderPage();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Answer quality suite' },
    });
    fireEvent.change(screen.getByTestId('goal-suite-description'), {
      target: { value: 'Collection description is not part of the generation request.' },
    });
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: 'Assess answer quality.' },
    });
    fireEvent.click(screen.getByTestId('edit-recommendation-model'));
    fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
    fireEvent.click(
      within(await screen.findByTestId('recommendation-model-option-granite-3b')).getByRole(
        'option',
        { hidden: true },
      ),
    );
    fireEvent.click(screen.getByTestId('save-recommendation-model'));

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
    expect(screen.getByTestId('review-step-placeholder')).toBeInTheDocument();
    expect(mockDeleteCollectionGeneration).not.toHaveBeenCalled();
  });

  it('should delete an active generation before cancelling to the suite chooser', async () => {
    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(pendingGeneration));
    await renderPage();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Answer quality suite' },
    });
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: 'Assess answer quality.' },
    });
    fireEvent.click(screen.getByTestId('edit-recommendation-model'));
    fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
    fireEvent.click(
      within(await screen.findByTestId('recommendation-model-option-granite-3b')).getByRole(
        'option',
        { hidden: true },
      ),
    );
    fireEvent.click(screen.getByTestId('save-recommendation-model'));
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

  it('should stop an active generation, pause polling, and show the retry state', async () => {
    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(pendingGeneration));
    let resolveDelete: (() => void) | undefined;
    mockDeleteCollectionGeneration.mockReturnValue(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );

    await startPendingGeneration();
    const stopButton = screen.getByTestId('collection-generation-stop');
    expect(stopButton).toBeEnabled();
    expect(screen.getByTestId('next-benchmark-overview')).toBeDisabled();
    fireEvent.click(stopButton);

    await waitFor(() => expect(mockDeleteCollectionGeneration).toHaveBeenCalledTimes(1));
    expect(mockDeleteCollectionGeneration).toHaveBeenCalledWith('', 'test-project', 'generation-1');
    expect(screen.getByTestId('collection-generation-stop')).toBeDisabled();
    expect(screen.getByTestId('next-benchmark-overview')).toBeDisabled();
    await act(async () => {
      resolveDelete?.();
    });

    expect(await screen.findByTestId('collection-generation-cancelled')).toHaveTextContent(
      'Generation stopped.',
    );
    expect(screen.getByTestId('collection-generation-retry')).toBeEnabled();
    expect(screen.queryByTestId('collection-generation-stop')).not.toBeInTheDocument();
    expect(screen.getByTestId('next-benchmark-overview')).toBeDisabled();
    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/test-project/create-suite/from-goal',
    );

    const generationReadCount = mockGetCollectionGeneration.mock.calls.length;
    await act(async () => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 8500);
      });
    });
    expect(mockGetCollectionGeneration).toHaveBeenCalledTimes(generationReadCount);
  }, 15_000);

  it('should allow stopping an active generation when status polling fails', async () => {
    mockGetCollectionGeneration.mockReturnValue(() =>
      Promise.reject(new Error('The status request failed.')),
    );

    await startPendingGeneration();
    await waitFor(() =>
      expect(screen.getByTestId('collection-generation-poll-error')).toBeInTheDocument(),
    );

    expect(screen.getByTestId('collection-generation-stop')).toBeEnabled();
    expect(screen.getByTestId('collection-generation-retry-poll')).toBeEnabled();
    expect(screen.getByTestId('next-benchmark-overview')).toBeDisabled();
    fireEvent.click(screen.getByTestId('collection-generation-stop'));

    expect(await screen.findByTestId('collection-generation-cancelled')).toBeInTheDocument();
    expect(screen.getByTestId('collection-generation-retry')).toBeEnabled();
    expect(screen.queryByTestId('collection-generation-retry-poll')).not.toBeInTheDocument();
  });

  it('should keep an active generation and allow Stop to retry when DELETE fails', async () => {
    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(pendingGeneration));
    mockDeleteCollectionGeneration
      .mockReturnValueOnce(() =>
        Promise.reject(new Error('The generation could not be cancelled.')),
      )
      .mockReturnValueOnce(() => Promise.resolve());

    await startPendingGeneration();
    fireEvent.click(screen.getByTestId('collection-generation-stop'));

    expect(await screen.findByTestId('collection-generation-cancel-error')).toHaveTextContent(
      'The generation could not be cancelled.',
    );
    expect(screen.getByText('Initializing recommendations')).toBeInTheDocument();
    expect(screen.getByTestId('collection-generation-stop')).toBeEnabled();
    expect(screen.getByTestId('next-benchmark-overview')).toBeDisabled();
    expect(screen.getByTestId('suite-builder-cancel')).toBeEnabled();

    fireEvent.click(screen.getByTestId('collection-generation-stop'));
    expect(await screen.findByTestId('collection-generation-cancelled')).toBeInTheDocument();
    expect(mockDeleteCollectionGeneration).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('collection-generation-retry')).toBeEnabled();
    expect(screen.getByTestId('next-benchmark-overview')).toBeDisabled();
  });

  it('should surface a cancellation error while keeping Cancel available to retry', async () => {
    mockGetCollectionGeneration.mockReturnValue(() => Promise.resolve(pendingGeneration));
    mockDeleteCollectionGeneration.mockReturnValue(() =>
      Promise.reject(new Error('The generation could not be cancelled.')),
    );
    await renderPage();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Answer quality suite' },
    });
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    fireEvent.change(screen.getByTestId('goal-suite-evaluation-goal'), {
      target: { value: 'Assess answer quality.' },
    });
    fireEvent.click(screen.getByTestId('edit-recommendation-model'));
    fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
    fireEvent.click(
      within(await screen.findByTestId('recommendation-model-option-granite-3b')).getByRole(
        'option',
        { hidden: true },
      ),
    );
    fireEvent.click(screen.getByTestId('save-recommendation-model'));
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
  });
});
