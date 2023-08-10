import * as React from 'react';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Title,
} from '@patternfly/react-core';
import { PipelineRunTask } from '~/k8sTypes';
import PipelineTaskDetails from './PipelineTaskDetails';

type SelectedTaskDrawerContentProps = {
  task?: PipelineRunTask;
  onClose: () => void;
};

const SelectedTaskDrawerContent: React.FC<SelectedTaskDrawerContentProps> = ({ task, onClose }) => {
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
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <PipelineTaskDetails task={task} />
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default SelectedTaskDrawerContent;
