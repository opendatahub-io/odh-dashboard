import * as React from 'react';
import { PageSection, Title } from '@patternfly/react-core';
import { Navigate, Route, Routes } from 'react-router-dom';

const WorkspacesListPlaceholder: React.FC = () => (
  <PageSection>
    <Title headingLevel="h1" size="lg">
      OpenShell workspaces (placeholder)
    </Title>
    <p>Workspaces list will mount here in Phase 5.</p>
  </PageSection>
);

const OpenShellRoutes: React.FC = () => (
  <Routes>
    <Route index element={<WorkspacesListPlaceholder />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default OpenShellRoutes;
