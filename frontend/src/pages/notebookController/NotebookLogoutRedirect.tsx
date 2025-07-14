import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNotebook } from '#~/services/notebookService';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import useNotification from '#~/utilities/useNotification';
import useRouteForNotebook from '#~/concepts/notebooks/apiHooks/useRouteForNotebook';
import { getRoute } from '#~/services/routeService';
import { FAST_POLL_INTERVAL } from '#~/utilities/const';
import useNamespaces from './useNamespaces';

const NotebookLogoutRedirect: React.FC = () => {
  const { namespace, notebookName } = useParams<{ namespace: string; notebookName: string }>();
  const notification = useNotification();
  const navigate = useNavigate();
  const { workbenchNamespace } = useNamespaces();
  const {
    data: notebookRoute,
    loaded,
    error,
  } = useRouteForNotebook(notebookName, namespace, true, FAST_POLL_INTERVAL);

  React.useEffect(() => {
    let cancelled = false;
    if (namespace && notebookName && namespace === workbenchNamespace) {
      getNotebook(namespace, notebookName)
        .then(() => {
          if (cancelled) {
            return;
          }
          getRoute(workbenchNamespace, notebookName)
            .then((route) => {
              const location = new URL(
                `https://${route.spec.host}/notebook/${workbenchNamespace}/${notebookName}`,
              );
              window.location.href = `${location.origin}/oauth/sign_out`;
            })
            .catch((e) => {
              notification.error('Error fetching notebook URL.', e.message);
              navigate('not-found');
            });
        })
        .catch((e) => {
          if (cancelled) {
            return;
          }
          /* eslint-disable-next-line no-console */
          console.error(e);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [namespace, notebookName, navigate, notification, workbenchNamespace]);

  React.useEffect(() => {
    if (namespace && notebookName && namespace !== workbenchNamespace) {
      if (error) {
        notification.error(`Error when logging out ${notebookName}`, error.message);
        navigate(`/projects/${namespace}`);
      }
      if (loaded && notebookRoute) {
        const location = new URL(notebookRoute);
        window.location.href = `${location.origin}/oauth/sign_out`;
      }
    }
  }, [
    notebookRoute,
    loaded,
    error,
    notification,
    namespace,
    notebookName,
    navigate,
    workbenchNamespace,
  ]);

  return (
    <ApplicationsPage title="Logging out..." description={null} loaded={false} empty={false} />
  );
};

export default NotebookLogoutRedirect;
