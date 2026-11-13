import * as React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { mockProvider } from '~/__mocks__/mockProvider';
import { useProviders } from '~/app/hooks/useProviders';
import CreateSuiteFromGoalPage from '~/app/pages/CreateSuiteFromGoalPage';
import type { Provider } from '~/app/types';

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ...require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule({
    includeBreadcrumb: true,
  }),
}));

jest.mock('~/app/hooks/useProviders', () => ({
  useProviders: jest.fn(),
}));

jest.mock('~/app/hooks/useNamespaceSelectorWithPersistence', () => ({
  useNamespaceSelectorWithPersistence: () => ({
    namespaces: [{ name: 'test-project', displayName: 'Test Project' }],
  }),
}));

const mockUseProviders = jest.mocked(useProviders);

const TestQueryClientProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [queryClient] = React.useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const LocationDisplay: React.FC = () => {
  const { pathname } = useLocation();
  return <div data-testid="location-pathname">{pathname}</div>;
};

const createPageElement = () => (
  <TestQueryClientProvider>
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
  </TestQueryClientProvider>
);

const renderPage = async () => {
  const rendered = render(createPageElement());
  await act(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });
  return rendered;
};

const providerWithCategories = (categories: (string | undefined)[]): Provider =>
  mockProvider({
    benchmarks: categories.map((category, index) => ({
      id: `benchmark-${index}`,
      name: `Benchmark ${index}`,
      category,
    })),
  });

describe('CreateSuiteFromGoalPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProviders.mockReturnValue({
      providers: [mockProvider()],
      loaded: true,
      loadError: undefined,
    });
  });

  it('should validate suite name and category before allowing the next step', async () => {
    await renderPage();

    expect(screen.getByRole('button', { name: /Define goal/ })).toBeDisabled();
    expect(screen.getByTestId('page-title')).toHaveTextContent('Create suite');
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Configure your suite, describe your goal, and choose benchmarks.',
    );
    expect(screen.getByText('Set the suite name, description, and category.')).toBeInTheDocument();
    expect(screen.getByTestId('goal-suite-evaluates')).toHaveTextContent('Model');
    expect(
      screen.getByText('The recommended benchmarks are configured to evaluate models.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('goal-suite-category-input')).toHaveAttribute(
      'placeholder',
      'Select category',
    );
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: '   ' },
    });
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();

    expect(await screen.findByTestId('suite-builder-name-error')).toHaveTextContent(
      'Enter a suite name.',
    );
    fireEvent.submit(screen.getByTestId('suite-settings-form'));
    expect(await screen.findByTestId('suite-builder-category-error')).toHaveTextContent(
      'Select a category.',
    );
    expect(screen.queryByTestId('define-goal-step')).not.toBeInTheDocument();
  });

  it('should derive, trim, deduplicate, and sort categories from providers', async () => {
    mockUseProviders.mockReturnValue({
      providers: [providerWithCategories([' Zeta ', 'alpha', 'ALPHA', undefined, 'Beta'])],
      loaded: true,
      loadError: undefined,
    });
    await renderPage();

    fireEvent.click(screen.getByTestId('goal-suite-category-input'));

    expect(await screen.findByTestId('goal-suite-category-option-alpha')).toHaveTextContent(
      'Alpha',
    );
    expect(screen.getByTestId('goal-suite-category-option-Beta')).toHaveTextContent('Beta');
    expect(screen.getByTestId('goal-suite-category-option-Zeta')).toHaveTextContent('Zeta');
    expect(screen.queryAllByTestId(/^goal-suite-category-option-/)).toHaveLength(3);
    fireEvent.click(
      within(screen.getByTestId('goal-suite-category-option-alpha')).getByRole('checkbox'),
    );
    expect(screen.getByTestId('goal-suite-category-tag-alpha')).toHaveTextContent('Alpha');
  });

  it('should advance after valid settings and preserve values when returning', async () => {
    await renderPage();
    expect(screen.getByRole('button', { name: /Define goal/ })).toBeDisabled();
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Reasoning suite' },
    });
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();
    fireEvent.change(screen.getByTestId('goal-suite-description'), {
      target: { value: 'Check general reasoning performance.' },
    });
    fireEvent.click(screen.getByTestId('goal-suite-category-input'));
    fireEvent.click(
      within(await screen.findByTestId('goal-suite-category-option-Reasoning')).getByRole(
        'checkbox',
      ),
    );
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
    await waitFor(() =>
      expect(screen.getByTestId('selected-recommendation-model')).toHaveTextContent('granite-3b'),
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
    await waitFor(() => expect(screen.getByTestId('recommend-benchmarks-with-ai')).toBeEnabled());

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
    expect(screen.getByText('Change recommendation model')).toBeInTheDocument();
    expect(
      screen.getByText('Choose the model that suggests benchmarks for your goal.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
    fireEvent.click(
      within(
        await screen.findByTestId('recommendation-model-option-preview-llama-3-2-1b'),
      ).getByText('llama-3.2-1b-instruct'),
    );
    fireEvent.click(screen.getByTestId('cancel-recommendation-model'));
    expect(screen.getByTestId('selected-recommendation-model')).toHaveTextContent('granite-3b');

    fireEvent.click(screen.getByTestId('edit-recommendation-model'));
    fireEvent.click(screen.getByTestId('recommendation-model-toggle'));
    fireEvent.click(
      within(await screen.findByTestId('recommendation-model-option-preview-mistral-7b')).getByText(
        'mistral-7b-instruct',
      ),
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
    expect(screen.getByTestId('goal-suite-category-tag-Reasoning')).toHaveTextContent('Reasoning');
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

  it('should show loading, empty, and error states for categories', async () => {
    mockUseProviders.mockReturnValue({
      providers: [],
      loaded: false,
      loadError: undefined,
    });
    const { rerender } = await renderPage();
    expect(screen.getByTestId('suite-builder-category-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('goal-suite-category-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();

    mockUseProviders.mockReturnValue({
      providers: [],
      loaded: true,
      loadError: undefined,
    });
    rerender(createPageElement());
    expect(screen.getByTestId('suite-builder-category-empty')).toBeInTheDocument();
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();
    expect(screen.getByTestId('goal-suite-category-input')).toBeDisabled();

    mockUseProviders.mockReturnValue({
      providers: [],
      loaded: false,
      loadError: new Error('offline'),
    });
    rerender(createPageElement());
    expect(screen.getByTestId('suite-builder-category-error-state')).toHaveTextContent(
      'Unable to load categories',
    );
    expect(screen.queryByTestId('suite-builder-category-skeleton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('goal-suite-category-input')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();
  });

  it('should require available providers for settings navigation and recover when they load', async () => {
    mockUseProviders.mockReturnValue({
      providers: [providerWithCategories(['Reasoning'])],
      loaded: true,
      loadError: undefined,
    });
    const { rerender } = await renderPage();

    fireEvent.change(screen.getByTestId('goal-suite-name'), {
      target: { value: 'Reasoning suite' },
    });
    fireEvent.click(screen.getByTestId('goal-suite-category-input'));
    fireEvent.click(
      within(await screen.findByTestId('goal-suite-category-option-Reasoning')).getByRole(
        'checkbox',
      ),
    );
    await waitFor(() => {
      expect(screen.getByTestId('next-suite-settings')).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId('next-suite-settings'));
    expect(await screen.findByTestId('define-goal-step')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Suite settings/ }));

    mockUseProviders.mockReturnValue({
      providers: [providerWithCategories(['Reasoning'])],
      loaded: false,
      loadError: undefined,
    });
    rerender(createPageElement());
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Define goal/ })).toBeDisabled();
    fireEvent.submit(screen.getByTestId('suite-settings-form'));
    expect(screen.queryByTestId('define-goal-step')).not.toBeInTheDocument();

    mockUseProviders.mockReturnValue({
      providers: [providerWithCategories(['Reasoning'])],
      loaded: false,
      loadError: new Error('offline'),
    });
    rerender(createPageElement());
    expect(screen.getByTestId('next-suite-settings')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Define goal/ })).toBeDisabled();
    fireEvent.submit(screen.getByTestId('suite-settings-form'));
    expect(screen.queryByTestId('define-goal-step')).not.toBeInTheDocument();

    mockUseProviders.mockReturnValue({
      providers: [providerWithCategories(['Reasoning'])],
      loaded: true,
      loadError: undefined,
    });
    rerender(createPageElement());
    await waitFor(() => {
      expect(screen.getByTestId('next-suite-settings')).toBeEnabled();
      expect(screen.getByRole('button', { name: /Define goal/ })).toBeEnabled();
    });
    fireEvent.submit(screen.getByTestId('suite-settings-form'));
    expect(await screen.findByTestId('define-goal-step')).toBeInTheDocument();
  });
});
