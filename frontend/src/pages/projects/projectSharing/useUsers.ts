import * as React from 'react';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { listUsers } from '~/api';
import { UserKind } from '~/k8sTypes';

const useUsers = (): FetchState<UserKind[]> => {
  const getUser = React.useCallback(
    () =>
      listUsers().catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('No users found.');
        }
        throw e;
      }),

    [],
  );

  return useFetchState<UserKind[]>(getUser, []);
};

export default useUsers;
