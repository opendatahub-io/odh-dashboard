import * as React from 'react';
import { ProjectKind } from '@odh-dashboard/k8s-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useHostApiCore } from '@odh-dashboard/plugin-core/host-api';
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
  const { checkAccess } = useHostApiCore();

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
        const accessRequest = {
          group: FeatureStoreModel.apiGroup ?? '',
          resource: FeatureStoreModel.plural,
          name: '',
          namespace: ns,
          subresource: '' as const,
        };
        let allowed: boolean;
        try {
          const [canCreate, canGet] = await Promise.all([
            checkAccess({ ...accessRequest, verb: 'create' }),
            checkAccess({ ...accessRequest, verb: 'get' }),
          ]);
          allowed = canCreate && canGet;
        } catch {
          allowed = false;
        }
        return { name: ns, displayName, allowed };
      }),
    ).then((results) =>
      results.filter((r) => r.allowed).map((r) => ({ name: r.name, displayName: r.displayName })),
    );
  }, [projects, projectsLoaded, checkAccess]);

  const { data: namespaces, loaded, error } = useFetch(fetchAccessibleNamespaces, []);

  return { namespaces, loaded, error };
};

export default useAccessibleNamespaces;
