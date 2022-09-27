import * as React from 'react';
import { getProjects } from '../../../../api';
import { ProjectKind } from '../../../../k8sTypes';
import { useUser } from '../../../../redux/selectors';
import { usernameTranslate } from '../../../../utilities/notebookControllerUtils';

const useUserProjects = (): [
  projects: ProjectKind[],
  loaded: boolean,
  loadError: Error | undefined,
  fetchProjects: () => Promise<void>,
] => {
  const { username } = useUser();
  const translatedUsername = usernameTranslate(username);
  const [projects, setProjects] = React.useState<ProjectKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  const fetchProjects = React.useCallback(() => {
    return getProjects(translatedUsername)
      .then((newProjects) => {
        setProjects(newProjects.filter(({ status }) => status?.phase === 'Active'));
      })
      .catch((e) => {
        setLoadError(e);
      });
  }, [translatedUsername]);

  React.useEffect(() => {
    if (!loaded) {
      fetchProjects().then(() => {
        setLoaded(true);
      });
    }
    // TODO: No cleanup -- custom hook to manage that??
  }, [loaded, fetchProjects]);

  return [projects, loaded, loadError, fetchProjects];
};

export default useUserProjects;
