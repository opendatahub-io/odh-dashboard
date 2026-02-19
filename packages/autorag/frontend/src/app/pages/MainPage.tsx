import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { mockPipelineRuns } from '~/app/mocks/mockPipelineRun';
import RunsTable from './RunsTable';

const MainPage: React.FC = () => {
  const runs = mockPipelineRuns;
  const loaded = true;
  const loadError = undefined;

  return (
    <ApplicationsPage
      title="AutoRAG"
      description={
        <p>Automatically configure and optimize your Retrieval-Augmented Generation workflows.</p>
      }
      empty={runs.length === 0}
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <RunsTable runs={runs} />
    </ApplicationsPage>
  );
};

export default MainPage;
