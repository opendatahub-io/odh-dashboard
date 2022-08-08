import * as React from 'react';
import NotebookAdminControl from './NotebookAdminControl';
import NotebookServerRoutes from '../server/NotebookServerRoutes';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import { NotebookAdminContextProvider } from './NotebookAdminContext';

const NotebookAdmin: React.FC = () => {
  const { impersonatingUser } = React.useContext(NotebookControllerContext);

  return impersonatingUser ? (
    <NotebookServerRoutes />
  ) : (
    <NotebookAdminContextProvider>
      <NotebookAdminControl />
    </NotebookAdminContextProvider>
  );
};

export default NotebookAdmin;
