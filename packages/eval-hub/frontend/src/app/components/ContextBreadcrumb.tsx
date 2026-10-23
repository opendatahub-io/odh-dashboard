import {
  Breadcrumb,
  BreadcrumbItem,
  Content,
  ContentVariants,
  Divider,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import React from 'react';
import { Link } from 'react-router-dom';
import './ContextBreadcrumb.scss';

type ContextBreadcrumbProps = {
  pageName: string;
  projectDisplayName: string;
  homePath: string;
  /** When omitted, the "go to project" link is not rendered (e.g. deployments without a host projects page). */
  projectHomePath?: string;
  onHomeNavigate?: () => void;
  children?: React.ReactNode;
  /** Renders the home crumb as an aria-disabled span instead of a link (e.g. while an operation is pending). */
  isHomeDisabled?: boolean;
  /** Renders the "go to project" link as an aria-disabled span instead of a link (e.g. while an operation is pending). */
  isProjectLinkDisabled?: boolean;
  /** Overrides the `data-testid` of the home crumb link. Defaults to `context-breadcrumb-home`. */
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
  isHomeDisabled = false,
  isProjectLinkDisabled = false,
  homeTestId = 'context-breadcrumb-home',
  projectLinkTestId = 'context-breadcrumb-project-link',
}) => {
  const homeContent = (
    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
      <FlexItem>{pageName} in</FlexItem>
      <ProjectIconWithSize size={IconSize.MD} />
      <FlexItem>{projectDisplayName}</FlexItem>
    </Flex>
  );

  const projectLinkContent = (
    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
      <FlexItem>Go to</FlexItem>
      <ProjectIconWithSize size={IconSize.MD} />
      <FlexItem>
        <strong>{projectDisplayName}</strong>
      </FlexItem>
    </Flex>
  );

  return (
    <Flex alignItems={{ default: 'alignItemsCenter' }}>
      <Breadcrumb>
        <BreadcrumbItem>
          {isHomeDisabled ? (
            <span
              role="link"
              aria-disabled="true"
              tabIndex={-1}
              className="evalhub-breadcrumb-link-disabled"
              data-testid={homeTestId}
            >
              {homeContent}
            </span>
          ) : (
            <Link
              to={homePath}
              className="evalhub-breadcrumb-link-with-icon"
              onClick={onHomeNavigate}
              data-testid={homeTestId}
            >
              {homeContent}
            </Link>
          )}
        </BreadcrumbItem>
        {children}
      </Breadcrumb>
      {projectHomePath ? (
        <Flex>
          <Divider orientation={{ default: 'vertical' }} />
          <FlexItem data-testid={projectLinkTestId}>
            <Content component={ContentVariants.small}>
              {isProjectLinkDisabled ? (
                <span
                  role="link"
                  aria-disabled="true"
                  tabIndex={-1}
                  className="evalhub-breadcrumb-link-disabled"
                >
                  {projectLinkContent}
                </span>
              ) : (
                <Link to={projectHomePath} className="evalhub-breadcrumb-link-with-icon">
                  {projectLinkContent}
                </Link>
              )}
            </Content>
          </FlexItem>
        </Flex>
      ) : null}
    </Flex>
  );
};

export default ContextBreadcrumb;
