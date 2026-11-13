/* eslint-disable camelcase */
import * as React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import { useInferenceServices } from '~/app/hooks/useInferenceServices';
import CreateSuiteFromGoalPage from '~/app/pages/CreateSuiteFromGoalPage';
import { verifyConnection } from '~/app/api/k8s';
import type { InferenceServiceItem } from '~/app/types';

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ...require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule({
    includeBreadcrumb: true,
  }),
}));

jest.mock('~/app/hooks/useInferenceServices', () => ({
  useInferenceServices: jest.fn(),
}));

jest.mock('~/app/api/k8s', () => ({
  ...jest.requireActual('~/app/api/k8s'),
  verifyConnection: jest.fn(),
}));

jest.mock('~/app/hooks/useNamespaceSelectorWithPersistence', () => ({
  useNamespaceSelectorWithPersistence: () => ({
    namespaces: [{ name: 'test-project', displayName: 'Test Project' }],
  }),
}));

const mockUseInferenceServices = jest.mocked(useInferenceServices);
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
  const rendered = render(createPageElement(), { wrapper: TrackingWrapper });
  await act(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });
  return rendered;
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
  });

  it('should require only a suite name before allowing the next step', async () => {
    await renderPage();

    expect(screen.getByRole('button', { name: /Define goal/ })).toBeDisabled();
    expect(screen.getByTestId('page-title')).toHaveTextContent('Create suite');
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Configure your suite, describe your goal, and choose benchmarks.',
    );
    expect(
      screen.getByText('Set the suite name, description, and optional recommendation settings.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('goal-suite-evaluates')).toHaveTextContent('Model');
    expect(screen.getByTestId('goal-suite-max-benchmarks')).toHaveValue(12);
    expect(screen.getByTestId('goal-suite-max-benchmarks')).not.toHaveAttribute('placeholder');
    expect(screen.getByTestId('goal-suite-strictness')).toHaveValue('moderate');
    expect(screen.queryByRole('option', { name: /default/i })).not.toBeInTheDocument();
    expect(
      screen.queryByText('Leave blank to use the default of 12 (1–50).'),
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
      'Enter a suite name.',
    );
    fireEvent.submit(screen.getByTestId('suite-settings-form'));
    expect(screen.queryByTestId('define-goal-step')).not.toBeInTheDocument();
  });

  it('should block invalid benchmark limits and preserve optional settings when navigating', async () => {
    await renderPage();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Reasoning suite' },
    });
    fireEvent.change(screen.getByTestId('goal-suite-max-benchmarks'), {
      target: { value: '51' },
    });
    expect(await screen.findByTestId('suite-builder-max-benchmarks-error')).toHaveTextContent(
      'Enter a whole number between 1 and 50.',
    );
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();

    fireEvent.change(screen.getByTestId('goal-suite-max-benchmarks'), {
      target: { value: '24' },
    });
    fireEvent.change(screen.getByTestId('goal-suite-strictness'), {
      target: { value: 'strict' },
    });
    await waitFor(() => expect(screen.getByTestId('next-suite-settings')).toBeEnabled());
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    expect(await screen.findByTestId('define-goal-step')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Suite settings/ }));
    expect(screen.getByTestId('goal-suite-max-benchmarks')).toHaveValue(24);
    expect(screen.getByTestId('goal-suite-strictness')).toHaveValue('strict');
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
    expect(screen.getByTestId('goal-suite-evaluation-goal')).toHaveAttribute('maxlength', '2000');
    expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeDisabled();
    expect(screen.getByTestId('selected-recommendation-model')).toHaveTextContent(
      'No model selected',
    );

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
    fireEvent.click(screen.getByRole('button', { name: /Suite settings/ }));
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
    fireEvent.click(screen.getByRole('button', { name: /Suite settings/ }));

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
});
