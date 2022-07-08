import * as React from 'react';
import { DashboardConfig, ImageInfo, Notebook, NotebookControllerUserState } from 'types';
import { EMPTY_USER_STATE } from './const';

type NotebookControllerContextProps = {
  notebook: Notebook | null | undefined;
  dashboardConfig: DashboardConfig | undefined;
  images: ImageInfo[];
  isNotebookRunning: boolean;
  projectName: string;
  userState: NotebookControllerUserState;
};

const defaultNotebookControllerContext: NotebookControllerContextProps = {
  notebook: undefined,
  dashboardConfig: undefined,
  images: [],
  isNotebookRunning: false,
  projectName: '',
  userState: EMPTY_USER_STATE,
};

const NotebookControllerContext = React.createContext(defaultNotebookControllerContext);

export default NotebookControllerContext;
