import * as React from 'react';
import { useParams } from 'react-router-dom';
import { getNotebook } from '../../services/notebookService';
import ApplicationsPage from 'pages/ApplicationsPage';

const NotebookLogoutRedirect: React.FC = () => {
  const { namespace, notebookName } = useParams<{ namespace: string; notebookName: string }>();
  React.useEffect(() => {
    if (namespace && notebookName) {
      getNotebook(namespace, notebookName)
        .then((notebook) => {
          if (notebook?.metadata.annotations?.['opendatahub.io/link']) {
            const location = new URL(notebook.metadata.annotations['opendatahub.io/link']);
            window.location.href = `${location.origin}/oauth/sign_out`;
          }
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }, [namespace, notebookName]);
  return (
    <ApplicationsPage title="Logging out..." description={null} loaded={false} empty={false} />
  );
};

export default NotebookLogoutRedirect;
