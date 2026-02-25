import { NotFound } from 'mod-arch-shared';
import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AutoRagConfigurePage from './pages/AutoRagConfigurePage';
import AutoRagCreatePage from './pages/AutoRagCreatePage';
import AutoragExperimentsPage from './pages/AutoragExperimentsPage';
import AutoRagResultsPage from './pages/AutoRagResultsPage';

function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="experiments" replace />} />
      <Route path="/experiments/:namespace?" element={<AutoragExperimentsPage />} />
      <Route path="/create/:namespace" element={<AutoRagCreatePage />} />
      <Route path="/configure/:experimentId" element={<AutoRagConfigurePage />} />
      <Route path="/results/:runId" element={<AutoRagResultsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
