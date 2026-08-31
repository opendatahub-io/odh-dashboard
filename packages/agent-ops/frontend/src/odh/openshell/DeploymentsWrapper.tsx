import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import OpenShellProviders from './OpenShellProviders';
import ProviderLandingPage from './ProviderLandingPage';
import SandboxDetailWrapper from './SandboxDetailWrapper';
import SandboxesWrapper from './SandboxesWrapper';
import NativeSandboxesWrapper from './NativeSandboxesWrapper';

const DeploymentsWrapper: React.FC = () => (
  <Routes>
    <Route
      index
      element={
        <OpenShellProviders requireConnection={false}>
          <ProviderLandingPage />
        </OpenShellProviders>
      }
    />
    <Route path="provider/openshell" element={<SandboxesWrapper />} />
    <Route path="provider/native/*" element={<NativeSandboxesWrapper />} />
    <Route
      path="provider/openshell/workspaces/:workspace/sandboxes/:sandbox/*"
      element={<SandboxDetailWrapper />}
    />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default DeploymentsWrapper;
