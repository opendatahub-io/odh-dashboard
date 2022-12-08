import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import useNotification from '../../../../utilities/useNotification';

const useCheckLogoutParams = (): void => {
  const [queryParams, setQueryParams] = useSearchParams();
  const notification = useNotification();

  // TODO: this will be triggered twice, don't know why
  React.useEffect(() => {
    if (queryParams.get('notebookLogout')) {
      notification.success(`Logout workbench successfully`);
      queryParams.delete('notebookLogout');
      setQueryParams(queryParams);
    }
  }, [notification, queryParams, setQueryParams]);
};

export default useCheckLogoutParams;
