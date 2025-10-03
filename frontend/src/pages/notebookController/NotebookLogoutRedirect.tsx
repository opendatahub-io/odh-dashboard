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
  const notebookRoute =
    namespace && notebookName ? getRoutePathForWorkbench(namespace, notebookName) : null;

  React.useEffect(() => {
    let cancelled = false;
    if (namespace && notebookName && namespace === workbenchNamespace) {
      getNotebook(namespace, notebookName)
        .then(() => {
          if (cancelled) {
            return;
          }
          window.location.href = getRoutePathForWorkbench(workbenchNamespace, notebookName);
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
      if (notebookRoute) {
        const location = new URL(notebookRoute);
        // TODO: how do we handle logout? We share a token login state
        window.location.href = `${location.origin}/oauth/sign_out`;
      }
    }
  }, [notebookRoute, notification, namespace, notebookName, navigate, workbenchNamespace]);

  return (
    <ApplicationsPage title="Logging out..." description={null} loaded={false} empty={false} />
  );
};

export default NotebookLogoutRedirect;
