import React from 'react';
import { useNamespaceSelector } from 'mod-arch-core';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { AutoragRunsTable } from '~/app/components/AutoragRunsTable';
import { useAutoragMockPipelines } from '~/app/hooks/useAutoragMockPipelines';
import { usePipelineDefinitions } from '~/app/hooks/usePipelineDefinitions';
import { usePipelineRuns } from '~/app/hooks/usePipelineRuns';

const MOCK_FALLBACK_NAMESPACE = 'default';

const MainPage: React.FC = () => {
  const { preferredNamespace } = useNamespaceSelector();
  const namespace = preferredNamespace?.name ?? '';
  const [useMock] = useAutoragMockPipelines();
  // When mock mode is on and no namespace is selected, use fallback so mock data can load
  const effectiveNamespace = useMock && !namespace ? MOCK_FALLBACK_NAMESPACE : namespace;
  const {
    pipelineDefinitions,
    loaded: defsLoaded,
    error: defsError,
    refresh: refreshDefs,
  } = usePipelineDefinitions(effectiveNamespace);
  const {
    runs,
    loaded: runsLoaded,
    error: runsError,
    refresh: refreshRuns,
  } = usePipelineRuns(effectiveNamespace, pipelineDefinitions);

  const loaded = defsLoaded && runsLoaded;
  const loadError = defsError ?? runsError;
  const hasRuns = runs.length > 0;

  const refresh = React.useCallback(async () => {
    await Promise.all([refreshDefs(), refreshRuns()]);
  }, [refreshDefs, refreshRuns]);

  return (
    <ApplicationsPage
      title="AutoML"
      description={
        <p>Automatically configure and optimize your predictive Machine Learning workflows.</p>
      }
      empty={!hasRuns}
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      {hasRuns && (
        <AutoragRunsTable
          runs={runs}
          namespace={effectiveNamespace}
          useMock={useMock}
          refresh={refresh}
        />
      )}
    </ApplicationsPage>
  );
};

export default MainPage;
