import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNamespaceSelectorWithPersistence } from '../../hooks/common/useNamespaceSelectorWithPersistence';

export type ProjectSelectorNavigatorProps = {
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
  onProjectSelected?: (projectName: string) => void;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const ProjectSelectorNavigator: React.FC<ProjectSelectorNavigatorProps> = ({
  getRedirectPath,
  namespace,
  onProjectSelected,
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
          ? namespaces.find((item) => item.name === projectName)
          : undefined;
        onProjectSelected?.(projectName);

        // Clearing the selector is not a project selection and must not navigate to an invalid URL.
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
