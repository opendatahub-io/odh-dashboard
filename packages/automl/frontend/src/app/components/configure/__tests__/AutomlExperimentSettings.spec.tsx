/* eslint-disable camelcase */
import { zodResolver } from '@hookform/resolvers/zod';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import AutomlExperimentSettings from '~/app/components/configure/AutomlExperimentSettings';
import { ConfigureSchema, createConfigureSchema } from '~/app/schemas/configure.schema';

const configureSchema = createConfigureSchema();

const FormWrapper: React.FC<{
  children: React.ReactNode;
  defaultValues?: Partial<ConfigureSchema>;
}> = ({ children, defaultValues }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: { ...configureSchema.defaults, ...defaultValues },
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  revertChanges: jest.fn(),
  saveChanges: jest.fn(),
};

const renderComponent = (props = {}, defaultValues?: Partial<ConfigureSchema>) =>
  render(
    <FormWrapper defaultValues={defaultValues}>
      <AutomlExperimentSettings {...defaultProps} {...props} />
    </FormWrapper>,
  );

describe('AutomlExperimentSettings', () => {
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

  describe('Form validation', () => {
    const changeTopN = (value: string) => {
      const input = screen.getByTestId('top-n-input').querySelector('input')!;
      fireEvent.change(input, { target: { value } });
    };

    it('should disable the Save button when no changes have been made', () => {
      renderComponent();
      expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
    });

    it('should disable the Save button when there are field errors', async () => {
      renderComponent();
      changeTopN('6');

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeDisabled();
      });
    });

    it('should show error message when top N exceeds the maximum', async () => {
      // Provide a valid task_type so the cross-field top_n max validator runs
      renderComponent({}, { task_type: 'binary' });
      changeTopN('11');

      await waitFor(() => {
        expect(screen.getByText('Maximum number of top models is 10')).toBeInTheDocument();
      });
    });

    it('should show error message when top N is below the minimum', async () => {
      renderComponent();
      changeTopN('0');

      await waitFor(() => {
        expect(screen.getByText('Minimum number of top models is 1')).toBeInTheDocument();
      });
    });

    it('should enable the Save button when top N is changed to a valid value', async () => {
      renderComponent();
      changeTopN('4');

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeEnabled();
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

  describe('Save and Cancel actions', () => {
    const changeTopN = (value: string) => {
      const input = screen.getByTestId('top-n-input').querySelector('input')!;
      fireEvent.change(input, { target: { value } });
    };

    it('should call saveChanges when Save is clicked after a valid change', async () => {
      renderComponent();
      changeTopN('4');

      await waitFor(() => {
        expect(screen.getByTestId('experiment-settings-save')).toBeEnabled();
      });

      fireEvent.click(screen.getByTestId('experiment-settings-save'));
      expect(defaultProps.saveChanges).toHaveBeenCalledTimes(1);
    });

    it('should call revertChanges and onClose when Cancel is clicked', async () => {
      renderComponent();

      fireEvent.click(screen.getByTestId('experiment-settings-cancel'));
      expect(defaultProps.revertChanges).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
