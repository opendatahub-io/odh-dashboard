import React from 'react';
import { Title } from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { TabContentProps } from '~/app/components/results/AutomlModelDetailsModal/tabConfig';
import { formatMetricName, toNumericMetric } from '~/app/utilities/utils';

/** AutoGluon reports some metrics as negative (lower-is-better). Display absolute values. */
function formatMetricValue(value: unknown): string {
  return Math.abs(toNumericMetric(value)).toFixed(3);
}

const ModelEvaluationTab: React.FC<TabContentProps> = ({ model }) => {
  const metrics = model.metrics.test_data;
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
