import * as React from 'react';
import { getModelServingProjectsAvailable } from '~/api';
import { ProjectKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

const useModelServingProjects = (): FetchState<ProjectKind[]> => {
  const fetchProjects = React.useCallback(() => getModelServingProjectsAvailable(), []);

  return useFetchState<ProjectKind[]>(fetchProjects, []);
};

export default useModelServingProjects;
