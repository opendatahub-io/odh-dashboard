import {
  Breadcrumb,
  Divider,
  ContentVariants,
  Flex,
  FlexItem,
  Content,
} from '@patternfly/react-core';
import React from 'react';
import { Link } from 'react-router';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { IconSize } from '#~/types.ts';
import { ProjectIconWithSize } from '#~/concepts/projects/ProjectIconWithSize.tsx';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils.ts';
import '#~/pages/pipelines/global/GlobalPipelineCoreDetails.scss';

type PipelineContextBreadcrumbProps = {
  children: React.ReactNode;
  dataTestId?: string;
};

const PipelineContextBreadcrumb: React.FC<PipelineContextBreadcrumbProps> = ({
  children,
  dataTestId,
}) => {
  const { project } = usePipelinesAPI();

  return (
    <Breadcrumb data-testid={dataTestId}>
      {children}
      <Flex>
        <Divider orientation={{ default: 'vertical' }} />
        <FlexItem data-testid="project-navigator-link">
          <Content component={ContentVariants.small}>
            <Link to={`/projects/${project.metadata.name}`} className="link-button-with-icon">
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsXs' }}
              >
                <FlexItem>Go to</FlexItem>
                <ProjectIconWithSize size={IconSize.MD} />
                <FlexItem>
                  <strong>{getDisplayNameFromK8sResource(project)}</strong>
                </FlexItem>
              </Flex>
            </Link>
          </Content>
        </FlexItem>
      </Flex>
    </Breadcrumb>
  );
};

export default PipelineContextBreadcrumb;
