import * as React from 'react';
import * as _ from 'lodash';
import { AppContext } from '../../../../../app/AppContext';
import { NotebookContainer, NotebookSize } from '../../../../../types';
import { getNotebookSizes } from '../../../../notebookController/screens/server/usePreferredNotebookSize';
import { NotebookKind } from '../../../../../k8sTypes';

const useNotebookSize = (notebook: NotebookKind): NotebookSize | null => {
  const { dashboardConfig } = React.useContext(AppContext);

  const container: NotebookContainer | undefined = notebook?.spec.template.spec.containers.find(
    (container) => container.name === notebook.metadata.name,
  );

  if (!container) {
    return null;
  }

  const sizes = getNotebookSizes(dashboardConfig);
  const size = sizes.find((size) => _.isEqual(size.resources.limits, container.resources?.limits));

  if (!size) {
    return null;
  }

  return size;
};

export default useNotebookSize;
