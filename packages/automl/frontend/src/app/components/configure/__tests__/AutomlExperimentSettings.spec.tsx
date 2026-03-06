import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import createConfigureSchema from '~/app/schemas/configure.schema';
import AutomlExperimentSettings from '~/app/components/configure/AutomlExperimentSettings';
import { useFilesQuery } from '~/app/hooks/queries';

jest.mock('~/app/hooks/queries');

const mockUseFilesQuery = jest.mocked(useFilesQuery);

const MOCK_COLUMNS = ['approval_status', 'credit_score', 'income', 'loan_amount', 'risk_category'];

const configureSchema = createConfigureSchema();

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const form = useForm({
    mode: 'onChange',
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
      <AutomlExperimentSettings {...defaultProps} {...props} />
    </FormWrapper>,
  );

describe('AutomlExperimentSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFilesQuery.mockReturnValue({
      data: MOCK_COLUMNS,
      isLoading: false,
    } as unknown as ReturnType<typeof useFilesQuery>);
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

    it('should render all three prediction type radio options', () => {
      renderComponent();
      expect(screen.getByTestId('task-type-radio-binary')).toBeInTheDocument();
      expect(screen.getByTestId('task-type-radio-multiclass')).toBeInTheDocument();
      expect(screen.getByTestId('task-type-radio-regression')).toBeInTheDocument();
    });

    it('should render binary classification as the default selected prediction type', () => {
      renderComponent();
      const binaryRadio = screen.getByTestId('task-type-radio-binary');
      expect(binaryRadio).toBeChecked();
    });

    it('should render prediction type descriptions', () => {
      renderComponent();
      expect(
        screen.getByText(
          'Classify data into categories. Choose this if your prediction column contains two distinct categories',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Classify data into categories. Choose this if your prediction column contains multiple distinct categories',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Predict values from a continuous set of values. Choose this if your prediction column contains a large number of values',
        ),
      ).toBeInTheDocument();
    });

    it('should render the label column dropdown', () => {
      renderComponent();
      expect(screen.getByTestId('label-column-select')).toBeInTheDocument();
    });

    it('should render mock column options in the label column dropdown', () => {
      renderComponent();
      MOCK_COLUMNS.forEach((column) => {
        expect(screen.getByText(column)).toBeInTheDocument();
      });
    });

    it('should render the top N input with default value 3', () => {
      renderComponent();
      const input = screen.getByTestId('top-n-input').querySelector('input');
      expect(input).toHaveValue(3);
    });

    it('should render Save and Cancel buttons', () => {
      renderComponent();
      expect(screen.getByTestId('experiment-settings-save')).toBeInTheDocument();
      expect(screen.getByTestId('experiment-settings-cancel')).toBeInTheDocument();
    });
  });

  describe('Prediction type selection', () => {
    it('should select a different prediction type when clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('task-type-radio-multiclass'));
      expect(screen.getByTestId('task-type-radio-multiclass')).toBeChecked();
      expect(screen.getByTestId('task-type-radio-binary')).not.toBeChecked();
    });
  });

  describe('Label column selection', () => {
    it('should allow selecting a column from the dropdown', async () => {
      renderComponent();
      const select = screen.getByTestId('label-column-select');
      fireEvent.change(select, { target: { value: 'income' } });

      await waitFor(() => {
        expect(select).toHaveValue('income');
      });
    });
  });

  describe('Form validation', () => {
    const changeTopN = (value: string) => {
      const input = screen.getByTestId('top-n-input').querySelector('input')!;
      fireEvent.change(input, { target: { value } });
    };

    it('should disable the Save button when no changes have been made', () => {
      renderComponent();
      expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
    });

    it('should enable the Save button when a field is changed', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('task-type-radio-multiclass'));

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeEnabled();
      });
    });

    it('should disable the Save button when there are field errors', async () => {
      renderComponent();
      changeTopN('6');

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
      });
    });

    it('should show error message when top N exceeds the maximum', async () => {
      renderComponent();
      changeTopN('6');

      await waitFor(() => {
        expect(screen.getByText('Maximum number of top models is 5')).toBeInTheDocument();
      });
    });

    it('should show error message when top N is below the minimum', async () => {
      renderComponent();
      changeTopN('0');

      await waitFor(() => {
        expect(screen.getByText('Minimum number of top models is 1')).toBeInTheDocument();
      });
    });

    it('should re-enable the Save button when a field error is corrected', async () => {
      renderComponent();
      changeTopN('6');

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
      });

      changeTopN('4');

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeEnabled();
      });
    });
  });

  describe('Dirty state detection', () => {
    it('should disable the Save button when a field is changed back to its default value', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('task-type-radio-multiclass'));
      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeEnabled();
      });

      await user.click(screen.getByTestId('task-type-radio-binary'));
      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
      });
    });
  });

  describe('Save and Cancel actions', () => {
    it('should call saveChanges when Save is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('task-type-radio-multiclass'));
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
