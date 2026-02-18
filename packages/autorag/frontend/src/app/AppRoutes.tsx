import { NotFound } from 'mod-arch-shared';
import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { mockPipelineRuns } from '~/app/mocks/mockPipelineRun';
import { mockPipelineVersion } from '~/app/mocks/mockPipelineVersion';
import AutoragConfigurePage from './pages/AutoragConfigurePage';
import AutoragCreatePage from './pages/AutoragCreatePage';
import AutoragExperimentsPage from './pages/AutoragExperimentsPage';
import AutoragResultsPage from './pages/AutoragResultsPage';
import MainPage from './pages/MainPage';
import RunDetails from './pages/RunDetails';

function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="experiments" replace />} />
      <Route path="/experiments/:namespace?" element={<AutoragExperimentsPage />} />
      <Route path="/create/:namespace" element={<AutoragCreatePage />} />
      <Route path="/configure/:namespace/:experimentId" element={<AutoragConfigurePage />} />
      <Route path="/results/:runId" element={<AutoragResultsPage />} />
      <Route path="/runs" element={<MainPage />} />
      <Route
        path="/runs/:runId"
        element={<RunDetails runs={mockPipelineRuns} pipelineVersion={mockPipelineVersion} />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
