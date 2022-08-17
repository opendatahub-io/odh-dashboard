import * as React from 'react';
import AppContext from '../../../../app/AppContext';
import { NotebookControllerContext } from '../../NotebookControllerContext';

export const usePreferredNotebookSize = (): {
  selectedSize: string;
  setSelectedSize: (size: string) => void;
} => {
  const [selectedSize, setSelectedSize] = React.useState<string>('');
  const { dashboardConfig } = React.useContext(AppContext);
  const { currentUserState } = React.useContext(NotebookControllerContext);

  React.useEffect(() => {
    if (dashboardConfig?.spec.notebookSizes) {
      if (currentUserState?.lastSelectedSize) {
        const size = dashboardConfig.spec.notebookSizes.find(
          (notebookSize) => notebookSize.name === currentUserState.lastSelectedSize,
        );
        if (size) {
          setSelectedSize(size.name);
        } else {
          setSelectedSize(dashboardConfig.spec.notebookSizes[0].name);
        }
      } else {
        setSelectedSize(dashboardConfig.spec.notebookSizes[0].name);
      }
    }
  }, [dashboardConfig, currentUserState, setSelectedSize]);

  return { selectedSize, setSelectedSize };
};
