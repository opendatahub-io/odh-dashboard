import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEvalHubServerHealth } from '~/app/api/k8s';
import { setEvalHubServerVersion } from '~/app/tracking/evalhubTracking';

const useEvalHubTrackingBootstrap = (): null => {
  const { data } = useQuery({
    queryKey: ['evalhub', 'tracking', 'server-health'],
    queryFn: ({ signal }) => getEvalHubServerHealth('')({ signal }),
    staleTime: Infinity,
    retry: false,
  });

  React.useEffect(() => {
    setEvalHubServerVersion(data?.system_info.version);
  }, [data?.system_info.version]);

  return null;
};

export default useEvalHubTrackingBootstrap;
