import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import GlobalModelServingCoreLoader from '@odh-dashboard/internal/pages/modelServing/screens/global/GlobalModelServingCoreLoader';
import BiasConfigurationBreadcrumbPage from '@odh-dashboard/internal/pages/modelServing/screens/metrics/bias/BiasConfigurationPage/BiasConfigurationBreadcrumbPage';
import GlobalModelMetricsPage from '@odh-dashboard/internal/pages/modelServing/screens/metrics/GlobalModelMetricsPage';
import GlobalModelMetricsWrapper from '@odh-dashboard/internal/pages/modelServing/screens/metrics/GlobalModelMetricsWrapper';
import ModelServingExplainabilityWrapper from '@odh-dashboard/internal/pages/modelServing/screens/metrics/ModelServingExplainabilityWrapper';
import useIsAreaAvailable from '@odh-dashboard/internal/concepts/areas/useIsAreaAvailable';
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/index';

// TODO: refactor metrics https://issues.redhat.com/browse/RHOAIENG-30172
const GlobalMetricsRoutes: React.FC = () => {
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  return (
    <Routes>
      <Route
        path=""
        element={
          <GlobalModelServingCoreLoader
            getInvalidRedirectPath={(namespace) => `/ai-hub/deployments/${namespace}`}
          />
        }
      >
        <Route path="" element={<ModelServingExplainabilityWrapper />}>
          <Route index element={<Navigate to=".." />} />
          <Route path=":inferenceService" element={<GlobalModelMetricsWrapper />}>
            <Route path=":tab?" element={<GlobalModelMetricsPage />} />
            {biasMetricsAreaAvailable && (
              <Route path="configure" element={<BiasConfigurationBreadcrumbPage />} />
            )}
          </Route>
          <Route path="*" element={<Navigate to="." />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default GlobalMetricsRoutes;
