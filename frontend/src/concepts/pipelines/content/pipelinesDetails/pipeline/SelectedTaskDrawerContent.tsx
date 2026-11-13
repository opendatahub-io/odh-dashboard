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
    <>
      <DrawerHead>
        <Title headingLevel="h2" size="xl" tabIndex={-1} data-testid="pipeline-drawer-task-title">
          {task.name} {task.type === 'artifact' ? 'Artifact details' : ''}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      {/* TODO: Revert the custom classname once
      https://github.com/patternfly/patternfly-react/issues/11804 is resolved */}
      <DrawerPanelBody data-testid="task-drawer" className="pf-v6-u-p-md">
        <PipelineTaskDetails task={task} />
      </DrawerPanelBody>
    </>
  );
};

export default SelectedTaskDrawerContent;
