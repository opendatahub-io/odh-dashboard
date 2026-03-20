import { zodResolver } from '@hookform/resolvers/zod';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import AutoragExperimentSettings from '~/app/components/configure/AutoragExperimentSettings';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

jest.mock('~/app/components/configure/AutoragExperimentSettingsModelSelection', () => {
  const MockModelSelection = () => <div data-testid="mock-model-selection">Model Selection</div>;
  return { __esModule: true, default: MockModelSelection };
});

const configureSchema = createConfigureSchema();

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: configureSchema.defaults,
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  revertChanges: jest.fn(),
};

const renderComponent = (props = {}) =>
  render(
    <FormWrapper>
      <AutoragExperimentSettings {...defaultProps} {...props} />
    </FormWrapper>,
  );

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
      expect(screen.getByText('Experiment settings')).toBeInTheDocument();
    });

    it('should render the model selection section', () => {
      renderComponent();
      expect(screen.getByTestId('mock-model-selection')).toBeInTheDocument();
    });

    it('should render all three metric radio options', () => {
      renderComponent();
      expect(screen.getByTestId('metric-radio-faithfulness')).toBeInTheDocument();
      expect(screen.getByTestId('metric-radio-answer_correctness')).toBeInTheDocument();
      expect(screen.getByTestId('metric-radio-context_correctness')).toBeInTheDocument();
    });

    it('should render faithfulness as the default selected metric', () => {
      renderComponent();
      const faithfulnessRadio = screen.getByTestId('metric-radio-faithfulness');
      expect(faithfulnessRadio).toBeChecked();
    });

    it('should render the max RAG patterns input with default value 8', () => {
      renderComponent();
      expect(screen.getByTestId('max-rag-patterns-input')).toBeInTheDocument();
    });

    it('should render Save and Cancel buttons', () => {
      renderComponent();
      expect(screen.getByTestId('experiment-settings-save')).toBeInTheDocument();
      expect(screen.getByTestId('experiment-settings-cancel')).toBeInTheDocument();
    });
  });

  describe('Metric selection', () => {
    it('should select a different metric when clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('metric-radio-answer_correctness'));
      expect(screen.getByTestId('metric-radio-answer_correctness')).toBeChecked();
      expect(screen.getByTestId('metric-radio-faithfulness')).not.toBeChecked();
    });
  });

  describe('Form validation', () => {
    const changeMaxRagPatterns = (value: string) => {
      const input = screen.getByTestId('max-rag-patterns-input').querySelector('input')!;
      fireEvent.change(input, { target: { value } });
    };

    it('should disable the Save button when no changes have been made', () => {
      renderComponent();
      expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
    });

    it('should enable the Save button when a field is changed', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('metric-radio-answer_correctness'));

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeEnabled();
      });
    });

    it('should disable the Save button when there are field errors', async () => {
      renderComponent();
      changeMaxRagPatterns('21');

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
      });
    });

    it('should show error message when max RAG patterns exceeds the maximum', async () => {
      renderComponent();
      changeMaxRagPatterns('21');

      await waitFor(() => {
        expect(screen.getByText('Maximum number of RAG patterns is 20')).toBeInTheDocument();
      });
    });

    it('should show error message when max RAG patterns is below the minimum', async () => {
      renderComponent();
      changeMaxRagPatterns('3');

      await waitFor(() => {
        expect(screen.getByText('Minimum number of RAG patterns is 4')).toBeInTheDocument();
      });
    });

    it('should re-enable the Save button when a field error is corrected', async () => {
      renderComponent();
      changeMaxRagPatterns('21');

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
      });

      changeMaxRagPatterns('5');

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeEnabled();
      });
    });
  });

  describe('Dirty state detection', () => {
    it('should disable the Save button when a field is changed back to its default value', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('metric-radio-answer_correctness'));
      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeEnabled();
      });

      await user.click(screen.getByTestId('metric-radio-faithfulness'));
      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
      });
    });
  });

  describe('Save and Cancel actions', () => {
    it('should call onClose when Save is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('metric-radio-answer_correctness'));
      await user.click(screen.getByTestId('experiment-settings-save'));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call revertChanges and onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('experiment-settings-cancel'));
      expect(defaultProps.revertChanges).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
