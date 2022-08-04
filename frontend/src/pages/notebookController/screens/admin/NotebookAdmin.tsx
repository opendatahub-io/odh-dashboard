import * as React from 'react';
import NotebookAdminControl from './NotebookAdminControl';
import NotebookServerRoutes from '../server/NotebookServerRoutes';
import { NotebookControllerContext } from '../../NotebookControllerContext';

const NotebookAdmin: React.FC = () => {
  const { impersonatingUser } = React.useContext(NotebookControllerContext);

  return impersonatingUser ? <NotebookServerRoutes /> : <NotebookAdminControl />;
};

export default NotebookAdmin;
