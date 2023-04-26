import * as React from 'react';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { listGroups } from '~/api';
import { GroupKind } from '~/k8sTypes';
import { useUser } from '~/redux/selectors';

const useGroups = (): FetchState<GroupKind[]> => {
  const { isAdmin } = useUser();

  const getGroup = React.useCallback(() => {
    if (!isAdmin) {
      return Promise.resolve([]);
    }
    return listGroups().catch((e) => {
      if (e.statusObject?.code === 404) {
        throw new Error('No groups found.');
      }
      throw e;
    });
  }, [isAdmin]);

  return useFetchState<GroupKind[]>(getGroup, []);
};

export default useGroups;
