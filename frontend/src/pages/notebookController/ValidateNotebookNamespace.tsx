import * as React from 'react';
import { validateNotebookNamespaceRoleBinding } from '#~/utilities/notebookControllerUtils';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import useNamespaces from './useNamespaces';

type ValidateNotebookNamespaceProps = {
  children: React.ReactNode;
};

const ValidateNotebookNamespace: React.FC<ValidateNotebookNamespaceProps> = ({ children }) => {
  const { workbenchNamespace, dashboardNamespace } = useNamespaces();
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    if (workbenchNamespace && dashboardNamespace) {
      validateNotebookNamespaceRoleBinding(workbenchNamespace, dashboardNamespace)
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
  }, [workbenchNamespace, dashboardNamespace]);

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
