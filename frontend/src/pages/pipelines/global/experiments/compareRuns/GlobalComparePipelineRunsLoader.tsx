import * as React from 'react';
import { Outlet } from 'react-router-dom';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import { CompareRunsContextProvider } from '~/concepts/pipelines/content/compareRuns/CompareRunsContext';
import PipelineRunVersionsContextProvider from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';

const GlobalComparePipelineRunsLoader: React.FC = () => (
  <EnsureAPIAvailability>
    <CompareRunsContextProvider>
      <PipelineRunVersionsContextProvider>
        <Outlet />
      </PipelineRunVersionsContextProvider>
    </CompareRunsContextProvider>
  </EnsureAPIAvailability>
);
export default GlobalComparePipelineRunsLoader;
