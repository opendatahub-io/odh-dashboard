import * as React from 'react';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { useNavigate } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';

type MaaSExternalResourcesProjectSelectorProps = {
  namespace: string;
  pathFunction: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const MaaSExternalResourcesProjectSelector: React.FC<MaaSExternalResourcesProjectSelectorProps> = ({
  namespace,
  pathFunction,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const { namespaces, updatePreferredNamespace, namespacesLoaded } = useNamespaceSelector();

  return (
    <div data-testid="maas-external-resources-project-selector">
      <ProjectSelector
        {...projectSelectorProps}
        showTitle
        onSelection={(projectName) => {
          const match = projectName
            ? (namespaces.find((n) => n.name === projectName) ?? undefined)
            : undefined;
          updatePreferredNamespace(match);
          navigate(pathFunction(projectName));
        }}
        namespace={namespace}
        isLoading={!namespacesLoaded}
        namespacesOverride={namespaces}
      />
    </div>
  );
};

export default MaaSExternalResourcesProjectSelector;
