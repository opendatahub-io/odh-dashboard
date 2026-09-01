import * as React from 'react';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { useNavigate } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';
import { externalProvidersManagementPath } from './const';

type ExternalProvidersProjectSelectorProps = {
  namespace: string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const ExternalProvidersProjectSelector: React.FC<ExternalProvidersProjectSelectorProps> = ({
  namespace,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const { namespaces, updatePreferredNamespace, namespacesLoaded } = useNamespaceSelector();

  return (
    <div data-testid="external-providers-project-selector">
      <ProjectSelector
        {...projectSelectorProps}
        showTitle
        onSelection={(projectName) => {
          const match = projectName
            ? (namespaces.find((n) => n.name === projectName) ?? undefined)
            : undefined;
          updatePreferredNamespace(match);
          navigate(externalProvidersManagementPath(projectName));
        }}
        namespace={namespace}
        isLoading={!namespacesLoaded}
        namespacesOverride={namespaces}
      />
    </div>
  );
};

export default ExternalProvidersProjectSelector;
