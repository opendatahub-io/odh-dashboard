/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import { useLlamaStackModelsQuery } from '~/app/hooks/queries';
import AutoragExperimentSettingsModelSelection from '~/app/components/configure/AutoragExperimentSettingsModelSelection';
import { LlamaStackModelType } from '~/app/types';

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

const mockUseLlamaStackModelsQuery = jest.mocked(useLlamaStackModelsQuery);

const MOCK_MODELS = [
  { id: 'llama-8b', type: 'llm' as const, provider: 'ollama', resource_path: 'ollama://llama-8b' },
  {
    id: 'llama-70b',
    type: 'llm' as const,
    provider: 'ollama',
    resource_path: 'ollama://llama-70b',
  },
  {
    id: 'minilm-v2',
    type: 'embedding' as const,
    provider: 'ollama',
    resource_path: 'ollama://minilm-v2',
  },
];

const mockModelsImplementation = (
  _namespace: string,
  _secretName?: string,
  modelType?: LlamaStackModelType,
) =>
  ({
    data: {
      models: modelType ? MOCK_MODELS.filter((m) => m.type === modelType) : MOCK_MODELS,
    },
    isLoading: false,
  }) as unknown as ReturnType<typeof useLlamaStackModelsQuery>;

const configureSchema = createConfigureSchema();

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: {
      ...configureSchema.defaults,
      generation_models: MOCK_MODELS.filter((m) => m.type === 'llm').map((m) => m.id),
      embeddings_models: MOCK_MODELS.filter((m) => m.type === 'embedding').map((m) => m.id),
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

describe('AutoragExperimentSettingsModelSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLlamaStackModelsQuery.mockImplementation(mockModelsImplementation);
  });

  describe('Rendering', () => {
    it('should show a spinner when loading', () => {
      mockUseLlamaStackModelsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useLlamaStackModelsQuery>);

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
      expect(screen.getByTestId('llm-selected-count')).toHaveTextContent('2');
      expect(screen.getByTestId('embedding-selected-count')).toHaveTextContent('1');
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

      expect(screen.getByTestId('llm-selected-count')).toHaveTextContent('2');

      const table = within(screen.getByTestId('llm-models-table'));
      const row = table.getByTestId('model-row-llama-8b');
      const checkbox = row.querySelector('input[type="checkbox"]');
      await user.click(checkbox!);

      expect(screen.getByTestId('llm-selected-count')).toHaveTextContent('1');
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
      expect(rows[0]).toHaveAttribute('data-testid', 'model-row-llama-8b');
      expect(rows[1]).toHaveAttribute('data-testid', 'model-row-llama-70b');
    });
  });

  describe('Pagination', () => {
    const MANY_LLM_MODELS = Array.from({ length: 8 }, (_, i) => ({
      id: `llm-model-${i + 1}`,
      type: 'llm' as const,
      provider: 'ollama',
      resource_path: `ollama://llm-model-${i + 1}`,
    }));

    const manyModelsImplementation = (
      _namespace: string,
      _secretName?: string,
      modelType?: LlamaStackModelType,
    ) =>
      ({
        data: {
          models: modelType === 'llm' ? MANY_LLM_MODELS : [MOCK_MODELS[2]],
        },
        isLoading: false,
      }) as unknown as ReturnType<typeof useLlamaStackModelsQuery>;

    const renderWithManyModels = () => {
      mockUseLlamaStackModelsQuery.mockImplementation(manyModelsImplementation);

      const FormWrapperMany: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        const form = useForm({
          mode: 'onChange',
          resolver: zodResolver(configureSchema.full),
          defaultValues: {
            ...configureSchema.defaults,
            generation_models: MANY_LLM_MODELS.map((m) => m.id),
            embeddings_models: ['minilm-v2'],
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
      mockUseLlamaStackModelsQuery.mockReturnValue({
        data: { models: [] },
        isLoading: false,
      } as unknown as ReturnType<typeof useLlamaStackModelsQuery>);

      renderComponent();
      expect(screen.getAllByText('No models available.').length).toBeGreaterThan(0);
    });
  });
});
