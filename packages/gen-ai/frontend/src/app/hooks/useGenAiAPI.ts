import * as React from 'react';
import { GenAiAPIState } from '~/app/hooks/useGenAiAPIState';
import { GenAiContext } from '~/app/context/GenAiContext';

type UseGenAiAPI = GenAiAPIState & {
  refreshAllAPI: () => void;
};

export const useGenAiAPI = (): UseGenAiAPI => {
  const { apiState, refreshAPIState: refreshAllAPI } = React.useContext(GenAiContext);

  return {
    refreshAllAPI,
    ...apiState,
  };
};
