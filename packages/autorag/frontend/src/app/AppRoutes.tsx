import { NotFound } from 'mod-arch-shared';
import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AutoragConfigurePage from './pages/AutoragConfigurePage';
import AutoragExperimentsPage from './pages/AutoragExperimentsPage';
import AutoragReconfigureLoader from './pages/AutoragReconfigureLoader';
import AutoragResultsPage from './pages/AutoragResultsPage';
import AutoragProjectRoute from './components/AutoragProjectRoute';

function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="experiments" replace />} />
      <Route element={<AutoragProjectRoute />}>
        <Route path="/experiments/:namespace?" element={<AutoragExperimentsPage />} />
        <Route path="/configure/:namespace" element={<AutoragConfigurePage />} />
        <Route path="/reconfigure/:namespace/:runId" element={<AutoragReconfigureLoader />} />
        <Route path="/results/:namespace/:runId" element={<AutoragResultsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
