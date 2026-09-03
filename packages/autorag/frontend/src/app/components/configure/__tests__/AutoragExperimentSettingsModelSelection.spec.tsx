/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import { useMaaSModelsQuery } from '~/app/hooks/queries';
import AutoragExperimentSettingsModelSelection from '~/app/components/configure/AutoragExperimentSettingsModelSelection';

jest.mock('~/app/hooks/queries');
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => ({ namespace: 'test-namespace' }),
}));
jest.mock('mod-arch-shared', () => ({
  DashboardPopupIconButton: ({
    icon,
    ...props
  }: {
    icon: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{icon}</button>,
}));

const mockUseMaaSModelsQuery = jest.mocked(useMaaSModelsQuery);

const MOCK_MODELS = [
  { id: 'llama-8b', display_name: 'Llama 8B', description: 'Generation model' },
  { id: 'llama-70b', display_name: 'Llama 70B', description: 'Generation model' },
  { id: 'minilm-v2', display_name: 'MiniLM v2', description: 'Embedding model' },
];

const mockModelsImplementation = (...args: [string]) => {
  void args;
  return {
    data: { models: MOCK_MODELS },
    isLoading: false,
  } as unknown as ReturnType<typeof useMaaSModelsQuery>;
};

const configureSchema = createConfigureSchema();

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: {
      ...configureSchema.defaults,
      generation_models: MOCK_MODELS.map((m) => m.id),
      embedding_models: MOCK_MODELS.map((m) => m.id),
    },
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

const renderComponent = () =>
  render(
    <FormWrapper>
      <AutoragExperimentSettingsModelSelection />
    </FormWrapper>,
  );

const EmptyFormWrapper: React.FC = () => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: { ...configureSchema.defaults, generation_models: [], embedding_models: [] },
  });
  return (
    <FormProvider {...form}>
      <AutoragExperimentSettingsModelSelection />
    </FormProvider>
  );
};

const renderEmptyComponent = () => render(<EmptyFormWrapper />);

describe('AutoragExperimentSettingsModelSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMaaSModelsQuery.mockImplementation(mockModelsImplementation);
  });

  describe('Rendering', () => {
    it('should show a spinner when loading', () => {
      mockUseMaaSModelsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useMaaSModelsQuery>);

      renderComponent();
      expect(screen.getByLabelText('Loading models')).toBeInTheDocument();
    });

    it('should render Foundation models tab as active by default', () => {
      renderComponent();
      expect(screen.getByTestId('foundation-models-tab')).toBeInTheDocument();
      expect(screen.getByTestId('llm-models-table')).toBeInTheDocument();
    });

    it('should render all foundation model rows', () => {
      renderComponent();
      const table = within(screen.getByTestId('llm-models-table'));
      expect(table.getByTestId('model-row-llama-8b')).toBeInTheDocument();
      expect(table.getByTestId('model-row-llama-70b')).toBeInTheDocument();
    });

    it('should render select-all checkbox in table header', () => {
      renderComponent();
      const thead = screen.getByTestId('llm-models-table').querySelector('thead');
      const headerCheckbox = thead?.querySelector('input[type="checkbox"]');
      expect(headerCheckbox).toBeInTheDocument();
      expect(headerCheckbox).toBeChecked();
    });

    it('should display selected model counts in tab badges', () => {
      renderComponent();
      expect(screen.getByTestId('llm-selected-count')).toHaveTextContent('3');
      expect(screen.getByTestId('embedding-selected-count')).toHaveTextContent('3');
    });

    it('should render pagination', () => {
      renderComponent();
      expect(screen.getByTestId('llm-pagination')).toBeInTheDocument();
    });

    it('should render sortable Model name column header', () => {
      renderComponent();
      const table = screen.getByTestId('llm-models-table');
      expect(table.querySelector('thead th button')).toBeInTheDocument();
    });

    it('should render Models to test label with red required indicator and help popover', async () => {
      const user = userEvent.setup();
      renderComponent();
      expect(screen.getByTestId('models-to-test-label')).toHaveTextContent('Models to test');
      expect(screen.getByTestId('models-to-test-required')).toHaveTextContent('*');
      expect(screen.getByTestId('models-to-test-required')).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByTestId('models-to-test-required')).toHaveClass(
        'autorag-model-selection__required-asterisk',
      );
      expect(screen.getByText('required')).toHaveClass('pf-v6-screen-reader');
      const helpButton = screen.getByTestId('models-to-test-help');
      expect(helpButton).toBeInTheDocument();
      await user.click(helpButton);
      expect(
        screen.getByText(
          'To verify model details, including language support, view the models in the Model catalog.',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /For multilingual AutoRAG setups, you must enable a tool-call parser on the model server/,
        ),
      ).toBeInTheDocument();
      expect(screen.getByTestId('models-to-test-tool-call-parser-args')).toHaveTextContent(
        '--enable-auto-tool-choice --tool-call-parser=mistral',
      );
      expect(screen.queryByRole('link', { name: /model catalog/i })).not.toBeInTheDocument();
    });
  });

  describe('Tab switching', () => {
    it('should switch to Embedding models tab and show embedding models', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('Embedding models', { exact: false }));
      const table = within(screen.getByTestId('embedding-models-table'));
      expect(table.getByTestId('model-row-minilm-v2')).toBeInTheDocument();
    });
  });

  describe('Model selection', () => {
    it('should start with zero selections and allow the same MaaS model in both tables', async () => {
      const user = userEvent.setup();
      renderEmptyComponent();

      expect(screen.getByTestId('llm-selected-count')).toHaveTextContent('0');
      expect(screen.getByTestId('embedding-selected-count')).toHaveTextContent('0');

      const generationRow = within(screen.getByTestId('llm-models-table')).getByTestId(
        'model-row-llama-8b',
      );
      await user.click(generationRow.querySelector('input[type="checkbox"]')!);
      await user.click(screen.getByText('Embedding models', { exact: false }));
      const embeddingRow = within(screen.getByTestId('embedding-models-table')).getByTestId(
        'model-row-llama-8b',
      );
      await user.click(embeddingRow.querySelector('input[type="checkbox"]')!);

      expect(screen.getByTestId('llm-selected-count')).toHaveTextContent('1');
      expect(screen.getByTestId('embedding-selected-count')).toHaveTextContent('1');
    });

    it('should render all models as selected by default', () => {
      renderComponent();

      const table = within(screen.getByTestId('llm-models-table'));
      const row = table.getByTestId('model-row-llama-8b');
      const checkbox = row.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeChecked();
    });

    it('should deselect a model when its checkbox is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const table = within(screen.getByTestId('llm-models-table'));
      const row = table.getByTestId('model-row-llama-8b');
      const checkbox = row.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeChecked();

      await user.click(checkbox!);
      expect(checkbox).not.toBeChecked();
    });

    it('should update the badge count when a model is deselected', async () => {
      const user = userEvent.setup();
      renderComponent();

      expect(screen.getByTestId('llm-selected-count')).toHaveTextContent('3');

      const table = within(screen.getByTestId('llm-models-table'));
      const row = table.getByTestId('model-row-llama-8b');
      const checkbox = row.querySelector('input[type="checkbox"]');
      await user.click(checkbox!);

      expect(screen.getByTestId('llm-selected-count')).toHaveTextContent('2');
    });

    it('should deselect all models when header checkbox is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const thead = screen.getByTestId('llm-models-table').querySelector('thead');
      const headerCheckbox = thead?.querySelector('input[type="checkbox"]');
      await user.click(headerCheckbox!);

      expect(screen.getByTestId('llm-selected-count')).toHaveTextContent('0');
    });
  });

  describe('Sorting', () => {
    it('should reverse sort order when Model name header is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Default is ascending: llama-70b before llama-8b
      let rows = screen.getByTestId('llm-models-table').querySelectorAll('tbody tr');
      expect(rows[0]).toHaveAttribute('data-testid', 'model-row-llama-70b');
      expect(rows[1]).toHaveAttribute('data-testid', 'model-row-llama-8b');

      // Click to sort descending
      const table = screen.getByTestId('llm-models-table');
      const sortButton = table.querySelector('thead th button')!;
      await user.click(sortButton);

      rows = screen.getByTestId('llm-models-table').querySelectorAll('tbody tr');
      expect(rows[0]).toHaveAttribute('data-testid', 'model-row-minilm-v2');
      expect(rows[1]).toHaveAttribute('data-testid', 'model-row-llama-8b');
    });
  });

  describe('Pagination', () => {
    const MANY_LLM_MODELS = Array.from({ length: 8 }, (_, i) => ({
      id: `llm-model-${i + 1}`,
      display_name: `Model ${i + 1}`,
      description: 'MaaS model',
    }));

    const manyModelsImplementation = (...args: [string]) => {
      void args;
      return {
        data: { models: MANY_LLM_MODELS },
        isLoading: false,
      } as unknown as ReturnType<typeof useMaaSModelsQuery>;
    };

    const renderWithManyModels = () => {
      mockUseMaaSModelsQuery.mockImplementation(manyModelsImplementation);

      const FormWrapperMany: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        const form = useForm({
          mode: 'onChange',
          resolver: zodResolver(configureSchema.full),
          defaultValues: {
            ...configureSchema.defaults,
            generation_models: MANY_LLM_MODELS.map((m) => m.id),
            embedding_models: ['minilm-v2'],
          },
        });
        return <FormProvider {...form}>{children}</FormProvider>;
      };

      return render(
        <FormWrapperMany>
          <AutoragExperimentSettingsModelSelection />
        </FormWrapperMany>,
      );
    };

    it('should only display models for the current page', () => {
      renderWithManyModels();

      // DEFAULT_PER_PAGE is 5, so page 1 should show 5 of 8 models
      const rows = screen.getByTestId('llm-models-table').querySelectorAll('tbody tr');
      expect(rows).toHaveLength(5);
    });

    it('should show remaining models on the next page', async () => {
      const user = userEvent.setup();
      renderWithManyModels();

      // Navigate to page 2 using the pagination within the LLM tab
      const pagination = screen.getByTestId('llm-pagination');
      const nextButton = pagination.querySelector('button[aria-label="Go to next page"]')!;
      await user.click(nextButton);

      // Page 2 should show the remaining 3 models
      const rows = screen.getByTestId('llm-models-table').querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);
    });
  });

  describe('Empty state', () => {
    it('should show empty message when no models are available', () => {
      mockUseMaaSModelsQuery.mockReturnValue({
        data: { models: [] },
        isLoading: false,
      } as unknown as ReturnType<typeof useMaaSModelsQuery>);

      renderComponent();
      expect(screen.getAllByText('No models available.').length).toBeGreaterThan(0);
    });
  });
});
