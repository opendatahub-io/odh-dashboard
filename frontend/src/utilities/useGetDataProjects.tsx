import * as React from 'react';
import { ProjectList } from '../types';
import { State } from '../redux/types';
import { getDataProjects } from '../services/dataProjectsService';
import { useSelector } from 'react-redux';

export const useGetDataProjects = (): {
  dataProjects: ProjectList | undefined;
  loaded: boolean;
  loadError: Error | undefined;
  updateDataProjects: () => void;
} => {
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
            setLoaded(true);
            setLoadError(undefined);
            setDataProjects(dp);
          }
        })
        .catch((e) => {
          console.log(e);
          setLoadError(e);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [updateKey, username]);

  return { dataProjects, loaded, loadError, updateDataProjects };
};
