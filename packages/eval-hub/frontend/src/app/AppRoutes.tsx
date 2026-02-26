import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import MainPage from './pages/MainPage';
import NewEvaluationRunPage from './pages/NewEvaluationRunPage';
import EvalCoreLoader from './pages/EvalCoreLoader';
import ChooseBenchmarkCollectionPage from './pages/ChooseBenchmarkCollectionPage';

/**
 * Route structure — module is mounted at /evaluation/* in the ODH dashboard.
 * React Router strips the /evaluation prefix before matching these inner routes.
 *
 *   /evaluation                          → EvalCoreLoader (redirects to preferred namespace)
 *   /evaluation/:namespace               → MainPage
 *   /evaluation/:namespace/new           → NewEvaluationRunPage
 *   /evaluation/:namespace/new/collections → ChooseBenchmarkCollectionPage
 */
const AppRoutes: React.FC = () => (
  <Routes>
    {/* Pathless layout route — EvalCoreLoader handles namespace validation / redirect */}
    <Route element={<EvalCoreLoader />}>
      <Route index element={null} />
      <Route path=":namespace" element={<MainPage />} />
      <Route path=":namespace/new" element={<NewEvaluationRunPage />} />
      <Route path=":namespace/new/collections" element={<ChooseBenchmarkCollectionPage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
