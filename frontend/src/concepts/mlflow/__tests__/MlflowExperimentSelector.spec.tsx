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
jest.mock('#~/components/searchSelector/SearchSelector', () => {
  const MockSearchSelector = ({
    toggleContent,
    searchHelpText,
    isLoading,
    isDisabled,
    children,
  }: {
    toggleContent: string;
    searchHelpText: string;
    isLoading: boolean;
    isDisabled: boolean;
    children: (args: { menuClose: () => void }) => React.ReactNode;
  }) => (
    <div
      data-testid="mlflow-search-selector"
      data-loading={String(isLoading)}
      data-disabled={String(isDisabled)}
    >
      <div data-testid="selector-toggle-content">{toggleContent}</div>
      <div data-testid="selector-help-text">{searchHelpText}</div>
      {children({ menuClose: () => undefined })}
    </div>
  );
  MockSearchSelector.displayName = 'MockSearchSelector';
  return MockSearchSelector;
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

    expect(screen.getByTestId('selector-toggle-content')).toHaveTextContent('Loading experiments');
    expect(screen.getByTestId('mlflow-search-selector')).toHaveAttribute('data-loading', 'true');
    expect(screen.getByTestId('mlflow-search-selector')).toHaveAttribute('data-disabled', 'true');
  });

  it('should show error toggle content when experiments fail to load', () => {
    useMlflowExperimentsMock.mockReturnValue({
      data: [],
      loaded: false,
      error: new Error('failed to load'),
      refresh: jest.fn(),
    });

    renderSelector();

    expect(screen.getByTestId('selector-toggle-content')).toHaveTextContent(
      'Error loading experiments',
    );
    expect(screen.getByTestId('mlflow-search-selector')).toHaveAttribute('data-loading', 'false');
    expect(screen.getByTestId('mlflow-search-selector')).toHaveAttribute('data-disabled', 'true');
  });

  it('should show empty-state toggle content when no experiments are available', () => {
    useMlflowExperimentsMock.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    renderSelector();

    expect(screen.getByTestId('selector-toggle-content')).toHaveTextContent(
      'No experiments available',
    );
    expect(screen.getByTestId('selector-help-text')).toHaveTextContent(
      'Type a name to search your 0 experiments.',
    );
  });

  it('should show selected experiment when provided', () => {
    renderSelector({ selection: 'Experiment B' });

    expect(screen.getByTestId('selector-toggle-content')).toHaveTextContent('Experiment B');
  });

  it('should use singular search help text when there is one experiment', () => {
    useMlflowExperimentsMock.mockReturnValue({
      data: [{ id: 'exp-1', name: 'Experiment A' }],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    renderSelector();

    expect(screen.getByTestId('selector-help-text')).toHaveTextContent(
      'Type a name to search your 1 experiment.',
    );
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
