import { NotFound } from 'mod-arch-shared';
import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AutomlConfigurePage from './pages/AutomlConfigurePage';
import AutomlCreatePage from './pages/AutomlCreatePage';
import AutomlExperimentsPage from './pages/AutomlExperimentsPage';
import AutomlResultsPage from './pages/AutomlResultsPage';

function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="experiments" replace />} />
      <Route path="/experiments/:namespace?" element={<AutomlExperimentsPage />} />
      <Route path="/create/:namespace" element={<AutomlCreatePage />} />
      <Route path="/configure/:experimentId" element={<AutomlConfigurePage />} />
      <Route path="/results/:runId" element={<AutomlResultsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
