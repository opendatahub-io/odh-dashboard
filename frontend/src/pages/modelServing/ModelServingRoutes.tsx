import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import GlobalModelServingCoreLoader from '~/pages/modelServing/screens/global/GlobalModelServingCoreLoader';
import ModelServingMetricsWrapper from './screens/metrics/ModelServingMetricsWrapper';
import ModelServingGlobal from './screens/global/ModelServingGlobal';
import useModelMetricsEnabled from './useModelMetricsEnabled';

const ModelServingRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();

  return (
    <ProjectsRoutes>
      <Route
        path="/:namespace?/*"
        element={
          <GlobalModelServingCoreLoader
            getInvalidRedirectPath={(namespace) => `/modelServing/${namespace}`}
          />
        }
      >
        <Route index element={<ModelServingGlobal />} />
        <Route
          path="metrics/:inferenceService"
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
