import * as React from 'react';
import OpenShellFederatedProviders from './OpenShellFederatedProviders';
import OpenShellRoutes from './OpenShellRoutes';

const OpenShellWrapper: React.FC = () => (
  <OpenShellFederatedProviders>
    <OpenShellRoutes />
  </OpenShellFederatedProviders>
);

export default OpenShellWrapper;
