import { zodResolver } from '@hookform/resolvers/zod';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import AutoragExperimentSettings from '~/app/components/configure/AutoragExperimentSettings';
import { RunTriggeredTrackingContext } from '~/app/context/RunTriggeredTrackingContext';
import { ConfigureSchema, createConfigureSchema } from '~/app/schemas/configure.schema';
import { AUTORAG_EVENTS, TrackingOutcome } from '~/app/utilities/tracking';

jest.mock('~/app/components/configure/AutoragExperimentSettingsModelSelection', () => {
  const MockModelSelection = () => <div data-testid="mock-model-selection">Model Selection</div>;
  return { __esModule: true, default: MockModelSelection };
});

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const fireFormTrackingEventMock = jest.mocked(fireFormTrackingEvent);

const configureSchema = createConfigureSchema();

type FormWrapperProps = {
  children: React.ReactNode;
  defaultValues?: Partial<ConfigureSchema>;
  /** When set, marks generation_models/embedding_models dirty with these values post-mount. */
  dirtyModels?: { generation_models?: string[]; embedding_models?: string[] };
};

const FormWrapper: React.FC<FormWrapperProps> = ({ children, defaultValues, dirtyModels }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: { ...configureSchema.defaults, ...defaultValues },
  });

  React.useEffect(() => {
    if (dirtyModels?.generation_models) {
      form.setValue('generation_models', dirtyModels.generation_models, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (dirtyModels?.embedding_models) {
      form.setValue('embedding_models', dirtyModels.embedding_models, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    it('should disable the Save button when no changes have been made', () => {
      renderComponent();
      expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
    });

    it('should call revertChanges and onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('experiment-settings-cancel'));
      expect(defaultProps.revertChanges).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('AutoRAG Models Selected tracking', () => {
    /* eslint-disable camelcase -- generation_models/embedding_models are schema field names */
    it('should fire with outcome: submit and correct counts when Save is clicked', async () => {
      const user = userEvent.setup();
      renderComponent(
        {},
        {
          dirtyModels: {
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
    });

    it('should not fire a submit event or close when Save is clicked with zero models selected', async () => {
      // Save is disabled unless the form is dirty; force it dirty with empty selections.
      renderComponent(
        {},
        {
          dirtyModels: { generation_models: [], embedding_models: [] },
          defaultValues: { generation_models: ['gpt-4'], embedding_models: ['minilm-v2'] },
        },
      );

      // Use fireEvent (synchronous) instead of userEvent here: clicking Save with zero models
      // selected races against the async zod validation that disables the button once it detects
      // the empty arrays are invalid, so a synchronous dispatch is needed to land the click before
      // that validation resolves and flips isDisabled. The click handler itself re-checks the live
      // model counts (not just the — possibly stale — disabled state), so it must be a no-op here:
      // no false "success" event, and the modal must not close on an invalid selection.
      fireEvent.click(screen.getByTestId('experiment-settings-save'));

      expect(fireFormTrackingEventMock).not.toHaveBeenCalledWith(
        AUTORAG_EVENTS.MODELS_SELECTED,
        expect.objectContaining({ outcome: TrackingOutcome.submit }),
      );
      expect(defaultProps.onClose).not.toHaveBeenCalled();

      // Flush the async validation triggered on mount so its state update is captured within
      // act(), rather than resolving after the test completes.
      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
      });
    });

    it('should fire with outcome: cancel when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderComponent(
        {},
        { dirtyModels: { generation_models: ['gpt-4'], embedding_models: ['minilm-v2'] } },
      );

      await user.click(screen.getByTestId('experiment-settings-cancel'));

      expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
        AUTORAG_EVENTS.MODELS_SELECTED,
        expect.objectContaining({ outcome: TrackingOutcome.cancel }),
      );
      expect(defaultProps.revertChanges).toHaveBeenCalledTimes(1);
    });

    it('should fire with outcome: cancel when the modal is closed via the X button', async () => {
      const user = userEvent.setup();
      renderComponent(
        {},
        { dirtyModels: { generation_models: ['gpt-4'], embedding_models: ['minilm-v2'] } },
      );

      await user.click(screen.getByLabelText('Close'));

      expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
        AUTORAG_EVENTS.MODELS_SELECTED,
        expect.objectContaining({ outcome: TrackingOutcome.cancel }),
      );
      expect(defaultProps.revertChanges).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
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
        { dirtyModels: { generation_models: ['gpt-4'], embedding_models: ['minilm-v2'] } },
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
        { dirtyModels: { generation_models: ['gpt-4'], embedding_models: ['minilm-v2'] } },
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
        { dirtyModels: { generation_models: ['gpt-4'], embedding_models: ['minilm-v2'] } },
        { onModelsConfigured },
      );

      await user.click(screen.getByLabelText('Close'));

      expect(onModelsConfigured).not.toHaveBeenCalled();
    });
    /* eslint-enable camelcase */
  });
});
