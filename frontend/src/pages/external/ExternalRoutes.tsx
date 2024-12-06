import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import PipelinesSdkRedirect from './redirectComponents/PipelinesSdkRedirects';

const ExternalRoutes: React.FC = () => (
  <Routes>
    <Route path="/pipelinesSdk/:namespace/*" element={<PipelinesSdkRedirect />} />
    <Route path="*" element={<Navigate to="/not-found" replace />} />
  </Routes>
);

export default ExternalRoutes;
