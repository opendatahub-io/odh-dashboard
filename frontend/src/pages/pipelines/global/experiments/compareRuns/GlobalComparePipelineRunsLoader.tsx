import * as React from 'react';
import { Outlet } from 'react-router-dom';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import { CompareRunsContextProvider } from '~/concepts/pipelines/content/compareRuns/CompareRunsContext';

const GlobalComparePipelineRunsLoader: React.FC = () => (
  <EnsureAPIAvailability>
    <CompareRunsContextProvider>
      <Outlet />
    </CompareRunsContextProvider>
  </EnsureAPIAvailability>
);
export default GlobalComparePipelineRunsLoader;
