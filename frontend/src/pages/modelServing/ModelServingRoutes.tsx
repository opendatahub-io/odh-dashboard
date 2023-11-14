import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import ModelServingContextProvider from './ModelServingContext';
import ModelServingMetricsWrapper from './screens/metrics/ModelServingMetricsWrapper';
import ModelServingGlobal from './screens/global/ModelServingGlobal';
import useModelMetricsEnabled from './useModelMetricsEnabled';

const ModelServingRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();

  return (
    <ProjectsRoutes>
      <Route path="/" element={<ModelServingContextProvider />}>
        <Route index element={<ModelServingGlobal />} />
        <Route path="/:namespace?/*" element={<ModelServingGlobal />} />
        <Route
          path="/metrics/:project/:inferenceService"
          element={
            modelMetricsEnabled ? <ModelServingMetricsWrapper /> : <Navigate replace to="/" />
          }
        />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </ProjectsRoutes>
  );
};

export default ModelServingRoutes;
