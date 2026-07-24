import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Content,
  ContentVariants,
  Divider,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { byName, getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { WORKSPACE_QUERY_PARAM } from '@odh-dashboard/internal/routes/pipelines/mlflow';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import './MlflowBreadcrumbs.scss';

export interface BreadcrumbEntry {
  label: string;
  path: string;
}

const MlflowBreadcrumbs: React.FC<{
  basePath: string;
  workspace: string;
  breadcrumbs: BreadcrumbEntry[];
}> = ({ basePath, workspace, breadcrumbs }) => {
  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find(byName(workspace));
  const projectDisplayName = project && getDisplayNameFromK8sResource(project);

  return (
    <Flex alignItems={{ default: 'alignItemsCenter' }}>
      <Breadcrumb>
        {breadcrumbs.map((b, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          const separator = b.path.includes('?') ? '&' : '?';
          const fullPath = `${basePath}${
            b.path
          }${separator}${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(workspace)}`;
          return (
            <BreadcrumbItem
              key={b.path}
              isActive={isLast}
              {...(isLast ? { 'data-testid': 'mlflow-breadcrumb-active' } : {})}
              render={() =>
                isLast ? (
                  b.label
                ) : (
                  <Button
                    variant="link"
                    isInline
                    component="a"
                    href={fullPath}
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState({}, '', fullPath);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                  >
                    {b.label}
                  </Button>
                )
              }
            />
          );
        })}
      </Breadcrumb>
      {project && (
        <Flex>
          <Divider orientation={{ default: 'vertical' }} />
          <FlexItem data-testid="project-navigator-link-in-breadcrumb">
            <Content component={ContentVariants.small}>
              <Link to={`/projects/${workspace}`} className="mlflow-breadcrumb-project-link">
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
      )}
    </Flex>
  );
};

export default MlflowBreadcrumbs;
