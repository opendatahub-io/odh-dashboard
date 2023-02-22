import * as React from 'react';
import { getProject } from '~/api';
import { ProjectKind } from '~/k8sTypes';

const useProject = (
  projectName?: string,
): [resource: ProjectKind | null, loaded: boolean, error: Error | null] => {
  const [project, setProject] = React.useState<ProjectKind | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (projectName) {
      getProject(projectName)
        .then((p) => {
          if (p == null) {
            throw new Error(`Project '${projectName}' not found`);
          }
          setProject(p);
          setLoaded(true);
        })
        .catch((e) => setError(e));
    }
  }, [projectName]);

  return [project, loaded, error];
};

export default useProject;
