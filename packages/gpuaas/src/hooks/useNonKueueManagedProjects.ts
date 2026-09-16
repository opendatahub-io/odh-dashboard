import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { useProjects } from '@odh-dashboard/internal/api/k8s/projects';
import { getNonKueueManagedDataScienceProjects } from '../utils/kueueProjects';

type UseNonKueueManagedProjectsResult = {
  projects: ProjectKind[];
  loaded: boolean;
  error: Error | undefined;
};

const useNonKueueManagedProjects = (): UseNonKueueManagedProjectsResult => {
  const [allProjects, loaded, error] = useProjects();

  const projects = React.useMemo(
    () => getNonKueueManagedDataScienceProjects(allProjects),
    [allProjects],
  );

  return { projects, loaded, error };
};

export default useNonKueueManagedProjects;
