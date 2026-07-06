import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MlflowExperimentTable from '#~/concepts/mlflow/MlflowExperimentTable';
import { MlflowExperiment } from '#~/concepts/mlflow/types';

jest.mock('#~/utilities/time', () => ({
  relativeTime: () => '2 days ago',
}));

const mockExperiments: MlflowExperiment[] = [
  {
    id: 'exp-1',
    name: 'Training pipeline',
    lastUpdateTime: '2026-03-10T00:00:00Z',
  },
  {
    id: 'exp-2',
    name: 'Evaluation run',
    lastUpdateTime: '2026-03-12T00:00:00Z',
  },
];

const defaultProps: React.ComponentProps<typeof MlflowExperimentTable> = {
  data: mockExperiments,
  loaded: true,
  onSelect: jest.fn(),
  menuClose: jest.fn(),
  onClearSearch: jest.fn(),
  getColumnSort: jest.fn(),
};

const renderTable = (overrides?: Partial<React.ComponentProps<typeof MlflowExperimentTable>>) =>
  render(<MlflowExperimentTable {...defaultProps} {...overrides} />);

describe('MlflowExperimentTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render experiment names', () => {
    renderTable();

    expect(screen.getByText('Training pipeline')).toBeInTheDocument();
    expect(screen.getByText('Evaluation run')).toBeInTheDocument();
  });

  it('should render relative time for lastUpdateTime', () => {
    renderTable();

    const timeElements = screen.getAllByText('2 days ago');
    expect(timeElements).toHaveLength(2);
  });

  it('should render dash when lastUpdateTime is missing', () => {
    const experiments: MlflowExperiment[] = [{ id: 'exp-no-time', name: 'No timestamp' }];

    renderTable({ data: experiments });

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should call onSelect and menuClose when a row is clicked', async () => {
    const onSelect = jest.fn();
    const menuClose = jest.fn();
    const user = userEvent.setup();

    renderTable({ onSelect, menuClose });

    await user.click(screen.getByText('Training pipeline'));

    expect(onSelect).toHaveBeenCalledWith(mockExperiments[0]);
    expect(menuClose).toHaveBeenCalledTimes(1);
  });

  it('should show empty state when data is empty and loaded', () => {
    renderTable({ data: [], loaded: true });

    expect(screen.queryByText('Training pipeline')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-empty-table-state')).toBeInTheDocument();
  });

  it('should render experiment rows', () => {
    renderTable();

    expect(screen.getByTestId('mlflow-experiment-selector-table-list')).toBeInTheDocument();
  });

  it('should show a selected indicator', () => {
    renderTable({ selection: 'Evaluation run' });

    expect(screen.getByText('Evaluation run').closest('tr')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Training pipeline').closest('tr')).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByTestId('selected-experiment-icon-exp-2')).toBeInTheDocument();
    expect(screen.queryByTestId('selected-experiment-icon-exp-1')).not.toBeInTheDocument();
  });
});
