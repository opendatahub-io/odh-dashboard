import React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import { formatMetricName, formatMetricValue, toNumericMetric } from '~/app/utilities/utils';

const ModelEvaluationTab: React.FC<TabContentProps> = ({ model }) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: test_data may be missing in malformed model.json
  const metrics = model.metrics.test_data ?? {};
  const entries = Object.entries(metrics);

  if (entries.length === 0) {
    return <p>No evaluation metrics available for this model.</p>;
  }

  return (
    <Table aria-label="Evaluation metrics" variant="compact" className="automl-evaluation-table">
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
            <Td dataLabel="Holdout score">{formatMetricValue(toNumericMetric(value))}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default ModelEvaluationTab;
