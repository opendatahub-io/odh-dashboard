import React from 'react';
import { Title } from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import {
  formatMetricName,
  formatMetricValue as formatValue,
  toNumericMetric,
  isErrorMetric,
} from '~/app/utilities/utils';

/** Format a metric value for display. Only apply Math.abs() for error metrics (lower-is-better). */
function formatMetricValue(key: string, value: unknown): string {
  const rawMetricValue = toNumericMetric(value);
  const absoluteValue = isErrorMetric(key) ? Math.abs(rawMetricValue) : rawMetricValue;
  return formatValue(absoluteValue);
}

const ModelEvaluationTab: React.FC<TabContentProps> = ({ model }) => {
  const metrics = model.metrics.test_data ?? {};
  const entries = Object.entries(metrics);

  if (entries.length === 0) {
    return <p>No evaluation metrics available for this model.</p>;
  }

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
              <Td dataLabel="Holdout score">{formatMetricValue(key, value)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </>
  );
};

export default ModelEvaluationTab;
