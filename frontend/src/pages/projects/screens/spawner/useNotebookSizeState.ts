import React from 'react';
import useNotebookDeploymentSize from '#~/pages/projects/screens/detail/notebooks/useNotebookDeploymentSize';
import { NotebookKind } from '#~/k8sTypes';
import { NotebookSize } from '#~/types';
import { getCustomNotebookSize } from '#~/pages/projects/utils';
import { useNotebookSize } from './useNotebookSize';

export const useNotebookSizeState = (
  existingNotebook: NotebookKind | undefined,
): {
  selectedSize: NotebookSize;
  setSelectedSize: (size: string) => void;
  sizes: NotebookSize[];
} => {
  const { size: notebookSize } = useNotebookDeploymentSize(existingNotebook);
  const { sizes } = useNotebookSize();

  const allSizes = React.useMemo(() => {
    if (notebookSize) {
      return sizes;
    }
    const CUSTOM_NOTEBOOK_SIZE = getCustomNotebookSize(existingNotebook);
    if (existingNotebook) {
      return [CUSTOM_NOTEBOOK_SIZE, ...sizes];
    }
    return sizes;
  }, [notebookSize, sizes, existingNotebook]);

  const [selectedSize, setSelectedSize] = React.useState<NotebookSize>(
    () => allSizes.find((size) => size.name === notebookSize?.name) || allSizes[0],
  );

  const setSelectedSizeSafe = React.useCallback(
    (name: string) => {
      const foundSize = allSizes.find((size) => size.name === name);
      setSelectedSize(foundSize ?? allSizes[0]);
    },
    [allSizes],
  );

  return { selectedSize, setSelectedSize: setSelectedSizeSafe, sizes: allSizes };
};
