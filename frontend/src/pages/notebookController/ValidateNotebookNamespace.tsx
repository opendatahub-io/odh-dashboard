import * as React from 'react';
import { validateNotebookNamespaceRoleBinding } from '../../utilities/notebookControllerUtils';
import useNamespaces from './useNamespaces';
import ApplicationsPage from '../ApplicationsPage';

type ValidateNotebookNamespaceProps = {
  children: React.ReactNode;
};

const ValidateNotebookNamespace: React.FC<ValidateNotebookNamespaceProps> = ({ children }) => {
  const { notebookNamespace, dashboardNamespace } = useNamespaces();
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    if (notebookNamespace && dashboardNamespace) {
      validateNotebookNamespaceRoleBinding(notebookNamespace, dashboardNamespace)
        .then(() => {
          setLoaded(true);
        })
        .catch((e) => {
          const error = new Error(
            `Error validating the role binding of your notebookNamespace; ${e.response.data.message}`,
          );
          setLoadError(error);
        });
    }
  }, [notebookNamespace, dashboardNamespace]);

  return loaded ? (
    <>{children}</>
  ) : (
    <ApplicationsPage
      title="Loading..."
      description=""
      loaded={false}
      empty={false}
      loadError={loadError}
    />
  );
};

export default ValidateNotebookNamespace;
