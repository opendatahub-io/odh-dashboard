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
import './ContextBreadcrumb.scss';

type ContextBreadcrumbProps = {
  pageName: string;
  projectDisplayName: string;
  homePath: string;
  projectHomePath: string;
  onHomeNavigate?: () => void;
  children?: React.ReactNode;
  /** Overrides the `data-testid` of the home breadcrumb item. Defaults to `context-breadcrumb-home`. */
  homeTestId?: string;
  /** Overrides the `data-testid` of the "go to project" link. Defaults to `context-breadcrumb-project-link`. */
  projectLinkTestId?: string;
};

/**
 * Breadcrumb for pages nested under a project: shows a "<pageName> in
 * <projectDisplayName>" home link plus any additional breadcrumb items, and a
 * "Go to <projectDisplayName>" link to the project's own page. All text and
 * routes are supplied via props — the component carries no vocabulary of its
 * own about what kind of page it is nested under.
 */
const ContextBreadcrumb: React.FC<ContextBreadcrumbProps> = ({
  pageName,
  projectDisplayName,
  homePath,
  projectHomePath,
  onHomeNavigate,
  children,
  homeTestId = 'context-breadcrumb-home',
  projectLinkTestId = 'context-breadcrumb-project-link',
}) => (
  <Flex alignItems={{ default: 'alignItemsCenter' }}>
    <Breadcrumb>
      <BreadcrumbItem data-testid={homeTestId}>
        <Link to={homePath} className="autox-breadcrumb-link-with-icon" onClick={onHomeNavigate}>
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
      <FlexItem data-testid={projectLinkTestId}>
        <Content component={ContentVariants.small}>
          <Link to={projectHomePath} className="autox-breadcrumb-link-with-icon">
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

export default ContextBreadcrumb;
