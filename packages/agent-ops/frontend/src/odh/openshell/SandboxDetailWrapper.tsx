import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, PageBreadcrumb } from '@patternfly/react-core';
import { SandboxDetailPage } from 'openshell-dashboard/pages';
import { OpenShellConnectGate } from './OpenShellConnection';
import OpenShellProviders from './OpenShellProviders';
import { DEPLOYMENTS_PATH, OPENSHELL_PROVIDER_PATH } from './providerRoutes';

const SandboxDetailWrapper: React.FC = () => {
  const { workspace, sandbox } = useParams<{
    workspace: string;
    sandbox: string;
  }>();
  if (!workspace || !sandbox) {
    return null;
  }
  return (
    <OpenShellProviders requireConnection={false}>
      <PageBreadcrumb hasBodyWrapper={false}>
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={DEPLOYMENTS_PATH}>All providers</Link>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <Link to={OPENSHELL_PROVIDER_PATH}>OpenShell</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{sandbox}</BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>
      <OpenShellConnectGate>
        <SandboxDetailPage workspace={workspace} sandboxName={sandbox} />
      </OpenShellConnectGate>
    </OpenShellProviders>
  );
};

export default SandboxDetailWrapper;
