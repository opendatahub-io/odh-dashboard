import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import { ExplainabilityProvider } from '~/concepts/explainability/ExplainabilityContext';
import ModelServingContextProvider from './ModelServingContext';
import GlobalInferenceMetricsWrapper from './screens/metrics/GlobalInferenceMetricsWrapper';
import ModelServingGlobal from './screens/global/ModelServingGlobal';
import useModelMetricsEnabled from './useModelMetricsEnabled';

const ModelServingRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();

  //TODO: Split route to project and mount provider here. This will allow you to load data when model switching is later implemented.
  return (
    <ProjectsRoutes>
      <Route path="/" element={<ModelServingContextProvider />}>
        <Route index element={<ModelServingGlobal />} />
        <Route path="/metrics/:project" element={<ExplainabilityProvider />}>
          <Route
            path=":inferenceService/:tab?"
            element={
              modelMetricsEnabled ? <GlobalInferenceMetricsWrapper /> : <Navigate replace to="/" />
            }
          />
          {/* TODO: Global Runtime metrics?? */}
          <Route path="*" element={<Navigate to="." />} />
        </Route>
      </Route>
    </ProjectsRoutes>
  );
};

export default ModelServingRoutes;
