import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { fireAutomlProjectDropdownOptionSelected } from '~/app/utilities/tracking';

type ProjectSelectorNavigatorProps = {
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const ProjectSelectorNavigator: React.FC<ProjectSelectorNavigatorProps> = ({
  getRedirectPath,
  namespace,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const { namespaces, updatePreferredNamespace, namespacesLoaded } =
    useNamespaceSelectorWithPersistence();

  return (
    <ProjectSelector
      {...projectSelectorProps}
      onSelection={(projectName) => {
        const match = projectName
          ? (namespaces.find((n) => n.name === projectName) ?? undefined)
          : undefined;
        fireAutomlProjectDropdownOptionSelected(projectName);
        if (match && projectName) {
          updatePreferredNamespace(match);
          navigate(getRedirectPath(projectName));
        }
      }}
      namespace={namespace ?? ''}
      isLoading={!namespacesLoaded}
      namespacesOverride={namespaces}
    />
  );
};

export default ProjectSelectorNavigator;
