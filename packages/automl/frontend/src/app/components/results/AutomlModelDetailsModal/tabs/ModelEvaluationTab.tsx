import React from 'react';
import { Title } from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { TabContentProps } from '~/app/components/results/AutomlModelDetailsModal/tabConfig';

/** Format metric keys from snake_case to Title Case. */
function formatMetricName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/** AutoGluon reports some metrics as negative (lower-is-better). Display absolute values. */
function formatMetricValue(value: number): string {
  return Math.abs(value).toFixed(3);
}

const ModelEvaluationTab: React.FC<TabContentProps> = ({ model }) => {
  const metrics = model.context.metrics.test_data;
  const entries = Object.entries(metrics);

  return (
    <>
      <Title headingLevel="h3" className="pf-v6-u-mb-md">
        Model evaluation measure
      </Title>
      <Table aria-label="Evaluation metrics" variant="compact">
        <Thead>
          <Tr>
            <Th>Measures</Th>
            <Th>Holdout score</Th>
          </Tr>
        </Thead>
        <Tbody>
          {entries.map(([key, value]) => (
            <Tr key={key}>
              <Td dataLabel="Measures">{formatMetricName(key)}</Td>
              <Td dataLabel="Holdout score">{formatMetricValue(value)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </>
  );
};

export default ModelEvaluationTab;
