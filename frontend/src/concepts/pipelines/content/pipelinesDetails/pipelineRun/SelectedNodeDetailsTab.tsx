import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';
import {
  asTimestamp,
  DetailItem,
  renderDetailItems,
} from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';
import { relativeDuration } from '#~/utilities/time';
import { RuntimeStateKF } from '#~/concepts/pipelines/kfTypes';
import { PipelineTask } from '#~/concepts/pipelines/topology';
import TaskDetailsSection from '#~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsSection';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { getIsArtifactModelRegistered } from '#~/pages/pipelines/global/experiments/artifacts/utils';
import { getArtifactModelData } from './artifacts/utils';
import PipelineRunRegisteredModelDetails from './PipelineRunRegisteredModelDetails';

type SelectedNodeDetailsTabProps = {
  task: PipelineTask;
};

const SelectedNodeDetailsTab: React.FC<SelectedNodeDetailsTabProps> = ({ task }) => {
  let details: DetailItem[];

  const taskName = {
    key: 'Task name',
    value: task.name,
  };

  const artifacts = task.outputs?.artifacts;

  const { status: modelRegistryAvailable } = useIsAreaAvailable(SupportedArea.MODEL_REGISTRY);

  const artifactModelData = React.useMemo(() => {
    if (!modelRegistryAvailable || !artifacts) {
      return [];
    }

    return artifacts
      .filter((artifactInputOutput) => getIsArtifactModelRegistered(artifactInputOutput.value))
      .map((artifactInputOutput) => {
        const artifact = artifactInputOutput.value;
        return getArtifactModelData(artifact);
      });
  }, [artifacts, modelRegistryAvailable]);

  const isModelRegistered = artifactModelData.length > 0;

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

  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsXl' }}>
      <FlexItem>
        <TaskDetailsSection title="Task details" testId="task-details">
          {renderDetailItems(details)}
        </TaskDetailsSection>
      </FlexItem>
      {isModelRegistered && (
        <FlexItem>
          <TaskDetailsSection title="Registered models" testId="registered-models">
            {renderDetailItems([
              {
                key: 'Name',
                value: (
                  <>
                    {artifactModelData.length ? (
                      artifactModelData.map((data) => (
                        <PipelineRunRegisteredModelDetails
                          key={data.modelVersionId}
                          artifactModelData={data}
                        />
                      ))
                    ) : (
                      <span>No model details available</span>
                    )}
                  </>
                ),
              },
            ])}
          </TaskDetailsSection>
        </FlexItem>
      )}
    </Flex>
  );
};

export default SelectedNodeDetailsTab;
