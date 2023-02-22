import * as React from 'react';
import NotebookAdminControl from './NotebookAdminControl';
import NotebookServerRoutes from '~/pages/notebookController/screens/server/NotebookServerRoutes';
import { NotebookControllerContext } from '~/pages/notebookController/NotebookControllerContext';
import { NotebookAdminContextProvider } from './NotebookAdminContext';

const NotebookAdmin: React.FC = () => {
  const { impersonatedUsername } = React.useContext(NotebookControllerContext);

  return impersonatedUsername ? (
    <NotebookServerRoutes />
  ) : (
    <NotebookAdminContextProvider>
      <NotebookAdminControl />
    </NotebookAdminContextProvider>
  );
};

export default NotebookAdmin;
