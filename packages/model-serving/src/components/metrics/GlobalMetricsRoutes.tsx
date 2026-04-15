import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import GlobalModelServingCoreLoader from '@odh-dashboard/internal/pages/modelServing/screens/global/GlobalModelServingCoreLoader';
import BiasConfigurationBreadcrumbPage from '@odh-dashboard/internal/pages/modelServing/screens/metrics/bias/BiasConfigurationPage/BiasConfigurationBreadcrumbPage';
import GlobalModelMetricsPage from '@odh-dashboard/internal/pages/modelServing/screens/metrics/GlobalModelMetricsPage';
import GlobalModelMetricsWrapper from '@odh-dashboard/internal/pages/modelServing/screens/metrics/GlobalModelMetricsWrapper';
import ModelServingExplainabilityWrapper from '@odh-dashboard/internal/pages/modelServing/screens/metrics/ModelServingExplainabilityWrapper';
import useIsAreaAvailable from '@odh-dashboard/internal/concepts/areas/useIsAreaAvailable';
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/index';

// Returns metrics <Route> elements to be included as direct children of <Routes>.
// These must NOT be wrapped in their own <Routes> — they must share the parent
// <Routes> context (from ProjectsRoutes) so that useParams() can access route
// params like :namespace from sibling route definitions.
// TODO: refactor metrics https://issues.redhat.com/browse/RHOAIENG-30172
export const useMetricsRoutes = (
  getInvalidRedirectPath: (namespace: string) => string,
): React.ReactNode => {
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  return (
    <Route
      path=":namespace/metrics"
      element={<GlobalModelServingCoreLoader getInvalidRedirectPath={getInvalidRedirectPath} />}
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
  );
};
