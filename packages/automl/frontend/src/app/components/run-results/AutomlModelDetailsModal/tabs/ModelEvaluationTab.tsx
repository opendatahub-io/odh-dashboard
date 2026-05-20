import React from 'react';
import { Title } from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import { formatMetricName, formatMetricValue, toNumericMetric } from '~/app/utilities/utils';
import { TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS } from '~/app/utilities/const';
import {
  mockBinaryRocCurveData,
  mockMulticlassRocCurveData,
} from '~/app/mocks/mockAutomlResultsContext';
import type { RocCurveData, TaskType } from '~/app/types';
import ROCCurveChart from '~/app/components/run-results/AutomlModelDetailsModal/components/ROCCurveChart';

const CLASSIFICATION_TYPES: TaskType[] = [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS];

function getMockRocCurveData(taskType: TaskType, modelName: string): RocCurveData | undefined {
  if (taskType === TASK_TYPE_BINARY) {
    return mockBinaryRocCurveData;
  }
  if (taskType === TASK_TYPE_MULTICLASS) {
    const multiclassModels = Object.values(mockMulticlassRocCurveData);
    return mockMulticlassRocCurveData[modelName] ?? multiclassModels[0];
  }
  return undefined;
}

const ModelEvaluationTab: React.FC<TabContentProps> = ({ model, taskType }) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: test_data may be missing in malformed model.json
  const metrics = model.metrics.test_data ?? {};
  const entries = Object.entries(metrics);
  const isClassification = CLASSIFICATION_TYPES.includes(taskType);

  // TODO: Replace mock data with real S3 data once the backend provides curves.json
  const rocCurveData = isClassification ? getMockRocCurveData(taskType, model.name) : undefined;

  if (entries.length === 0) {
    return <p>No evaluation metrics available for this model.</p>;
  }

  return (
    <>
      {isClassification && (
        <div className="pf-v6-u-mb-xl" data-testid="roc-curve-section">
          {rocCurveData ? (
            <ROCCurveChart rocCurveData={rocCurveData} />
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
