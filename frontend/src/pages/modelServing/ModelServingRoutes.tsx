import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import { ExplainabilityProvider } from '~/concepts/explainability/ExplainabilityContext';
import BiasConfigurationBreadcrumbPage from './screens/metrics/BiasConfigurationBreadcrumbPage';
import GlobalInferenceMetricsPage from './screens/metrics/GlobalInferenceMetricsPage';
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
        {modelMetricsEnabled && (
          <Route path="/metrics/:project" element={<ExplainabilityProvider />}>
            <Route index element={<Navigate to=".." />} />
            <Route path=":inferenceService" element={<GlobalInferenceMetricsWrapper />}>
              <Route path=":tab?" element={<GlobalInferenceMetricsPage />} />
              <Route path="configure" element={<BiasConfigurationBreadcrumbPage />} />
            </Route>
            {/* TODO: Global Runtime metrics?? */}
            <Route path="*" element={<Navigate to="." />} />
          </Route>
        )}
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </ProjectsRoutes>
  );
};

export default ModelServingRoutes;
