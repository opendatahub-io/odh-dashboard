import React from 'react';

import {
  DrawerHead,
  Title,
  Content,
  DrawerActions,
  DrawerCloseButton,
  DrawerPanelBody,
  Tabs,
  Tab,
  TabTitleText,
  EmptyState,
  EmptyStateVariant,
} from '@patternfly/react-core';

import PipelineRunDrawerRightContent from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightContent';
import { isMetricsArtifactType } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';
import { ArtifactNodeDetails } from './ArtifactNodeDetails';
import { ArtifactVisualization } from './ArtifactVisualization';

type ArtifactNodeDrawerContentProps = Omit<
  React.ComponentProps<typeof PipelineRunDrawerRightContent>,
  'executions'
>;

enum ArtifactNodeDrawerTab {
  Details = 'details',
  Visualization = 'visualization',
}

export const ArtifactNodeDrawerContent: React.FC<ArtifactNodeDrawerContentProps> = ({
  task,
  upstreamTaskName,
  onClose,
}) => {
  const [activeTab, setActiveTab] = React.useState<string | number>(ArtifactNodeDrawerTab.Details);
  const artifact = task?.metadata;

  return task ? (
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
        {artifact ? (
          <Tabs
            aria-label="Artifact node detail tabs"
            activeKey={activeTab}
            onSelect={(_, tabName: string | number) => setActiveTab(tabName)}
            style={{ flexShrink: 0 }}
          >
            <Tab
              eventKey={ArtifactNodeDrawerTab.Details}
              title={<TabTitleText>Artifact details</TabTitleText>}
              aria-label="Artifact details"
            >
              <ArtifactNodeDetails artifact={artifact} upstreamTaskName={upstreamTaskName} />
            </Tab>
            {isMetricsArtifactType(artifact.getType()) && (
              <Tab
                eventKey={ArtifactNodeDrawerTab.Visualization}
                title={<TabTitleText>Visualization</TabTitleText>}
                aria-label="Visualization"
              >
                <ArtifactVisualization artifact={artifact} />
              </Tab>
            )}
          </Tabs>
        ) : (
          <EmptyState
            headingLevel="h4"
            titleText="Content is not available yet."
            variant={EmptyStateVariant.xs}
          />
        )}
      </DrawerPanelBody>
    </>
  ) : null;
};
