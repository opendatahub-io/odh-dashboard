import * as React from 'react';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Text,
  Title,
} from '@patternfly/react-core';
import PipelineRunDrawerRightTabs from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightTabs';
import { TaskReferenceMap, PipelineRunTaskDetails } from '~/concepts/pipelines/content/types';

type PipelineRunDrawerRightContentProps = {
  task?: PipelineRunTaskDetails;
  taskReferences: TaskReferenceMap;
  onClose: () => void;
};

const PipelineRunDrawerRightContent: React.FC<PipelineRunDrawerRightContentProps> = ({
  task,
  taskReferences,
  onClose,
}) => {
  if (!task) {
    return null;
  }

  return (
    <DrawerPanelContent
      isResizable
      widths={{ default: 'width_33', lg: 'width_50' }}
      minSize="300px"
    >
      <DrawerHead>
        <Title headingLevel="h2" size="xl">
          {task.taskSpec.metadata?.annotations?.['pipelines.kubeflow.org/task_display_name'] ||
            task.name}
        </Title>
        {task.runDetails && <Text component="small">{task.runDetails.status.podName}</Text>}
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <PipelineRunDrawerRightTabs taskReferences={taskReferences} task={task} />
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default PipelineRunDrawerRightContent;
