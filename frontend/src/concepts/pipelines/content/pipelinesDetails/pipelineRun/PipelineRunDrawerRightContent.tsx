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
import PipelineRunDrawerRightTabs from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightTabs';

type PipelineRunDrawerRightContentProps = {
  task?: PipelineRunTask;
  onClose: () => void;
};

const PipelineRunDrawerRightContent: React.FC<PipelineRunDrawerRightContentProps> = ({
  task,
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
          {task.name}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <PipelineRunDrawerRightTabs task={task} />
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default PipelineRunDrawerRightContent;
