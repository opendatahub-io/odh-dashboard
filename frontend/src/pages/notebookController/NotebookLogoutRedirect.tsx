import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNotebook } from '#~/services/notebookService';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import useNotification from '#~/utilities/useNotification';
import { useGetNotebookRoute } from '#~/utilities/useGetNotebookRoute';
import useNamespaces from './useNamespaces';

const NotebookLogoutRedirect: React.FC = () => {
  const { namespace, notebookName } = useParams<{ namespace: string; notebookName: string }>();
  const notification = useNotification();
  const navigate = useNavigate();
  const { workbenchNamespace } = useNamespaces();
  const [injectAuth, setInjectAuth] = React.useState<boolean>(false);
  const [notebookLoaded, setNotebookLoaded] = React.useState<boolean>(false);

  const workbenchPath =
    useGetNotebookRoute(workbenchNamespace, notebookName, injectAuth, true) ?? '';

  React.useEffect(() => {
    let cancelled = false;
    if (namespace && notebookName) {
      getNotebook(namespace, notebookName)
        .then((notebook) => {
          if (cancelled) {
            return;
          }
          setInjectAuth(
            notebook.metadata.annotations?.['notebooks.opendatahub.io/inject-auth'] === 'true',
          );
          setNotebookLoaded(true);
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
  }, [namespace, notebookName, navigate, notification]);

  React.useEffect(() => {
    if (notebookLoaded && workbenchPath) {
      const location = new URL(workbenchPath, window.location.origin);
      window.location.href = `${location.origin}/oauth2/sign_out`;
    }
  }, [notebookLoaded, workbenchPath]);

  return (
    <ApplicationsPage title="Logging out..." description={null} loaded={false} empty={false} />
  );
};

export default NotebookLogoutRedirect;
