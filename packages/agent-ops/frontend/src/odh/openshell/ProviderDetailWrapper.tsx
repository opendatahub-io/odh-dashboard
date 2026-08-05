import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  PageBreadcrumb,
} from '@patternfly/react-core';
import { ProviderDetailPage } from 'openshell-dashboard/pages';
import OpenShellProviders from './OpenShellProviders';

const ProviderDetailWrapper: React.FC = () => {
  const { workspace, provider } = useParams<{
    workspace: string;
    provider: string;
  }>();
  if (!workspace || !provider) {
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
          <BreadcrumbItem isActive>{provider}</BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>
      <ProviderDetailPage workspace={workspace} providerName={provider} />
    </OpenShellProviders>
  );
};

export default ProviderDetailWrapper;
