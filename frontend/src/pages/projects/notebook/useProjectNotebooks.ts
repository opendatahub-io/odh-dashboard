import * as React from 'react';
import { getNotebooks } from '../../../api';
import { NotebookKind } from '../../../k8sTypes';
import { ProjectDetailsContext } from '../ProjectDetailsContext';

/**
 * Note: `useProjectNotebookStates` is probably what you want if you need information about the notebooks.
 * This will only get you back the related Notebooks.
 */
const useProjectNotebooks = (): [
  notebooks: NotebookKind[],
  loaded: boolean,
  error: Error | undefined,
] => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [notebooks, setNotebooks] = React.useState<NotebookKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const namespace = currentProject.metadata.name;

  React.useEffect(() => {
    getNotebooks(namespace)
      .then((newNotebooks) => {
        setNotebooks(newNotebooks);
        setLoaded(true);
      })
      .catch((e) => {
        setError(e);
      });
  }, [namespace]);

  return [notebooks, loaded, error];
};

export default useProjectNotebooks;
