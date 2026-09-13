import { zodResolver } from '@hookform/resolvers/zod';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import AutoragExperimentSettings from '~/app/components/configure/AutoragExperimentSettings';
import { RunTriggeredTrackingContext } from '~/app/context/RunTriggeredTrackingContext';
import { ConfigureSchema, createConfigureSchema } from '~/app/schemas/configure.schema';
import { AUTORAG_EVENTS, TrackingOutcome } from '~/app/utilities/tracking';

jest.mock('~/app/components/configure/AutoragExperimentSettingsModelSelection', () => {
  const MockModelSelection = ({
    onGenerationModelsChange,
    onEmbeddingModelsChange,
  }: {
    onGenerationModelsChange: (models: string[]) => void;
    onEmbeddingModelsChange: (models: string[]) => void;
  }) => (
    <div data-testid="mock-model-selection">
      <button
        data-testid="draft-generation-model"
        onClick={() => onGenerationModelsChange(['draft-generation'])}
      />
      <button
        data-testid="draft-both-models"
        onClick={() => {
          onGenerationModelsChange(['draft-generation']);
          onEmbeddingModelsChange(['draft-embedding']);
        }}
      />
      <button
        data-testid="draft-empty-models"
        onClick={() => {
          onGenerationModelsChange([]);
          onEmbeddingModelsChange([]);
        }}
      />
    </div>
  );
  return { __esModule: true, default: MockModelSelection };
});

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const fireFormTrackingEventMock = jest.mocked(fireFormTrackingEvent);

const configureSchema = createConfigureSchema();
let latestForm: UseFormReturn<ConfigureSchema>;

type FormWrapperProps = {
  children: React.ReactNode;
  defaultValues?: Partial<ConfigureSchema>;
};

const FormWrapper: React.FC<FormWrapperProps> = ({ children, defaultValues }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: { ...configureSchema.defaults, ...defaultValues },
  });
  latestForm = form as UseFormReturn<ConfigureSchema>;

  return <FormProvider {...form}>{children}</FormProvider>;
};

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  revertChanges: jest.fn(),
};

const renderComponent = (
  props: Partial<typeof defaultProps> = {},
  formWrapperProps: Omit<FormWrapperProps, 'children'> = {},
  options?: { onModelsConfigured?: () => void },
) => {
  const tree = (
    <FormWrapper {...formWrapperProps}>
      <AutoragExperimentSettings {...defaultProps} {...props} />
    </FormWrapper>
  );
  return render(
    options?.onModelsConfigured ? (
      <RunTriggeredTrackingContext.Provider
        value={{
          onKnowledgeSourceConfigured: jest.fn(),
          onEvaluationSourceConfigured: jest.fn(),
          onVectorStoreConfigured: jest.fn(),
          onModelsConfigured: options.onModelsConfigured,
        }}
      >
        {tree}
      </RunTriggeredTrackingContext.Provider>
    ) : (
      tree
    ),
  );
};

