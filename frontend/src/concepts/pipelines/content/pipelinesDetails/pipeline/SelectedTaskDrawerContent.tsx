import * as React from 'react';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Title,
} from '@patternfly/react-core';
import { PipelineTask } from '~/concepts/pipelines/topology';
import PipelineTaskDetails from './PipelineTaskDetails';

type SelectedTaskDrawerContentProps = {
  task?: PipelineTask;
  onClose: () => void;
};

const SelectedTaskDrawerContent: React.FC<SelectedTaskDrawerContentProps> = ({ task, onClose }) => {
  if (!task) {
    return null;
  }

  return (
    <DrawerPanelContent data-testid="task-drawer" style={{ height: '100%', overflowY: 'auto' }}>
      <DrawerHead>
        <Title headingLevel="h2" size="xl" data-testid="pipeline-task-name">
          {task.name} {task.type === 'artifact' ? 'Artifact details' : ''}
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
