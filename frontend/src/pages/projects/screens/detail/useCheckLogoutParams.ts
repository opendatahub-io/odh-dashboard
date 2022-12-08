import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import useNotification from '../../../../utilities/useNotification';
import { ProjectDetailsContext } from '../../ProjectDetailsContext';
import { getNotebookDisplayName } from '../../utils';

const useCheckLogoutParams = (): void => {
  const [queryParams, setQueryParams] = useSearchParams();
  const notification = useNotification();
  const {
    notebooks: { data: notebooks, loaded },
  } = React.useContext(ProjectDetailsContext);

  React.useEffect(() => {
    if (loaded) {
      const notebookLogout = queryParams.get('notebookLogout');
      const notebook = notebooks.find((n) => n.notebook.metadata.name === notebookLogout);
      if (notebook?.notebook) {
        notification.success(
          `Logout workbench "${getNotebookDisplayName(notebook.notebook)}" successfully`,
        );
      }
      queryParams.delete('notebookLogout');
      setQueryParams(queryParams);
    }
  }, [notification, queryParams, setQueryParams, notebooks, loaded]);
};

export default useCheckLogoutParams;
