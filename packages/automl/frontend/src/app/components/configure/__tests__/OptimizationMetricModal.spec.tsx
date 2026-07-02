/* eslint-disable camelcase */
import { zodResolver } from '@hookform/resolvers/zod';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import OptimizationMetricModal from '~/app/components/configure/OptimizationMetricModal';
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
  onSave: jest.fn(),
  onCancel: jest.fn(),
};

const renderComponent = (props = {}, defaultValues?: Partial<ConfigureSchema>) =>
  render(
    <FormWrapper defaultValues={defaultValues}>
      <OptimizationMetricModal {...defaultProps} {...props} />
    </FormWrapper>,
  );

describe('OptimizationMetricModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the modal when isOpen is true', () => {
      renderComponent({}, { task_type: 'binary' });
      expect(screen.getByTestId('optimization-metric-modal')).toBeInTheDocument();
    });

    it('should render the modal header with correct title', () => {
      renderComponent({}, { task_type: 'binary' });
      expect(screen.getByText('Select optimization metric')).toBeInTheDocument();
    });

    it('should render Save and Cancel buttons', () => {
      renderComponent({}, { task_type: 'binary' });
      expect(screen.getByTestId('optimization-metric-save')).toBeInTheDocument();
      expect(screen.getByTestId('optimization-metric-cancel')).toBeInTheDocument();
    });

    it('should render classification metrics for binary task type', () => {
      renderComponent({}, { task_type: 'binary' });
      expect(screen.getByTestId('eval-metric-radio-accuracy')).toBeInTheDocument();
      expect(screen.getByTestId('eval-metric-radio-f1')).toBeInTheDocument();
      expect(screen.getByTestId('eval-metric-radio-roc_auc')).toBeInTheDocument();
    });

    it('should render regression metrics for regression task type', () => {
      renderComponent({}, { task_type: 'regression' });
      expect(screen.getByTestId('eval-metric-radio-r2')).toBeInTheDocument();
      expect(screen.getByTestId('eval-metric-radio-root_mean_squared_error')).toBeInTheDocument();
      expect(screen.queryByTestId('eval-metric-radio-accuracy')).not.toBeInTheDocument();
    });

    it('should render timeseries metrics for timeseries task type', () => {
      renderComponent({}, { task_type: 'timeseries' });
      expect(screen.getByTestId('eval-metric-radio-MASE')).toBeInTheDocument();
      expect(screen.getByTestId('eval-metric-radio-RMSE')).toBeInTheDocument();
      expect(screen.queryByTestId('eval-metric-radio-accuracy')).not.toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should pre-select the default metric for the task type when no metric is set', () => {
      renderComponent({}, { task_type: 'binary' });
      expect(screen.getByRole('radio', { name: /^Accuracy$/i })).toBeChecked();
    });

    it('should pre-select the current eval_metric from the form', () => {
      renderComponent({}, { task_type: 'binary', eval_metric: 'f1' });
      expect(screen.getByRole('radio', { name: /^F₁$/i })).toBeChecked();
    });

    it('should allow selecting a different metric', () => {
      renderComponent({}, { task_type: 'binary' });
      fireEvent.click(screen.getByTestId('eval-metric-radio-roc_auc'));
      expect(screen.getByRole('radio', { name: /^ROC AUC$/i })).toBeChecked();
    });
  });

  describe('Save and Cancel actions', () => {
    it('should call onSave with the selected metric when Save is clicked', () => {
      renderComponent({}, { task_type: 'binary' });
      fireEvent.click(screen.getByTestId('eval-metric-radio-f1'));
      fireEvent.click(screen.getByTestId('optimization-metric-save'));
      expect(defaultProps.onSave).toHaveBeenCalledWith('f1');
    });

    it('should call onCancel when Cancel is clicked', () => {
      renderComponent({}, { task_type: 'binary' });
      fireEvent.click(screen.getByTestId('optimization-metric-cancel'));
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
