import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { CompareRunsContextProvider } from '~/concepts/pipelines/content/compareRuns/CompareRunsContext';

const GlobalComparePipelineRunsLoader: React.FC = () => (
  <CompareRunsContextProvider>
    <Outlet />
  </CompareRunsContextProvider>
);
export default GlobalComparePipelineRunsLoader;
