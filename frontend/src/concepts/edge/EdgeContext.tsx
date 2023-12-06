import * as React from 'react';
import { Outlet } from 'react-router';
import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import { EdgeContextState, EdgeModel } from './types';
import { useEdgeModels } from './useEdgeModels';
import { EDGE_CONSTANT } from './const';

export const EdgeContext = React.createContext<EdgeContextState>({
  models: DEFAULT_CONTEXT_DATA,
  refreshAll: () => undefined,
});

const EdgeContextProvider: React.FC = () => {
  const models = useContextResourceData<EdgeModel>(useEdgeModels(EDGE_CONSTANT));

  const modelsRefresh = models.refresh;
  const refreshAll = React.useCallback(() => {
    modelsRefresh();
  }, [modelsRefresh]);

  return (
    <EdgeContext.Provider value={{ models, refreshAll }}>
      <Outlet />
    </EdgeContext.Provider>
  );
};

export default EdgeContextProvider;
