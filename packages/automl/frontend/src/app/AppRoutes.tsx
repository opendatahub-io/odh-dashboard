import { NotFound } from 'mod-arch-shared';
import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AutomlConfigurePage from './pages/AutomlConfigurePage';
import AutomlExperimentsPage from './pages/AutomlExperimentsPage';
import AutomlReconfigureLoader from './pages/AutomlReconfigureLoader';
import AutomlResultsPage from './pages/AutomlResultsPage';

function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="experiments" replace />} />
      <Route path="/experiments/:namespace?" element={<AutomlExperimentsPage />} />
      <Route path="/configure/:namespace" element={<AutomlConfigurePage />} />
      <Route path="/reconfigure/:namespace/:runId" element={<AutomlReconfigureLoader />} />
      <Route path="/results/:namespace/:runId" element={<AutomlResultsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
