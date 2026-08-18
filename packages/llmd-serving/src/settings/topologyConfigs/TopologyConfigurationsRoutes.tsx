import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import TopologyConfigContextProvider from './TopologyConfigContext';
import TopologyConfigurationsView from './TopologyConfigurationsView';
import TopologyConfigurationCreateEdit from './TopologyConfigurationCreateEdit';
import { TOPOLOGY_CONFIGS_STANDALONE_PATH } from './paths';
import LlmInferenceServiceConfigAccessGate from '../LlmInferenceServiceConfigAccessGate';

/**
 * Routes for the standalone llm-d topology configurations page, used when the
 * `modelDeploymentSettings` feature flag is off. When the flag is on this page
 * is replaced by the tab (see TopologyConfigTabRoutes) and the form breakout
 * routes (see TopologyConfigFormRoutes).
 *
 * Temporary — this whole file is deleted by RHOAIENG-80077 along with the flag.
 * https://issues.redhat.com/browse/RHOAIENG-80077
 */
const TopologyConfigurationsRoutes: React.FC = () => (
  <LlmInferenceServiceConfigAccessGate>
    <Routes>
      <Route path="/" element={<TopologyConfigContextProvider />}>
        <Route index element={<TopologyConfigurationsView />} />
        <Route
          path="add/:topologyType"
          element={<TopologyConfigurationCreateEdit listPath={TOPOLOGY_CONFIGS_STANDALONE_PATH} />}
        />
        <Route
          path="edit/:configName"
          element={<TopologyConfigurationCreateEdit listPath={TOPOLOGY_CONFIGS_STANDALONE_PATH} />}
        />
        <Route
          path="duplicate/:configName"
          element={
            <TopologyConfigurationCreateEdit
              listPath={TOPOLOGY_CONFIGS_STANDALONE_PATH}
              isDuplicate
            />
          }
        />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Routes>
  </LlmInferenceServiceConfigAccessGate>
);

export default TopologyConfigurationsRoutes;
