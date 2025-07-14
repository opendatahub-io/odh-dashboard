import * as React from 'react';
import { Navigate, Route } from 'react-router-dom';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes';
import ModelServingExplainabilityWrapper from '#~/pages/modelServing/screens/metrics/ModelServingExplainabilityWrapper';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import GlobalModelServingCoreLoader from '#~/pages/modelServing/screens/global/GlobalModelServingCoreLoader';
import BiasConfigurationBreadcrumbPage from './screens/metrics/bias/BiasConfigurationPage/BiasConfigurationBreadcrumbPage';
import GlobalModelMetricsPage from './screens/metrics/GlobalModelMetricsPage';
import GlobalModelMetricsWrapper from './screens/metrics/GlobalModelMetricsWrapper';
import ModelServingGlobal from './screens/global/ModelServingGlobal';
import useModelMetricsEnabled from './useModelMetricsEnabled';

const ModelServingRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;

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
        {modelMetricsEnabled && (
          <Route path="metrics" element={<ModelServingExplainabilityWrapper />}>
            <Route index element={<Navigate to=".." />} />
            <Route path=":inferenceService" element={<GlobalModelMetricsWrapper />}>
              <Route path=":tab?" element={<GlobalModelMetricsPage />} />
              {biasMetricsAreaAvailable && (
                <Route path="configure" element={<BiasConfigurationBreadcrumbPage />} />
              )}
            </Route>
            <Route path="*" element={<Navigate to="." />} />
          </Route>
        )}
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </ProjectsRoutes>
  );
};

export default ModelServingRoutes;
