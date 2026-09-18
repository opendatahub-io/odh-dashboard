import * as React from 'react';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';

const DEV_FLAGS_SESSION_KEY = 'odh-feature-flags';
const DEV_FLAGS_CHANGED_EVENT = 'odh-dev-flags-changed';
const FLAG_NAME = 'genAiMcpRegistryServers';

const readSessionFlag = (): boolean | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const storedFlags = window.sessionStorage.getItem(DEV_FLAGS_SESSION_KEY);
    if (!storedFlags) {
      return undefined;
    }

    const parsedFlags: unknown = JSON.parse(storedFlags);
    if (typeof parsedFlags !== 'object' || parsedFlags === null || Array.isArray(parsedFlags)) {
      return undefined;
    }

    const flagValue = Reflect.get(parsedFlags, FLAG_NAME);
    return typeof flagValue === 'boolean' ? flagValue : undefined;
  } catch {
    return undefined;
  }
};

const useGenAiMcpRegistryServers = (): boolean => {
  const dashboardConfig = React.useContext(DashboardConfigContext);
  const [, setFlagsVersion] = React.useState(0);

  React.useEffect(() => {
    const handleFlagsChanged = () => setFlagsVersion((version) => version + 1);
    window.addEventListener(DEV_FLAGS_CHANGED_EVENT, handleFlagsChanged);
    return () => window.removeEventListener(DEV_FLAGS_CHANGED_EVENT, handleFlagsChanged);
  }, []);

  const configValue = dashboardConfig?.dashboardConfig.genAiMcpRegistryServers;
  if (typeof configValue === 'boolean') {
    return configValue;
  }

  return readSessionFlag() ?? false;
};

export default useGenAiMcpRegistryServers;
