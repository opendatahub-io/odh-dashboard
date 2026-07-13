import * as React from 'react';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import { useNavigate } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';

type ExternalModelsProjectSelectorProps = {
  namespace: string;
  getRedirectPath: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const ExternalModelsProjectSelector: React.FC<ExternalModelsProjectSelectorProps> = ({
  namespace,
  getRedirectPath,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const { namespaces, updatePreferredNamespace, namespacesLoaded } = useNamespaceSelector();

  return (
    <div data-testid="external-models-project-selector">
      <ProjectSelector
        {...projectSelectorProps}
        showTitle
        onSelection={(projectName) => {
          const match = projectName
            ? (namespaces.find((n) => n.name === projectName) ?? undefined)
            : undefined;
          updatePreferredNamespace(match);
          navigate(getRedirectPath(projectName));
        }}
        namespace={namespace}
        isLoading={!namespacesLoaded}
        namespacesOverride={namespaces}
      />
    </div>
  );
};

export default ExternalModelsProjectSelector;
