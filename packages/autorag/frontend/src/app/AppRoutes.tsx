import { NotFound } from 'mod-arch-shared';
import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AutoRagConfigurePage from './pages/AutoRagConfigurePage';
import AutoRagCreatePage from './pages/AutoRagCreatePage';
import AutoRagExperimentsPage from './pages/AutoRagExperimentsPage';
import AutoRagResultsPage from './pages/AutoRagResultsPage';

function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="experiments" replace />} />
      <Route path="/experiments/:namespace?" element={<AutoRagExperimentsPage />} />
      <Route path="/create/:namespace" element={<AutoRagCreatePage />} />
      <Route path="/configure/:experimentId" element={<AutoRagConfigurePage />} />
      <Route path="/results/:runId" element={<AutoRagResultsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
