import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import { mockPipelineRuns } from '~/app/mocks/mockPipelineRun';
import { mockPipelineVersion } from '~/app/mocks/mockPipelineVersion';
import MainPage from './pages/MainPage';
import RunDetails from './pages/RunDetails';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/main-view" replace />} />
    <Route path="/main-view/*">
      <Route index element={<MainPage />} />
      <Route
        path="runs/:runId"
        element={<RunDetails runs={mockPipelineRuns} pipelineVersion={mockPipelineVersion} />}
      />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
