import * as React from 'react';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import { useNamespaceSelector } from 'mod-arch-core';
import { useNavigate } from 'react-router-dom';

type EvalHubProjectSelectorProps = {
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const EvalHubProjectSelector: React.FC<EvalHubProjectSelectorProps> = ({
  getRedirectPath,
  namespace,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const { namespaces, updatePreferredNamespace, namespacesLoaded } = useNamespaceSelector();

  return (
    <div data-testid="eval-hub-project-selector">
      <ProjectSelector
        {...projectSelectorProps}
        onSelection={(projectName) => {
          const match = projectName
            ? // eslint-disable-next-line prettier/prettier
              (namespaces.find((n) => n.name === projectName) ?? undefined)
            : undefined;
          updatePreferredNamespace(match);
          navigate(getRedirectPath(projectName));
        }}
        namespace={namespace ?? ''}
        isLoading={!namespacesLoaded}
        namespacesOverride={namespaces}
      />
    </div>
  );
};

export default EvalHubProjectSelector;
