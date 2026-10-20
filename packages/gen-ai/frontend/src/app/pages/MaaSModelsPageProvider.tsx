import * as React from 'react';
import { GenAiContext } from '~/app/context/GenAiContext';
import useGenAiAPIState from '~/app/hooks/useGenAiAPIState';
import MaaSModelsPage from '~/app/pages/MaaSModelsPage';
import { API_URL_PREFIX } from '~/app/utilities/const';

const MaaSModelsPageProvider: React.FC = () => {
  const [apiState, refreshAPIState] = useGenAiAPIState(`${API_URL_PREFIX}/api/v1`);

  const contextValue = React.useMemo(
    () => ({
      namespace: undefined,
      apiState,
      refreshAPIState,
    }),
    [apiState, refreshAPIState],
  );

  return (
    <GenAiContext.Provider value={contextValue}>
      <MaaSModelsPage />
    </GenAiContext.Provider>
  );
};

export default MaaSModelsPageProvider;
