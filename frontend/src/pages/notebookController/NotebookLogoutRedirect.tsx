import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNotebook } from '#~/services/notebookService';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import useNotification from '#~/utilities/useNotification';
import { getRoutePathForWorkbench } from '#~/concepts/notebooks/utils';
import useNamespaces from './useNamespaces';

const NotebookLogoutRedirect: React.FC = () => {
  const { namespace, notebookName } = useParams<{ namespace: string; notebookName: string }>();
  const notification = useNotification();
  const navigate = useNavigate();
  const { workbenchNamespace } = useNamespaces();

  React.useEffect(() => {
    let cancelled = false;
    if (namespace && notebookName) {
      getNotebook(namespace, notebookName)
        .then(() => {
          if (cancelled) {
            return;
          }
          // Use same-origin relative path for logout
          const workbenchPath = getRoutePathForWorkbench(namespace, notebookName);
          const location = new URL(workbenchPath, window.location.origin);
          window.location.href = `${location.origin}/oauth/sign_out`;
        })
        .catch((e) => {
          if (cancelled) {
            return;
          }
          /* eslint-disable-next-line no-console */
          console.error(e);
          notification.error('Error fetching notebook.', e.message);
          navigate('not-found');
        });
    }
    return () => {
      cancelled = true;
    };
  }, [namespace, notebookName, navigate, notification, workbenchNamespace]);

  return (
    <ApplicationsPage title="Logging out..." description={null} loaded={false} empty={false} />
  );
};

export default NotebookLogoutRedirect;
