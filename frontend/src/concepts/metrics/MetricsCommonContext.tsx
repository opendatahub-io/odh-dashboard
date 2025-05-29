import * as React from 'react';
import useCurrentTimeframeBrowserStorage from '#~/concepts/metrics/useCurrentTimeframeBrowserStorage';
import useRefreshIntervalBrowserStorage from '#~/concepts/metrics/useRefreshIntervalBrowserStorage';
import { RefreshIntervalTitle, TimeframeTitle } from '#~/concepts/metrics/types';

export type MetricsCommonContextType = {
  currentTimeframe: TimeframeTitle;
  setCurrentTimeframe: (timeframe: TimeframeTitle) => void;
  currentRefreshInterval: RefreshIntervalTitle;
  setCurrentRefreshInterval: (interval: RefreshIntervalTitle) => void;
  lastUpdateTime: number;
  setLastUpdateTime: (time: number) => void;
};

export const MetricsCommonContext = React.createContext<MetricsCommonContextType>({
  currentTimeframe: TimeframeTitle.ONE_HOUR,
  setCurrentTimeframe: () => undefined,
  currentRefreshInterval: RefreshIntervalTitle.FIVE_MINUTES,
  setCurrentRefreshInterval: () => undefined,
  lastUpdateTime: 0,
  setLastUpdateTime: () => undefined,
});

type MetricsCommonContextProviderProps = {
  children: React.ReactNode;
  initialRefreshInterval?: RefreshIntervalTitle;
};

export const MetricsCommonContextProvider: React.FC<MetricsCommonContextProviderProps> = ({
  children,
  initialRefreshInterval,
}) => {
  const [currentTimeframe, setCurrentTimeframe] = useCurrentTimeframeBrowserStorage();

  const [currentRefreshInterval, setCurrentRefreshInterval] =
    useRefreshIntervalBrowserStorage(initialRefreshInterval);

  const [lastUpdateTime, setLastUpdateTime] = React.useState<number>(Date.now());

  const contextValue = React.useMemo(
    () => ({
      currentTimeframe,
      setCurrentTimeframe,
      currentRefreshInterval,
      setCurrentRefreshInterval,
      lastUpdateTime,
      setLastUpdateTime,
    }),
    [
      currentTimeframe,
      setCurrentTimeframe,
      currentRefreshInterval,
      setCurrentRefreshInterval,
      lastUpdateTime,
      setLastUpdateTime,
    ],
  );

  return (
    <MetricsCommonContext.Provider value={contextValue}>{children}</MetricsCommonContext.Provider>
  );
};
