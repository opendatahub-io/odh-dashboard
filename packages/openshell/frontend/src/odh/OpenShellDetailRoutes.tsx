import * as React from 'react';
import { PageSection, Title } from '@patternfly/react-core';
import { Route, Routes, useParams } from 'react-router-dom';
import OpenShellFederatedProviders from './OpenShellFederatedProviders';

const WorkspaceDetailPlaceholder: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  return (
    <PageSection>
      <Title headingLevel="h1" size="lg">
        Workspace detail (placeholder)
      </Title>
      <p>Workspace ID: {workspaceId}</p>
      <p>Sandbox detail will mount here in Phase 5.</p>
    </PageSection>
  );
};

const OpenShellDetailRoutes: React.FC = () => (
  <OpenShellFederatedProviders>
    <Routes>
      <Route path="*" element={<WorkspaceDetailPlaceholder />} />
    </Routes>
  </OpenShellFederatedProviders>
);

export default OpenShellDetailRoutes;
