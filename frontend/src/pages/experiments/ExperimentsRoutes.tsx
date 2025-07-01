import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { experimentsRoute } from '#~/routes/experiments/registryBase.ts';
import ModelRegistryCoreLoader from '#~/concepts/modelRegistry/content/ModelRegistryCoreLoader.tsx';
import ExperimentRuns from './screens/Experiments/ExperimentRuns/ExperimentRuns';
import Experiments from './screens/Experiments/Experiments';
import CompareRuns from './screens/CompareRuns/CompareRuns';

const ModelRegistryRoutes: React.FC = () => (
  <Routes>
    <Route
      path={'/:modelRegistry?/*'}
      element={
        <ModelRegistryCoreLoader
          getInvalidRedirectPath={(experiment) => experimentsRoute(experiment)}
        />
      }
    >
      <Route index element={<Experiments empty={false} />} />
      <Route path="compareRuns" element={<CompareRuns empty={false} />} />
      <Route path=":experimentId/runs" element={<ExperimentRuns empty={false} />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </Routes>
);

export default ModelRegistryRoutes;
