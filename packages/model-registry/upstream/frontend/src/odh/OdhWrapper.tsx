import React from 'react';
import { DeploymentMode, ModularArchConfig, ModularArchContextProvider } from 'mod-arch-core';
import { AreaContext } from '@odh-dashboard/plugin-core/areas';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

type OdhWrapperProps = {
  children: React.ReactNode;
};

export const createOdhModularArchConfig = (instancesNamespace?: string): ModularArchConfig => ({
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION,
  mandatoryNamespace: instancesNamespace,
});

const OdhWrapper: React.FC<OdhWrapperProps> = ({ children }) => {
  const { aiHubInstancesNamespace, aiHubError } = React.useContext(AreaContext);

  if (aiHubError) {
    return <div>Error: {aiHubError.message}</div>;
  }

  return (
    <ModularArchContextProvider config={createOdhModularArchConfig(aiHubInstancesNamespace)}>
      {children}
    </ModularArchContextProvider>
  );
};

export default OdhWrapper;
