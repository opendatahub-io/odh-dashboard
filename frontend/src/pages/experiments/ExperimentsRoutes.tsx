import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { experimentsRunsRoute } from '#~/routes/experiments/registryBase.ts';
import ModelRegistryCoreLoader from '#~/concepts/modelRegistry/content/ModelRegistryCoreLoader.tsx';
import ExperimentRuns from './screens/Experiments/ExperimentRuns/ExperimentRuns';
import Experiments from './screens/Experiments/Experiments';
import CompareRuns from './screens/CompareRuns/CompareRuns';
import ExperimentRunDetails from './screens/Experiments/ExperimentRuns/ExperimentRunDetails';

const ModelRegistryRoutes: React.FC = () => (
  <Routes>
    <Route
      path={'/:modelRegistry?/*'}
      element={
        <ModelRegistryCoreLoader
          getInvalidRedirectPath={(experiment) => experimentsRunsRoute(experiment)}
        />
      }
    >
      <Route index element={<Experiments empty={false} />} />
      <Route path="metrics" element={<CompareRuns empty={false} />} />
      <Route path="runs/:experimentId?" element={<ExperimentRuns empty={false} />} />
      <Route path="runs/:experimentId/:runId" element={<ExperimentRunDetails />} />
      {/* <Route path="params" element={<ExperimentParams empty={false} />} /> */}
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </Routes>
);

export default ModelRegistryRoutes;
