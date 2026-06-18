import * as React from 'react';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import { useNamespaceSelector } from 'mod-arch-core';
import { useNavigate } from 'react-router-dom';

type AgentOpsProjectSelectorProps = {
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const AgentOpsProjectSelector: React.FC<AgentOpsProjectSelectorProps> = ({
  getRedirectPath,
  namespace,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const { namespaces, updatePreferredNamespace, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelector();

  const effectiveNamespaces = React.useMemo(() => {
    if (namespaces.length > 0) {
      return namespaces;
    }
    if (namespace) {
      return [{ name: namespace, displayName: namespace }];
    }
    return namespaces;
  }, [namespaces, namespace]);

  const isLoading = !namespacesLoaded && !namespacesLoadError;

  return (
    <ProjectSelector
      {...projectSelectorProps}
      onSelection={(projectName) => {
        const match = projectName
          ? (effectiveNamespaces.find((n) => n.name === projectName) ?? undefined)
          : undefined;
        updatePreferredNamespace(match);
        navigate(getRedirectPath(projectName));
      }}
      namespace={namespace ?? ''}
      isLoading={isLoading}
      namespacesOverride={effectiveNamespaces}
    />
  );
};

export default AgentOpsProjectSelector;
