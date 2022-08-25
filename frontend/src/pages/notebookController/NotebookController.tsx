import * as React from 'react';
import QuickStarts from '../../app/QuickStarts';
import { useUser } from '../../redux/selectors';
import NotebookServerRoutes from './screens/server/NotebookServerRoutes';
import NotebookControllerTabs from './screens/admin/NotebookControllerTabs';
import { NotebookControllerContextProvider } from './NotebookControllerContext';
import ValidateNotebookNamespace from './ValidateNotebookNamespace';

const NotebookController: React.FC = () => {
  const { isAdmin } = useUser();

  return (
    <QuickStarts>
      <NotebookControllerContextProvider>
        <ValidateNotebookNamespace>
          {isAdmin ? <NotebookControllerTabs /> : <NotebookServerRoutes />}
        </ValidateNotebookNamespace>
      </NotebookControllerContextProvider>
    </QuickStarts>
  );
};

export default NotebookController;
