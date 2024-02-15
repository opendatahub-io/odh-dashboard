import * as React from 'react';
import { Tooltip } from '@patternfly/react-core';
import {
  asTimestamp,
  DetailItem,
  renderDetailItems,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';
import { PipelineRunTaskDetails } from '~/concepts/pipelines/content/types';
import { relativeDuration } from '~/utilities/time';

type SelectedNodeDetailsTabProps = {
  task: PipelineRunTaskDetails;
};

const SelectedNodeDetailsTab: React.FC<SelectedNodeDetailsTabProps> = ({ task }) => {
  let details: DetailItem[];

  const taskName = {
    key: 'Task name',
    value:
      task.taskSpec.metadata?.annotations?.['pipelines.kubeflow.org/task_display_name'] ||
      task.name,
  };

  if (task.skipped) {
    details = [taskName, { key: 'Status', value: 'Skipped' }];
  } else if (task.runDetails) {
    const startDate =
      task.runDetails.status?.startTime && new Date(task.runDetails.status.startTime);
    const endDate =
      task.runDetails.status?.completionTime && new Date(task.runDetails.status.completionTime);
    const statusCondition = task.runDetails.status?.conditions?.find((c) => c.type === 'Succeeded');

    details = [
      { key: 'Task ID', value: task.runDetails.runID || '-' },
      taskName,
      {
        key: 'Status',
        value: statusCondition ? (
          <Tooltip content={statusCondition.message}>
            <div>{statusCondition.reason}</div>
          </Tooltip>
        ) : (
          '-'
        ),
      },
      {
        key: 'Started at',
        value: startDate ? asTimestamp(startDate) : '-',
      },
      {
        key: 'Finished at',
        value: endDate ? asTimestamp(endDate) : '-',
      },
      {
        key: 'Duration',
        value:
          startDate && endDate ? relativeDuration(endDate.getTime() - startDate.getTime()) : '-',
      },
    ];
  } else {
    details = [taskName];
  }

  return <>{renderDetailItems(details)}</>;
};

export default SelectedNodeDetailsTab;
