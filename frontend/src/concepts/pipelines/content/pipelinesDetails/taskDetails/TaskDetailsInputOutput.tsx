import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import TaskDetailsSection from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsSection';
import TaskDetailsPrintKeyValues from '~/concepts/pipelines/content/pipelinesDetails/taskDetails/TaskDetailsPrintKeyValues';
import { PipelineTaskArtifact } from '~/concepts/pipelines/topology';
import { ArtifactUriLink } from '~/concepts/pipelines/content/artifacts/ArtifactUriLink';

type TaskDetailsInputOutputProps = {
  type: 'Input' | 'Output';
  artifacts?: PipelineTaskArtifact[];
  params?: React.ComponentProps<typeof TaskDetailsPrintKeyValues>['items'];
};

const TaskDetailsInputOutput: React.FC<TaskDetailsInputOutputProps> = ({
  artifacts,
  params,
  type,
}) => {
  const artifactKeyValues = React.useMemo(() => {
    if (!artifacts) {
      return [];
    }

    return artifacts.map((artifactInputOutput) => {
      const artifact = artifactInputOutput.value;

      if (artifact) {
        return {
          label: artifactInputOutput.label,
          value: <ArtifactUriLink artifact={artifact} />,
        };
      }

      return {
        label: artifactInputOutput.label,
        value: artifactInputOutput.type,
      };
    });
  }, [artifacts]);

  if (!params && !artifacts) {
    return null;
  }

  return (
    <Stack hasGutter>
      {artifacts && (
        <StackItem>
          <TaskDetailsSection title={`${type} artifacts`} testId={`${type}-artifacts`}>
            <TaskDetailsPrintKeyValues items={artifactKeyValues} />
          </TaskDetailsSection>
        </StackItem>
      )}
      {params && (
        <StackItem>
          <TaskDetailsSection title={`${type} parameters`} testId={`${type}-parameters`}>
            <TaskDetailsPrintKeyValues items={params} />
          </TaskDetailsSection>
        </StackItem>
      )}
    </Stack>
  );
};

export default TaskDetailsInputOutput;
