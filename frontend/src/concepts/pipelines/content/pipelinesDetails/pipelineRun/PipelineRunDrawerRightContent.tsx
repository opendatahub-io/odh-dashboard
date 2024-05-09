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
import './PipelineRunDrawer.scss';
import { PipelineTask } from '~/concepts/pipelines/topology';
import { Execution } from '~/third_party/mlmd';

type PipelineRunDrawerRightContentProps = {
  task?: PipelineTask;
  executions: Execution[];
  onClose: () => void;
};

const PipelineRunDrawerRightContent: React.FC<PipelineRunDrawerRightContentProps> = ({
  task,
  executions,
  onClose,
}) => {
  if (!task) {
    return null;
  }

  return (
    <DrawerPanelContent
      isResizable
      widths={{ default: 'width_33', lg: 'width_50' }}
      minSize="500px"
      data-testid="pipeline-run-drawer-right-content"
    >
      <DrawerHead>
        <Title headingLevel="h2" size="xl">
          {task.name} {task.type === 'artifact' ? 'Artifact details' : ''}
        </Title>
        {task.status?.podName && <Text component="small">{task.status.podName}</Text>}
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody className="pipeline-run__drawer-panel-body pf-v5-u-pr-sm">
        <PipelineRunDrawerRightTabs task={task} executions={executions} />
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default PipelineRunDrawerRightContent;
