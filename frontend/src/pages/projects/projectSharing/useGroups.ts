import * as React from 'react';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { listGroups } from '~/api';
import { GroupKind } from '~/k8sTypes';

const useGroups = (): FetchState<GroupKind[]> => {
  const getGroup = React.useCallback(
    () =>
      listGroups().catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('No groups found.');
        }
        throw e;
      }),

    [],
  );

  return useFetchState<GroupKind[]>(getGroup, []);
};

export default useGroups;
