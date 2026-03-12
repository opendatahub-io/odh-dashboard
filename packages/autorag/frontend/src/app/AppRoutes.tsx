import { NotFound } from 'mod-arch-shared';
import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AutoragConfigurePage from './pages/AutoragConfigurePage';
import AutoragCreatePage from './pages/AutoragCreatePage';
import AutoragExperimentsPage from './pages/AutoragExperimentsPage';
import AutoragResultsPage from './pages/AutoragResultsPage';

function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="experiments" replace />} />
      <Route path="/experiments/:namespace?" element={<AutoragExperimentsPage />} />
      <Route path="/create/:namespace" element={<AutoragCreatePage />} />
      <Route path="/configure/:namespace/:experimentId" element={<AutoragConfigurePage />} />
      <Route path="/results/:runId" element={<AutoragResultsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
