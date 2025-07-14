import * as React from 'react';
import { useAppContext } from '#~/app/AppContext';
import { DashboardConfigKind } from '#~/k8sTypes';
import { NotebookSize } from '#~/types';
import useNotification from '#~/utilities/useNotification';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';
import { DEFAULT_NOTEBOOK_SIZES } from './const';

export const getNotebookSizes = (config: DashboardConfigKind): NotebookSize[] => {
  let sizes = config.spec.notebookSizes || [];
  if (sizes.length === 0) {
    sizes = DEFAULT_NOTEBOOK_SIZES;
  }
  return sizes;
};

export const useNotebookSize = (): {
  selectedSize: NotebookSize;
  setSelectedSize: (size: string) => void;
  sizes: NotebookSize[];
} => {
  const { dashboardConfig } = useAppContext();
  const notification = useNotification();
  const sizes = useDeepCompareMemoize(getNotebookSizes(dashboardConfig));

  const [selectedSize, setSelectedSize] = React.useState<NotebookSize>(sizes[0]);

  const setSelectedSizeSafe = React.useCallback(
    (name: string) => {
      let foundSize = sizes.find((size) => size.name === name);
      if (!foundSize) {
        [foundSize] = sizes;
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
