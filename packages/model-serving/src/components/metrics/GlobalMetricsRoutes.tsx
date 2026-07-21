import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import { useIsAreaAvailable, SupportedArea } from '@odh-dashboard/plugin-core/areas';
import GlobalModelServingCoreLoader from '../global/GlobalModelServingCoreLoader';
import BiasConfigurationBreadcrumbPage from './bias/BiasConfigurationPage/BiasConfigurationBreadcrumbPage';
import GlobalModelMetricsPage from './GlobalModelMetricsPage';
import GlobalModelMetricsWrapper from './GlobalModelMetricsWrapper';
import ModelServingExplainabilityWrapper from './ModelServingExplainabilityWrapper';

// Returns metrics <Route> elements to be included as direct children of <Routes>.
// These must NOT be wrapped in their own <Routes> — they must share the parent
// <Routes> context (from ProjectsRoutes) so that useParams() can access route
// params like :namespace from sibling route definitions.
// TODO: refactor metrics https://issues.redhat.com/browse/RHOAIENG-30172
export const useMetricsRoutes = (
  getInvalidRedirectPath: (namespace: string) => string,
  routePath = ':namespace/metrics',
): React.ReactNode => {
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;
  return (
    <Route
      path={routePath}
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
