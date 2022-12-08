import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import useNotification from '../../../../utilities/useNotification';

const useCheckLogoutParams = (): void => {
  const [queryParams, setQueryParams] = useSearchParams();
  const notification = useNotification();

  React.useEffect(() => {
    if (queryParams.get('notebookLogout')) {
      notification.success(`Logout workbench successfully`);
      queryParams.delete('notebookLogout');
      setQueryParams(queryParams);
    }
  }, [notification, queryParams, setQueryParams]);
};

export default useCheckLogoutParams;
