import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import { evaluationRootSegment } from '~/app/routes';
import MainPage from './pages/MainPage';
import NewEvaluationRunPage from './pages/NewEvaluationRunPage';
import EvalCoreLoader from './pages/EvalCoreLoader';

/**
 * Route structure (mirrors the gen-ai GenAiCoreLoader pattern):
 *
 *   /evaluation                    → EvalCoreLoader (redirects to preferred namespace)
 *   /evaluation/:namespace         → MainPage        (evaluations list for a namespace)
 *   /evaluation/:namespace/new     → NewEvaluationRunPage
 */
const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to={evaluationRootSegment} replace />} />
    <Route path={`/${evaluationRootSegment}`} element={<EvalCoreLoader />}>
      <Route path=":namespace" element={<MainPage />} />
      <Route path=":namespace/new" element={<NewEvaluationRunPage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
