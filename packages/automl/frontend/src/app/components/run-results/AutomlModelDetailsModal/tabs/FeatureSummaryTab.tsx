import React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  SearchInput,
  Skeleton,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { Table, Thead, Tbody, Tr, Th, Td, type ThProps } from '@patternfly/react-table';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';

type SortColumn = 'name' | 'importance';

const FeatureSummaryTab: React.FC<TabContentProps> = ({
  featureImportance,
  isArtifactsLoading,
}) => {
  const [searchValue, setSearchValue] = React.useState('');
  const [sortColumn, setSortColumn] = React.useState<SortColumn>('importance');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  const allEntries = React.useMemo(
    () =>
      featureImportance
        ? Object.entries(featureImportance.importance).toSorted(([, a], [, b]) => b - a)
        : [],
    [featureImportance],
  );

  const hasFeatureData = allEntries.length > 0;

  React.useEffect(() => {
    if (!hasFeatureData) {
      setSearchValue('');
    }
  }, [hasFeatureData]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection(column === 'name' ? 'asc' : 'desc');
    }
  };

  const sortBy = {
    index: sortColumn === 'name' ? 0 : 1,
    direction: sortDirection,
  };

  const nameSortParams: ThProps['sort'] = {
    sortBy,
    onSort: () => handleSort('name'),
    columnIndex: 0,
  };

  const importanceSortParams: ThProps['sort'] = {
    sortBy,
    onSort: () => handleSort('importance'),
    columnIndex: 1,
  };

  if (isArtifactsLoading) {
    return (
      <Table aria-label="Feature importance loading" variant="compact">
        <Thead>
          <Tr>
            <Th sort={nameSortParams}>Feature name</Th>
            <Th sort={importanceSortParams}>Importance</Th>
          </Tr>
        </Thead>
        <Tbody>
          {Array.from({ length: 5 }, (_, i) => (
            <Tr key={i}>
              <Td>
                <Skeleton width="60%" />
              </Td>
              <Td>
                <Skeleton width="40%" />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    );
  }

  const filtered = allEntries.filter(([name]) =>
    name.toLowerCase().includes(searchValue.toLowerCase()),
  );

  const entries = filtered.toSorted(([nameA, impA], [nameB, impB]) => {
    const mult = sortDirection === 'asc' ? 1 : -1;
    if (sortColumn === 'name') {
      return mult * nameA.localeCompare(nameB);
    }
    return mult * (impA - impB);
  });

  return (
    <>
      {hasFeatureData && (
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <SearchInput
                className="odh-autox-print-hide-element"
                placeholder="Search by feature name"
                value={searchValue}
                onChange={(_e, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
                data-testid="feature-search"
                inputProps={{ 'data-testid': 'feature-search-input' }}
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      )}
      <Table
        aria-label="Feature importance"
        variant="compact"
        className="automl-feature-summary-table"
      >
        <Thead>
          <Tr>
            <Th sort={nameSortParams}>Feature name</Th>
            <Th sort={importanceSortParams}>Importance</Th>
          </Tr>
        </Thead>
        <Tbody>
          {entries.length === 0 ? (
            <Tr>
              <Td colSpan={2}>
                <Bullseye>
                  {searchValue ? (
                    <EmptyState
                      variant={EmptyStateVariant.sm}
                      icon={SearchIcon}
                      titleText="No matching features"
                      data-testid="feature-search-empty-state"
                    >
                      <EmptyStateBody>
                        No features match your search. Try adjusting your search criteria.
                      </EmptyStateBody>
                    </EmptyState>
                  ) : (
                    <EmptyState
                      variant={EmptyStateVariant.sm}
                      titleText="No feature data available"
                      data-testid="feature-no-data-empty-state"
                    >
                      <EmptyStateBody>
                        Feature importance data is not available for this model.
                      </EmptyStateBody>
                    </EmptyState>
                  )}
                </Bullseye>
              </Td>
            </Tr>
          ) : (
            entries.map(([name, importance]) => (
              <Tr key={name}>
                <Td dataLabel="Feature name">{name}</Td>
                <Td dataLabel="Importance">
                  <div className="automl-feature-importance-cell">
                    <div className="automl-feature-importance-track">
                      <div
                        className={`automl-feature-importance-bar${importance !== 0 ? ' m-has-value' : ''}${importance < 0 && Math.abs(importance * 100) >= 0.005 ? ' m-negative' : ''}`}
                        data-testid={`feature-importance-bar-${name}`}
                        style={{
                          width: `${Math.min(Math.abs(importance) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span>
                      {(Math.abs(importance * 100) < 0.005 ? 0 : importance * 100).toFixed(1)}%
                    </span>
                  </div>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </>
  );
};

export default FeatureSummaryTab;
