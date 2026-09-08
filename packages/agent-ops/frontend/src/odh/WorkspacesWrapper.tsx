import * as React from 'react';
import WorkspacesFederatedProviders from './WorkspacesFederatedProviders';
import WorkspacesRoutes from './WorkspacesRoutes';

const WorkspacesWrapper: React.FC = () => (
  <WorkspacesFederatedProviders>
    <WorkspacesRoutes />
  </WorkspacesFederatedProviders>
);

export default WorkspacesWrapper;
