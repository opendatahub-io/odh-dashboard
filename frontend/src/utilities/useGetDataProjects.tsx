import * as React from 'react';
import { Project, ProjectList } from '../types';
import { State } from '../redux/types';
import { getDataProject, getDataProjects } from '../services/dataProjectsService';
import { useDispatch, useSelector } from 'react-redux';
import { addNotification } from '../redux/actions/actions';

export const useGetDataProjects = (): {
  dataProjects: ProjectList | undefined;
  loaded: boolean;
  loadError: Error | undefined;
  watchDataProjectStatus: (project: Project) => void;
} => {
  const dispatch = useDispatch();
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [dataProjects, setDataProjects] = React.useState<ProjectList>();
  const [updateKey, setUpdateKey] = React.useState<number>(0);
  const updateRef = React.useRef<number>(updateKey);
  const username: string | null | undefined = useSelector<State, string | null | undefined>(
    (state) => state.appState.user,
  );

  const updateDataProjects = () => {
    updateRef.current = updateRef.current + 1;
    setUpdateKey(updateRef.current);
  };

  React.useEffect(() => {
    let cancelled = false;
    if (username) {
      getDataProjects()
        .then((dp: ProjectList) => {
          if (!cancelled) {
            setDataProjects(dp);
            setLoaded(true);
            setLoadError(undefined);
          }
        })
        .catch((e) => {
          console.log(e);
          setLoaded(true);
          setLoadError(e);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [updateKey, username]);

  const watchDataProjectStatus = (project: Project) => {
    let watchHandle;
    const projectName = project.metadata?.name;
    const displayedProject = dataProjects?.items.find((proj) => proj.metadata.name === projectName);
    if (!displayedProject) {
      return;
    }
    const watchDataProject = () => {
      getDataProject(projectName)
        .then((newProject: Project) => {
          if (newProject.status.phase !== displayedProject.status.phase) {
            updateDataProjects();
          }
          watchHandle = setTimeout(watchDataProject, 2000); // every 2 seconds
        })
        .catch((e) => {
          if (e.statusCode === 404) {
            dispatch(
              addNotification({
                status: 'success',
                title: `Data project ${projectName} deleted successfully.`,
                timestamp: new Date(),
              }),
            );
            updateDataProjects();
          } else {
            dispatch(
              addNotification({
                status: 'danger',
                title: `Error refreshing data projects list.`,
                message: e.message,
                timestamp: new Date(),
              }),
            );
          }
        });
      clearTimeout(watchHandle);
    };
    watchDataProject();
  };

  return { dataProjects, loaded, loadError, watchDataProjectStatus };
};
