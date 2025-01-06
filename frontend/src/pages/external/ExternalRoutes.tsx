import React from 'react';
import { Route, Routes } from 'react-router-dom';
import PipelinesSdkRedirect from './redirectComponents/PipelinesSdkRedirects';
import ExternalRedirectNotFound from './redirectComponents/ExternalRedirectNotFound';

/**
 * Be sure to keep this file in sync with the documentation in `docs/external-redirects.md`.
 */
const ExternalRoutes: React.FC = () => (
  <Routes>
    <Route path="/pipelinesSdk/:namespace/*" element={<PipelinesSdkRedirect />} />
    <Route path="*" element={<ExternalRedirectNotFound />} />
  </Routes>
);

export default ExternalRoutes;
