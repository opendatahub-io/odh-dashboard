import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import ModelServingExplainabilityWrapper from '~/pages/modelServing/screens/metrics/ModelServingExplainabilityWrapper';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import BiasConfigurationBreadcrumbPage from './screens/metrics/BiasConfigurationBreadcrumbPage';
import GlobalModelMetricsPage from './screens/metrics/GlobalModelMetricsPage';
import ModelServingContextProvider from './ModelServingContext';
import GlobalModelMetricsWrapper from './screens/metrics/GlobalModelMetricsWrapper';
import ModelServingGlobal from './screens/global/ModelServingGlobal';
import useModelMetricsEnabled from './useModelMetricsEnabled';

const ModelServingRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;

  //TODO: Split route to project and mount provider here. This will allow you to load data when model switching is later implemented.
  return (
    <ProjectsRoutes>
      <Route path="/" element={<ModelServingContextProvider />}>
        <Route index element={<ModelServingGlobal />} />
        <Route path="/:namespace?/*" element={<ModelServingGlobal />} />
        {modelMetricsEnabled && (
          <Route path="/metrics/:project" element={<ModelServingExplainabilityWrapper />}>
            <Route index element={<Navigate to=".." />} />
            <Route path=":inferenceService" element={<GlobalModelMetricsWrapper />}>
              <Route path=":tab?" element={<GlobalModelMetricsPage />} />
              {biasMetricsAreaAvailable && (
                <Route path="configure" element={<BiasConfigurationBreadcrumbPage />} />
              )}
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
