import * as React from 'react';
import { getDashboardPvcs } from '~/api';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';

const useProjectPvcs = (
  namespace?: string,
  allowAll?: boolean,
): FetchState<PersistentVolumeClaimKind[]> => {
  const { projects } = React.useContext(ProjectsContext);
  const getProjectPvcs = React.useCallback(() => {
    if (!namespace) {
      if (allowAll) {
        const getters = projects.map((p) => getDashboardPvcs(p.metadata.name));
        return Promise.all(getters).then((results) =>
          results.reduce<PersistentVolumeClaimKind[]>((acc, next) => {
            acc.push(...next);
            return acc;
          }, []),
        );
      }
      return Promise.reject(new NotReadyError('No namespace'));
    }

    return getDashboardPvcs(namespace);
  }, [allowAll, namespace, projects]);

  return useFetchState<PersistentVolumeClaimKind[]>(getProjectPvcs, []);
};

export default useProjectPvcs;
