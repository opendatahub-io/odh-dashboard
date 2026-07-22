import * as React from 'react';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';

const DEV_FLAGS_SESSION_KEY = 'odh-feature-flags';
const DEV_FLAGS_CHANGED_EVENT = 'odh-dev-flags-changed';

const readBooleanFlag = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const readSessionDevFlag = (flag: string): boolean | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  try {
    const stored = window.sessionStorage.getItem(DEV_FLAGS_SESSION_KEY);
    if (!stored) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return undefined;
    }
    return readBooleanFlag(Reflect.get(parsed, flag));
  } catch {
    return undefined;
  }
};

/**
 * True when agent-ops deploy mode is enabled (write actions are available).
 *
 * Federated remotes may not share host React contexts, so we resolve from:
 * 1. DashboardConfigContext (host merge of CR + session overrides, when shared)
 * 2. sessionStorage `odh-feature-flags` (covers local toggle without shared context)
 * 3. SupportedArea / AreaContext fallback
 */
export const useAgentOpsDeploy = (): boolean => {
  const config = React.useContext(DashboardConfigContext);
  const areaStatus = useIsAreaAvailable(SupportedArea.AGENT_OPS_DEPLOY).status;

  // Re-render when the host updates session flags (needed if context is not shared).
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const onFlagsChanged = () => setTick((tick) => tick + 1);
    window.addEventListener(DEV_FLAGS_CHANGED_EVENT, onFlagsChanged);
    return () => window.removeEventListener(DEV_FLAGS_CHANGED_EVENT, onFlagsChanged);
  }, []);

  const fromConfig = readBooleanFlag(config?.dashboardConfig.agentOpsDeploy);
  if (typeof fromConfig === 'boolean') {
    return fromConfig;
  }

  const fromSession = readSessionDevFlag('agentOpsDeploy');
  if (typeof fromSession === 'boolean') {
    return fromSession;
  }

  return areaStatus;
};
