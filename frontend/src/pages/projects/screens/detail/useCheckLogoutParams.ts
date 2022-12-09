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
    const deleteLogoutParam = () => {
      queryParams.delete('notebookLogout');
      setQueryParams(queryParams);
    };
    const notebookLogout = queryParams.get('notebookLogout');
    if (notebookLogout) {
      const notebook = notebooks.find((n) => n.notebook.metadata.name === notebookLogout);
      if (notebook?.notebook) {
        notification.success(
          `Logout workbench "${getNotebookDisplayName(notebook.notebook)}" successfully`,
        );
        deleteLogoutParam();
      } else if (loaded) {
        notification.error('Error logging out', 'Unable to locate notebook to finalize logout');
        deleteLogoutParam();
      }
    }
  }, [notification, notebooks, loaded, setQueryParams, queryParams]);
};

export default useCheckLogoutParams;
