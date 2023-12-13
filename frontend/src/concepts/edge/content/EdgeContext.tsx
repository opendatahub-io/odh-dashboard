import * as React from 'react';
import { Outlet } from 'react-router';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import { EdgeContextState, EdgeModel } from '~/concepts/edge/types';
import { useEdgeModels } from '~/concepts/edge/hooks/useEdgeModels';
import { EDGE_CONSTANT } from '~/concepts/edge/const';
import { useEdgePipelines } from '~/concepts/edge/hooks/useEdgePipelines';
import { PipelineKind } from '~/k8sTypes';
import { useTaskRunStatus } from '~/concepts/edge/hooks/useTaskRunStatus';

export const EdgeContext = React.createContext<EdgeContextState>({
  models: DEFAULT_CONTEXT_DATA,
  pipelines: DEFAULT_CONTEXT_DATA,
  taskRunStatuses: {},
  refreshAll: () => undefined,
});

const EdgeContextProvider: React.FC = () => {
  const models = useContextResourceData<EdgeModel>(useEdgeModels(EDGE_CONSTANT));
  const pipelines = useContextResourceData<PipelineKind>(useEdgePipelines(EDGE_CONSTANT));

  const [taskRunStatuses, , , taskRunStatusesRefresh] = useTaskRunStatus(EDGE_CONSTANT);

  const modelsRefresh = models.refresh;
  const pipelinesRefresh = pipelines.refresh;
  const refreshAll = React.useCallback(() => {
    modelsRefresh();
    pipelinesRefresh();
    taskRunStatusesRefresh();
  }, [modelsRefresh, pipelinesRefresh, taskRunStatusesRefresh]);

  return (
    <EdgeContext.Provider value={{ models, pipelines, taskRunStatuses, refreshAll }}>
      <Outlet />
    </EdgeContext.Provider>
  );
};

export default EdgeContextProvider;
