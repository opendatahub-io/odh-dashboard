import React from 'react';
import {
  SearchInput,
  Skeleton,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';

const FeatureSummaryTab: React.FC<TabContentProps> = ({ featureImportance }) => {
  const [searchValue, setSearchValue] = React.useState('');

  if (!featureImportance) {
    return (
      <Table aria-label="Feature importance loading" variant="compact">
        <Thead>
          <Tr>
            <Th>Feature name</Th>
            <Th>Importance</Th>
            <Th />
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

  const entries = Object.entries(featureImportance.importance)
    .toSorted(([, a], [, b]) => b - a)
    .filter(([name]) => name.toLowerCase().includes(searchValue.toLowerCase()));

  const importanceValues = Object.values(featureImportance.importance);
  const maxImportance = importanceValues.length > 0 ? Math.max(...importanceValues) : 0;

  return (
    <>
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
      <Table aria-label="Feature importance" variant="compact">
        <Thead>
          <Tr>
            <Th>Feature name</Th>
            <Th>Importance</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {entries.map(([name, importance]) => (
            <Tr key={name}>
              <Td dataLabel="Feature name">{name}</Td>
              <Td dataLabel="Importance">{(importance * 100).toFixed(2)}%</Td>
              <Td>
                <div
                  style={{
                    width: `${maxImportance > 0 ? (importance / maxImportance) * 100 : 0}%`,
                    height: 12,
                    backgroundColor: 'var(--pf-t--global--color--brand--default)',
                    borderRadius: 2,
                    minWidth: 4,
                  }}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </>
  );
};

export default FeatureSummaryTab;
