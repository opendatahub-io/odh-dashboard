import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import ModelServingContextProvider from './ModelServingContext';
import GlobalInferenceMetricsWrapper from './screens/metrics/GlobalInferenceMetricsWrapper';
import ModelServingGlobal from './screens/global/ModelServingGlobal';
import useModelMetricsEnabled from './useModelMetricsEnabled';

const ModelServingRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();

  return (
    <ProjectsRoutes>
      <Route path="/" element={<ModelServingContextProvider />}>
        <Route index element={<ModelServingGlobal />} />
        <Route
          path="/metrics/:project/:inferenceService/:tab?"
          element={
            modelMetricsEnabled ? <GlobalInferenceMetricsWrapper /> : <Navigate replace to="/" />
          }
        />
        {/* TODO: Global Runtime metrics?? */}
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </ProjectsRoutes>
  );
};

export default ModelServingRoutes;
