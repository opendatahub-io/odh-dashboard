import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import RoutingConfigContextProvider from './RoutingConfigContext';
import RoutingConfigurationsView from './RoutingConfigurationsView';
import RoutingConfigurationCreateEdit from './RoutingConfigurationCreateEdit';
import { ROUTING_CONFIGS_STANDALONE_PATH } from './paths';
import LlmInferenceServiceConfigAccessGate from '../LlmInferenceServiceConfigAccessGate';

/**
 * Routes for the standalone llm-d routing configurations page, used when the
 * `modelDeploymentSettings` feature flag is off. When the flag is on this page is
 * replaced by the tab (see RoutingConfigTabRoutes) and the form breakout routes
 * (see RoutingConfigFormRoutes).
 *
 * Temporary — this whole file is deleted by RHOAIENG-80077 along with the flag.
 * https://issues.redhat.com/browse/RHOAIENG-80077
 */
const RoutingConfigurationsRoutes: React.FC = () => (
  <LlmInferenceServiceConfigAccessGate>
    <Routes>
      <Route path="/" element={<RoutingConfigContextProvider />}>
        <Route index element={<RoutingConfigurationsView />} />
        <Route
          path="add"
          element={<RoutingConfigurationCreateEdit listPath={ROUTING_CONFIGS_STANDALONE_PATH} />}
        />
        <Route
          path="edit/:configName"
          element={<RoutingConfigurationCreateEdit listPath={ROUTING_CONFIGS_STANDALONE_PATH} />}
        />
        <Route
          path="duplicate/:configName"
          element={
            <RoutingConfigurationCreateEdit
              listPath={ROUTING_CONFIGS_STANDALONE_PATH}
              isDuplicate
            />
          }
        />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Routes>
  </LlmInferenceServiceConfigAccessGate>
);

export default RoutingConfigurationsRoutes;
