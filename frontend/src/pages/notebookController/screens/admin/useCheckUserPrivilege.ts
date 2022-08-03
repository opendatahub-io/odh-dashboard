import * as React from 'react';
import { getPrivileges } from '../../../../redux/actions/actions';
import { useDeepCompareMemoize } from '../../../../utilities/useDeepCompareMemoize';

const useCheckUserPrivilege = (
  userList: string[],
): [{ [username: string]: 'Admin' | 'User' }, boolean, Error | undefined] => {
  const [privileges, setPrivileges] = React.useState<{ [username: string]: 'Admin' | 'User' }>();
  const [loadError, setLoadError] = React.useState<Error | undefined>();
  const usernames = useDeepCompareMemoize(userList);

  React.useEffect(() => {
    let cancelled = false;

    getPrivileges(usernames)
      .then((data) => {
        if (cancelled) return;
        setPrivileges(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e);
      });

    return () => {
      cancelled = true;
    };
  }, [usernames]);

  const loaded = !!privileges;
  return [privileges || {}, loaded, loadError];
};

export default useCheckUserPrivilege;
