import { zodResolver } from '@hookform/resolvers/zod';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
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
});
