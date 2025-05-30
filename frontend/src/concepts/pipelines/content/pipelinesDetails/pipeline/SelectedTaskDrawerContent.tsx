import * as React from 'react';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  Title,
} from '@patternfly/react-core';
import { PipelineTask } from '#~/concepts/pipelines/topology';
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
    // TODO: Revisit below approach, either to further to look into what caused the content to not render or
    // to restructure the code -- see  https://issues.redhat.com/browse/RHOAIENG-23537
    <div
      className="pf-v6-c-drawer__panel"
      data-testid="task-drawer"
      // TODO: look into removing this inline style; PF Drawers should handle height/scrolling by default
      style={{ height: '100%', overflowY: 'auto' }}
    >
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
    </div>
  );
};

export default SelectedTaskDrawerContent;
