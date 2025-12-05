import * as React from 'react';
import { MCPServerFromAPI } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';

const useFetchMCPServers = (): {
  data: MCPServerFromAPI[];
  loaded: boolean;
  error: Error | undefined;
} => {
  const { api, apiAvailable } = useGenAiAPI();
  const [data, setData] = React.useState<MCPServerFromAPI[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const fetchAttempted = React.useRef(false);

  React.useEffect(() => {
    if (apiAvailable && !fetchAttempted.current) {
      fetchAttempted.current = true;

      api
        .getMCPServers({})
        .then((response) => {
          setData(response.servers);
          setLoaded(true);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('[useFetchMCPServers] Error fetching MCP servers:', err);
          setError(err);
          setData([]);
          setLoaded(true);
        });
    }
  }, [apiAvailable, api]);

  return { data, loaded, error };
};

export default useFetchMCPServers;
