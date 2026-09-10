import * as React from 'react';
import { MCPServerFromAPI } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchMCPServers = (): {
  data: MCPServerFromAPI[];
  configMapName: string | null;
  registryAvailable: boolean;
  loaded: boolean;
  error: Error | undefined;
  refetch: () => void;
} => {
  const { api, apiAvailable } = useGenAiAPI();
  const [data, setData] = React.useState<MCPServerFromAPI[]>([]);
  const [configMapName, setConfigMapName] = React.useState<string | null>(null);
  const [registryAvailable, setRegistryAvailable] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const fetchAttempted = React.useRef(false);
  const generationRef = React.useRef(0);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    if (apiAvailable && !fetchAttempted.current) {
      fetchAttempted.current = true;
      const generation = ++generationRef.current;

      api
        .getMCPServers({})
        .then((response) => {
          if (generation !== generationRef.current) {
            return;
          }
          setData(response.servers ?? []);
          setConfigMapName(response.config_map_info?.name ?? null);
          setRegistryAvailable(response.registry_available ?? false);
          setLoaded(true);
        })
        .catch((err) => {
          if (generation !== generationRef.current) {
            return;
          }
          // eslint-disable-next-line no-console
          console.error('[useFetchMCPServers] Error fetching MCP servers:', err);
          setError(err);
          setData([]);
          setLoaded(true);
        });
    }
  }, [apiAvailable, api, retryCount]);

  const refetch = React.useCallback(() => {
    generationRef.current++;
    fetchAttempted.current = false;
    setLoaded(false);
    setError(undefined);
    setRetryCount((c) => c + 1);
  }, []);

  return { data, configMapName, registryAvailable, loaded, error, refetch };
};

export default useFetchMCPServers;
