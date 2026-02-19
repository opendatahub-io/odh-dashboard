import React from 'react';
import { Breadcrumb, BreadcrumbItem, Button } from '@patternfly/react-core';
import { WORKSPACE_QUERY_PARAM } from '@odh-dashboard/internal/routes/pipelines/mlflow';

export interface BreadcrumbEntry {
  label: string;
  path: string;
}

const MlflowBreadcrumbs: React.FC<{
  basePath: string;
  workspace: string;
  breadcrumbs: BreadcrumbEntry[];
}> = ({ basePath, workspace, breadcrumbs }) => (
  <Breadcrumb>
    {breadcrumbs.map((b, idx) => {
      const isLast = idx === breadcrumbs.length - 1;
      // Prepend the host's base route and workspace param to MLflow's relative path
      const separator = b.path.includes('?') ? '&' : '?';
      const fullPath = `${basePath}${
        b.path
      }${separator}${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(workspace)}`;
      return (
        <BreadcrumbItem
          key={b.path}
          isActive={isLast}
          render={() =>
            isLast ? (
              b.label
            ) : (
              <Button
                variant="link"
                isInline
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
);

export default MlflowBreadcrumbs;
