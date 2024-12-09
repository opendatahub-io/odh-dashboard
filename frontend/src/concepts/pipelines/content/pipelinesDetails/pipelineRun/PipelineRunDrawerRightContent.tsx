import * as React from 'react';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Flex,
  Popover,
  Title,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import PipelineRunDrawerRightTabs from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightTabs';
import './PipelineRunDrawer.scss';
import { PipelineTask } from '~/concepts/pipelines/topology';
import { Execution } from '~/third_party/mlmd';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import InlineTruncatedClipboardCopy from '~/components/InlineTruncatedClipboardCopy';
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
            {task.status?.podName && (
              <Flex
                display={{ default: 'inlineFlex' }}
                spaceItems={{ default: 'spaceItemsXs' }}
                flexWrap={{ default: 'nowrap' }}
              >
                <InlineTruncatedClipboardCopy
                  testId="podname-copy"
                  textToCopy={task.status.podName}
                />
                <Popover bodyContent="This is the pod name of the run execution in OpenShift">
                  <DashboardPopupIconButton
                    icon={<OutlinedQuestionCircleIcon />}
                    aria-label="More info"
                  />
                </Popover>
              </Flex>
            )}
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
