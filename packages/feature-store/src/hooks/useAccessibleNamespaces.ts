import * as React from 'react';
import { ProjectKind } from '@odh-dashboard/k8s-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { checkAccess } from '@odh-dashboard/internal/api/useAccessReview';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import useFetch, {
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetch';

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

  const fetchAccessibleNamespaces = React.useCallback<
    FetchStateCallbackPromise<NamespaceInfo[]>
  >(() => {
    if (!projectsLoaded) {
      return Promise.reject(new NotReadyError('Projects not loaded'));
    }
    return Promise.all(
      projects.map(async (project: ProjectKind) => {
        const ns = project.metadata.name;
        const displayName = project.metadata.annotations?.['openshift.io/display-name'] || ns;
        let allowed: boolean;
        try {
          allowed = await checkAccess({
            group: FeatureStoreModel.apiGroup ?? '',
            resource: FeatureStoreModel.plural,
            verb: 'create',
            name: '',
            namespace: ns,
            subresource: '',
          });
        } catch {
          allowed = false;
        }
        return { name: ns, displayName, allowed };
      }),
    ).then((results) =>
      results.filter((r) => r.allowed).map((r) => ({ name: r.name, displayName: r.displayName })),
    );
  }, [projects, projectsLoaded]);

  const { data: namespaces, loaded, error } = useFetch(fetchAccessibleNamespaces, []);

  return { namespaces, loaded, error };
};

export default useAccessibleNamespaces;
