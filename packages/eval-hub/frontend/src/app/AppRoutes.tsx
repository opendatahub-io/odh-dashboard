import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import EvalHubCoreLoader from './components/EvalHubCoreLoader';
import EvaluationsPage from './pages/EvaluationsPage';
import NewEvaluationRunPage from './pages/NewEvaluationRunPage';
import ChooseBenchmarkCollectionPage from './pages/ChooseBenchmarkCollectionPage';
import ChooseStandardisedBenchmarksPage from './pages/ChooseStandardisedBenchmarksPage';
import { evalHubEvaluationsRoute } from './utilities/routes';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route
      path="/"
      element={<EvalHubCoreLoader getInvalidRedirectPath={evalHubEvaluationsRoute} />}
    >
      <Route path=":namespace" element={<EvaluationsPage />} />
      <Route path=":namespace/create" element={<NewEvaluationRunPage />} />
      <Route path=":namespace/create/collections" element={<ChooseBenchmarkCollectionPage />} />
      <Route path=":namespace/create/benchmarks" element={<ChooseStandardisedBenchmarksPage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
