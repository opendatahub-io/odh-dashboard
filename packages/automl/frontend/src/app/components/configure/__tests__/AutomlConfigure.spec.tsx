import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import AutomlConfigure from '~/app/components/configure/AutomlConfigure';
import { useFilesQuery } from '~/app/hooks/queries';

const mockNavigate = jest.fn();

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

jest.mock('~/app/hooks/queries');
jest.mock('~/app/components/common/FileExplorer/FileExplorer', () => () => null);

const mockUseFilesQuery = jest.mocked(useFilesQuery);

const MOCK_COLUMNS = ['approval_status', 'credit_score', 'income', 'loan_amount', 'risk_category'];

const renderComponent = () => render(<AutomlConfigure />);

describe('AutomlConfigure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFilesQuery.mockReturnValue({
      data: MOCK_COLUMNS,
      isLoading: false,
    } as unknown as ReturnType<typeof useFilesQuery>);
  });

  describe('Prediction type', () => {
    it('should render all three prediction type tile cards', () => {
      renderComponent();
      expect(screen.getByTestId('task-type-card-binary')).toBeInTheDocument();
      expect(screen.getByTestId('task-type-card-multiclass')).toBeInTheDocument();
      expect(screen.getByTestId('task-type-card-regression')).toBeInTheDocument();
    });

    it('should render prediction type labels', () => {
      renderComponent();
      expect(screen.getByText('Binary classification')).toBeInTheDocument();
      expect(screen.getByText('Multiclass classification')).toBeInTheDocument();
      expect(screen.getByText('Regression')).toBeInTheDocument();
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

    it('should have binary classification selected by default', () => {
      renderComponent();
      const binaryCard = screen.getByTestId('task-type-card-binary');
      expect(binaryCard).toHaveClass('pf-m-selected');
    });

    it('should select a different prediction type when clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('task-type-card-multiclass'));
      expect(screen.getByTestId('task-type-card-multiclass')).toHaveClass('pf-m-selected');
      expect(screen.getByTestId('task-type-card-binary')).not.toHaveClass('pf-m-selected');
    });
  });

  describe('Label column', () => {
    it('should render the label column dropdown', () => {
      renderComponent();
      expect(screen.getByTestId('label-column-select')).toBeInTheDocument();
    });

    it('should show placeholder text when no column is selected', () => {
      renderComponent();
      expect(screen.getByTestId('label-column-select')).toHaveTextContent('Select a column');
    });

    it('should be disabled when no file is selected', () => {
      renderComponent();
      expect(screen.getByTestId('label-column-select')).toBeDisabled();
    });

    it('should be disabled when columns are empty', () => {
      mockUseFilesQuery.mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof useFilesQuery>);
      renderComponent();
      expect(screen.getByTestId('label-column-select')).toBeDisabled();
    });
  });

  describe('Top models to consider', () => {
    it('should render the top N input with default value 3', () => {
      renderComponent();
      const input = screen.getByTestId('top-n-input').querySelector('input');
      expect(input).toHaveValue(3);
    });

    it('should show error message when top N exceeds the maximum', async () => {
      renderComponent();
      const input = screen.getByTestId('top-n-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: '6' } });

      await waitFor(() => {
        expect(screen.getByText('Maximum number of top models is 5')).toBeInTheDocument();
      });
    });

    it('should show error message when top N is below the minimum', async () => {
      renderComponent();
      const input = screen.getByTestId('top-n-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: '0' } });

      await waitFor(() => {
        expect(screen.getByText('Minimum number of top models is 1')).toBeInTheDocument();
      });
    });
  });

  describe('Run experiment button', () => {
    it('should be disabled by default when form is invalid', () => {
      renderComponent();
      const button = screen.getByRole('button', { name: 'Run experiment' });
      expect(button).toBeDisabled();
    });

    it('should be disabled when top N has a validation error', async () => {
      renderComponent();
      const input = screen.getByTestId('top-n-input').querySelector('input')!;
      fireEvent.change(input, { target: { value: '6' } });

      await waitFor(() => {
        const button = screen.getByRole('button', { name: 'Run experiment' });
        expect(button).toBeDisabled();
      });
    });
  });
});
