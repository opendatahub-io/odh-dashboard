import React from 'react';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { checkAccess } from '@odh-dashboard/internal/api/useAccessReview';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';

type NamespaceInfo = {
  name: string;
  displayName: string;
};

type UseAccessibleNamespacesReturn = {
  namespaces: NamespaceInfo[];
  loaded: boolean;
  error?: Error;
};

const useAccessibleNamespaces = (): UseAccessibleNamespacesReturn => {
  const { projects, loaded: projectsLoaded } = React.useContext(ProjectsContext);
  const [namespaces, setNamespaces] = React.useState<NamespaceInfo[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    if (!projectsLoaded) {
      return;
    }

    const checkNamespaceAccess = async () => {
      try {
        const results = await Promise.all(
          projects.map(async (project: ProjectKind) => {
            const ns = project.metadata.name;
            const displayName = project.metadata.annotations?.['openshift.io/display-name'] || ns;
            const allowed = await checkAccess({
              group: FeatureStoreModel.apiGroup ?? '',
              resource: FeatureStoreModel.plural,
              verb: 'create',
              name: '',
              namespace: ns,
              subresource: '',
            });
            return { name: ns, displayName, allowed };
          }),
        );

        setNamespaces(
          results
            .filter((r) => r.allowed)
            .map((r) => ({ name: r.name, displayName: r.displayName })),
        );
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoaded(true);
      }
    };

    checkNamespaceAccess();
  }, [projects, projectsLoaded]);

  return { namespaces, loaded, error };
};

export default useAccessibleNamespaces;
