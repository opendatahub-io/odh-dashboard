import * as React from 'react';
import QuickStarts from '../../app/QuickStarts';
import { useUser } from '../../redux/selectors';
import NotebookServerRoutes from './screens/server/NotebookServerRoutes';
import NotebookControllerTabs from './screens/admin/NotebookControllerTabs';
import { NotebookControllerContextProvider } from './NotebookControllerContext';
import SetupCurrentUserState from './SetupCurrentUserState';

const NotebookController: React.FC = () => {
  const { isAdmin } = useUser();

  return (
    <QuickStarts>
      <NotebookControllerContextProvider>
        <SetupCurrentUserState>
          {isAdmin ? <NotebookControllerTabs /> : <NotebookServerRoutes />}
        </SetupCurrentUserState>
      </NotebookControllerContextProvider>
    </QuickStarts>
  );
};

export default NotebookController;
