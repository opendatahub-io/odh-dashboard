import React from 'react';
import {
  Bullseye,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Title,
} from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { TabContentProps } from '../tabConfig';

const FeatureSummaryTab: React.FC<TabContentProps> = ({ featureImportance }) => {
  const [searchValue, setSearchValue] = React.useState('');

  if (!featureImportance) {
    return (
      <Bullseye>
        <Title headingLevel="h3">Loading feature importance data...</Title>
      </Bullseye>
    );
  }

  const entries = Object.entries(featureImportance.importance)
    .toSorted(([, a], [, b]) => b - a)
    .filter(([name]) => name.toLowerCase().includes(searchValue.toLowerCase()));

  const maxImportance = Math.max(...Object.values(featureImportance.importance));

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
                    width: `${(importance / maxImportance) * 100}%`,
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
