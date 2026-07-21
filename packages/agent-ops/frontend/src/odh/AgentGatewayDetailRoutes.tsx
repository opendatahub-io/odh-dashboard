import * as React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import AgentOpsFederatedProviders from './AgentOpsFederatedProviders';
import { GatewayContextProvider } from '~/app/context/GatewayContext';
import GatewayDetailPage from '~/app/pages/GatewayDetailPage';

const AgentGatewayDetailRoutes: React.FC = () => (
  <AgentOpsFederatedProviders>
    <GatewayContextProvider>
      <Routes>
        <Route index element={<GatewayDetailPage />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </GatewayContextProvider>
  </AgentOpsFederatedProviders>
);

export default AgentGatewayDetailRoutes;
