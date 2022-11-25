import * as React from 'react';
import { getProject } from '../../../../api';
import { ProjectKind } from '../../../../k8sTypes';

const useConnectedProject = (
  name: string,
): [project: ProjectKind | undefined, loaded: boolean, error?: Error] => {
  const [project, setProject] = React.useState<ProjectKind>();
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  React.useEffect(() => {
    getProject(name)
      .then((newProject) => {
        setProject(newProject);
        setLoaded(true);
      })
      .catch((e) => {
        setError(e);
        setLoaded(true);
      });
  }, [name]);

  return [project, loaded, error];
};

export default useConnectedProject;
