import React from 'react';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import { TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS } from '~/app/utilities/const';
import {
  mockBinaryPrecisionRecallData,
  mockMulticlassPrecisionRecallData,
} from '~/app/mocks/mockAutomlResultsContext';
import type { PrecisionRecallData, TaskType } from '~/app/types';
import PrecisionRecallChart from '~/app/components/run-results/AutomlModelDetailsModal/components/PrecisionRecallChart';

function getMockPrecisionRecallData(
  taskType: TaskType,
  modelName: string,
): PrecisionRecallData | undefined {
  if (taskType === TASK_TYPE_BINARY) {
    return mockBinaryPrecisionRecallData;
  }
  if (taskType === TASK_TYPE_MULTICLASS) {
    const multiclassModels = Object.values(mockMulticlassPrecisionRecallData);
    return mockMulticlassPrecisionRecallData[modelName] ?? multiclassModels[0];
  }
  return undefined;
}

const PrecisionRecallTab: React.FC<TabContentProps> = ({ model, taskType }) => {
  // TODO: Replace mock data with real S3 data once the backend provides curves.json
  const prData = getMockPrecisionRecallData(taskType, model.name);

  if (!prData) {
    return (
      <p data-testid="precision-recall-no-data">
        Precision-recall curve data is not available for this model. This data may be generated if
        the training run is submitted again.
      </p>
    );
  }

  return <PrecisionRecallChart prData={prData} />;
};

export default PrecisionRecallTab;
