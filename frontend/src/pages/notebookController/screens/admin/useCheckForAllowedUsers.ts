import * as React from 'react';
import { getAllowedUsers } from '#~/redux/actions/actions';
import useNamespaces from '#~/pages/notebookController/useNamespaces';
import { AllowedUser } from './types';

const useCheckForAllowedUsers = (): [
  allowedUsers: AllowedUser[],
  loaded: boolean,
  error: Error | undefined,
] => {
  const { notebookNamespace } = useNamespaces();
  const [allowedUsers, setAllowedUsers] = React.useState<AllowedUser[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    getAllowedUsers(notebookNamespace)
      .then((users) => {
        setAllowedUsers(users);
        setLoaded(true);
      })
      .catch((e) => {
        setError(new Error(e.response.data.message));
        setLoaded(false);
      });
  }, [notebookNamespace]);

  return [allowedUsers, loaded, error];
};

export default useCheckForAllowedUsers;
