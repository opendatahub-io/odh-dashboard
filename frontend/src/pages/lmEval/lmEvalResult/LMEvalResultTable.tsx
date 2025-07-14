import * as React from 'react';
import { SearchInput, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td, TableVariant } from '@patternfly/react-table';
import SimpleSelect from '#~/components/SimpleSelect';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { COLUMN_FILTER_OPTIONS, SEARCH_PLACEHOLDERS, SearchColumn } from './utils';

// Define the structure of a result row based on typical LM evaluation output
export type EvaluationResult = {
  task: string;
  metric: string;
  value: number;
  error?: number;
};

type LMEvalResultTableProps = {
  results: EvaluationResult[];
};

const LMEvalResultTable: React.FC<LMEvalResultTableProps> = ({ results }) => {
  const [searchValue, setSearchValue] = React.useState('');
  const [searchColumn, setSearchColumn] = React.useState<SearchColumn>('task');

  // Filter results based on search value and selected column
  const filteredResults = React.useMemo(() => {
    if (!searchValue) {
      return results;
    }

    const searchLower = searchValue.toLowerCase();

    return results.filter((result) => {
      switch (searchColumn) {
        case 'task':
          return result.task.toLowerCase().includes(searchLower);
        case 'metric':
          return result.metric.toLowerCase().includes(searchLower);
        case 'value':
          return result.value.toFixed(5).includes(searchValue);
        case 'error':
          return result.error ? result.error.toFixed(4).includes(searchValue) : false;
        default:
          return true;
      }
    });
  }, [results, searchValue, searchColumn]);

  const handleSearchChange = React.useCallback(
    (_event: React.FormEvent<HTMLInputElement>, value: string) => {
      setSearchValue(value);
    },
    [],
  );

  const handleColumnChange = React.useCallback((key: string) => {
    if (key === 'task' || key === 'metric' || key === 'value' || key === 'error') {
      setSearchColumn(key);
      setSearchValue(''); // Clear search when changing columns
    }
  }, []);

  const handleClearFilters = React.useCallback(() => {
    setSearchValue('');
  }, []);

  // Show DashboardEmptyTableView when filtering/searching returns no results
  if (filteredResults.length === 0 && searchValue && results.length > 0) {
    return (
      <>
        <Toolbar id="lm-eval-result-toolbar">
          <ToolbarContent>
            <ToolbarItem>
              <SimpleSelect
                options={COLUMN_FILTER_OPTIONS}
                value={searchColumn}
                onChange={handleColumnChange}
                dataTestId="column-filter"
                toggleProps={{
                  style: { minWidth: '120px' },
                }}
              />
            </ToolbarItem>
            <ToolbarItem>
              <SearchInput
                placeholder={SEARCH_PLACEHOLDERS[searchColumn]}
                value={searchValue}
                onChange={handleSearchChange}
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <DashboardEmptyTableView onClearFilters={handleClearFilters} />
      </>
    );
  }

  return (
    <>
      <Toolbar id="lm-eval-result-toolbar">
        <ToolbarContent>
          <ToolbarItem>
            <SimpleSelect
              options={COLUMN_FILTER_OPTIONS}
              value={searchColumn}
              onChange={handleColumnChange}
              dataTestId="column-filter"
              toggleProps={{
                style: { minWidth: '120px' },
              }}
            />
          </ToolbarItem>
          <ToolbarItem>
            <SearchInput
              placeholder={SEARCH_PLACEHOLDERS[searchColumn]}
              value={searchValue}
              onChange={handleSearchChange}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      <Table variant={TableVariant.compact}>
        <Thead>
          <Tr>
            <Th>Task</Th>
            <Th>Metric</Th>
            <Th>Value</Th>
            <Th>Error</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredResults.length === 0 ? (
            <Tr>
              <Td
                colSpan={4}
                style={{ textAlign: 'center', padding: 'var(--pf-v5-global--spacer--lg)' }}
              >
                No evaluation results available
              </Td>
            </Tr>
          ) : (
            filteredResults.map((result, index) => (
              <Tr key={`${result.task}-${result.metric}-${index}`}>
                <Td dataLabel="Task">{result.task}</Td>
                <Td dataLabel="Metric">{result.metric}</Td>
                <Td dataLabel="Value">{result.value.toFixed(5)}</Td>
                <Td dataLabel="Error">{result.error ? `± ${result.error.toFixed(4)}` : '-'}</Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </>
  );
};

export default LMEvalResultTable;
