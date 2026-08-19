import {
  Breadcrumb,
  BreadcrumbItem,
  Content,
  ContentVariants,
  Divider,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { ProjectIconWithSize } from '@odh-dashboard/ui-core/components/projectSelector/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/ui-core/types';
import React from 'react';
import { Link } from 'react-router-dom';
import './ExperimentContextBreadcrumb.scss';

type ExperimentContextBreadcrumbProps = {
  pageName: string;
  namespace: string;
  projectDisplayName: string;
  homePath: string;
  onHomeNavigate?: () => void;
  children?: React.ReactNode;
};

const ExperimentContextBreadcrumb: React.FC<ExperimentContextBreadcrumbProps> = ({
  pageName,
  namespace,
  projectDisplayName,
  homePath,
  onHomeNavigate,
  children,
}) => (
  <Flex alignItems={{ default: 'alignItemsCenter' }}>
    <Breadcrumb>
      <BreadcrumbItem data-testid="experiment-breadcrumb-home">
        <Link to={homePath} className="autorag-breadcrumb-link-with-icon" onClick={onHomeNavigate}>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsXs' }}
          >
            <FlexItem>{pageName} in</FlexItem>
            <ProjectIconWithSize size={IconSize.MD} />
            <FlexItem>{projectDisplayName}</FlexItem>
          </Flex>
        </Link>
      </BreadcrumbItem>
      {children}
    </Breadcrumb>
    <Flex>
      <Divider orientation={{ default: 'vertical' }} />
      <FlexItem data-testid="project-navigator-link-in-breadcrumb">
        <Content component={ContentVariants.small}>
          <Link to={`/projects/${namespace}`} className="autorag-breadcrumb-link-with-icon">
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsXs' }}
            >
              <FlexItem>Go to</FlexItem>
              <ProjectIconWithSize size={IconSize.MD} />
              <FlexItem>
                <strong>{projectDisplayName}</strong>
              </FlexItem>
            </Flex>
          </Link>
        </Content>
      </FlexItem>
    </Flex>
  </Flex>
);

export default ExperimentContextBreadcrumb;
