import React from 'react';
import { getAuth } from '@odh-dashboard/internal/api';

const DEFAULT_GROUP = 'system:authenticated';

type UseFetchAuthGroupsResult = {
  groups: string[];
  loaded: boolean;
  error: Error | undefined;
};

/**
 * Fetches auth groups from the cluster configuration.
 * Falls back to ['system:authenticated'] if no groups are found or on error.
 */
export const useFetchAuthGroups = (): UseFetchAuthGroupsResult => {
  const [groups, setGroups] = React.useState<string[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  React.useEffect(() => {
    let isMounted = true;

    const fetchGroups = async () => {
      try {
        const auth = await getAuth();
        if (!isMounted) {
          return;
        }
        const { adminGroups, allowedGroups } = auth.spec;
        // Combine admin and allowed groups, removing duplicates
        const allGroups = [...new Set([...adminGroups, ...allowedGroups, DEFAULT_GROUP])];

        // If no groups found, default to system:authenticated
        setGroups(allGroups.length > 0 ? allGroups : [DEFAULT_GROUP]);
        setError(undefined);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        // On error, fall back to system:authenticated
        setGroups([DEFAULT_GROUP]);
        setError(err instanceof Error ? err : new Error('Failed to fetch auth groups'));
      } finally {
        if (isMounted) {
          setLoaded(true);
        }
      }
    };

    fetchGroups();

    return () => {
      isMounted = false;
    };
  }, []);

  return { groups, loaded, error };
};
