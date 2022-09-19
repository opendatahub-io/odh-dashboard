import * as React from 'react';
import { useAppContext } from '../../../../app/AppContext';
import { useNotebookUserState } from '../../../../utilities/notebookControllerUtils';
import { DEFAULT_NOTEBOOK_SIZES } from '../../const';
import { DashboardConfig, NotebookSize } from '../../../../types';
import useNotification from '../../../../utilities/useNotification';
import { useDeepCompareMemoize } from '../../../../utilities/useDeepCompareMemoize';

export const getNotebookSizes = (config: DashboardConfig): NotebookSize[] => {
  let sizes = config.spec.notebookSizes || [];
  if (sizes.length === 0) {
    sizes = DEFAULT_NOTEBOOK_SIZES;
  }
  return sizes;
};

export const usePreferredNotebookSize = (): {
  selectedSize: NotebookSize;
  setSelectedSize: (size: string) => void;
  sizes: NotebookSize[];
} => {
  const { dashboardConfig } = useAppContext();
  const notification = useNotification();
  const currentUserState = useNotebookUserState();
  const sizes = useDeepCompareMemoize(getNotebookSizes(dashboardConfig));

  const [selectedSize, setSelectedSize] = React.useState<NotebookSize>(() => {
    let defaultSize: NotebookSize;
    let notUserDefined = false;
    if (currentUserState.lastSelectedSize) {
      const size = sizes.find(
        (notebookSize) => notebookSize.name === currentUserState.lastSelectedSize,
      );
      if (size) {
        defaultSize = size;
      } else {
        defaultSize = sizes[0];
        notUserDefined = true;
      }
    } else {
      defaultSize = sizes[0];
    }
    return { ...defaultSize, notUserDefined };
  });

  const setSelectedSizeSafe = React.useCallback(
    (name: string) => {
      let foundSize = sizes.find((size) => size.name === name);
      if (!foundSize) {
        foundSize = sizes[0];
        notification.warning(
          'The size you select is no longer available, we have set the size to the default one.',
        );
      }
      setSelectedSize(foundSize);
    },
    [notification, sizes],
  );

  return { selectedSize, setSelectedSize: setSelectedSizeSafe, sizes };
};
