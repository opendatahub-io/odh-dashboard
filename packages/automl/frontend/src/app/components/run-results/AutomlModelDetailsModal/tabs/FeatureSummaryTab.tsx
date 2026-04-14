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
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';

const FeatureSummaryTab: React.FC<TabContentProps> = ({
  featureImportance,
  isArtifactsLoading,
}) => {
  const [searchValue, setSearchValue] = React.useState('');

  const allEntries = React.useMemo(
    () =>
      featureImportance
        ? Object.entries(featureImportance.importance).toSorted(([, a], [, b]) => b - a)
        : [],
    [featureImportance],
  );

  const maxImportance = React.useMemo(() => {
    if (!featureImportance) {
      return 0;
    }
    const importanceValues = Object.values(featureImportance.importance);
    return importanceValues.length > 0 ? Math.max(...importanceValues.map(Math.abs)) : 0;
  }, [featureImportance]);

  const hasFeatureData = allEntries.length > 0;

  // Clear stale search when switching to a model with no feature data
  React.useEffect(() => {
    if (!hasFeatureData) {
      setSearchValue('');
    }
  }, [hasFeatureData]);

  if (isArtifactsLoading) {
    return (
      <Table aria-label="Feature importance loading" variant="compact">
        <Thead>
          <Tr>
            <Th>Feature name</Th>
            <Th>Importance</Th>
            <Th screenReaderText="Importance bar" />
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
              <Td>
                <Skeleton width="80%" height="12px" />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    );
  }

  const entries = allEntries.filter(([name]) =>
    name.toLowerCase().includes(searchValue.toLowerCase()),
  );

  return (
    <>
      {hasFeatureData && (
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <SearchInput
                placeholder="Search feature names"
                value={searchValue}
                onChange={(_e, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
                data-testid="feature-search"
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      )}
      <Table aria-label="Feature importance" variant="compact">
        <Thead>
          <Tr>
            <Th>Feature name</Th>
            <Th>Importance</Th>
            <Th screenReaderText="Importance bar" />
          </Tr>
        </Thead>
        <Tbody>
          {entries.length === 0 ? (
            <Tr>
              <Td colSpan={3}>
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
                {/* Clamp near-zero values to 0 to avoid displaying "-0.00%" */}
                <Td dataLabel="Importance">
                  {(Math.abs(importance * 100) < 0.005 ? 0 : importance * 100).toFixed(2)}%
                </Td>
                <Td>
                  <div
                    className={`automl-feature-importance-bar${importance !== 0 ? ' m-has-value' : ''}${importance < 0 && Math.abs(importance * 100) >= 0.005 ? ' m-negative' : ''}`}
                    data-testid={`feature-importance-bar-${name}`}
                    style={{
                      width: `${maxImportance > 0 ? (Math.abs(importance) / maxImportance) * 100 : 0}%`,
                    }}
                  />
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
