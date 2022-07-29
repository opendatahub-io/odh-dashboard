import * as React from 'react';
import { NotebookControllerUserState } from '../../types';
import { EMPTY_USER_STATE } from './const';

type NotebookControllerContextProps = {
  setCurrentUserState: (userState: NotebookControllerUserState) => void;
  currentUserState: NotebookControllerUserState;
};

const defaultNotebookControllerContext: NotebookControllerContextProps = {
  setCurrentUserState: () => undefined,
  currentUserState: EMPTY_USER_STATE,
};

const NotebookControllerContext = React.createContext(defaultNotebookControllerContext);

export default NotebookControllerContext;
