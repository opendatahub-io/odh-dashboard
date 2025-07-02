import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import {
  experimentsRunsRoute,
  experimentsMetricsRoute,
  experimentsParamsRoute,
} from '#~/routes/experiments/registryBase.ts';
import ModelRegistryCoreLoader from '#~/concepts/modelRegistry/content/ModelRegistryCoreLoader.tsx';
import ExperimentRuns from './screens/Runs/ExperimentRuns';
import RunParameters from './screens/Parameters/RunParameters';
import ExperimentRunDetails from './screens/Runs/ExperimentRunDetails';
import RunMetrics from './screens/Metrics/RunMetrics';
import Experiments from './screens/Experiments/Experiments';

const ModelRegistryRoutes: React.FC = () => (
  <Routes>
    <Route
      path="runs/:modelRegistry?/*"
      element={
        <ModelRegistryCoreLoader
          getInvalidRedirectPath={(modelRegistry) => experimentsRunsRoute(modelRegistry)}
        />
      }
    >
      <Route index element={<Experiments empty={false} />} />
      <Route path=":experimentId" element={<ExperimentRuns empty={false} />} />
      <Route path=":experimentId/:runId" element={<ExperimentRunDetails />} />
    </Route>
    <Route
      path="metrics/:modelRegistry?/*"
      element={
        <ModelRegistryCoreLoader
          getInvalidRedirectPath={(modelRegistry) => experimentsMetricsRoute(modelRegistry)}
        />
      }
    >
      <Route index element={<RunMetrics empty={false} />} />
    </Route>
    <Route
      path="parameters/:modelRegistry?/*"
      element={
        <ModelRegistryCoreLoader
          getInvalidRedirectPath={(modelRegistry) => experimentsParamsRoute(modelRegistry)}
        />
      }
    >
      <Route index element={<RunParameters empty={false} />} />
    </Route>
  </Routes>
);

export default ModelRegistryRoutes;
