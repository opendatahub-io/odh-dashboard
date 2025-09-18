import * as React from 'react';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import { useNamespaceSelector } from 'mod-arch-core';
import { useNavigate } from 'react-router-dom';

type PipelineCoreProjectSelectorProps = {
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const GenAiCoreProjectSelector: React.FC<PipelineCoreProjectSelectorProps> = ({
  getRedirectPath,
  namespace,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const { namespaces, updatePreferredNamespace, namespacesLoaded } = useNamespaceSelector();

  return (
    <ProjectSelector
      {...projectSelectorProps}
      onSelection={(projectName) => {
        const match = projectName
          ? (namespaces.find((n) => n.name === projectName) ?? undefined)
          : undefined;
        updatePreferredNamespace(match);
        navigate(getRedirectPath(projectName));
      }}
      namespace={namespace ?? ''}
      isLoading={!namespacesLoaded}
      namespacesOverride={namespaces}
    />
  );
};

export default GenAiCoreProjectSelector;
