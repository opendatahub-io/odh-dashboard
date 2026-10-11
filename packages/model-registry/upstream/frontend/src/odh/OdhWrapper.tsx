import React from 'react';
import { DeploymentMode, ModularArchConfig, ModularArchContextProvider } from 'mod-arch-core';
import type { AIHubKind } from '@odh-dashboard/k8s-core';
import { AreaContext } from '@odh-dashboard/plugin-core/areas';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

type OdhWrapperProps = {
  children: React.ReactNode;
};

export const createOdhModularArchConfig = (aiHub: AIHubKind | null): ModularArchConfig => ({
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION,
  mandatoryNamespace: aiHub?.spec.instancesNamespace,
});

const OdhWrapper: React.FC<OdhWrapperProps> = ({ children }) => {
  const { aiHub, aiHubError } = React.useContext(AreaContext);

  if (aiHubError) {
    return <div>Error: {aiHubError.message}</div>;
  }

  return (
    <ModularArchContextProvider config={createOdhModularArchConfig(aiHub)}>
      {children}
    </ModularArchContextProvider>
  );
};

export default OdhWrapper;
