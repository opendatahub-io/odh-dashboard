import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import MainPage from './pages/MainPage';
import NewEvaluationRunPage from './pages/NewEvaluationRunPage';
import EvalCoreLoader from './pages/EvalCoreLoader';
import ChooseBenchmarkCollectionPage from './pages/ChooseBenchmarkCollectionPage';
import ChooseStandardisedBenchmarksPage from './pages/ChooseStandardisedBenchmarksPage';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route element={<EvalCoreLoader />}>
      <Route index element={null} />
      <Route path=":namespace" element={<MainPage />} />
      <Route path=":namespace/create" element={<NewEvaluationRunPage />} />
      <Route path=":namespace/create/collections" element={<ChooseBenchmarkCollectionPage />} />
      <Route path=":namespace/create/benchmarks" element={<ChooseStandardisedBenchmarksPage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