describe('AutoragExperimentSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the modal when isOpen is true', () => {
      renderComponent();
      expect(screen.getByTestId('experiment-settings-modal')).toBeInTheDocument();
    });

    it('should render the modal header with correct title', () => {
      renderComponent();
      expect(screen.getByText('Model configuration')).toBeInTheDocument();
    });

    it('should render the model selection section', () => {
      renderComponent();
      expect(screen.getByTestId('mock-model-selection')).toBeInTheDocument();
    });

    it('should render Save and Cancel buttons', () => {
      renderComponent();
      expect(screen.getByTestId('experiment-settings-save')).toBeInTheDocument();
      expect(screen.getByTestId('experiment-settings-cancel')).toBeInTheDocument();
    });
  });

  describe('Save and Cancel actions', () => {
    /* eslint-disable camelcase -- generation_models/embedding_models are schema field names */
    it('should disable the Save button when no changes have been made', () => {
      renderComponent();
      expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
    });

    it('should keep the Save button disabled when only generation models are selected', async () => {
      renderComponent({}, { defaultValues: { generation_models: ['gpt-4'] } });

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
      });
    });

    it('should keep the Save button disabled when only embedding models are selected', async () => {
      renderComponent({}, { defaultValues: { embedding_models: ['minilm-v2'] } });

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
      });
    });

    it('should enable the Save button when generation and embedding models are selected', async () => {
      renderComponent(
        {},
        {
          defaultValues: {
            generation_models: ['gpt-4'],
            embedding_models: ['minilm-v2'],
          },
        },
      );

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeEnabled();
      });
    });

    it('should call revertChanges and onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('experiment-settings-cancel'));
      expect(defaultProps.revertChanges).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
    /* eslint-enable camelcase */
  });

  describe('AutoRAG Models Selected tracking', () => {
    /* eslint-disable camelcase -- generation_models/embedding_models are schema field names */
    it('should fire with outcome: submit and correct counts when Save is clicked', async () => {
      const user = userEvent.setup();
      renderComponent(
        {},
        {
          defaultValues: {
            generation_models: ['gpt-4'],
            embedding_models: ['text-embedding-3', 'minilm-v2'],
          },
        },
      );

      await user.click(screen.getByTestId('experiment-settings-save'));

      expect(fireFormTrackingEventMock).toHaveBeenCalledWith(AUTORAG_EVENTS.MODELS_SELECTED, {
        countOfFoundationModels: 1,
        countOfEmbeddingModels: 2,
        outcome: TrackingOutcome.submit,
        success: true,
      });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should save valid unchanged model selections when the modal opens', async () => {
      const user = userEvent.setup();
      renderComponent(
        {},
        {
          defaultValues: {
            generation_models: ['gpt-4'],
            embedding_models: ['minilm-v2'],
          },
        },
      );

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeEnabled();
      });
      await user.click(screen.getByTestId('experiment-settings-save'));

      expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
        AUTORAG_EVENTS.MODELS_SELECTED,
        expect.objectContaining({
          countOfFoundationModels: 1,
          countOfEmbeddingModels: 1,
          outcome: TrackingOutcome.submit,
        }),
      );
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should keep draft selections out of the parent form until Save', async () => {
      const user = userEvent.setup();
      renderComponent(
        {},
        {
          defaultValues: {
            generation_models: ['saved-generation'],
            embedding_models: ['saved-embedding'],
          },
        },
      );

      await user.click(screen.getByTestId('draft-both-models'));

      expect(latestForm.getValues('generation_models')).toEqual(['saved-generation']);
      expect(latestForm.getValues('embedding_models')).toEqual(['saved-embedding']);
    });

    it('should commit both draft selections when Save is clicked', async () => {
      const user = userEvent.setup();
      renderComponent(
        {},
        {
          defaultValues: {
            generation_models: ['saved-generation'],
            embedding_models: ['saved-embedding'],
          },
        },
      );

      await user.click(screen.getByTestId('draft-both-models'));
      await user.click(screen.getByTestId('experiment-settings-save'));

      expect(latestForm.getValues('generation_models')).toEqual(['draft-generation']);
      expect(latestForm.getValues('embedding_models')).toEqual(['draft-embedding']);
    });

    it('should not fire a submit event or close when Save is clicked with zero models selected', async () => {
      renderComponent(
        {},
        {
          defaultValues: { generation_models: ['gpt-4'], embedding_models: ['minilm-v2'] },
        },
      );

      await userEvent.setup().click(screen.getByTestId('draft-empty-models'));

      expect(fireFormTrackingEventMock).not.toHaveBeenCalledWith(
        AUTORAG_EVENTS.MODELS_SELECTED,
        expect.objectContaining({ outcome: TrackingOutcome.submit }),
      );
      expect(defaultProps.onClose).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
      });
    });

    it('should fire with outcome: cancel when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderComponent(
        {},
        {
          defaultValues: {
            generation_models: ['saved-generation'],
            embedding_models: ['saved-embedding'],
          },
        },
      );

      await user.click(screen.getByTestId('draft-both-models'));
      await user.click(screen.getByTestId('experiment-settings-cancel'));

      expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
        AUTORAG_EVENTS.MODELS_SELECTED,
        expect.objectContaining({ outcome: TrackingOutcome.cancel }),
      );
      expect(defaultProps.revertChanges).toHaveBeenCalledTimes(1);
      expect(latestForm.getValues('generation_models')).toEqual(['saved-generation']);
      expect(latestForm.getValues('embedding_models')).toEqual(['saved-embedding']);
    });

    it('should fire with outcome: cancel when the modal is closed via the X button', async () => {
      const user = userEvent.setup();
      renderComponent(
        {},
        {
          defaultValues: {
            generation_models: ['saved-generation'],
            embedding_models: ['saved-embedding'],
          },
        },
      );

      await user.click(screen.getByTestId('draft-both-models'));
      await user.click(screen.getByLabelText('Close'));

      expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
        AUTORAG_EVENTS.MODELS_SELECTED,
        expect.objectContaining({ outcome: TrackingOutcome.cancel }),
      );
      expect(defaultProps.revertChanges).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
      expect(latestForm.getValues('generation_models')).toEqual(['saved-generation']);
      expect(latestForm.getValues('embedding_models')).toEqual(['saved-embedding']);
    });
    /* eslint-enable camelcase */
  });

  describe('RunTriggeredTrackingContext reporting', () => {
    /* eslint-disable camelcase -- generation_models/embedding_models are schema field names */
    it('should report to RunTriggeredTrackingContext when Save is clicked', async () => {
      const user = userEvent.setup();
      const onModelsConfigured = jest.fn();
      renderComponent(
        {},
        {
          defaultValues: {
            generation_models: ['gpt-4'],
            embedding_models: ['minilm-v2'],
          },
        },
        { onModelsConfigured },
      );

      await user.click(screen.getByTestId('experiment-settings-save'));

      expect(onModelsConfigured).toHaveBeenCalledTimes(1);
    });

    it('should NOT report to RunTriggeredTrackingContext when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onModelsConfigured = jest.fn();
      renderComponent(
        {},
        {
          defaultValues: {
            generation_models: ['gpt-4'],
            embedding_models: ['minilm-v2'],
          },
        },
        { onModelsConfigured },
      );

      await user.click(screen.getByTestId('experiment-settings-cancel'));

      expect(onModelsConfigured).not.toHaveBeenCalled();
    });

    it('should NOT report to RunTriggeredTrackingContext when the modal is closed via the X button', async () => {
      const user = userEvent.setup();
      const onModelsConfigured = jest.fn();
      renderComponent(
        {},
        {
          defaultValues: {
            generation_models: ['gpt-4'],
            embedding_models: ['minilm-v2'],
          },
        },
        { onModelsConfigured },
      );

      await user.click(screen.getByLabelText('Close'));

      expect(onModelsConfigured).not.toHaveBeenCalled();
    });
    /* eslint-enable camelcase */
  });
});
