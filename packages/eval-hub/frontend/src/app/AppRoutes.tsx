import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import EvalHubCoreLoader from './components/EvalHubCoreLoader';
import EvaluationsPage from './pages/EvaluationsPage';
import { evalHubEvaluationsRoute } from './utilities/routes';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route
      path="/"
      element={<EvalHubCoreLoader getInvalidRedirectPath={evalHubEvaluationsRoute} />}
    >
      <Route path=":namespace" element={<EvaluationsPage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
