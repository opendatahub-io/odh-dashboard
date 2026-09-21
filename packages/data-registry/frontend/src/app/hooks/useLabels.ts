import React from 'react';
import { fetchLabels } from '~/app/api/dataRegistry';

export const useLabels = (project: string): [string[], boolean, Error | undefined, () => void] => {
  const [labels, setLabels] = React.useState<string[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = React.useCallback(() => setRefreshKey((k) => k + 1), []);

  React.useEffect(() => {
    if (!project) {
      setLabels([]);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setLabels([]);
    setLoaded(false);
    setError(undefined);

    fetchLabels(project)
      .then((response) => {
        if (!cancelled) {
          setLabels(response.labels);
          setLoaded(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [project, refreshKey]);

  return [labels, loaded, error, refresh];
};
