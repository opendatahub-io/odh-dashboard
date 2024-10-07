import * as React from 'react';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Content,
  Title,
} from '@patternfly/react-core';
import PipelineRunDrawerRightTabs from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightTabs';
import './PipelineRunDrawer.scss';
import { PipelineTask } from '~/concepts/pipelines/topology';
import { Execution } from '~/third_party/mlmd';
import { ArtifactNodeDrawerContent } from './artifacts';

type PipelineRunDrawerRightContentProps = {
  task?: PipelineTask;
  executions: Execution[];
  upstreamTaskName?: string;
  onClose: () => void;
};

const PipelineRunDrawerRightContent: React.FC<PipelineRunDrawerRightContentProps> = ({
  task,
  executions,
  upstreamTaskName,
  onClose,
}) => {
  if (!task) {
    return null;
  }

  return (
    <DrawerPanelContent
      data-testid="pipeline-run-drawer-right-content"
      style={{ height: '100%', overflowY: 'auto' }}
    >
      {task.type === 'artifact' ? (
        <ArtifactNodeDrawerContent
          upstreamTaskName={upstreamTaskName}
          task={task}
          onClose={onClose}
        />
      ) : (
        <>
          <DrawerHead>
            <Title headingLevel="h2" size="xl">
              {task.name}
            </Title>
            {task.status?.podName && <Content component="small">{task.status.podName}</Content>}
            <DrawerActions>
              <DrawerCloseButton onClick={onClose} />
            </DrawerActions>
          </DrawerHead>
          <DrawerPanelBody className="pipeline-run__drawer-panel-body pf-v6-u-pr-sm">
            <PipelineRunDrawerRightTabs task={task} executions={executions} />
          </DrawerPanelBody>
        </>
      )}
    </DrawerPanelContent>
  );
};

export default PipelineRunDrawerRightContent;
