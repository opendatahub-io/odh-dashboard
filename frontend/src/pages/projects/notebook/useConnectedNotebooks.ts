import * as React from 'react';
import { NotebookKind } from '../../../k8sTypes';
import { getNotebook } from '../../../api';
import { ProjectDetailsContext } from '../ProjectDetailsContext';

const useConnectedNotebooks = (
  connectedAnnotation: string,
): [notebooks: NotebookKind[], loaded: boolean, loadError: Error | undefined] => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [notebookNames, setNotebookNames] = React.useState<string[]>([]);
  const [notebooks, setNotebooks] = React.useState<NotebookKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const namespace = currentProject.metadata.name;
  React.useEffect(() => {
    if (!connectedAnnotation) {
      setLoaded(true);
      setNotebookNames([]);
      return;
    }

    try {
      const relatedNotebookNames = JSON.parse(connectedAnnotation);
      setNotebookNames(relatedNotebookNames.filter((name) => typeof name === 'string'));
    } catch (e) {
      console.error('Failed to parse connected annotations', connectedAnnotation, e);
      setLoaded(true);
    }
  }, [connectedAnnotation]);

  React.useEffect(() => {
    if (notebookNames.length > 0) {
      Promise.all(notebookNames.map((name) => getNotebook(name, namespace)))
        .then((notebooks) => {
          setNotebooks(notebooks);
          setLoaded(true);
        })
        .catch((e) => {
          setError(e);
        });
    } else {
      setNotebooks([]);
    }
  }, [namespace, notebookNames]);

  return [notebooks, loaded, error];
};

export default useConnectedNotebooks;
