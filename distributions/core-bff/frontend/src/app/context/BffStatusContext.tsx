import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { URL_PREFIX, BFF_API_VERSION } from '~/app/utilities/const';

type BffStatus = {
  connected: boolean;
  loaded: boolean;
  version?: string;
  error?: string;
};

const BffStatusContext = createContext<BffStatus>({
  connected: false,
  loaded: false,
});

export const BffStatusProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [status, setStatus] = useState<BffStatus>({ connected: false, loaded: false });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const resp = await fetch(`${URL_PREFIX}/api/${BFF_API_VERSION}/healthcheck`);
        if (!resp.ok) {
          setStatus({ connected: false, loaded: true, error: `HTTP ${resp.status}` });
          return;
        }
        const data = await resp.json().catch(() => null);
        setStatus({ connected: true, loaded: true, version: data?.systemInfo?.version });
      } catch (err) {
        setStatus({ connected: false, loaded: true, error: String(err) });
      }
    };
    fetchStatus();
  }, []);

  const value = useMemo(() => status, [status]);

  return <BffStatusContext.Provider value={value}>{children}</BffStatusContext.Provider>;
};

export const useBffStatus = (): BffStatus => useContext(BffStatusContext);
