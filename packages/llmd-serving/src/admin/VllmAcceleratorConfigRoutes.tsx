import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import VllmAcceleratorConfigContextProvider from './VllmAcceleratorConfigContext';
import VllmAcceleratorConfigView from './VllmAcceleratorConfigView';
import { LLMInferenceServiceConfigModel } from '../types';

const VllmAcceleratorConfigRoutesInner: React.FC = () => (
  <Routes>
    <Route path="/" element={<VllmAcceleratorConfigContextProvider />}>
      <Route index element={<VllmAcceleratorConfigView />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </Routes>
);

const VllmAcceleratorConfigRoutes: React.FC = () => {
  const [canCreate, createLoaded] = useAccessAllowed(
    verbModelAccess('create', LLMInferenceServiceConfigModel),
  );
  const [canPatch, patchLoaded] = useAccessAllowed(
    verbModelAccess('patch', LLMInferenceServiceConfigModel),
  );

  if (!createLoaded || !patchLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!canCreate || !canPatch) {
    return <NotFound />;
  }

  return <VllmAcceleratorConfigRoutesInner />;
};

export default VllmAcceleratorConfigRoutes;
