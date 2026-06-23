import React from 'react';
import { Bullseye, Spinner, Title } from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import {
  CLASSIFICATION_TYPES,
  type TabContentProps,
} from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import { formatMetricName, formatMetricValue, toNumericMetric } from '~/app/utilities/utils';
import ROCCurveChart from '~/app/components/run-results/AutomlModelDetailsModal/components/ROCCurveChart';

const ModelEvaluationTab: React.FC<TabContentProps> = ({
  model,
  taskType,
  curves,
  isArtifactsLoading,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: test_data may be missing in malformed model.json
  const metrics = model.metrics.test_data ?? {};
  const entries = Object.entries(metrics);
  const isClassification = CLASSIFICATION_TYPES.includes(taskType);

  if (entries.length === 0) {
    return <p>No evaluation metrics available for this model.</p>;
  }

  return (
    <>
      {isClassification && (
        <div className="pf-v6-u-mb-xl" data-testid="roc-curve-section">
          {isArtifactsLoading ? (
            <Bullseye>
              <Spinner size="lg" aria-label="Loading ROC curve data" />
            </Bullseye>
          ) : curves ? (
            <ROCCurveChart rocCurveData={curves} />
          ) : (
            <p data-testid="roc-curve-no-data">
              ROC curve data is not available for this model. This data may be generated if the
              training run is submitted again.
            </p>
          )}
        </div>
      )}

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
              <Td dataLabel="Holdout score">{formatMetricValue(toNumericMetric(value))}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </>
  );
};

export default ModelEvaluationTab;
