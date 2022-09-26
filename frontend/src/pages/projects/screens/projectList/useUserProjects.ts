import * as React from 'react';
import { getProjects } from '../../../../api';
import { ProjectKind } from '../../../../k8sTypes';
import { useUser } from '../../../../redux/selectors';
import { usernameTranslate } from '../../../../utilities/notebookControllerUtils';

const useUserProjects = (): [
  projects: ProjectKind[],
  loaded: boolean,
  loadError: Error | undefined,
] => {
  const { username } = useUser();
  const translatedUsername = usernameTranslate(username);
  const [projects, setProjects] = React.useState<ProjectKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  React.useEffect(() => {
    getProjects(translatedUsername)
      .then((projects) => {
        setProjects(projects);
        setLoaded(true);
      })
      .catch((e) => {
        setLoadError(e);
        setLoaded(true);
      });
  }, [translatedUsername]);

  return [projects, loaded, loadError];
};

export default useUserProjects;
