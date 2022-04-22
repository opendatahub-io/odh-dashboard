import { Container, Notebook } from '../types';

export const getContainer = (notebook: Notebook | undefined | null): Container | undefined => {
  if (!notebook) {
    return;
  }
  const containers: Container[] = notebook.spec?.template?.spec?.containers || [];
  return containers.find((container) => container.name === notebook.metadata.name);
};
