import * as React from 'react';
import {
  asTimestamp,
  DetailItem,
  renderDetailItems,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';
import { relativeDuration } from '~/utilities/time';
import { RuntimeStateKF } from '~/concepts/pipelines/kfTypes';
import { PipelineTask } from '~/concepts/pipelines/topology';

type SelectedNodeDetailsTabProps = {
  task: PipelineTask;
};

const SelectedNodeDetailsTab: React.FC<SelectedNodeDetailsTabProps> = ({ task }) => {
  let details: DetailItem[];

  const taskName = {
    key: 'Task name',
    value: task.name,
  };

  if (task.status) {
    const { startTime, completeTime, state } = task.status;
    const skipped = state === RuntimeStateKF.SKIPPED;

    if (skipped) {
      details = [taskName, { key: 'Status', value: 'Skipped' }];
    } else {
      const startDate = startTime && new Date(startTime);
      const endDate = completeTime && new Date(completeTime);

      details = [
        { key: 'Task ID', value: task.status.taskId || '-' },
        taskName,
        {
          key: 'Status',
          value: state ?? '-',
        },
        {
          key: 'Started',
          value: startDate ? asTimestamp(startDate) : '-',
        },
        {
          key: 'Finished',
          value: endDate ? asTimestamp(endDate) : '-',
        },
        {
          key: 'Duration',
          value:
            startDate && endDate ? relativeDuration(endDate.getTime() - startDate.getTime()) : '-',
        },
      ];
    }
  } else {
    details = [taskName];
  }

  return <>{renderDetailItems(details)}</>;
};

export default SelectedNodeDetailsTab;
