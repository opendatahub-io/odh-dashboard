import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, PageBreadcrumb } from '@patternfly/react-core';
import { WorkspaceDetailPage } from 'openshell-dashboard/pages';
import OpenShellProviders from './OpenShellProviders';

const WorkspaceDetailWrapper: React.FC = () => {
  const { workspace } = useParams<{ workspace: string }>();
  const navigate = useNavigate();
  if (!workspace) {
    return null;
  }
  return (
    <OpenShellProviders>
      <PageBreadcrumb hasBodyWrapper={false}>
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to="/ai-hub/agents/workspaces">Workspaces</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{workspace}</BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>
      <WorkspaceDetailPage
        workspace={workspace}
        onSelectSandbox={(name) =>
          navigate(`/ai-hub/agents/workspaces/${workspace}/sandboxes/${name}`)
        }
        onSelectProvider={(name) =>
          navigate(`/ai-hub/agents/workspaces/${workspace}/providers/${name}`)
        }
      />
    </OpenShellProviders>
  );
};

export default WorkspaceDetailWrapper;
