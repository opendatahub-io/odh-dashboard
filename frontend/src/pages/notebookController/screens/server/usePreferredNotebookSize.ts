import * as React from 'react';
import AppContext from '../../../../app/AppContext';
import { useNotebookUserState } from '../../../../utilities/notebookControllerUtils';

export const usePreferredNotebookSize = (): [
  selectedSize: string,
  setSelectedSize: (size: string) => void,
] => {
  const { dashboardConfig } = React.useContext(AppContext);
  const currentUserState = useNotebookUserState();

  let defaultSize = '';
  if (dashboardConfig?.spec.notebookSizes) {
    if (currentUserState.lastSelectedSize) {
      const size = dashboardConfig.spec.notebookSizes.find(
        (notebookSize) => notebookSize.name === currentUserState.lastSelectedSize,
      );
      if (size) {
        defaultSize = size.name;
      } else {
        defaultSize = dashboardConfig.spec.notebookSizes[0].name;
      }
    } else {
      defaultSize = dashboardConfig.spec.notebookSizes[0].name;
    }
  }

  return React.useState<string>(defaultSize);
};
