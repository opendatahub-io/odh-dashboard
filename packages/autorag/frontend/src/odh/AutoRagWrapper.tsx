import React from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  ModularArchConfig,
  DeploymentMode,
  ModularArchContextProvider,
  NotificationContextProvider,
  BrowserStorageContextProvider,
} from 'mod-arch-core';
import { URL_PREFIX } from '~/app/utilities/const';
import { mockPipelineRuns } from '~/app/mocks/mockPipelineRun';
import { mockPipelineVersion } from '~/app/mocks/mockPipelineVersion';
import MainPage from '~/app/pages/MainPage';
import RunDetails from '~/app/pages/RunDetails';

const autoRagConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

const AutoRagWrapper: React.FC = () => (
  <ModularArchContextProvider config={autoRagConfig}>
    <BrowserStorageContextProvider>
      <NotificationContextProvider>
        <Routes>
          <Route index element={<MainPage />} />
          <Route
            path="runs/:runId"
            element={<RunDetails runs={mockPipelineRuns} pipelineVersion={mockPipelineVersion} />}
          />
        </Routes>
      </NotificationContextProvider>
    </BrowserStorageContextProvider>
  </ModularArchContextProvider>
);

export default AutoRagWrapper;
