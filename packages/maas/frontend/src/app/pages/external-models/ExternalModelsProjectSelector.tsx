import * as React from 'react';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { useNavigate } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';
import { deploymentsExternalPath } from './const';

type ExternalModelsProjectSelectorProps = {
  namespace: string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const ExternalModelsProjectSelector: React.FC<ExternalModelsProjectSelectorProps> = ({
  namespace,
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
          navigate(deploymentsExternalPath(projectName));
        }}
        namespace={namespace}
        isLoading={!namespacesLoaded}
        namespacesOverride={namespaces}
      />
    </div>
  );
};

export default ExternalModelsProjectSelector;
