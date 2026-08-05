import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  PageBreadcrumb,
} from '@patternfly/react-core';
import { SandboxDetailPage } from 'openshell-dashboard/pages';
import OpenShellProviders from './OpenShellProviders';

const SandboxDetailWrapper: React.FC = () => {
  const { workspace, sandbox } = useParams<{
    workspace: string;
    sandbox: string;
  }>();
  if (!workspace || !sandbox) {
    return null;
  }
  return (
    <OpenShellProviders>
      <PageBreadcrumb hasBodyWrapper={false}>
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to="/ai-hub/agents/workspaces">Workspaces</Link>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <Link to={`/ai-hub/agents/workspaces/${workspace}`}>
              {workspace}
            </Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{sandbox}</BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>
      <SandboxDetailPage workspace={workspace} sandboxName={sandbox} />
    </OpenShellProviders>
  );
};

export default SandboxDetailWrapper;
