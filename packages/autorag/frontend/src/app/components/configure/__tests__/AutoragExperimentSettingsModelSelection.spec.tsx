/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import createConfigureSchema from '~/app/schemas/configure.schema';
import { useLlamaStackModelsQuery } from '~/app/hooks/queries';
import AutoragExperimentSettingsModelSelection from '~/app/components/configure/AutoragExperimentSettingsModelSelection';
import { LlamaStackModelType } from '~/app/types';

jest.mock('~/app/hooks/queries');

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

const mockModelsImplementation = (modelType?: LlamaStackModelType) =>
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
    resolver: zodResolver(configureSchema),
    defaultValues: {
      ...configureSchema.parse({}),
      generation_constraints: MOCK_MODELS.filter((m) => m.type === 'llm').map((m) => ({
        model: m.id,
      })),
      embeddings_constraints: MOCK_MODELS.filter((m) => m.type === 'embedding').map((m) => ({
        model: m.id,
      })),
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
    it('should render the section title', () => {
      renderComponent();
      expect(screen.getByText('Models to test')).toBeInTheDocument();
    });

    it('should show a spinner when loading', () => {
      mockUseLlamaStackModelsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useLlamaStackModelsQuery>);

      renderComponent();
      expect(screen.getByLabelText('Loading models')).toBeInTheDocument();
    });

    it('should render Foundation Models tab as active by default', () => {
      renderComponent();
      expect(screen.getByTestId('foundation-models-tab')).toBeInTheDocument();
      expect(screen.getByTestId('llm-models-table')).toBeInTheDocument();
    });

    it('should render all foundation model rows', () => {
      renderComponent();
      expect(screen.getByTestId('model-row-llama-8b')).toBeInTheDocument();
      expect(screen.getByTestId('model-row-llama-70b')).toBeInTheDocument();
    });

    it('should render the select-all checkbox', () => {
      renderComponent();
      expect(screen.getByTestId('select-all-llm')).toBeInTheDocument();
    });
  });

  describe('Tab switching', () => {
    it('should switch to Embedding Models tab and show embedding models', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByText('Embedding Models'));
      expect(screen.getByTestId('embedding-models-table')).toBeInTheDocument();
      expect(screen.getByTestId('model-row-minilm-v2')).toBeInTheDocument();
    });
  });

  describe('Model selection', () => {
    it('should render all models as selected by default', () => {
      renderComponent();

      const row = screen.getByTestId('model-row-llama-8b');
      const checkbox = row.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeChecked();
    });

    it('should deselect a model when its checkbox is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const row = screen.getByTestId('model-row-llama-8b');
      const checkbox = row.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeChecked();

      await user.click(checkbox!);
      expect(checkbox).not.toBeChecked();
    });

    it('should reselect a model when its checkbox is clicked again', async () => {
      const user = userEvent.setup();
      renderComponent();

      const row = screen.getByTestId('model-row-llama-8b');
      const checkbox = row.querySelector('input[type="checkbox"]');

      await user.click(checkbox!);
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox!);
      expect(checkbox).toBeChecked();
    });

    it('should render the select-all checkbox as checked by default', () => {
      renderComponent();
      const selectAllCheckbox = screen.getByRole('checkbox', { name: 'All available models' });
      expect(selectAllCheckbox).toBeChecked();
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
