import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '#~/redux/selectors';
import { useCheckJupyterEnabled } from '#~/utilities/notebookControllerUtils';
import NotebookServerRoutes from './screens/server/NotebookServerRoutes';
import NotebookControllerTabs from './screens/admin/NotebookControllerTabs';
import { NotebookControllerContextProvider } from './NotebookControllerContext';
import ValidateNotebookNamespace from './ValidateNotebookNamespace';

const NotebookController: React.FC = () => {
  const { isAdmin } = useUser();
  const isJupyterEnabled = useCheckJupyterEnabled();
  if (!isJupyterEnabled) {
    return <Navigate to="/" replace />;
  }

  return (
    <NotebookControllerContextProvider>
      <ValidateNotebookNamespace>
        {isAdmin ? <NotebookControllerTabs /> : <NotebookServerRoutes />}
      </ValidateNotebookNamespace>
    </NotebookControllerContextProvider>
  );
};

export default NotebookController;
