import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNotebook } from '../../services/notebookService';
import ApplicationsPage from '../../pages/ApplicationsPage';
import useNotification from '../../utilities/useNotification';
import useRouteForNotebook from '../projects/notebook/useRouteForNotebook';
import useNamespaces from './useNamespaces';

const NotebookLogoutRedirect: React.FC = () => {
  const { namespace, notebookName } = useParams<{ namespace: string; notebookName: string }>();
  const notification = useNotification();
  const navigate = useNavigate();
  const { notebookNamespace } = useNamespaces();
  const [routeLink, loaded, error] = useRouteForNotebook(notebookName, namespace);

  React.useEffect(() => {
    let cancelled = false;
    if (namespace && notebookName && namespace === notebookNamespace) {
      getNotebook(namespace, notebookName)
        .then((notebook) => {
          if (cancelled) {
            return;
          }
          if (notebook?.metadata.annotations?.['opendatahub.io/link']) {
            const location = new URL(notebook.metadata.annotations['opendatahub.io/link']);
            window.location.href = `${location.origin}/oauth/sign_out`;
          } else {
            notification.error(
              'Error fetching notebook URL.',
              'Please check the status of your notebook.',
            );
            navigate('not-found');
          }
        })
        .catch((e) => {
          if (cancelled) {
            return;
          }
          console.error(e);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [namespace, notebookName, navigate, notification, notebookNamespace]);

  React.useEffect(() => {
    let cancelled = false;
    if (cancelled) {
      return;
    }
    if (namespace && notebookName && namespace !== notebookNamespace) {
      if (loaded) {
        if (error) {
          notification.error(`Error when logging out ${notebookName}`, error.message);
          navigate(`/projects/${namespace}`);
        } else if (routeLink) {
          const location = new URL(routeLink);
          window.location.href = `${location.origin}/oauth/sign_out`;
        }
      }
    }
    return () => {
      cancelled = true;
    };
  }, [
    routeLink,
    loaded,
    error,
    notification,
    namespace,
    notebookName,
    navigate,
    notebookNamespace,
  ]);

  return (
    <ApplicationsPage title="Logging out..." description={null} loaded={false} empty={false} />
  );
};

export default NotebookLogoutRedirect;
