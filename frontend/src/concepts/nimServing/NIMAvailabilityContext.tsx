import * as React from 'react';
import { useIsNIMAvailable } from '~/pages/modelServing/screens/projects/useIsNIMAvailable';

export type NIMAvailabilityContextType = {
  isNIMAvailable: boolean;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<boolean | undefined>;
};

type NIMAvailabilityContextProviderProps = {
  children: React.ReactNode;
};

export const NIMAvailabilityContext = React.createContext<NIMAvailabilityContextType>({
  isNIMAvailable: false,
  loaded: false,
  error: undefined,
  refresh: async () => undefined,
});

const useNIMAvailabilitySync = (isNIMAvailable: boolean) => {
  const [syncedIsNIMAvailable, setSyncedIsNIMAvailable] = React.useState(isNIMAvailable);
  const channel = React.useRef(new BroadcastChannel('nim_availability'));

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      setSyncedIsNIMAvailable(event.data);
    };
    channel.current.addEventListener('message', handleMessage);
    return () => channel.current.removeEventListener('message', handleMessage);
  }, []);

  React.useEffect(() => {
    channel.current.postMessage(syncedIsNIMAvailable);
  }, [syncedIsNIMAvailable]);

  React.useEffect(() => {
    setSyncedIsNIMAvailable(isNIMAvailable);
  }, [isNIMAvailable]);

  return syncedIsNIMAvailable;
};

export const NimContextProvider: React.FC<NIMAvailabilityContextProviderProps> = ({
  children,
  ...props
}) => <EnabledNimContextProvider {...props}>{children}</EnabledNimContextProvider>;

const EnabledNimContextProvider: React.FC<NIMAvailabilityContextProviderProps> = ({ children }) => {
  const [isNIMAvailable, loaded, error, refresh] = useIsNIMAvailable();
  const syncedIsNIMAvailable = useNIMAvailabilitySync(isNIMAvailable);

  const contextValue = React.useMemo(
    () => ({ isNIMAvailable: syncedIsNIMAvailable, loaded, error, refresh }),
    [syncedIsNIMAvailable, loaded, error, refresh],
  );

  return (
    <NIMAvailabilityContext.Provider value={contextValue}>
      {children}
    </NIMAvailabilityContext.Provider>
  );
};
