import * as React from 'react';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { getProjects } from '@odh-dashboard/internal/api/k8s/projects';
import { isFeatureStoreAccessibleProject } from '../utils/contextUtils';

type UseFeatureStoreAccessibleProjectsReturn = {
  accessibleProjects: ProjectKind[];
  projectsLoaded: boolean;
  projectsError: Error | undefined;
};

export const useFeatureStoreAccessibleProjects = (): UseFeatureStoreAccessibleProjectsReturn => {
  const [accessibleProjects, setAccessibleProjects] = React.useState<ProjectKind[]>([]);
  const [projectsLoaded, setProjectsLoaded] = React.useState(false);
  const [projectsError, setProjectsError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    const loadProjects = async () => {
      try {
        const allProjects = await getProjects();

        const filteredProjects = allProjects.filter((project) =>
          isFeatureStoreAccessibleProject(project.metadata.name, ''),
        );

        setAccessibleProjects(filteredProjects);
        setProjectsLoaded(true);
      } catch (error) {
        const errorObj =
          error instanceof Error ? error : new Error('Failed to load projects for FeatureStore');
        console.error('Failed to load projects for FeatureStore context:', error);
        setProjectsError(errorObj);
        setProjectsLoaded(true);
      }
    };

    loadProjects();
  }, []);

  return {
    accessibleProjects,
    projectsLoaded,
    projectsError,
  };
};
