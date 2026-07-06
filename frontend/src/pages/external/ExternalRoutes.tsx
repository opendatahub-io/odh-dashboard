import React from 'react';
import { Route, Routes } from 'react-router-dom';
import PipelinesSdkRedirect from './redirectComponents/PipelinesSdkRedirects';
import ExternalRedirectNotFound from './redirectComponents/ExternalRedirectNotFound';
import ElyraRedirects from './redirectComponents/ElyraRedirects';
import CatalogModelRedirects from './redirectComponents/CatalogModelRedirects';

/**
 * Be sure to keep this file in sync with the documentation in `docs/external-redirects.md`.
 */
const ExternalRoutes: React.FC = () => (
  <Routes>
    <Route path="/pipelinesSdk/:namespace/*" element={<PipelinesSdkRedirect />} />
    <Route path="/elyra/:namespace/*" element={<ElyraRedirects />} />
    <Route path="/catalog/*" element={<CatalogModelRedirects />} />
    <Route path="*" element={<ExternalRedirectNotFound />} />
  </Routes>
);

export default ExternalRoutes;
