import * as React from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { getNotebook } from '../../services/notebookService';
import ApplicationsPage from '../../pages/ApplicationsPage';
import useNotification from '../../utilities/useNotification';

const NotebookLogoutRedirect: React.FC = () => {
  const { namespace, notebookName } = useParams<{ namespace: string; notebookName: string }>();
  const notification = useNotification();
  const history = useHistory();
  React.useEffect(() => {
    if (namespace && notebookName) {
      getNotebook(namespace, notebookName)
        .then((notebook) => {
          if (notebook?.metadata.annotations?.['opendatahub.io/link']) {
            const location = new URL(notebook.metadata.annotations['opendatahub.io/link']);
            window.location.href = `${location.origin}/oauth/sign_out`;
          } else {
            notification.error(
              'Error fetching notebook URL.',
              'Please check the status of your notebook.',
            );
            history.push('not-found');
          }
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }, [namespace, notebookName, history, notification]);
  return (
    <ApplicationsPage title="Logging out..." description={null} loaded={false} empty={false} />
  );
};

export default NotebookLogoutRedirect;
