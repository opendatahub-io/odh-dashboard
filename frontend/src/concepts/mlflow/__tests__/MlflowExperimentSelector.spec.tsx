import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MlflowExperimentSelector from '#~/concepts/mlflow/MlflowExperimentSelector';
import useMlflowExperiments from '#~/concepts/mlflow/useMlflowExperiments';
import useTableColumnSort from '#~/components/table/useTableColumnSort';

jest.mock('#~/concepts/mlflow/useMlflowExperiments');
jest.mock('#~/components/table/useTableColumnSort');
jest.mock('#~/concepts/mlflow/MlflowExperimentTable', () => {
  const MockMlflowExperimentTable = (props: { data: unknown[] }) => (
    <div data-testid="mlflow-experiment-table">{props.data.length}</div>
  );
  MockMlflowExperimentTable.displayName = 'MockMlflowExperimentTable';
  return MockMlflowExperimentTable;
});

const useMlflowExperimentsMock = jest.mocked(useMlflowExperiments);
const useTableColumnSortMock = jest.mocked(useTableColumnSort);

const defaultExperiments = [
  {
    id: 'exp-1',
    name: 'Experiment A',
  },
  {
    id: 'exp-2',
    name: 'Experiment B',
  },
];

const renderSelector = (props?: Partial<React.ComponentProps<typeof MlflowExperimentSelector>>) =>
  render(
    <MlflowExperimentSelector
      workspace="test-workspace"
      onSelect={jest.fn()}
      selection={undefined}
      {...props}
    />,
  );

describe('MlflowExperimentSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMlflowExperimentsMock.mockReturnValue({
      data: defaultExperiments,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    useTableColumnSortMock.mockReturnValue({
      transformData: (data) => data,
      getColumnSort: jest.fn(),
      isCustomOrder: false,
    });
  });

  it('should show loading toggle content while experiments are loading', () => {
    useMlflowExperimentsMock.mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    renderSelector();

    const toggle = screen.getByTestId('mlflow-experiment-selector-toggle');
    expect(toggle).toHaveTextContent('Loading experiments');
    expect(toggle).toBeDisabled();
  });

  it('should show error toggle content when experiments fail to load', () => {
    useMlflowExperimentsMock.mockReturnValue({
      data: [],
      loaded: false,
      error: new Error('failed to load'),
      refresh: jest.fn(),
    });

    renderSelector();

    const toggle = screen.getByTestId('mlflow-experiment-selector-toggle');
    expect(toggle).toHaveTextContent('Error loading experiments');
    expect(toggle).toBeDisabled();
  });

  it('should show empty-state toggle content when no experiments are available', () => {
    useMlflowExperimentsMock.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    renderSelector();

    const toggle = screen.getByTestId('mlflow-experiment-selector-toggle');
    expect(toggle).toHaveTextContent('No experiments available');
    expect(toggle).toBeDisabled();
  });

  it('should show selected experiment when provided', () => {
    renderSelector({ selection: 'Experiment B' });

    const toggle = screen.getByTestId('mlflow-experiment-selector-toggle');
    expect(toggle).toHaveTextContent('Experiment B');
    expect(toggle).not.toBeDisabled();
  });

  it('should show default toggle text when loaded with experiments but no selection', () => {
    renderSelector();

    const toggle = screen.getByTestId('mlflow-experiment-selector-toggle');
    expect(toggle).toHaveTextContent('Select an experiment');
    expect(toggle).not.toBeDisabled();
  });

  it('should emit status changes to parent through onStatusChange', () => {
    const onStatusChange = jest.fn();
    const error = new Error('api error');
    useMlflowExperimentsMock.mockReturnValue({
      data: [],
      loaded: true,
      error,
      refresh: jest.fn(),
    });

    renderSelector({ onStatusChange });

    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith({ loaded: true, error });
  });
});
