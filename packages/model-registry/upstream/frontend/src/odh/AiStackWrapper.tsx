import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import OdhWrapper from '~/odh/OdhWrapper';
import AiStackPage from '~/app/pages/aiStack/AiStackPage';
import GatewayLayerPage from '~/app/pages/gatewayLayer/GatewayLayerPage';

const AiStackWrapper: React.FC = () => (
  <OdhWrapper>
    <Routes>
      <Route index element={<AiStackPage />} />
      <Route path="gateway" element={<GatewayLayerPage />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  </OdhWrapper>
);

export default AiStackWrapper;
