import * as React from 'react';
import { DashboardConfig, ImageInfo, Notebook } from 'types';

type NotebookControllerContextProps = {
  notebook: Notebook | null | undefined;
  dashboardConfig: DashboardConfig | undefined;
  images: ImageInfo[];
  isNotebookRunning: boolean;
  projectName: string;
};

const defaultNotebookControllerContext: NotebookControllerContextProps = {
  notebook: undefined,
  dashboardConfig: undefined,
  images: [],
  isNotebookRunning: false,
  projectName: '',
};

const NotebookControllerContext = React.createContext(defaultNotebookControllerContext);

export default NotebookControllerContext;
