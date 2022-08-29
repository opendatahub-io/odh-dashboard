import * as React from 'react';
import NotebookAdminControl from './NotebookAdminControl';
import NotebookServerRoutes from '../server/NotebookServerRoutes';
import { NotebookControllerContext } from '../../NotebookControllerContext';
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
