import * as React from 'react';
import { ProjectKind } from '~/k8sTypes';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';
import { getModelServingProjects } from '~/api';

const useModelServingProjects = (namespace?: string): FetchState<ProjectKind[]> => {
  const getProjects = React.useCallback(() => {
    if (namespace) {
      return Promise.reject(new NotReadyError('Does not needed when namespace is provided'));
    }

    return getModelServingProjects();
  }, [namespace]);

  return useFetchState<ProjectKind[]>(getProjects, []);
};

export default useModelServingProjects;
