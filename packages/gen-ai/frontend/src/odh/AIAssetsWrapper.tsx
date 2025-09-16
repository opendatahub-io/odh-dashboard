import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ModularArchConfig, DeploymentMode, ModularArchContextProvider } from 'mod-arch-core';
import { GenAiContextProvider } from '~/app/context';
import { URL_PREFIX } from '~/app/utilities/const';
import { NotFound } from '~/app/NotFound/NotFound';
import { AIAssetsPage } from '~/app/AIAssets/AIAssetsPage';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

const AIAssetsWrapper: React.FC = () => (
  <ModularArchContextProvider config={modularArchConfig}>
    <GenAiContextProvider>
      <Routes>
        <Route path="/" element={<AIAssetsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </GenAiContextProvider>
  </ModularArchContextProvider>
);

export default AIAssetsWrapper;
