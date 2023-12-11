import * as React from 'react';
import { Outlet } from 'react-router';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import { EdgeContextState, EdgeModel } from '~/concepts/edge/types';
import { useEdgeModels } from '~/concepts/edge/useEdgeModels';
import { EDGE_CONSTANT } from '~/concepts/edge/const';
import { useEdgePipelines } from '~/concepts/edge/useEdgePipelines';
import { PipelineKind } from '~/k8sTypes';

export const EdgeContext = React.createContext<EdgeContextState>({
  models: DEFAULT_CONTEXT_DATA,
  pipelines: DEFAULT_CONTEXT_DATA,
  refreshAll: () => undefined,
});

const EdgeContextProvider: React.FC = () => {
  const models = useContextResourceData<EdgeModel>(useEdgeModels(EDGE_CONSTANT));
  const pipelines = useContextResourceData<PipelineKind>(useEdgePipelines(EDGE_CONSTANT));

  const modelsRefresh = models.refresh;
  const refreshAll = React.useCallback(() => {
    modelsRefresh();
  }, [modelsRefresh]);

  return (
    <EdgeContext.Provider value={{ models, pipelines, refreshAll }}>
      <Outlet />
    </EdgeContext.Provider>
  );
};

export default EdgeContextProvider;
