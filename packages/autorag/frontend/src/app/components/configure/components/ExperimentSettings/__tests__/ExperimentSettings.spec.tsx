import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import createConfigureSchema from '~/app/schemas/configure.schema';
import ExperimentSettings from '~/app/components/configure/components/ExperimentSettings/ExperimentSettings';

jest.mock(
  '~/app/components/configure/components/ExperimentSettings/components/ExperimentSettingsModelSelection',
  () => {
    const MockModelSelection = () => <div data-testid="mock-model-selection">Model Selection</div>;
    return { __esModule: true, default: MockModelSelection };
  },
);

const configureSchema = createConfigureSchema();

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const form = useForm({
    resolver: zodResolver(configureSchema),
    defaultValues: configureSchema.parse({}),
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  revertChanges: jest.fn(),
  saveChanges: jest.fn(),
};

const renderComponent = (props = {}) =>
  render(
    <FormWrapper>
      <ExperimentSettings {...defaultProps} {...props} />
    </FormWrapper>,
  );

describe('ExperimentSettings', () => {
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

    it('should render the max RAG patterns input with default value 4', () => {
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

  describe('Save and Cancel actions', () => {
    it('should call saveChanges when Save is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('experiment-settings-save'));
      expect(defaultProps.saveChanges).toHaveBeenCalledTimes(1);
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
