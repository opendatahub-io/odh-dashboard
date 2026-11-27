import * as React from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import NotFound from '@odh-dashboard/ui-core/components/NotFound';
import { NavDataItem } from '~/app/standalone/types';
import { evalHubEvaluationsRoute, evalHubRootPath } from './utilities/routes';
import EvalHubCoreLoader from './components/EvalHubCoreLoader';
import ToastNotifications from './components/ToastNotifications';
import EvaluationsPage from './pages/EvaluationsPage';
import BenchmarkSuitesPage from './pages/BenchmarkSuitesPage';
import CuratedBenchmarkSuitesPage from './pages/CuratedBenchmarkSuitesPage';
import SingleBenchmarkWizardPage from './pages/SingleBenchmarkWizardPage';
import StartEvaluationRunPage from './pages/StartEvaluationRunPage';
import EvaluationResultsPage from './pages/EvaluationResultsPage';
import CompareEvaluationsPage from './pages/CompareEvaluationsPage';
import ChooseCompareBenchmarksPage from './pages/ChooseCompareBenchmarksPage';
import { evaluationComparePathSegment } from './routeSegments';
import EvaluationReconfigureLoader from './pages/EvaluationReconfigureLoader';
import ManualCollectionEditorPage from './pages/ManualCollectionEditorPage';
import CreateCollectionChooserPage from './pages/CreateCollectionChooserPage';
import CreateCollectionFromGoalPage from './pages/CreateCollectionFromGoalPage';
import { evaluationCreateSuiteRoute, isGoalCollectionBuilderEnabled } from './routes';

export const useNavData = (): NavDataItem[] => [
  {
    label: 'Evaluations',
    path: `${evalHubRootPath}/*`,
    href: evalHubRootPath,
  },
];

const RedirectToCreateCollectionForm: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  return <Navigate to={evaluationCreateSuiteRoute(namespace)} replace />;
};

const AppRoutes: React.FC = () => (
  <>
    <ToastNotifications />
    <Routes>
      <Route
        path="/"
        element={<EvalHubCoreLoader getInvalidRedirectPath={evalHubEvaluationsRoute} />}
      >
        <Route path=":namespace" element={<EvaluationsPage />} />
        <Route path=":namespace/collections" element={<BenchmarkSuitesPage />} />
        <Route
          path=":namespace/collections/:evaluationTarget"
          element={<CuratedBenchmarkSuitesPage />}
        />
        <Route path=":namespace/results/:jobId" element={<EvaluationResultsPage />} />
        <Route
          path=":namespace/create-suite"
          element={
            isGoalCollectionBuilderEnabled() ? (
              <CreateCollectionChooserPage />
            ) : (
              <RedirectToCreateCollectionForm />
            )
          }
        />
        <Route
          path=":namespace/create-suite/from-goal"
          element={
            isGoalCollectionBuilderEnabled() ? (
              <CreateCollectionFromGoalPage />
            ) : (
              <RedirectToCreateCollectionForm />
            )
          }
        />
        <Route
          path={`:namespace/${evaluationComparePathSegment}/benchmarks`}
          element={<ChooseCompareBenchmarksPage />}
        />
        <Route
          path={`:namespace/${evaluationComparePathSegment}`}
          element={<CompareEvaluationsPage />}
        />
        <Route
          path=":namespace/create/collections/new"
          element={<ManualCollectionEditorPage mode="create" />}
        />
        <Route
          path=":namespace/create/collections/:collectionId/edit"
          element={<ManualCollectionEditorPage mode="edit" />}
        />
        <Route
          path=":namespace/create/collections/:collectionId/copy"
          element={<ManualCollectionEditorPage mode="copy" />}
        />
        <Route path=":namespace/create/single-benchmark" element={<SingleBenchmarkWizardPage />} />
        <Route path=":namespace/create/start" element={<StartEvaluationRunPage />} />
        <Route path=":namespace/reconfigure/:jobId" element={<EvaluationReconfigureLoader />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

export default AppRoutes;
