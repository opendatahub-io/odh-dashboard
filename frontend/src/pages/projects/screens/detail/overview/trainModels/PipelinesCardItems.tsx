import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Flex, FlexItem, Content } from '@patternfly/react-core';
import { PipelineKF } from '#~/concepts/pipelines/kfTypes';
import { ProjectKind } from '#~/k8sTypes';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';

interface PipelineCardItemsProps {
  pipelines: PipelineKF[];
  loaded?: boolean;
  error?: Error;
  totalCount?: number;
  currentProject: ProjectKind;
}

const PipelineCardItems: React.FC<PipelineCardItemsProps> = ({
  pipelines,
  loaded,
  error,
  totalCount = 0,
  currentProject,
}) => {
  const navigate = useNavigate();

  if (!loaded || error) {
    return [];
  }

  const listItems = pipelines.slice(0, 5);
  return (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapSm' }}>
      {listItems.map((pipeline) => (
        <div key={pipeline.pipeline_id}>{pipeline.display_name}</div>
      ))}
      <Flex key="count" gap={{ default: 'gapMd' }}>
        <FlexItem>
          <Content>
            <Content component="small">
              {listItems.length} of {totalCount} pipelines
            </Content>
          </Content>
        </FlexItem>
        <FlexItem>
          <Button
            id="pipelines-view-all"
            aria-labelledby="pipelines-view-all Pipelines-title"
            variant="link"
            onClick={() =>
              navigate(
                `/projects/${currentProject.metadata.name}?section=${ProjectSectionID.PIPELINES}`,
              )
            }
          >
            View all
          </Button>
        </FlexItem>
      </Flex>
    </Flex>
  );
};

export default PipelineCardItems;
