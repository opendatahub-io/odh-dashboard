import * as React from 'react';
import { useFetchState, type FetchStateCallbackPromise } from 'mod-arch-core';
import { listGateways } from '~/app/api/gateways';
import type { Gateway } from '~/app/types/gateway';

const GATEWAY_STORAGE_KEY = 'agent-ops-selected-gateway';
const GATEWAY_REFRESH_INTERVAL = 30_000;

type GatewayContextProps = {
  gateways: Gateway[];
  selectedGateway: Gateway | undefined;
  setSelectedGateway: (gateway: Gateway) => void;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => void;
};

const GatewayContext = React.createContext<GatewayContextProps>({
  gateways: [],
  selectedGateway: undefined,
  setSelectedGateway: () => undefined,
  loaded: false,
  error: undefined,
  refresh: () => undefined,
});

type GatewayContextProviderProps = {
  children: React.ReactNode;
};

export const GatewayContextProvider: React.FC<GatewayContextProviderProps> = ({ children }) => {
  const [selectedName, setSelectedName] = React.useState<string | null>(() => {
    try {
      return sessionStorage.getItem(GATEWAY_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const fetchCallback = React.useCallback<FetchStateCallbackPromise<Gateway[]>>(
    async (opts) => listGateways('')(opts),
    [],
  );

  const [gateways, loaded, fetchError, refresh] = useFetchState<Gateway[]>(
    fetchCallback,
    [],
    { refreshRate: GATEWAY_REFRESH_INTERVAL },
  );

  const selectedGateway = React.useMemo(() => {
    if (gateways.length === 0) {
      return undefined;
    }
    if (selectedName) {
      const found = gateways.find((gw) => gw.name === selectedName);
      if (found) {
        return found;
      }
    }
    return gateways[0];
  }, [gateways, selectedName]);

  const setSelectedGateway = React.useCallback((gateway: Gateway) => {
    setSelectedName(gateway.name);
    try {
      sessionStorage.setItem(GATEWAY_STORAGE_KEY, gateway.name);
    } catch {
      // sessionStorage unavailable, silently ignore
    }
  }, []);

  const contextValue = React.useMemo<GatewayContextProps>(
    () => ({
      gateways,
      selectedGateway,
      setSelectedGateway,
      loaded,
      error: fetchError ?? undefined,
      refresh,
    }),
    [gateways, selectedGateway, setSelectedGateway, loaded, fetchError, refresh],
  );

  return <GatewayContext.Provider value={contextValue}>{children}</GatewayContext.Provider>;
};

export const useGatewayContext = (): GatewayContextProps => {
  const context = React.useContext(GatewayContext);
  if (!context) {
    throw new Error('useGatewayContext must be used within a GatewayContextProvider');
  }
  return context;
};

export default GatewayContext;
