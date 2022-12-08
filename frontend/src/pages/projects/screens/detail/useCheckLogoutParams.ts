import * as React from 'react';
import useNotification from '../../../../utilities/useNotification';
import { useQueryParams } from '../../../../utilities/useQueryParams';

const useCheckLogoutParams = (): void => {
  const queryParams = useQueryParams();
  const notification = useNotification();

  // TODO: this will be triggered twice, don't know why
  React.useEffect(() => {
    if (queryParams.get('notebookLogout')) {
      notification.success(`Logout workbench successfully`);
      queryParams.delete('notebookLogout');
    }
  }, [notification, queryParams]);
};

export default useCheckLogoutParams;
