import React from 'react';
import AppRoutes from '~/app/AppRoutes';
import MaaSFederatedProviders from './MaaSFederatedProviders';

const MaaSWrapper: React.FC = () => (
  <MaaSFederatedProviders>
    <AppRoutes />
  </MaaSFederatedProviders>
);

export default MaaSWrapper;
