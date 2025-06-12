import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import useNotification from '#~/utilities/useNotification';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';

const useCheckLogoutParams = (): void => {
  const [queryParams, setQueryParams] = useSearchParams();
  const notification = useNotification();
  const {
    notebooks: { data: notebooks, loaded },
  } = React.useContext(ProjectDetailsContext);

  const notebookLogout = queryParams.get('notebookLogout');
  const notebook = notebooks.find((n) => n.notebook.metadata.name === notebookLogout);

  React.useEffect(() => {
    const deleteLogoutParam = () => {
      queryParams.delete('notebookLogout');
      setQueryParams(queryParams, { replace: true });
    };
    if (notebookLogout) {
      if (notebook) {
        notification.success(
          `Logged out of workbench "${getDisplayNameFromK8sResource(
            notebook.notebook,
          )}" successfully`,
        );
        deleteLogoutParam();
      } else if (loaded) {
        notification.error('Error logging out', 'Unable to locate notebook to finalize logout');
        deleteLogoutParam();
      }
    }
  }, [notification, notebook, setQueryParams, queryParams, loaded, notebookLogout]);
};

export default useCheckLogoutParams;
