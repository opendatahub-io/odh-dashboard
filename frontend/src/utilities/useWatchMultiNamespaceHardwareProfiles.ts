import * as React from 'react';
import { HardwareProfileKind } from '#~/k8sTypes';
import { CustomWatchK8sResult } from '#~/types';
import { listHardwareProfiles } from '#~/api';
import { POLL_INTERVAL } from './const';
import { allSettledPromises } from './allSettledPromises';

export const useWatchMultiNamespaceHardwareProfiles = (
  namespaces: string[],
): CustomWatchK8sResult<HardwareProfileKind[]> => {
  const [combinedData, setCombinedData] = React.useState<HardwareProfileKind[]>([]);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const namespacesString = React.useMemo(() => namespaces.toSorted().join(','), [namespaces]);

  const fetchHardwareProfiles = React.useCallback(async () => {
    if (!namespacesString.length) {
      setCombinedData([]);
      setIsLoaded(true);
      setError(undefined);
      return;
    }
    const [successes, failures] = await allSettledPromises<
      { namespace: string; profiles: HardwareProfileKind[] },
      Error
    >(
      namespaces.map((namespace) =>
        listHardwareProfiles(namespace).then((profiles) => ({ namespace, profiles })),
      ),
    );
    const allProfiles = successes.flatMap(({ value }) => value.profiles);
    setCombinedData(allProfiles);
    setIsLoaded(true);

    if (failures.length > 0) {
      if (failures.length === 1) {
        setError(failures[0].reason);
      } else {
        setError(
          new Error(
            `Failed to fetch hardware profiles from ${failures.length} namespace(s):\n${failures
              .map(({ reason }) => `  - ${reason.message}`)
              .join('\n')}`,
          ),
        );
      }
    } else {
      setError(undefined);
    }
  }, [namespacesString]);

  React.useEffect(() => {
    setIsLoaded(false);
    fetchHardwareProfiles();
  }, [fetchHardwareProfiles]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchHardwareProfiles();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchHardwareProfiles]);

  return [combinedData, isLoaded, error];
};
